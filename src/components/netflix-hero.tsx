'use client';

import { useState } from 'react';
import type { DoubanItem } from '@/lib/types';

interface NetflixHeroProps {
  items: DoubanItem[];
  onPlay: (title: string) => void;
  onMoreInfo?: (item: DoubanItem) => void;
}

export function NetflixHero({ items, onPlay, onMoreInfo }: NetflixHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!items || items.length === 0) {
    return (
      <div className="relative w-full h-[55vh] sm:h-[70vh] bg-gradient-to-b from-zinc-900 to-[#141414] flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 text-sm">正在加载精彩影视...</div>
      </div>
    );
  }

  const current = items[currentIndex % items.length];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div className="relative w-full h-[65vh] sm:h-[78vh] lg:h-[85vh] overflow-hidden select-none">
      {/* 巨幅背景海报 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={current.id || current.title}
        src={current.cover}
        alt={current.title}
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-90 transform scale-105 transition-all duration-1000 ease-out"
        referrerPolicy="no-referrer"
      />

      {/* Netflix 经典三重渐变遮罩：左侧文字黑雾、底部无缝融入、顶部暗影 */}
      <div className="absolute inset-0 netflix-vignette" />
      <div className="absolute inset-0 netflix-bottom-fade" />
      <div className="absolute inset-0 netflix-top-fade pointer-events-none" />

      {/* 巨幅文字信息区 */}
      <div className="absolute bottom-16 sm:bottom-24 left-4 sm:left-12 lg:left-16 max-w-2xl z-20 space-y-4">
        {/* Netflix 原创标识 */}
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="w-5 h-5 bg-[#E50914] text-white font-black text-xs flex items-center justify-center rounded-sm tracking-tighter">
            N
          </span>
          <span className="text-zinc-300 font-bold tracking-widest text-xs uppercase">
            LIBREFLIX 热门推荐
          </span>
        </div>

        {/* 电影标题（大号粗体） */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] line-clamp-2">
          {current.title}
        </h1>

        {/* 元数据标签：评分、4K、高分榜单 */}
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
          {current.rating && current.rating !== '0.0' && (
            <span className="text-green-400 font-bold flex items-center gap-1">
              ★ 豆瓣 {current.rating} 分
            </span>
          )}
          <span className="border border-white/40 text-zinc-300 px-1.5 py-0.5 rounded text-xs font-mono">
            4K 超高清
          </span>
          <span className="bg-red-600/80 text-white px-2 py-0.5 rounded text-xs">
            TOP 10 必看
          </span>
          <span className="text-zinc-300">
            全网多源秒播
          </span>
        </div>

        {/* 影视简述 */}
        <p className="text-zinc-300 text-sm sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          自由探索《{current.title}》，聚合数十个高清资源线路。无缝全屏播放，支持多清晰度切源与智能断点续播。
        </p>

        {/* 经典 Netflix 操作大按钮 */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => onPlay(current.title)}
            className="btn-netflix-play text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3 cursor-pointer"
            aria-label="立即播放"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>立即播放</span>
          </button>

          {onMoreInfo && (
            <button
              onClick={() => onMoreInfo(current)}
              className="btn-netflix-info text-sm sm:text-base px-5 sm:px-7 py-2.5 sm:py-3 cursor-pointer"
              aria-label="更多信息"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>更多信息</span>
            </button>
          )}
        </div>
      </div>

      {/* 右下角：换一部轮播按钮 + 分级标识 */}
      <div className="absolute bottom-16 sm:bottom-24 right-4 sm:right-12 z-20 flex items-center gap-3">
        <button
          onClick={handleNext}
          title="换一部推荐"
          className="w-10 h-10 rounded-full border border-white/40 bg-black/40 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-xs transition-transform active:rotate-180 duration-500 cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <div className="bg-zinc-800/80 border-l-2 border-zinc-200 text-zinc-300 text-xs px-3 py-1 font-semibold backdrop-blur-xs">
          16+
        </div>
      </div>
    </div>
  );
}
