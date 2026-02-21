import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Run, useStore } from '../store';
import ImageAsset from './common/ImageAsset';
import { WinRateChart } from './charts/WinRateChart';
import { normalizeCharacterName, getCharacterImagePath } from '../utils/characterUtils';
import { motion, useReducedMotion } from 'framer-motion';

// キャラクターごとの色クラスを取得する関数
const getCharacterColorClass = (character: string): string => {
  switch (normalizeCharacterName(character)) {
    case 'ironclad':
      return 'text-red-500';
    case 'silent':
      return 'text-green-500';
    case 'defect':
      return 'text-blue-500';
    case 'watcher':
      return 'text-purple-500';
    default:
      return '';
  }
};

// 数値を3桁ごとにカンマ区切りで表示する関数
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// 統計情報のメインコンポーネント
export const StatsOverview: React.FC = () => {
  const { t } = useTranslation();
  const { runs } = useStore();
  const shouldReduceMotion = useReducedMotion();

  // 統計データの計算（useMemoで導出）
  const stats = useMemo(() => {
    const defaultStats = {
      totalRuns: 0,
      victories: 0,
      winRate: 0,
      totalPlaytime: 0,
      averagePlaytime: 0,
      averageScore: 0,
      highestScore: 0,
      averageFloor: 0,
      highestFloor: 0,
      characterStats: [] as {
        character: string;
        playCount: number;
        victories: number;
        winRate: number;
        highestScore: number;
        highestFloor: number;
      }[]
    };

    if (!runs || runs.length === 0) return defaultStats;

    const totalRuns = runs.length;

    // 「勝利」のみをカウントする（57階到達した場合のみ）
    const victories = runs.filter(run => {
      if (!run.victory) return false;

      // 57階に到達したかどうかを確認
      const pathPerFloor = run.run_data?.path_per_floor || [];
      const reached57Floor = Array.isArray(pathPerFloor) && pathPerFloor.length >= 57;

      return reached57Floor; // 57階に到達した勝利のみカウント
    }).length;

    const winRate = totalRuns > 0 ? (victories / totalRuns) * 100 : 0;
    const totalPlaytime = runs.reduce((sum, run) => sum + run.playtime, 0);
    const averagePlaytime = totalRuns > 0 ? totalPlaytime / totalRuns : 0;
    const averageScore = totalRuns > 0 ? runs.reduce((sum, run) => sum + run.score, 0) / totalRuns : 0;
    const highestScore = runs.reduce((max, run) => Math.max(max, run.score), 0);
    const averageFloor = totalRuns > 0 ? runs.reduce((sum, run) => sum + run.floor_reached, 0) / totalRuns : 0;
    const highestFloor = runs.reduce((max, run) => Math.max(max, run.floor_reached), 0);

    // キャラクターごとの統計
    const characterGroups = runs.reduce((acc, run) => {
      const char = normalizeCharacterName(run.character).toUpperCase();
      if (!acc[char]) {
        acc[char] = [];
      }
      acc[char].push(run);
      return acc;
    }, {} as { [key: string]: Run[] });

    const characterStats = Object.entries(characterGroups).map(([character, charRuns]) => {
      const playCount = charRuns.length;

      // キャラクターごとの勝利数も同様に57階到達した場合のみカウント
      const charVictories = charRuns.filter(run => {
        if (!run.victory) return false;

        // 57階に到達したかどうかを確認
        const pathPerFloor = run.run_data?.path_per_floor || [];
        const reached57Floor = Array.isArray(pathPerFloor) && pathPerFloor.length >= 57;

        return reached57Floor; // 57階に到達した勝利のみカウント
      }).length;

      const charWinRate = playCount > 0 ? (charVictories / playCount) * 100 : 0;
      const charHighestScore = charRuns.reduce((max, run) => Math.max(max, run.score), 0);
      const charHighestFloor = charRuns.reduce((max, run) => Math.max(max, run.floor_reached), 0);

      return {
        character,
        playCount,
        victories: charVictories,
        winRate: charWinRate,
        highestScore: charHighestScore,
        highestFloor: charHighestFloor
      };
    }).sort((a, b) => b.playCount - a.playCount); // プレイ回数でソート

    return {
      totalRuns,
      victories,
      winRate,
      totalPlaytime,
      averagePlaytime,
      averageScore,
      highestScore,
      averageFloor,
      highestFloor,
      characterStats
    };
  }, [runs]);

  // プレイ時間のフォーマット（秒から時間:分に変換）
  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // スタガードアニメーション用props
  const motionContainerProps = shouldReduceMotion
    ? {}
    : {
        variants: {
          hidden: {},
          visible: { transition: { staggerChildren: 0.05 } },
        },
        initial: 'hidden' as const,
        animate: 'visible' as const,
      };

  const motionCardProps = shouldReduceMotion
    ? {}
    : {
        variants: {
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
        },
      };

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1920px]">
      <h2 className="text-2xl font-bold mb-6 text-gold-light">{t('統計情報')}</h2>

      {/* 概要統計 */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8"
        {...motionContainerProps}
      >
        {/* 総プレイ回数 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current icon-glow">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
              </svg>
            </div>
            <div className="stat-title">{t('総プレイ回数')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{formatNumber(stats.totalRuns)}</div>
        </motion.div>

        {/* 勝利数 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current icon-glow">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="stat-title">{t('勝利数')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{formatNumber(stats.victories)}</div>
        </motion.div>

        {/* 勝率 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current icon-glow">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="stat-title">{t('勝率')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{stats.winRate.toFixed(1)}%</div>
        </motion.div>

        {/* 総プレイ時間 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <ImageAsset
                path="ui/timerIcon.png"
                alt="Timer"
                className="w-8 h-8 icon-glow"
              />
            </div>
            <div className="stat-title">{t('総プレイ時間')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{formatPlaytime(stats.totalPlaytime)}</div>
        </motion.div>

        {/* 平均プレイ時間 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <ImageAsset
                path="ui/timerIcon.png"
                alt="Timer"
                className="w-8 h-8 icon-glow"
              />
            </div>
            <div className="stat-title">{t('平均プレイ時間')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{formatPlaytime(stats.averagePlaytime)}</div>
        </motion.div>

        {/* 平均スコア */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <ImageAsset
                path="ui/leaderboards/score.png"
                alt="Score"
                className="w-8 h-8 icon-glow"
              />
            </div>
            <div className="stat-title">{t('平均スコア')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{formatNumber(Math.round(stats.averageScore))}</div>
        </motion.div>

        {/* 最高スコア */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <ImageAsset
                path="ui/leaderboards/score.png"
                alt="Score"
                className="w-8 h-8 icon-glow"
              />
            </div>
            <div className="stat-title">{t('最高スコア')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{formatNumber(stats.highestScore)}</div>
        </motion.div>

        {/* 平均到達階層 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <ImageAsset
                path="ui/topPanel/floor.png"
                alt="Floor"
                className="w-8 h-8 icon-glow"
              />
            </div>
            <div className="stat-title">{t('平均到達階層')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{Math.round(stats.averageFloor)}</div>
        </motion.div>

        {/* 最高到達階層 */}
        <motion.div className="stat-sts" {...motionCardProps}>
          <div className="flex items-center gap-2 mb-2">
            <div className="stat-figure text-secondary">
              <ImageAsset
                path="ui/topPanel/floor.png"
                alt="Floor"
                className="w-8 h-8 icon-glow"
              />
            </div>
            <div className="stat-title">{t('最高到達階層')}</div>
          </div>
          <div className="stat-value text-2xl font-bold text-gold-light">{stats.highestFloor}</div>
        </motion.div>
      </motion.div>

      {/* キャラクター別勝率グラフ */}
      {stats.characterStats.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4 text-gold-light">{t('キャラクター別勝率')}</h3>
          <WinRateChart characterStats={stats.characterStats} />
        </div>
      )}

      {/* キャラクター別統計テーブル */}
      {stats.characterStats.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4 text-gold-light">{t('キャラクター別統計')}</h3>
          <div className="overflow-x-auto">
            <table className="table table-navy w-full text-sm">
              <thead>
                <tr className="text-base">
                  <th>{t('キャラクター')}</th>
                  <th className="text-center">{t('プレイ回数')}</th>
                  <th className="text-center">{t('勝利数')}</th>
                  <th className="text-center">{t('勝率')}</th>
                  <th className="text-center">{t('最高スコア')}</th>
                  <th className="text-center">{t('最高到達階層')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.characterStats.map((charStat) => (
                  <tr key={charStat.character}>
                    <td>
                      <div className="flex items-center space-x-3">
                        <div className="avatar">
                          <div className="mask mask-squircle w-10 h-10 bg-base-300">
                            <ImageAsset
                              path={getCharacterImagePath(charStat.character)}
                            alt={charStat.character}
                              className="w-10 h-10 object-contain"
                              fallbackPath="ui/char/unknown.png"
                          />
                          </div>
                        </div>
                        <div>
                          <div className={`font-bold ${getCharacterColorClass(charStat.character)}`}>
                            {t(normalizeCharacterName(charStat.character))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">{formatNumber(charStat.playCount)}</td>
                    <td className="text-center">{formatNumber(charStat.victories)}</td>
                    <td className="text-center">{charStat.winRate.toFixed(1)}%</td>
                    <td className="text-center">{formatNumber(charStat.highestScore)}</td>
                    <td className="text-center">{formatNumber(charStat.highestFloor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsOverview;
