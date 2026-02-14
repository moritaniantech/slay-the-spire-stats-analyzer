import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Run, useStore } from '../store';
import { format } from 'date-fns';
import { ChevronUpIcon, ChevronDownIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/20/solid';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
//import './RunList.css';
import { getAssetUrl } from '../utils/assetUtils';
import ImageAsset from './common/ImageAsset';
import Tab from './common/Tab';
import { normalizeCharacterName, getCharacterImagePath } from '../utils/characterUtils';

type SortKey = 'timestamp' | 'character' | 'ascension_level' | 'victory' | 'floor_reached' | 'playtime' | 'score' | 'name';
type SortOrder = 'asc' | 'desc';

interface SortIconProps {
  active: boolean;
  direction: SortOrder;
}

const SortIcon: React.FC<SortIconProps> = ({ active, direction }) => {
  return (
    <span className="inline-flex flex-col ml-2">
      <ChevronUpIcon className={`h-4 w-4 transition-colors ${active && direction === 'asc' ? 'text-primary' : 'text-base-content/20'}`} />
      <ChevronDownIcon className={`h-4 w-4 -mt-1 transition-colors ${active && direction === 'desc' ? 'text-primary' : 'text-base-content/20'}`} />
    </span>
  );
};

interface Filters {
  character?: string;
  ascensionLevel?: number;
  minScore?: number;
  result?: 'victory' | 'defeat';
}

// タブの設定
const classTabConfig = [
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    searchBgColor: 'bg-[#ff6563]/20',
    textColor: 'text-[#ff6563]',
    costFrame: getAssetUrl('cards/design/ironclad/ironclad.png')
  },
  {
    id: 'silent',
    name: 'SILENT',
    searchBgColor: 'bg-[#7fff00]/20',
    textColor: 'text-[#7fff00]',
    costFrame: getAssetUrl('cards/design/silent/silent.png')
  },
  {
    id: 'defect',
    name: 'DEFECT',
    searchBgColor: 'bg-[#87ceeb]/20',
    textColor: 'text-[#87ceeb]',
    costFrame: getAssetUrl('cards/design/defect/defect.png')
  },
  {
    id: 'watcher',
    name: 'WATCHER',
    searchBgColor: 'bg-[#a600ff]/20',
    textColor: 'text-[#a600ff]',
    costFrame: getAssetUrl('cards/design/watcher/watcher.png')
  },
  {
    id: 'all',
    name: 'ALL',
    searchBgColor: 'bg-base-200/50',
    textColor: 'text-base-content',
    costFrame: getAssetUrl('cards/design/colorless/colorless.png')
  }
] as const;

// キャラクタータイプの型定義
type CharacterType = 'ironclad' | 'silent' | 'defect' | 'watcher' | 'all';

// 数値を3桁ごとにカンマ区切りで表示する関数
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// プレイ時間をHH:mm:ss形式にフォーマットする関数
const formatPlaytime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 勝利状態を判定する関数
const determineVictoryStatus = (run: Run): { status: string; colorClass: string } => {
  if (run.victory) {
    // 57階に到達したかどうかを確認
    const pathPerFloor = run.run_data?.path_per_floor || [];
    const reached57Floor = Array.isArray(pathPerFloor) && pathPerFloor.length >= 57;
    
    if (reached57Floor) {
      return { status: '勝利', colorClass: 'bg-success text-success-content' };
    } else {
      return { status: '勝利？', colorClass: 'bg-warning text-warning-content' };
    }
  } else {
    return { status: '敗北', colorClass: 'bg-error text-error-content' };
  }
};

// メインコンポーネント
const RunList: React.FC = () => {
  const { runs } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();
  
  // 検索フィルター用の状態
  const [filters, setFilters] = useState<Filters>({});
  const [characterFilter, setCharacterFilter] = useState<string>('');
  const [ascensionFilter, setAscensionFilter] = useState<string>('');
  const [scoreFilter, setScoreFilter] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<string>('');

  // ソート処理
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // 同じキーで降順/昇順を切り替え
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいキーで降順に設定
      setSortKey(key);
      setSortOrder('desc');
    }
    // ページを先頭に戻す
    setCurrentPage(1);
  };

  // フィルターの適用
  const applyFilters = () => {
    const newFilters: Filters = {};
    
    if (characterFilter) {
      newFilters.character = characterFilter;
    }
    
    if (ascensionFilter) {
      const ascValue = parseInt(ascensionFilter);
      if (!isNaN(ascValue) && ascValue >= 0 && ascValue <= 20) {
        newFilters.ascensionLevel = ascValue;
      }
    }
    
    if (scoreFilter) {
      const scoreValue = parseInt(scoreFilter);
      if (!isNaN(scoreValue) && scoreValue >= 0) {
        newFilters.minScore = scoreValue;
      }
    }
    
    if (resultFilter) {
      newFilters.result = resultFilter as 'victory' | 'defeat';
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // フィルターのリセット
  const resetFilters = () => {
    setCharacterFilter('');
    setAscensionFilter('');
    setScoreFilter('');
    setResultFilter('');
    setFilters({});
    setCurrentPage(1);
  };

  // フィルタリングされたデータ
  const filteredRuns = useMemo(() => {
    return runs.filter(run => {
      // キャラクターフィルター
      if (filters.character && normalizeCharacterName(run.character) !== filters.character.toLowerCase()) {
        return false;
      }
      
      // アセンションレベルフィルター
      if (filters.ascensionLevel !== undefined && run.ascension_level !== filters.ascensionLevel) {
        return false;
      }
      
      // 最小スコアフィルター
      if (filters.minScore !== undefined && run.score < filters.minScore) {
        return false;
      }
      
      // 勝敗フィルター
      if (filters.result === 'victory' && !run.victory) {
        return false;
      }
      if (filters.result === 'defeat' && run.victory) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // ソート処理
      if (['timestamp', 'ascension_level', 'floor_reached', 'playtime', 'score'].includes(sortKey)) {
        // 数値によるソート
        return sortOrder === 'asc'
          ? a[sortKey as keyof Run] - b[sortKey as keyof Run]
          : b[sortKey as keyof Run] - a[sortKey as keyof Run];
      } else if (sortKey === 'character') {
        // 文字列によるソート
        return sortOrder === 'asc'
          ? a.character.localeCompare(b.character)
          : b.character.localeCompare(a.character);
      } else if (sortKey === 'victory') {
        // 真偽値によるソート
        return sortOrder === 'asc'
          ? (a.victory ? 1 : 0) - (b.victory ? 1 : 0)
          : (b.victory ? 1 : 0) - (a.victory ? 1 : 0);
      }
      
      // デフォルトは時間の降順
      return b.timestamp - a.timestamp;
    });
  }, [runs, filters, sortKey, sortOrder]);

  // ページネーション
  const totalPages = Math.ceil(filteredRuns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredRuns.slice(startIndex, startIndex + itemsPerPage);
  
  // 表示するページ番号の範囲
  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1920px]">
      <div className="card-navy">
        <div className="card-body p-4">
          {/* 検索フィルター */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* キャラクターフィルター */}
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-primary-custom font-jp">キャラクター</span>
              </label>
              <select 
                className="select input-navy w-full text-primary-custom"
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
              >
                <option value="">すべて</option>
                <option value="ironclad">Ironclad</option>
                <option value="silent">Silent</option>
                <option value="defect">Defect</option>
                <option value="watcher">Watcher</option>
              </select>
            </div>
            
            {/* アセンションフィルター */}
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-primary-custom font-jp">アセンション (0-20)</span>
              </label>
              <input
                type="number"
                min="0"
                max="20"
                placeholder="アセンション"
                className="input input-navy w-full text-primary-custom"
                value={ascensionFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 20)) {
                    setAscensionFilter(value);
                  }
                }}
              />
            </div>
            
            {/* スコアフィルター */}
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text text-primary-custom font-jp">最小スコア</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="スコア"
                className="input input-navy w-full text-primary-custom"
                value={scoreFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || parseInt(value) >= 0) {
                    setScoreFilter(value);
                  }
                }}
              />
            </div>
            
            {/* 検索ボタン */}
            <div className="form-control flex-none self-end">
              <div className="flex gap-2">
                <button 
                  className="btn btn-navy-primary font-jp"
                  onClick={applyFilters}
                >
                  検索
                </button>
                <button 
                  className="btn btn-navy-secondary font-jp"
                  onClick={resetFilters}
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
          
          {/* フィルター表示（適用中のフィルター） */}
          {Object.keys(filters).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {filters.character && (
                <div className="badge badge-outline gap-1">
                  キャラクター: {filters.character.charAt(0).toUpperCase() + filters.character.slice(1)}
                </div>
              )}
              {filters.ascensionLevel !== undefined && (
                <div className="badge badge-outline gap-1">
                  アセンション: {filters.ascensionLevel}
                </div>
              )}
              {filters.minScore !== undefined && (
                <div className="badge badge-outline gap-1">
                  最小スコア: {filters.minScore}
                </div>
              )}
              {filters.result && (
                <div className="badge badge-outline gap-1">
                  結果: {filters.result === 'victory' ? '勝利' : '敗北'}
                </div>
              )}
              <button 
                className="btn btn-xs btn-ghost"
                onClick={resetFilters}
              >
                すべてクリア
              </button>
            </div>
          )}
          
          {/* 結果件数表示 */}
          <div className="text-sm text-base-content/70 mb-4">
            {filteredRuns.length}件中 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRuns.length)}件を表示
          </div>

          {/* 結果表示 */}
          <div className="overflow-x-auto">
            <table className="table table-navy w-full">
              <thead>
                <tr className="text-base border-b border-navy">
                  <th onClick={() => handleSort('timestamp')} className="cursor-pointer bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <span>日時</span>
                      <SortIcon active={sortKey === 'timestamp'} direction={sortOrder} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('character')} className="cursor-pointer bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <span>キャラクター</span>
                      <SortIcon active={sortKey === 'character'} direction={sortOrder} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('ascension_level')} className="cursor-pointer text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <ImageAsset
                        path="ui/topPanel/ascension.png"
                        alt="Ascension"
                        className="w-5 h-5 mr-1.5"
                      />
                      <span>アセンション</span>
                      <SortIcon active={sortKey === 'ascension_level'} direction={sortOrder} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('victory')} className="cursor-pointer text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        <div className="absolute w-4 h-4">
                          <ImageAsset 
                            path="ui/topPanel/key_green.png" 
                            alt="Green Key" 
                            className="absolute w-4 h-4 left-0 top-[-1px] transform -rotate-0 origin-center"
                          />
                          <ImageAsset 
                            path="ui/topPanel/key_blue.png" 
                            alt="Blue Key" 
                            className="absolute w-4 h-4 right-[-1px] top-0 transform rotate-60 origin-center"
                          />
                          <ImageAsset 
                            path="ui/topPanel/key_red.png" 
                            alt="Red Key" 
                            className="absolute w-4 h-4 left-[-1px] top-0 transform -rotate-60 origin-center"
                          />
                        </div>
                      </div>
                      <span>結果</span>
                      <SortIcon active={sortKey === 'victory'} direction={sortOrder} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('floor_reached')} className="cursor-pointer text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <ImageAsset
                        path="ui/topPanel/floor.png"
                        alt="Floor"
                        className="w-5 h-5 mr-1.5"
                      />
                      <span>到達階層</span>
                      <SortIcon active={sortKey === 'floor_reached'} direction={sortOrder} />
                    </div>
                  </th>
                  <th className="text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <span>ネオーの祝福</span>
                    </div>
                  </th>
                  <th onClick={() => handleSort('playtime')} className="cursor-pointer text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <ImageAsset
                        path="ui/timerIcon.png"
                        alt="Timer"
                        className="w-5 h-5 mr-1.5"
                      />
                      <span>プレイ時間</span>
                      <SortIcon active={sortKey === 'playtime'} direction={sortOrder} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('score')} className="cursor-pointer text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <ImageAsset
                        path="ui/leaderboards/score.png"
                        alt="Score"
                        className="w-5 h-5 mr-1.5"
                      />
                      <span>スコア</span>
                      <SortIcon active={sortKey === 'score'} direction={sortOrder} />
                    </div>
                  </th>
                  <th className="text-center bg-navy-light text-primary-custom font-jp">
                    <div className="flex items-center justify-center">
                      <ImageAsset
                        path="ui/topPanel/peek_button.png"
                        alt="Details"
                        className="w-5 h-5 mr-1.5"
                      />
                      <span>詳細</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((run) => (
                  <tr 
                    key={run.id} 
                    className="hover:bg-navy-light transition-colors cursor-pointer text-primary-custom"
                    onClick={() => navigate(`/play-detail/${run.id}`)}
                  >
                    <td className="text-center">
                      {format(new Date(run.timestamp * 1000), 'yyyy/MM/dd HH:mm')}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
                          <ImageAsset
                            path={getCharacterImagePath(run.character)}
                            alt={run.character}
                            className="w-6 h-6 object-contain"
                            fallbackPath="ui/char/unknown.png"
                          />
                        </div>
                        <span className="capitalize">{normalizeCharacterName(run.character)}</span>
                      </div>
                    </td>
                    <td className="text-center">{run.ascension_level}</td>
                    <td className="text-center">
                      {(() => {
                        const victoryStatus = determineVictoryStatus(run);
                        return (
                          <div className={`badge ${victoryStatus.colorClass}`}>
                            {victoryStatus.status}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="text-center">{formatNumber(run.floor_reached)}</td>
                    <td className="text-center">{run.run_data?.neow_bonus || '-'}</td>
                    <td className="text-center">
                      {formatPlaytime(run.playtime)}
                    </td>
                    <td className="text-center">{formatNumber(run.score)}</td>
                    <td className="text-center">
                      <button 
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/play-detail/${run.id}`);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex gap-1">
                <button
                  className="btn btn-md px-3"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  «
                </button>
                <button
                  className="btn btn-md px-3"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  ‹
                </button>

                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                  <button
                    key={page}
                    className={`btn btn-md min-w-[2.5rem] ${currentPage === page ? 'btn-active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  className="btn btn-md px-3"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  ›
                </button>
                <button
                  className="btn btn-md px-3"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunList; 