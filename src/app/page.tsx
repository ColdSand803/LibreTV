'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Header } from '@/components/header';
import { NetflixHome } from '@/components/netflix-home';
import { DetailModal } from '@/components/detail-modal';
import { AggregatedCard, aggregateResults } from '@/components/video-card';
import { useAppStore, resolveSource, isInDisabledSubscription, isSourceDisabled } from '@/lib/store';
import { api } from '@/lib/client-api';
import type { SearchResultItem, SourceSearchOutcome } from '@/lib/types';
import { validateSourceUrl } from '@/lib/utils';
import { useToast } from '@/components/toast';
import { useAuth } from '@/components/auth';
import { EmptyState } from '@/components/states';
import { SearchFilter, filterAggregatedGroups, type SearchFilterState } from '@/components/search-filter';

/** 搜索结果分批渲染批次 */
const RESULT_PAGE_SIZE = 60;

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { version } = useAuth();
  const urlQuery = searchParams.get('s') || '';
  const store = useAppStore();
  const [detailItem, setDetailItem] = useState<SearchResultItem | null>(null);
  const [streamedOutcomes, setStreamedOutcomes] = useState<SourceSearchOutcome[]>([]);

  const sourceName = (key: string) =>
    store.customAPIs.find((a) => a.key === key)?.name ??
    store.envSources.find((a) => a.key === key)?.name ??
    key;

  const selectedSources = useMemo(() => {
    const seen = new Set<string>();
    return store.selectedKeys
      .map((key) => resolveSource(store, key))
      .filter((s): s is NonNullable<typeof s> => {
        if (!s || !validateSourceUrl(s.url) || seen.has(s.key)) return false;
        seen.add(s.key);
        return true;
      })
      .filter((s) => !isSourceDisabled(store, s.key))
      .filter((s) => !isInDisabledSubscription(store, s.key));
  }, [store]);

  const disabledSources = useMemo(
    () => store.selectedKeys.filter((key) => isSourceDisabled(store, key)),
    [store]
  );

  const searchQuery = useQuery({
    queryKey: ['search', urlQuery, selectedSources.map((s) => s.key).sort().join(','), store.yellowFilter],
    queryFn: ({ signal }) => {
      setStreamedOutcomes([]);
      return api.search(urlQuery, selectedSources, store.yellowFilter, {
        signal,
        onSource: (outcome: SourceSearchOutcome) => {
          setStreamedOutcomes((prev) => [...prev, outcome]);
          if (!outcome.ok && !outcome.timedOut && outcome.error) {
            toast(`${outcome.sourceKey}: ${outcome.error}`, 'error');
          }
        },
      });
    },
    enabled: Boolean(urlQuery) && selectedSources.length > 0,
    staleTime: 300_000,
  });

  const runSearch = (q: string) => {
    const query = q.trim().slice(0, 100);
    if (!query) {
      toast('请输入搜索内容', 'info');
      return;
    }
    if (selectedSources.length === 0) {
      toast('请先在右上角设置中启用采集源', 'warning');
      return;
    }
    router.push(`/?s=${encodeURIComponent(query)}`, { scroll: false });
  };

  const isSearching = Boolean(urlQuery) && searchQuery.isFetching && !searchQuery.data;
  const streamedList = useMemo(
    () => streamedOutcomes.flatMap((o) => o.list),
    [streamedOutcomes]
  );
  const list = useMemo(
    () => searchQuery.data?.list ?? (isSearching ? streamedList : []),
    [searchQuery.data, isSearching, streamedList]
  );

  const failures =
    searchQuery.data?.failures ??
    streamedOutcomes
      .filter((o) => !o.ok)
      .map((o) => ({ sourceKey: o.sourceKey, error: o.error || '请求失败', timedOut: o.timedOut }));

  const groups = useMemo(() => aggregateResults(list), [list]);
  const [filters, setFilters] = useState<SearchFilterState>({
    type: 'all',
    year: 'all',
    multiOnly: false,
  });
  const filteredGroups = useMemo(
    () => filterAggregatedGroups(groups, filters),
    [groups, filters]
  );
  const [visibleCount, setVisibleCount] = useState(RESULT_PAGE_SIZE);
  const visibleGroups = useMemo(() => filteredGroups.slice(0, visibleCount), [filteredGroups, visibleCount]);
  useEffect(() => setVisibleCount(RESULT_PAGE_SIZE), [groups, filters]);

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col selection:bg-red-600 selection:text-white">
      {/* Netflix 沉浸式顶部导航栏 */}
      <Header />

      <main className="flex-1 w-full">
        {/* 当没有搜索关键词时：展现 Netflix 经典首页 (Hero Billboard + 多分类滑动 Rails) */}
        {!urlQuery ? (
          <NetflixHome onPick={runSearch} />
        ) : (
          /* 当有搜索关键词时：展现 Netflix 风格全景搜索结果页 */
          <div className="pt-24 max-w-7xl mx-auto px-4 sm:px-8 pb-16">
            {/* 搜索结果头部栏 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">
                    “<span className="text-red-500">{urlQuery}</span>” 的搜索结果
                  </h1>
                  {groups.length > 0 && (
                    <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full font-medium">
                      共 {filteredGroups.length} 部
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  已匹配全网聚合片源，支持跨线路聚合与无缝切换
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="px-3.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <span>返回主页</span>
                </Link>
              </div>
            </div>

            {/* 故障源或停用源提示 */}
            {failures.length > 0 && (
              <div className="mb-4 text-xs text-zinc-400 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 flex flex-wrap gap-2">
                <span className="text-zinc-500">部分源未响应：</span>
                {failures.map((f) => (
                  <span key={f.sourceKey} className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                    {sourceName(f.sourceKey)} ({f.timedOut ? '超时' : f.error})
                  </span>
                ))}
              </div>
            )}

            {disabledSources.length > 0 && (
              <div className="mb-4 text-xs text-zinc-400 bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2">
                {disabledSources.length} 个源处于暂停保护状态：{disabledSources.map((k) => sourceName(k)).join('、')}
              </div>
            )}
            {groups.length > 0 && (
              <SearchFilter groups={groups} filters={filters} onChange={setFilters} />
            )}

            {/* 结果网格 */}
            {selectedSources.length === 0 ? (
              <div className="text-center py-20 text-zinc-400">
                <p className="mb-4">当前未启用任何点播采集源</p>
                <Link href="/" className="btn-netflix-red text-sm">
                  前往启用预置源
                </Link>
              </div>
            ) : list.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
                  {visibleGroups.map((group) => (
                    <AggregatedCard
                      key={group.key}
                      group={group}
                      onOpen={(item) => setDetailItem(item)}
                    />
                  ))}
                </div>

                {filteredGroups.length > visibleCount && (
                  <div className="flex justify-center mt-10">
                    <button
                      className="px-6 py-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition-colors cursor-pointer shadow-lg"
                      onClick={() => setVisibleCount((v) => v + RESULT_PAGE_SIZE)}
                    >
                      加载更多影片（还有 {filteredGroups.length - visibleCount} 部）
                    </button>
                  </div>
                )}
              </>
            ) : isSearching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-zinc-900 animate-pulse rounded-md border border-zinc-800" />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="search"
                title="未找到相关影视资源"
                description="请尝试其他关键词或在右上角设置中检查启用的点播源"
                className="!py-20"
              />
            )}
          </div>
        )}
      </main>

      {/* Netflix 风格页脚 */}
      <footer className="border-t border-zinc-900 bg-[#101010] py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-red-600 font-black tracking-wider text-base">LIBREFLIX</span>
            <span>· 自由观影平台</span>
            {version ? <span>v{version}</span> : null}
          </div>
          <p className="text-center sm:text-right">
            本站仅为视频检索工具，不存储任何视频文件。遵循 AGPL-3.0 协议。
          </p>
        </div>
      </footer>

      {/* 沉浸式影视详情与选集弹窗 */}
      <DetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}
