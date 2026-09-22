'use client';

import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/client-api';
import { db } from '@/lib/db';
import { NetflixHero } from './netflix-hero';
import { NetflixRow, type NetflixRowCardItem } from './netflix-row';
import type { DoubanItem } from '@/lib/types';

interface NetflixHomeProps {
  onPick: (title: string) => void;
}

export function NetflixHome({ onPick }: NetflixHomeProps) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat') || '';

  // 1. 最近观看历史记录
  const historyEntries = useLiveQuery(
    () => db.history.orderBy('timestamp').reverse().limit(12).toArray(),
    []
  );

  // 2. 热门电影
  const movieTrendingQuery = useQuery({
    queryKey: ['douban', 'movie', '热门'],
    queryFn: ({ signal }) => api.douban('movie', '热门', 0, 20, signal),
  });

  // 3. 热门剧集
  const tvTrendingQuery = useQuery({
    queryKey: ['douban', 'tv', '热门'],
    queryFn: ({ signal }) => api.douban('tv', '热门', 0, 20, signal),
  });

  // 4. 豆瓣高分
  const topRatedQuery = useQuery({
    queryKey: ['douban', 'movie', '豆瓣高分'],
    queryFn: ({ signal }) => api.douban('movie', '豆瓣高分', 0, 20, signal),
  });

  // 5. 科幻 / 悬疑
  const scifiQuery = useQuery({
    queryKey: ['douban', 'movie', '科幻'],
    queryFn: ({ signal }) => api.douban('movie', '科幻', 0, 20, signal),
  });

  // 6. 美剧
  const usTvQuery = useQuery({
    queryKey: ['douban', 'tv', '美剧'],
    queryFn: ({ signal }) => api.douban('tv', '美剧', 0, 20, signal),
  });

  // 7. 新番动漫
  const animeQuery = useQuery({
    queryKey: ['bangumi', 'calendar'],
    queryFn: ({ signal }) => api.bangumiCalendar(signal),
  });

  // 转换豆瓣数据为 Netflix 卡片格式
  const mapDoubanItems = (items?: DoubanItem[]): NetflixRowCardItem[] => {
    if (!items) return [];
    return items.map((i) => ({
      id: i.id || i.title,
      title: i.title,
      cover: i.cover,
      rate: i.rating,
    }));
  };

  // 转换历史数据为 Netflix 卡片格式
  const historyItems: NetflixRowCardItem[] = (historyEntries || []).map((h) => {
    const progress = h.duration > 0 ? (h.playbackPosition / h.duration) * 100 : 0;
    return {
      id: h.id,
      title: h.title,
      cover: h.pic || '',
      progressPercent: progress,
      episodeTitle: `第 ${h.episodeIndex + 1} 集`,
    };
  });

  // 动漫新番聚合
  const animeItems: NetflixRowCardItem[] = (animeQuery.data?.days || [])
    .flatMap((d) => d.items)
    .slice(0, 20)
    .map((a) => ({
      id: a.id || a.title,
      title: a.title,
      cover: a.cover,
      rate: a.rating,
    }));

  const heroCandidates = [
    ...(movieTrendingQuery.data?.items || []),
    ...(tvTrendingQuery.data?.items || []),
  ].filter((item) => Boolean(item.cover));

  return (
    <div className="w-full pb-20">
      {/* 首屏巨幅海报 (Hero Billboard) */}
      {!cat && heroCandidates.length > 0 && (
        <NetflixHero
          items={heroCandidates.slice(0, 8)}
          onPlay={(title) => onPick(title)}
          onMoreInfo={(item) => onPick(item.title)}
        />
      )}

      {/* 内容行列表 (Rails) */}
      <div className={!cat ? '-mt-4 sm:-mt-20 relative z-30' : 'pt-24 sm:pt-20'}>
        {/* 继续观看 (若有观看历史则置顶展示) */}
        {(!cat || cat === 'all') && historyItems.length > 0 && (
          <NetflixRow
            title="继续观看"
            subtitle="从上次暂停的地方接着看"
            items={historyItems}
            onPick={onPick}
          />
        )}

        {/* 电影分类视图 / 默认视图 */}
        {(!cat || cat === 'movie') && (
          <>
            <NetflixRow
              title="今日热映电影"
              subtitle="全网热度最高的爆款院线电影"
              items={mapDoubanItems(movieTrendingQuery.data?.items)}
              onPick={onPick}
            />

            <NetflixRow
              title="豆瓣高分电影神作"
              subtitle="口碑爆棚的殿堂级佳作"
              items={mapDoubanItems(topRatedQuery.data?.items)}
              onPick={onPick}
            />

            <NetflixRow
              title="硬核科幻 & 视觉盛宴"
              items={mapDoubanItems(scifiQuery.data?.items)}
              onPick={onPick}
            />
          </>
        )}

        {/* 电视剧分类视图 / 默认视图 */}
        {(!cat || cat === 'tv') && (
          <>
            <NetflixRow
              title="热播连续剧集"
              subtitle="正在热播的国产剧与亚洲剧集"
              items={mapDoubanItems(tvTrendingQuery.data?.items)}
              onPick={onPick}
            />

            <NetflixRow
              title="精选欧美热剧"
              subtitle="高水准美剧与英剧推荐"
              items={mapDoubanItems(usTvQuery.data?.items)}
              onPick={onPick}
            />
          </>
        )}

        {/* 动漫分类视图 / 默认视图 */}
        {(!cat || cat === 'anime') && animeItems.length > 0 && (
          <NetflixRow
            title="当季新番放送"
            subtitle="Bangumi 日本动画每日更新日历"
            items={animeItems}
            onPick={onPick}
          />
        )}
      </div>
    </div>
  );
}
