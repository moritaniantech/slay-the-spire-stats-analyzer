import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Run, useStore } from '../store';
import { format } from 'date-fns';
import { ChevronUpIcon, ChevronDownIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/react/20/solid';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '@heroicons/react/20/solid';

// キャラクター画像のインポート
import ironclad from '../assets/images/characters/ironclad.png';
import silent from '../assets/images/characters/silent.png';
import defect from '../assets/images/characters/defect.png';
import watcher from '../assets/images/characters/watcher.png';

const characterImages: { [key: string]: string } = {
  IRONCLAD: ironclad,
  SILENT: silent,
  DEFECT: defect,
  WATCHER: watcher,
};

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
  result?: 'victory' | 'victory_suspicious' | 'defeat';
  minAscension?: number;
  maxAscension?: number;
  minScore?: number;
  maxScore?: number;
}

export const RunList: React.FC = () => {
  useTranslation();
  const { runs, setRuns } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const savedSortKey = localStorage.getItem('runListSortKey');
    return savedSortKey ? (savedSortKey as SortKey) : 'timestamp';
  });
  
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const savedSortOrder = localStorage.getItem('runListSortOrder');
    return savedSortOrder ? (savedSortOrder as SortOrder) : 'desc';
  });
  
  const [filters, setFilters] = useState<Filters>(() => {
    const savedFilters = localStorage.getItem('runListFilters');
    return savedFilters ? JSON.parse(savedFilters) : {};
  });

  // フィルターと並び順の変更を保存
  useEffect(() => {
    localStorage.setItem('runListSortKey', sortKey);
    localStorage.setItem('runListSortOrder', sortOrder);
    localStorage.setItem('runListFilters', JSON.stringify(filters));
  }, [sortKey, sortOrder, filters]);

  const removeDuplicates = async () => {
    if (!window.electronAPI) return;
    
    // キーごとに最新のrunを保持するMap
    const latestRuns = new Map();
    
    // 各runについて、同じキーを持つものの中で最新のものを保持
    runs.forEach(run => {
      const key = `${run.character}_${run.ascension_level}_${run.victory}_${run.floor_reached}_${run.playtime}_${run.score}`;
      if (!latestRuns.has(key) || latestRuns.get(key).timestamp < run.timestamp) {
        latestRuns.set(key, run);
      }
    });

    // 削除対象のrunを特定（最新以外のすべての重複）
    const duplicates = runs.filter(run => {
      const key = `${run.character}_${run.ascension_level}_${run.victory}_${run.floor_reached}_${run.playtime}_${run.score}`;
      return latestRuns.get(key).id !== run.id;
    });

    // 重複が存在する場合のみ処理を実行
    if (duplicates.length > 0) {
      try {
        // 重複を1つずつ削除
        for (const run of duplicates) {
          await window.electronAPI.deleteRun(run);
        }
        // 削除後にデータを再取得
        const updatedRuns = await window.electronAPI.getAllRuns() as Run[];
        setRuns(updatedRuns);
      } catch (error) {
        console.error('Error handling duplicates:', error);
      }
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const resetSort = () => {
    setSortKey('timestamp');
    setSortOrder('desc');
  };

  const resetFilters = () => {
    setFilters({});
  };

  const resetAll = () => {
    resetSort();
    resetFilters();
  };

  const applyFilters = (run: any) => {
    if (filters.character && run.character !== filters.character) return false;
    if (filters.result !== undefined) {
      if (filters.result === 'victory' && (!run.victory || run.floor_reached < 57)) return false;
      if (filters.result === 'victory_suspicious' && (!run.victory || run.floor_reached >= 57)) return false;
      if (filters.result === 'defeat' && run.victory) return false;
    }
    if (filters.minAscension !== undefined && run.ascension_level < filters.minAscension) return false;
    if (filters.maxAscension !== undefined && run.ascension_level > filters.maxAscension) return false;
    if (filters.minScore !== undefined && run.score < filters.minScore) return false;
    if (filters.maxScore !== undefined && run.score > filters.maxScore) return false;
    return true;
  };

  // フィルター変更時にスクロール位置を保持する関数
  const handleFilterChange = (newFilters: Filters) => {
    // 現在のスクロール位置を保存
    const scrollPosition = window.scrollY;
    
    // フィルターを更新
    setFilters(newFilters);
    
    // スクロール位置を復元（非同期処理後に実行）
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 0);
  };

  const filteredAndSortedRuns = [...runs]
    .filter(applyFilters)
    .sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'character':
          comparison = a.character.localeCompare(b.character);
          break;
        case 'ascension_level':
          comparison = a.ascension_level - b.ascension_level;
          break;
        case 'victory':
          comparison = (a.victory ? 1 : 0) - (b.victory ? 1 : 0);
          break;
        case 'floor_reached':
          comparison = a.floor_reached - b.floor_reached;
          break;
        case 'playtime':
          comparison = a.playtime - b.playtime;
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const formatPlaytime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
  };

  const getResultBadgeClass = (run: any) => {
    if (run.victory && run.floor_reached < 57) {
      return 'badge-warning'; // 勝利だが57階未満の場合は警告色
    }
    return run.victory ? 'badge-success' : 'badge-error';
  };

  const getResultText = (run: any) => {
    if (run.victory && run.floor_reached < 57) {
      return '勝利？';
    }
    return run.victory ? '勝利' : '敗北';
  };

  return (
    <div className="container mx-auto px-4 space-y-4">
      <div className="max-w-[1920px] mx-auto">
        <div className="card bg-base-100 shadow">
          <div className="card-body p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="form-control">
                <select 
                  className="select select-bordered select-sm" 
                  value={filters.character || ''}
                  onChange={(e) => handleFilterChange({...filters, character: e.target.value || undefined})}
                >
                  <option value="">キャラクター: すべて</option>
                  <option value="IRONCLAD">IRONCLAD</option>
                  <option value="THE_SILENT">SILENT</option>
                  <option value="DEFECT">DEFECT</option>
                  <option value="WATCHER">WATCHER</option>
                </select>
              </div>
              
              <div className="form-control">
                <select 
                  className="select select-bordered select-sm" 
                  value={filters.result || ''}
                  onChange={(e) => handleFilterChange({...filters, result: e.target.value as any || undefined})}
                >
                  <option value="">結果: すべて</option>
                  <option value="victory">勝利</option>
                  <option value="victory_suspicious">勝利？</option>
                  <option value="defeat">敗北</option>
                </select>
              </div>
              
              <div className="form-control flex-row items-center gap-2">
                <span className="text-sm">アセンション:</span>
                <input 
                  type="number" 
                  placeholder="最小" 
                  className="input input-bordered input-sm w-20" 
                  min="0"
                  max="20"
                  value={filters.minAscension || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    if (value !== undefined && (value < 0 || value > 20)) return;
                    handleFilterChange({...filters, minAscension: value});
                  }}
                />
                <span>-</span>
                <input 
                  type="number" 
                  placeholder="最大" 
                  className="input input-bordered input-sm w-20" 
                  min="0"
                  max="20"
                  value={filters.maxAscension || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    if (value !== undefined && (value < 0 || value > 20)) return;
                    handleFilterChange({...filters, maxAscension: value});
                  }}
                />
              </div>
              
              <div className="form-control flex-row items-center gap-2">
                <span className="text-sm">スコア:</span>
                <input 
                  type="number" 
                  placeholder="最小" 
                  className="input input-bordered input-sm w-24" 
                  min="0"
                  value={filters.minScore || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    if (value !== undefined && value < 0) return;
                    handleFilterChange({...filters, minScore: value});
                  }}
                />
                <span>-</span>
                <input 
                  type="number" 
                  placeholder="最大" 
                  className="input input-bordered input-sm w-24" 
                  min="0"
                  value={filters.maxScore || ''}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    if (value !== undefined && value < 0) return;
                    handleFilterChange({...filters, maxScore: value});
                  }}
                />
              </div>
              
              <button
                onClick={resetAll}
                className="btn btn-ghost btn-sm gap-2"
              >
                <ArrowPathIcon className="h-5 w-5" />
                すべてリセット
              </button>
              
              <button
                onClick={removeDuplicates}
                className="btn btn-ghost btn-sm gap-2"
              >
                重複を削除
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow mt-4">
          <div className="card-body p-4">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="text-base border-b border-base-300">
                    <th onClick={() => handleSort('timestamp')} className="cursor-pointer bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <span>日時</span>
                        <SortIcon active={sortKey === 'timestamp'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('character')} className="cursor-pointer bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <span>キャラクター</span>
                        <SortIcon active={sortKey === 'character'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('ascension_level')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <img src="/src/assets/ui/topPanel/ascension.png" alt="Ascension" className="w-5 h-5 mr-1.5" />
                        <span>アセンション</span>
                        <SortIcon active={sortKey === 'ascension_level'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('victory')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                          <div className="absolute w-4 h-4">
                            <img 
                              src="/src/assets/ui/topPanel/key_green.png" 
                              alt="Green Key" 
                              className="absolute w-4 h-4 left-0 top-[-1px] transform -rotate-0 origin-center"
                            />
                            <img 
                              src="/src/assets/ui/topPanel/key_blue.png" 
                              alt="Blue Key" 
                              className="absolute w-4 h-4 right-[-1px] top-0 transform rotate-60 origin-center"
                            />
                            <img 
                              src="/src/assets/ui/topPanel/key_red.png" 
                              alt="Red Key" 
                              className="absolute w-4 h-4 left-[-1px] top-0 transform -rotate-60 origin-center"
                            />
                          </div>
                        </div>
                        <span>結果</span>
                        <SortIcon active={sortKey === 'victory'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('floor_reached')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <img src="/src/assets/ui/topPanel/floor.png" alt="Floor" className="w-5 h-5 mr-1.5" />
                        <span>到達階層</span>
                        <SortIcon active={sortKey === 'floor_reached'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('playtime')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <img src="/src/assets/ui/timerIcon.png" alt="Timer" className="w-5 h-5 mr-1.5" />
                        <span>プレイ時間</span>
                        <SortIcon active={sortKey === 'playtime'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('score')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <img src="/src/assets/ui/leaderboards/score.png" alt="Score" className="w-5 h-5 mr-1.5" />
                        <span>スコア</span>
                        <SortIcon active={sortKey === 'score'} direction={sortOrder} />
                      </div>
                    </th>
                    <th className="text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <img src="/src/assets/ui/topPanel/peek_button.png" alt="Details" className="w-5 h-5 mr-1.5" />
                        <span>詳細</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedRuns.map((run) => (
                    <tr key={run.id} className="text-base hover:bg-base-200 transition-colors">
                      <td className="whitespace-nowrap text-center font-medium">
                        {format(new Date(run.timestamp * 1000), 'yyyy/MM/dd HH:mm')}
                      </td>
                      <td>
                        <div className="flex items-center justify-center">
                          <img
                            src={characterImages[run.character]}
                            alt={run.character}
                            title={run.character}
                            className="w-8 h-8 rounded-full"
                          />
                        </div>
                      </td>
                      <td className="text-center">{run.ascension_level}</td>
                      <td className="text-center">
                        <span className={`badge ${getResultBadgeClass(run)} badge-sm font-medium`}>
                          {getResultText(run)}
                        </span>
                      </td>
                      <td className="text-center font-medium">{run.floor_reached}</td>
                      <td className="text-center font-medium">{formatPlaytime(run.playtime)}</td>
                      <td className="text-center font-medium">{run.score.toLocaleString()}</td>
                      <td className="text-center">
                        <Link
                          to={`/runs/${run.id}`}
                          className={`btn btn-ghost btn-sm ${!run.id ? 'btn-disabled' : ''}`}
                          onClick={(e) => !run.id && e.preventDefault()}
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunList; 