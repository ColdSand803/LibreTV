'use client';

import { useEffect, useRef, useState } from 'react';
import { buildImageUrl } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export interface NetflixRowCardItem {
  id: string | number;
  title: string;
  cover: string;
  rate?: string;
  year?: string;
  remarks?: string;
  progressPercent?: number; // 针对「继续观看」历史记录
  episodeTitle?: string;
}

interface NetflixRowProps {
  title: string;
  items: NetflixRowCardItem[];
  onPick: (title: string) => void;
  subtitle?: string;
}

export function NetflixRow({ title, items, onPick, subtitle }: NetflixRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  if (!items || items.length === 0) return null;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 20);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
  };

  const slide = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const { clientWidth } = scrollRef.current;
    const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative group mb-6 sm:mb-8 select-none">
      {/* 行标题 */}
      <div className="px-4 sm:px-12 mb-2 flex items-baseline gap-2 sm:gap-3">
        <h2 className="text-base sm:text-xl font-bold text-white tracking-wide group-hover:text-red-500 transition-colors flex items-center gap-1.5 cursor-pointer">
          <span>{title}</span>
          <span className="text-red-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            ›
          </span>
        </h2>
        {subtitle && <span className="text-[11px] sm:text-xs text-zinc-400 font-normal truncate max-w-[50%]">{subtitle}</span>}
      </div>

      {/* 滑动轨道容器 */}
      <div className="relative">
        {/* 左滑箭头（仅平板与桌面端展示，手机端纯手势滑屏） */}
        {showLeftArrow && (
          <button
            type="button"
            onClick={() => slide('left')}
            className="hidden sm:flex absolute left-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/60 hover:bg-black/85 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
            aria-label="向前滑动"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* 卡片水平滚动列表 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth px-4 sm:px-12 py-2 sm:py-3"
        >
          {items.map((item) => (
            <NetflixCard key={item.id} item={item} onPick={onPick} />
          ))}
        </div>

        {/* 右滑箭头（仅平板与桌面端展示） */}
        {showRightArrow && (
          <button
            type="button"
            onClick={() => slide('right')}
            className="hidden sm:flex absolute right-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/60 hover:bg-black/85 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
            aria-label="向后滑动"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function NetflixCard({ item, onPick }: { item: NetflixRowCardItem; onPick: (title: string) => void }) {
  const imageProxyMode = useAppStore((s) => s.imageProxyMode);
  const customImageProxy = useAppStore((s) => s.customImageProxy);
  const [imgError, setImgError] = useState(false);
  const [tryProxy, setTryProxy] = useState(false);

  // 计算当前图片源地址：如果开启了代理或直连失败后自动降级到代理
  const currentCover = (() => {
    if (!item.cover) return '';
    if (tryProxy && !item.cover.startsWith('/api/proxy/')) {
      return `/api/proxy/${encodeURIComponent(item.cover)}`;
    }
    return buildImageUrl(item.cover, imageProxyMode, customImageProxy) || item.cover;
  })();

  useEffect(() => {
    setImgError(false);
    setTryProxy(false);
  }, [item.cover, imageProxyMode]);

  const handleError = () => {
    // 如果直连失败且尚未尝试内置代理，则自动降级到 /api/proxy 重试一次（解决豆瓣等图床防盗链）
    if (!tryProxy && !currentCover.startsWith('/api/proxy/')) {
      setTryProxy(true);
    } else {
      setImgError(true);
    }
  };

  return (
    <div
      onClick={() => onPick(item.title)}
      className="shrink-0 w-28 sm:w-44 md:w-48 cursor-pointer group/card relative rounded-md overflow-hidden bg-zinc-900 transition-all duration-300 hover:scale-105 hover:z-20 hover:shadow-[0_8px_25px_rgba(0,0,0,0.8)]"
    >
      {/* 海报图 */}
      <div className="relative aspect-[2/3] w-full bg-zinc-800 overflow-hidden">
        {currentCover && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentCover}
            src={currentCover}
            alt={item.title}
            onError={handleError}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px] sm:text-xs text-zinc-500 bg-zinc-800">
            {item.title}
          </div>
        )}

        {/* 悬停光晕遮罩与居中播放按钮 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg transform scale-75 group-hover/card:scale-100 transition-transform">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-6 sm:h-6 ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 顶部或底部角标 */}
        {item.rate && item.rate !== '0.0' && (
          <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-black/75 backdrop-blur-xs text-amber-400 text-[10px] sm:text-[11px] font-bold px-1 sm:px-1.5 py-0.2 rounded shadow">
            ★ {item.rate}
          </div>
        )}

        {item.remarks && (
          <div className="absolute bottom-1 left-1 right-1 sm:bottom-1.5 sm:left-1.5 sm:right-1.5 truncate text-[9px] sm:text-[10px] text-zinc-300 bg-black/60 backdrop-blur-xs px-1 sm:px-1.5 py-0.2 rounded">
            {item.remarks}
          </div>
        )}

        {/* 针对观看历史的进度条 */}
        {typeof item.progressPercent === 'number' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
            <div
              className="h-full bg-red-600"
              style={{ width: `${Math.min(100, Math.max(0, item.progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {/* 底部片名 */}
      <div className="p-1.5 sm:p-2 bg-[#181818]">
        <h3 className="text-xs sm:text-sm font-medium text-zinc-200 truncate group-hover/card:text-white" title={item.title}>
          {item.title}
        </h3>
        {item.episodeTitle && (
          <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">{item.episodeTitle}</p>
        )}
      </div>
    </div>
  );
}
