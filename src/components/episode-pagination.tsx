'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface EpisodePaginationProps {
  totalEpisodes: number;
  currentIndex?: number;
  reversed?: boolean;
  episodesPerPage?: number;
  onSelect: (index: number) => void;
  gridColsClassName?: string;
}

/**
 * 智能剧集分段分页组件（汲取 OrangeTV 优秀特性）：
 * 当总集数较多时，自动分段为 1-50, 51-100, 101-150 等分页 Tab，
 * 解决长剧/短剧数百集在移动端和弹窗中过度拉伸、卡顿的问题。
 */
export function EpisodePagination({
  totalEpisodes,
  currentIndex = 0,
  reversed = false,
  episodesPerPage = 50,
  onSelect,
  gridColsClassName,
}: EpisodePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalEpisodes / episodesPerPage));
  
  // 自动根据当前激活的集数定位到所在的分段
  const initialPage = Math.floor(Math.max(0, currentIndex) / episodesPerPage);
  const [activePage, setActivePage] = useState(initialPage);

  useEffect(() => {
    if (currentIndex >= 0) {
      const targetPage = Math.floor(currentIndex / episodesPerPage);
      if (targetPage >= 0 && targetPage < pageCount) {
        setActivePage(targetPage);
      }
    }
  }, [currentIndex, episodesPerPage, pageCount]);

  // 生成分段标签数据
  const pageRanges = useMemo(() => {
    return Array.from({ length: pageCount }, (_, i) => {
      const start = i * episodesPerPage + 1;
      const end = Math.min((i + 1) * episodesPerPage, totalEpisodes);
      return {
        page: i,
        label: start === end ? `第${start}集` : `${start}-${end}`,
      };
    });
  }, [pageCount, episodesPerPage, totalEpisodes]);

  // 当前分段包含的实际集数索引
  const currentEpisodes = useMemo(() => {
    const start = activePage * episodesPerPage;
    const end = Math.min((activePage + 1) * episodesPerPage, totalEpisodes);
    const indices: number[] = [];
    for (let i = start; i < end; i++) {
      indices.push(i);
    }
    return reversed ? [...indices].reverse() : indices;
  }, [activePage, episodesPerPage, totalEpisodes, reversed]);

  return (
    <div className="space-y-3">
      {/* 分段 Tab 切换条（仅在总集数超过一页时展示） */}
      {pageCount > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-zinc-800">
          {pageRanges.map((range) => {
            const isCurrentActive = activePage === range.page;
            return (
              <button
                key={range.page}
                type="button"
                onClick={() => setActivePage(range.page)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold shrink-0 transition-all cursor-pointer',
                  isCurrentActive
                    ? 'bg-[#E50914] text-white shadow-sm'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 剧集按钮网格 */}
      <div
        className={cn(
          gridColsClassName ||
            'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2'
        )}
      >
        {currentEpisodes.map((realIndex) => {
          const isActive = realIndex === currentIndex;
          return (
            <button
              key={realIndex}
              type="button"
              onClick={() => onSelect(realIndex)}
              title={`第 ${realIndex + 1} 集`}
              className={cn(
                'px-1.5 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-center whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-sm border flex items-center justify-center',
                isActive
                  ? 'bg-[#E50914] text-white border-red-600 font-bold shadow-md'
                  : 'bg-zinc-800/80 text-zinc-200 border-zinc-700/50 hover:bg-red-600 hover:text-white hover:border-red-500'
              )}
            >
              第 {realIndex + 1} 集
            </button>
          );
        })}
      </div>
    </div>
  );
}
