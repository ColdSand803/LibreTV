'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SourceManagerDrawer } from './source-manager';
import { HistoryPanel } from './history-panel';
import { Icon } from './icon';
import { SearchHistoryDropdown, useSearchHistory } from './search-history';
import { cn } from '@/lib/utils';

export function Header(props: { showSearch?: boolean }) {
  return (
    <Suspense fallback={<header className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-[#141414] z-40" />}>
      <HeaderContent {...props} />
    </Suspense>
  );
}

function HeaderContent({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('cat') || '';
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const searchHistory = useSearchHistory(query);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const submitSearch = (text: string) => {
    const q = text.trim().slice(0, 100);
    if (!q) return;
    searchHistory.close();
    setSearchExpanded(false);
    router.push(`/?s=${encodeURIComponent(q)}`, { scroll: false });
    searchHistory.record(q);
  };

  const pickHistory = (text: string) => {
    setQuery(text);
    submitSearch(text);
  };

  const handleSearchToggle = () => {
    if (!searchExpanded) {
      setSearchExpanded(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-in-out',
          isScrolled
            ? 'bg-[#141414]/95 backdrop-blur-md shadow-2xl border-b border-white/5'
            : 'bg-gradient-to-b from-black/85 via-black/40 to-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Netflix 红色品牌 Logo */}
          {!searchExpanded ? (
            <Link
              href="/"
              aria-label="LibreFlix 首页"
              className="flex items-center gap-2 shrink-0 group focus:outline-none"
            >
              <span className="text-[#E50914] font-black text-xl sm:text-3xl tracking-tighter uppercase font-sans select-none drop-shadow-[0_2px_10px_rgba(229,9,20,0.5)] group-hover:scale-105 transition-transform">
                LIBREFLIX
              </span>
            </Link>
          ) : (
            <div className="sm:hidden flex items-center">
              <button
                type="button"
                onClick={() => setSearchExpanded(false)}
                className="text-zinc-400 hover:text-white text-xs px-2.5 py-1 rounded bg-zinc-800"
              >
                ‹ 返回
              </button>
            </div>
          )}

          {/* 导航菜单项 (平板与桌面端) */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <NavLink href="/" active={pathname === '/' && !activeCategory}>
              首页
            </NavLink>
            <NavLink href="/?cat=tv" active={activeCategory === 'tv'}>
              剧集
            </NavLink>
            <NavLink href="/?cat=movie" active={activeCategory === 'movie'}>
              电影
            </NavLink>
            <NavLink href="/?cat=anime" active={activeCategory === 'anime'}>
              新番动漫
            </NavLink>
            <NavLink href="/live" active={pathname === '/live'}>
              电视直播
            </NavLink>
            <NavLink href="/about" active={pathname === '/about'}>
              关于
            </NavLink>
          </nav>

          <div className="flex-1" />

          {/* 右侧工具组：Netflix 展开式搜索框、观看历史、头像设置 */}
          <div className={cn('flex items-center gap-2 sm:gap-3', searchExpanded && 'flex-1 sm:flex-initial')}>
            {showSearch && (
              <div
                ref={searchHistory.containerRef}
                className={cn(
                  'relative flex items-center transition-all duration-300',
                  searchExpanded
                    ? 'flex-1 sm:w-64 bg-black/90 border border-white/40 rounded-full px-3 py-1'
                    : 'w-8 h-8 sm:w-9 sm:h-9 justify-center'
                )}
              >
                <button
                  type="button"
                  onClick={handleSearchToggle}
                  className="text-zinc-300 hover:text-white transition-colors focus:outline-none shrink-0"
                  aria-label="搜索"
                  title="搜索影视"
                >
                  <Icon name="search" className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <input
                  ref={searchInputRef}
                  className={cn(
                    'bg-transparent text-white text-xs sm:text-sm focus:outline-none ml-2 transition-all',
                    searchExpanded ? 'w-full opacity-100' : 'w-0 opacity-0 pointer-events-none'
                  )}
                  placeholder="搜索片名、演员..."
                  value={query}
                  maxLength={100}
                  onBlur={() => {
                    if (!query.trim()) setSearchExpanded(false);
                  }}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    searchHistory.resetActive();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitSearch(query);
                    }
                    searchHistory.onKeyDown(e, pickHistory);
                  }}
                  onFocus={searchHistory.onFocus}
                />

                {searchExpanded && query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="text-zinc-400 hover:text-white text-xs px-1"
                    title="清空"
                  >
                    ✕
                  </button>
                )}

                {/* 搜索历史下拉 */}
                {searchHistory.visible && searchExpanded && (
                  <div className="absolute top-11 right-0 w-72 max-w-[90vw]">
                    <SearchHistoryDropdown
                      id="header-search-history"
                      matches={searchHistory.matches}
                      activeIndex={searchHistory.activeIndex}
                      onPick={pickHistory}
                      onRemove={searchHistory.remove}
                      onClearAll={searchHistory.clearAll}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 观看历史按钮 */}
            {!searchExpanded && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="p-1.5 sm:p-2 text-zinc-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                title="观看历史"
                aria-label="观看历史"
              >
                <Icon name="clock" className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Netflix 经典头像 */}
            {!searchExpanded && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 sm:gap-2 group focus:outline-none shrink-0"
                title="账户设置与采集源管理"
                aria-label="设置与采集源管理"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-gradient-to-tr from-[#E50914] to-red-400 flex items-center justify-center text-white font-bold text-xs shadow-md border border-white/20 group-hover:ring-2 group-hover:ring-white transition-all overflow-hidden">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white translate-y-0.5">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* 移动端专属横向分类胶囊条（对齐 Netflix 移动端 App 体验） */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-1.5 border-t border-white/5 bg-[#141414]/90 backdrop-blur-md">
          <MobileCategoryLink href="/" active={pathname === '/' && !activeCategory}>
            全部
          </MobileCategoryLink>
          <MobileCategoryLink href="/?cat=tv" active={activeCategory === 'tv'}>
            剧集
          </MobileCategoryLink>
          <MobileCategoryLink href="/?cat=movie" active={activeCategory === 'movie'}>
            电影
          </MobileCategoryLink>
          <MobileCategoryLink href="/?cat=anime" active={activeCategory === 'anime'}>
            动漫
          </MobileCategoryLink>
          <MobileCategoryLink href="/live" active={pathname === '/live'}>
            直播
          </MobileCategoryLink>
          <MobileCategoryLink href="/about" active={pathname === '/about'}>
            关于
          </MobileCategoryLink>
        </div>
      </header>

      <SourceManagerDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'transition-colors duration-200',
        active ? 'text-white font-bold' : 'text-zinc-300 hover:text-zinc-100 font-normal'
      )}
    >
      {children}
    </Link>
  );
}

function MobileCategoryLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1 rounded-full text-xs shrink-0 transition-all font-medium border',
        active
          ? 'bg-white text-black font-bold border-white shadow-sm'
          : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
      )}
    >
      {children}
    </Link>
  );
}
