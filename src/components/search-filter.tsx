'use client';

import { useMemo } from 'react';
import type { AggregatedGroup } from './video-card';
import { cn } from '@/lib/utils';

export interface SearchFilterState {
  type: string;
  year: string;
  multiOnly: boolean;
}

interface SearchFilterProps {
  groups: AggregatedGroup[];
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
}

const TYPE_OPTIONS = [
  { label: '全部类型', value: 'all' },
  { label: '电影', value: 'movie' },
  { label: '电视剧', value: 'tv' },
  { label: '动漫', value: 'anime' },
  { label: '综艺', value: 'variety' },
];

const YEAR_OPTIONS = [
  { label: '全部年份', value: 'all' },
  { label: '2025', value: '2025' },
  { label: '2024', value: '2024' },
  { label: '2023', value: '2023' },
  { label: '2022及更早', value: 'earlier' },
];

/**
 * 搜索结果多维过滤器（借鉴 OrangeTV SearchResultFilter）：
 * 支持按影视类型、年份和多线路来源秒级过滤聚合结果
 */
export function SearchFilter({ groups, filters, onChange }: SearchFilterProps) {
  // 统计各类型数量
  const counts = useMemo(() => {
    const res = { all: groups.length, multi: 0, movie: 0, tv: 0, anime: 0, variety: 0 };
    for (const g of groups) {
      if (g.items.length > 1) res.multi++;
      const t = g.typeName || '';
      if (t.includes('电影') || t.includes('动作') || t.includes('喜剧') || t.includes('科幻')) {
        res.movie++;
      } else if (t.includes('剧') || t.includes('国产') || t.includes('美剧') || t.includes('韩剧')) {
        res.tv++;
      } else if (t.includes('动画') || t.includes('动漫') || t.includes('番')) {
        res.anime++;
      } else if (t.includes('综艺')) {
        res.variety++;
      }
    }
    return res;
  }, [groups]);

  const hasActiveFilters = filters.type !== 'all' || filters.year !== 'all' || filters.multiOnly;

  return (
    <div className="mb-6 p-3 sm:p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3 select-none">
      {/* 类型过滤与年份过滤 */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
        {/* 类型标签胶囊 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-zinc-500 font-medium shrink-0 mr-1">类型:</span>
          {TYPE_OPTIONS.map((opt) => {
            const active = filters.type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, type: opt.value })}
                className={cn(
                  'px-2.5 py-1 rounded-full shrink-0 transition-colors font-medium cursor-pointer',
                  active
                    ? 'bg-[#E50914] text-white shadow-xs'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* 年份标签胶囊 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-zinc-500 font-medium shrink-0 mr-1">年份:</span>
          {YEAR_OPTIONS.map((opt) => {
            const active = filters.year === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...filters, year: opt.value })}
                className={cn(
                  'px-2.5 py-1 rounded-full shrink-0 transition-colors font-medium cursor-pointer',
                  active
                    ? 'bg-[#E50914] text-white shadow-xs'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* 仅看多源线路切换 */}
        <div className="flex items-center gap-3 ml-auto shrink-0 pt-1 sm:pt-0">
          <label className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              className="rounded accent-red-600 cursor-pointer"
              checked={filters.multiOnly}
              onChange={(e) => onChange({ ...filters, multiOnly: e.target.checked })}
            />
            <span>多线路聚合 ({counts.multi})</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange({ type: 'all', year: 'all', multiOnly: false })}
              className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 工具函数：应用筛选条件过滤结果
 */
export function filterAggregatedGroups(
  groups: AggregatedGroup[],
  filters: SearchFilterState
): AggregatedGroup[] {
  return groups.filter((g) => {
    // 1. 多线路过滤
    if (filters.multiOnly && g.items.length <= 1) {
      return false;
    }

    // 2. 类型过滤
    if (filters.type !== 'all') {
      const t = g.typeName || '';
      if (filters.type === 'movie' && !t.includes('电影') && !t.includes('动作') && !t.includes('喜剧') && !t.includes('科幻')) {
        return false;
      }
      if (filters.type === 'tv' && !t.includes('剧') && !t.includes('国产') && !t.includes('美剧') && !t.includes('韩剧')) {
        return false;
      }
      if (filters.type === 'anime' && !t.includes('动画') && !t.includes('动漫') && !t.includes('番')) {
        return false;
      }
      if (filters.type === 'variety' && !t.includes('综艺')) {
        return false;
      }
    }

    // 3. 年份过滤
    if (filters.year !== 'all') {
      const y = parseInt(g.year || '0', 10);
      if (filters.year === '2025' && y !== 2025) return false;
      if (filters.year === '2024' && y !== 2024) return false;
      if (filters.year === '2023' && y !== 2023) return false;
      if (filters.year === 'earlier' && (y <= 0 || y >= 2023)) return false;
    }

    return true;
  });
}
