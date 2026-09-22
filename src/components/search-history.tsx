'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addSearchHistory, clearSearchHistory, db, removeSearchHistory, restoreSearchHistory } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useToast } from './toast';
import { Icon } from './icon';

/** 下拉最多展示条数，与 db 层 MAX_SEARCH_HISTORY 保持一致 */
const HISTORY_LIMIT = 10;

/**
 * 「最近搜索」下拉的交互逻辑：聚焦展开、输入时按关键字过滤。
 */
export function useSearchHistory(input: string) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: ['searchHistory'],
    queryFn: () => db.searchHistory.orderBy('timestamp').reverse().limit(HISTORY_LIMIT).toArray(),
  });

  const matches = useMemo(() => {
    const all = history.data ?? [];
    const keyword = input.trim().toLowerCase();
    return keyword ? all.filter((h) => h.text.toLowerCase().includes(keyword)) : all;
  }, [history.data, input]);

  // 唯一命中项与输入内容完全一致时不展开
  const visible = open && matches.length > 0 && !(matches.length === 1 && matches[0].text === input.trim());

  // 点按下拉之外的位置收起
  useEffect(() => {
    if (!visible) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [visible]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const record = (text: string) => {
    addSearchHistory(text)
      .then(() => history.refetch())
      .catch(() => {});
  };

  const remove = (text: string) => {
    setActiveIndex(-1);
    removeSearchHistory(text).then(() => history.refetch());
  };

  const clearAll = async () => {
    const snapshot = history.data ?? [];
    if (snapshot.length === 0) return;
    close();
    await clearSearchHistory();
    await history.refetch();
    toast('已清空搜索记录', 'info', {
      action: {
        label: '撤销',
        onClick: () => {
          restoreSearchHistory(snapshot).then(() => history.refetch());
        },
      },
    });
  };

  const onFocus = () => {
    setOpen(true);
    history.refetch();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, onPick: (text: string) => void) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!visible) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onPick(matches[activeIndex].text);
    }
  };

  return {
    visible,
    matches,
    activeIndex,
    containerRef,
    close,
    record,
    remove,
    clearAll,
    onFocus,
    onKeyDown,
    resetActive: () => setActiveIndex(-1),
  };
}

/**
 * Netflix 风格最近搜索浮层：
 * 高质感深黑半透明面板、圆角全包边、优化防失焦误触、手机端完美对齐
 */
export function SearchHistoryDropdown({
  id,
  matches,
  activeIndex,
  onPick,
  onRemove,
  onClearAll,
}: {
  id: string;
  matches: { text: string }[];
  activeIndex: number;
  onPick: (text: string) => void;
  onRemove: (text: string) => void;
  onClearAll: () => void;
}) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden text-left rounded-xl border border-zinc-700/80 bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl animate-fade-in'
      )}
    >
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800">
        <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
          <Icon name="clock" className="w-3.5 h-3.5 text-zinc-400" />
          最近搜索
        </span>
        <button
          type="button"
          className="px-2 py-0.5 rounded text-xs text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
          onMouseDown={(e) => {
            e.preventDefault();
            onClearAll();
          }}
        >
          清空
        </button>
      </div>

      <ul
        id={id}
        role="listbox"
        aria-label="最近搜索"
        className="max-h-[min(60vh,320px)] overflow-y-auto no-scrollbar py-1"
      >
        {matches.map((h, i) => (
          <li
            key={h.text}
            id={`${id}-${i}`}
            role="option"
            aria-selected={i === activeIndex}
            className={cn(
              'flex items-center hover:bg-white/10 transition-colors group/item px-2 py-0.5',
              i === activeIndex && 'bg-white/10'
            )}
          >
            <button
              type="button"
              className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 text-left text-xs sm:text-sm text-zinc-200 group-hover/item:text-white truncate cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(h.text);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-zinc-500 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="truncate">{h.text}</span>
            </button>
            <button
              type="button"
              className="shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={`删除搜索记录 ${h.text}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(h.text);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
