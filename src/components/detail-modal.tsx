'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import type { SearchResultItem, VideoDetail } from '@/lib/types';
import { buildImageUrl, buildWatchUrl } from '@/lib/utils';
import { useAppStore, resolveSource } from '@/lib/store';
import { useToast } from './toast';
import { addSearchHistory } from '@/lib/db';
import { ErrorState, LoadingState } from './states';
import { useFocusTrap } from './use-focus-trap';
import { EpisodePagination } from './episode-pagination';
/**
 * Netflix 风格沉浸式详情弹窗：
 * 经典暗黑大弹窗、巨幅剧照渐变横幅、快捷「▶ 立即播放」大按钮、分集瓷砖网格与排序
 */
export function DetailModal({ item, onClose }: { item: SearchResultItem | null; onClose: () => void }) {
  const store = useAppStore();
  const router = useRouter();
  const { toast } = useToast();
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reversed, setReversed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const poster = buildImageUrl(item?.pic, store.imageProxyMode, store.customImageProxy);

  useFocusTrap(Boolean(item), panelRef);

  useEffect(() => setPosterFailed(false), [poster]);

  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [item]);

  useEffect(() => {
    if (!item) {
      setDetail(null);
      setError('');
      return;
    }
    const source = resolveSource(store, item.sourceKey, {
      url: item.sourceUrl,
      name: item.sourceName,
    });
    if (!source) {
      setError('点播源配置不存在（可能已被删除），请在设置中重新添加');
      return;
    }
    setLoading(true);
    setError('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    api
      .detail(item.vodId, source, controller.signal)
      .then((d) => setDetail(d))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '获取剧集详情失败');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [item, store]);

  if (!item) return null;

  const episodes = detail ? (reversed ? [...detail.episodes].reverse() : detail.episodes) : [];
  const info = detail?.videoInfo;

  const play = (index: number) => {
    if (!detail || !detail.episodes[index]) return;
    addSearchHistory(item.name).catch(() => {});
    router.push(
      buildWatchUrl({
        sourceKey: item.sourceKey,
        vodId: item.vodId,
        index,
        title: item.name,
        sourceUrl: item.sourceUrl,
      })
    );
  };

  const copyLinks = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.episodes.join('\n'));
      toast('播放链接已复制', 'success');
    } catch {
      toast('复制失败，请检查浏览器权限', 'error');
    }
  };

  const metaRows = [
    info?.typeName && ['类型', info.typeName],
    info?.year && ['年份', info.year],
    info?.area && ['地区', info.area],
    info?.director && ['导演', info.director],
    info?.actor && ['主演', info.actor],
    info?.remarks && ['状态', info.remarks],
  ].filter(Boolean) as [string, string][];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-6 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-[#181818] border border-zinc-800 text-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-slide-up outline-none my-auto max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} 详情`}
      >
        {/* 顶部横幅区（带背景图与快捷播放） */}
        <div className="relative h-44 sm:h-64 bg-zinc-900 shrink-0 overflow-hidden">
          {poster && !posterFailed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover filter brightness-75 scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-black/30" />

          {/* 右上角关闭按钮 */}
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-20 cursor-pointer"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>

          {/* 横幅浮动标题与快速播放按钮 */}
          <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest bg-red-950/80 border border-red-800/40 px-2 py-0.5 rounded">
                {item.sourceName}
              </span>
              <h2 className="text-lg sm:text-3xl font-black text-white mt-0.5 sm:mt-1 drop-shadow-md truncate">
                {item.name}
              </h2>
            </div>

            {episodes.length > 0 && (
              <button
                onClick={() => play(0)}
                className="btn-netflix-play text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>播放第 1 集</span>
              </button>
            )}
          </div>
        </div>

        {/* 主体滚动区 */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          {loading && <LoadingState label="正在从采集站解析剧集与线路..." />}
          {!loading && error && <ErrorState message={error} />}

          {!loading && !error && detail && (
            <>
              {/* 演职员与元数据 */}
              <div className="space-y-3">
                {metaRows.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {metaRows.map(([k, v]) => (
                      <div key={k} className="truncate">
                        <span className="text-zinc-500 font-medium">{k}：</span>
                        <span className="text-zinc-300">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {info?.desc && (
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">
                    {info.desc}
                  </p>
                )}
              </div>

              {/* 选集区域 */}
              {episodes.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">选集播放</h3>
                      <span className="text-xs text-zinc-500">共 {episodes.length} 集</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
                        onClick={() => setReversed((v) => !v)}
                        title="正序/倒序排列"
                      >
                        {reversed ? '倒序' : '正序'}
                      </button>
                      <button
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
                        onClick={copyLinks}
                        title="复制全部播放链接"
                      >
                        复制链接
                      </button>
                    </div>
                  </div>

                  <EpisodePagination
                    totalEpisodes={episodes.length}
                    currentIndex={0}
                    reversed={reversed}
                    episodesPerPage={30}
                    onSelect={(index) => play(index)}
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  该源未解析到可用播放链接，可尝试更换其他来源
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
