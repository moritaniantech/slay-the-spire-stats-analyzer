import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Run, useStore } from '../store';
import { calculateNeowBonusStats } from '../services/neowBonusService';
import { NeowBonusData } from '../types/neowBonus';
import './NeowBonusList.css';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import ImageAsset from './common/ImageAsset';

// キャラクター名のマッピング（モジュールレベルで安定参照）
const characterMap: Record<string, string> = {
  'ironclad': 'IRONCLAD',
  'silent': 'THE_SILENT',
  'defect': 'DEFECT',
  'watcher': 'WATCHER',
  'all': 'ALL'
};

const classTabConfig = [
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    searchBgColor: 'bg-[#ff6563]/20',
    textColor: 'text-[#ff6563]',
    costFrame: 'cards/design/ironclad/ironclad.png'
  },
  {
    id: 'silent',
    name: 'SILENT',
    searchBgColor: 'bg-[#7fff00]/20',
    textColor: 'text-[#7fff00]',
    costFrame: 'cards/design/silent/silent.png'
  },
  {
    id: 'defect',
    name: 'DEFECT',
    searchBgColor: 'bg-[#87ceeb]/20',
    textColor: 'text-[#87ceeb]',
    costFrame: 'cards/design/defect/defect.png'
  },
  {
    id: 'watcher',
    name: 'WATCHER',
    searchBgColor: 'bg-[#a600ff]/20',
    textColor: 'text-[#a600ff]',
    costFrame: 'cards/design/watcher/watcher.png'
  },
  {
    id: 'all',
    name: 'ALL',
    searchBgColor: 'bg-base-200/50',
    textColor: 'text-base-content',
    costFrame: 'cards/design/colorless/colorless.png'
  }
] as const;

const tabImages: Record<string, string> = {
  'all': 'images/cardLibrary/tab_colorless.png',
  'watcher': 'images/cardLibrary/tab_watcher.png',
  'defect': 'images/cardLibrary/tab_defect.png',
  'ironclad': 'images/cardLibrary/tab_ironclad.png',
  'silent': 'images/cardLibrary/tab_silent.png'
};

type SortKey = 'bonus' | 'totalSelected' | 'last50Selected' | 'totalWinRate' | 'last50WinRate';
type SortOrder = 'asc' | 'desc';

interface SortIconProps {
  active: boolean;
  direction: SortOrder;
}

const SortIcon: React.FC<SortIconProps> = ({ active, direction }) => {
  if (!active) {
    return (
      <div className="w-4 h-4 ml-1 opacity-30">
        <ChevronUpIcon className="w-2 h-2" />
        <ChevronDownIcon className="w-2 h-2" />
      </div>
    );
  }
  return direction === 'asc' ? (
    <ChevronUpIcon className="w-4 h-4 ml-1" />
  ) : (
    <ChevronDownIcon className="w-4 h-4 ml-1" />
  );
};

interface NeowBonusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bonusKey: string;
  character: string;
  runs: Run[];
}

const NeowBonusHistoryModal: React.FC<NeowBonusHistoryModalProps> = ({
  isOpen,
  onClose,
  bonusKey,
  runs
}) => {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  // プレイ時間のフォーマット関数
  const formatPlaytime = (playtime: number): string => {
    const hours = Math.floor(playtime / 3600);
    const minutes = Math.floor((playtime % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // リザルトバッジのクラス名を取得する関数
  const getResultBadgeClass = (run: Run): string => {
    if (run.victory && run.floor_reached < 57) {
      return 'badge-warning';
    }
    return run.victory ? 'badge-success' : 'badge-error';
  };

  // リザルトテキストを取得する関数
  const getResultText = (run: Run): string => {
    if (run.victory && run.floor_reached < 57) {
      return '勝利？';
    }
    return run.victory ? '勝利' : '敗北';
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'character':
          comparison = (a.character_chosen || a.character).localeCompare(b.character_chosen || b.character);
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
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [runs, sortKey, sortOrder]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-xl font-bold">
            {t(bonusKey.replace('neowBonus.', ''))} の選択履歴
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-base-200 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="table w-full">
            <thead className="sticky top-0 bg-base-100">
              <tr>
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
                    <ImageAsset path="ui/topPanel/ascension.png" alt="Ascension" className="w-5 h-5 mr-1.5" />
                    <span>アセンション</span>
                    <SortIcon active={sortKey === 'ascension_level'} direction={sortOrder} />
                  </div>
                </th>
                <th onClick={() => handleSort('victory')} className="cursor-pointer text-center bg-base-200/50">
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
                <th onClick={() => handleSort('floor_reached')} className="cursor-pointer text-center bg-base-200/50">
                  <div className="flex items-center justify-center">
                    <ImageAsset path="ui/topPanel/floor.png" alt="Floor" className="w-5 h-5 mr-1.5" />
                    <span>到達階層</span>
                    <SortIcon active={sortKey === 'floor_reached'} direction={sortOrder} />
                  </div>
                </th>
                <th onClick={() => handleSort('playtime')} className="cursor-pointer text-center bg-base-200/50">
                  <div className="flex items-center justify-center">
                    <ImageAsset path="ui/timerIcon.png" alt="Timer" className="w-5 h-5 mr-1.5" />
                    <span>プレイ時間</span>
                    <SortIcon active={sortKey === 'playtime'} direction={sortOrder} />
                  </div>
                </th>
                <th onClick={() => handleSort('score')} className="cursor-pointer text-center bg-base-200/50">
                  <div className="flex items-center justify-center">
                    <ImageAsset path="ui/leaderboards/score.png" alt="Score" className="w-5 h-5 mr-1.5" />
                    <span>スコア</span>
                    <SortIcon active={sortKey === 'score'} direction={sortOrder} />
                  </div>
                </th>
                <th className="text-center bg-base-200/50">
                  <div className="flex items-center justify-center">
                    <ImageAsset path="ui/topPanel/peek_button.png" alt="Details" className="w-5 h-5 mr-1.5" />
                    <span>詳細</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRuns.map((run) => (
                <tr key={run.id} className="text-base hover:bg-base-200 transition-colors">
                  <td className="whitespace-nowrap text-center font-medium">
                    {new Date(run.timestamp * 1000).toLocaleString('ja-JP')}
                  </td>
                  <td>
                    <div className="flex items-center justify-center">
                      {(() => {
                        const character = run.character_chosen || run.character;
                        const characterPathMap: { [key: string]: string } = {
                          'IRONCLAD': 'images/characters/ironclad.png',
                          'THE_SILENT': 'images/characters/silent.png',
                          'SILENT': 'images/characters/silent.png',
                          'DEFECT': 'images/characters/defect.png',
                          'WATCHER': 'images/characters/watcher.png',
                        };
                        const imagePath = characterPathMap[character] || 'images/characters/ironclad.png';
                        return (
                          <ImageAsset
                            path={imagePath}
                            alt={character}
                            title={character}
                            className="w-8 h-8 rounded-full"
                          />
                        );
                      })()}
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
  );
};

const NeowBonusList: React.FC = () => {
  const { t } = useTranslation();
  const runs = useStore((state) => state.runs);
  const [selectedCharacter, setSelectedCharacter] = useState<string>(() => {
    const savedCharacter = localStorage.getItem('selectedNeowBonusCharacter');
    return savedCharacter || 'ironclad';
  });
  const [bonusData, setBonusData] = useState<NeowBonusData>({});
  const [sortKey, setSortKey] = useState<SortKey>('totalSelected');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedBonus, setSelectedBonus] = useState<string | null>(() => {
    const savedBonus = localStorage.getItem('selectedNeowBonus');
    return savedBonus || null;
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(() => {
    return localStorage.getItem('isNeowBonusModalOpen') === 'true';
  });

  // モーダルとタブの状態を永続化
  useEffect(() => {
    if (selectedBonus) {
      localStorage.setItem('selectedNeowBonus', selectedBonus);
    } else {
      localStorage.removeItem('selectedNeowBonus');
    }
    localStorage.setItem('isNeowBonusModalOpen', isModalOpen.toString());
    localStorage.setItem('selectedNeowBonusCharacter', selectedCharacter);
  }, [selectedBonus, isModalOpen, selectedCharacter]);

  // runsデータからの統計計算をメモ化
  const calculatedStats = useMemo(() => {
    console.log('Debug - Runs:', {
      length: runs.length,
      sample: runs.slice(0, 1).map(run => ({
        character: run.character_chosen || run.character,
        neow_cost: run.neow_cost,
        neow_bonus: run.neow_bonus, // neow_bonusも確認
        victory: run.victory,
        fullRun: JSON.stringify(run) // 完全なrunオブジェクトをJSON文字列として出力
      })),
      allCharacters: runs.map(run => run.character_chosen || run.character),
      allNeowCosts: runs.map(run => run.neow_cost),
      allNeowBonuses: runs.map(run => run.neow_bonus)
    });

    if (runs.length === 0) {
      console.log('Debug - No runs available');
      return {};
    }

    // キャラクター名のマッピング（コンポーネントの小文字から実際のデータの大文字へ）
    const characterMap: Record<string, string> = {
      'ironclad': 'IRONCLAD',
      'silent': 'THE_SILENT',
      'defect': 'DEFECT',
      'watcher': 'WATCHER',
      'all': 'ALL'
    };

    // 選択されたキャラクターの変換
    const normalizedCharacter = characterMap[selectedCharacter] || selectedCharacter.toUpperCase();
    console.log('Debug - Character mapping:', {
      selectedCharacter,
      normalizedCharacter,
      characterMap
    });

    const stats = calculateNeowBonusStats(runs);
    console.log('Debug - Calculated stats:', {
      stats,
      hasData: Object.keys(stats).length > 0,
      characters: Object.keys(stats),
      firstCharacterData: stats[Object.keys(stats)[0]]
    });
    return stats;
  }, [runs, selectedCharacter]);

  // 統計データの更新
  useEffect(() => {
    console.log('Debug - Setting bonus data:', {
      calculatedStats,
      hasData: Object.keys(calculatedStats).length > 0
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- useMemoの結果をstateに同期
    setBonusData(calculatedStats);
  }, [calculatedStats]);

  // タブ選択のハンドラをメモ化
  const handleTabSelect = useCallback((classId: string) => {
    setSelectedCharacter(classId);
  }, []);

  // characterMapはモジュールレベルで定義（安定参照）

  // 選択されたキャラクターの変換
  const normalizedCharacter = characterMap[selectedCharacter] || selectedCharacter.toUpperCase();

  // 現在のキャラクターのデータをメモ化
  const currentCharacterData = useMemo(() => {
    console.log('Debug - Current character data:', {
      selectedCharacter,
      normalizedCharacter,
      bonusData,
      hasSelectedCharacter: bonusData[normalizedCharacter] !== undefined,
      dataKeys: Object.keys(bonusData),
      characterData: bonusData[normalizedCharacter]
    });
    return bonusData[normalizedCharacter] || {};
  }, [bonusData, selectedCharacter, normalizedCharacter]);

  // データの存在確認をメモ化
  const hasData = useMemo(() => {
    const hasDataValue = Object.keys(currentCharacterData).length > 0;
    console.log('Debug - Has data check:', {
      hasData: hasDataValue,
      currentCharacterData,
      keys: Object.keys(currentCharacterData),
      selectedCharacter,
      normalizedCharacter
    });
    return hasDataValue;
  }, [currentCharacterData, selectedCharacter, normalizedCharacter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const getRunsWithBonus = useCallback(
    (bonusKey: string) => {
      return runs.filter((run) => {
        // キャラクターのフィルタリング
        if (selectedCharacter !== 'all') {
          const runCharacter = run.character_chosen || run.character;
          const normalizedCharacter = characterMap[selectedCharacter];
          if (runCharacter !== normalizedCharacter) {
            return false;
          }
        }

        // ネオーの祝福のフィルタリング
        const runBonus = (run.neow_bonus || (run.run_data && run.run_data.neow_bonus))?.replace('neowBonus.', '');
        return runBonus === bonusKey.replace('neowBonus.', '');
      });
    },
    [runs, selectedCharacter]
  );

  const handleRowClick = useCallback((bonusKey: string) => {
    setSelectedBonus(bonusKey);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedBonus(null);
  };

  // テーブル行のレンダリングをメモ化
  const tableRows = useMemo(() => {
    if (!hasData) {
      return (
        <tr>
          <td colSpan={5} className="p-4 text-center">
            データがありません
          </td>
        </tr>
      );
    }

    return Object.entries(currentCharacterData)
      .map(([bonus, stats]) => {
        const bonusKey = bonus.replace('neowBonus.', '');
        const localizedBonus = t(`${bonusKey}`);
        return {
          bonus: localizedBonus || bonusKey,
          originalBonus: bonus,
          ...stats,
        };
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortKey) {
          case 'bonus':
            comparison = a.bonus.localeCompare(b.bonus);
            break;
          case 'totalSelected':
            comparison = a.totalSelected - b.totalSelected;
            break;
          case 'last50Selected':
            comparison = a.last50Selected - b.last50Selected;
            break;
          case 'totalWinRate':
            comparison = a.totalWinRate - b.totalWinRate;
            break;
          case 'last50WinRate':
            comparison = a.last50WinRate - b.last50WinRate;
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      })
      .map((row) => (
        <tr
          key={row.originalBonus}
          className="text-base hover:bg-base-200 transition-colors cursor-pointer"
          onClick={() => handleRowClick(row.originalBonus)}
        >
          <td className="whitespace-normal p-4">{row.bonus}</td>
          <td className="text-center p-4 font-medium">{row.totalSelected}</td>
          <td className="text-center p-4 font-medium">{row.last50Selected}</td>
          <td className="text-center p-4 font-medium">{`${row.totalWinRate.toFixed(1)}%`}</td>
          <td className="text-center p-4 font-medium">{`${row.last50WinRate.toFixed(1)}%`}</td>
        </tr>
      ));
  }, [currentCharacterData, t, hasData, sortKey, sortOrder, handleRowClick]);

  return (
    <div className="container mx-auto px-4 space-y-4">
      <div className="max-w-[1920px] mx-auto">
        <h1 className="text-2xl font-bold mt-4">ネオーの祝福</h1>

        {/* タブバー */}
        <div className="card bg-base-100 shadow mt-4">
          <div className="card-body p-4">
            <div className="w-full relative mx-auto bg-transparent">
              <div className="flex overflow-x-auto no-scrollbar">
                {classTabConfig.map((classConfig, index) => (
                  <button
                    key={classConfig.id}
                    className={`
                      relative h-[48px] overflow-hidden
                      ${index > 0 ? '-ml-16' : ''}
                      ${selectedCharacter === classConfig.id ? 'z-[40] scale-x-110 transition-transform duration-200' : `z-${30 - index * 5} hover:z-[35]`}
                      flex-1 min-w-[80px] flex-shrink-0
                    `}
                    onClick={() => handleTabSelect(classConfig.id)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageAsset
                        path={tabImages[classConfig.id] || 'images/cardLibrary/tab_colorless.png'}
                        alt={classConfig.name}
                        className={`
                          w-full h-[48px]
                          transition-all duration-200
                          ${selectedCharacter === classConfig.id ? 'brightness-125 contrast-110' : 'hover:brightness-105'}
                        `}
                        style={{
                          objectFit: 'fill',
                          objectPosition: 'center'
                        }}
                      />
                    </div>
                    <div className="relative z-10 flex items-center justify-center w-full h-full">
                      <div className="flex items-center justify-center gap-1 w-48">
                        {classConfig.costFrame && (
                          <div className="flex-shrink-0 w-6 h-6 items-center justify-center">
                            <ImageAsset
                              path={classConfig.costFrame}
                              alt={`${classConfig.name} cost frame`}
                              className="w-full h-full"
                            />
                          </div>
                        )}
                        <span 
                          className={`
                            font-bold text-lg text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]
                            ${selectedCharacter === classConfig.id ? classConfig.textColor : ''}
                            transition-all duration-200 text-center
                          `}
                          style={{ fontFamily: 'Kreon, serif' }}
                        >
                          {classConfig.name}
                        </span>
                        {classConfig.costFrame && (
                          <div className="flex-shrink-0 w-6 h-6 items-center justify-center">
                            <ImageAsset
                              path={classConfig.costFrame}
                              alt={`${classConfig.name} cost frame`}
                              className="w-full h-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* テーブル */}
        <div className="card bg-base-100 shadow mt-4">
          <div className="card-body p-4">
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="text-base border-b border-base-300">
                    <th onClick={() => handleSort('bonus')} className="cursor-pointer bg-base-200/50">
                      <div className="flex items-center">
                        <span>ネオーの祝福</span>
                        <SortIcon active={sortKey === 'bonus'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('totalSelected')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <ImageAsset path="ui/topPanel/deck.png" alt="Total Selected" className="w-5 h-5 mr-1.5" />
                        <span>選択回数（通算）</span>
                        <SortIcon active={sortKey === 'totalSelected'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('last50Selected')} className="cursor-pointer text-center bg-base-200/50">
                      <div className="flex items-center justify-center">
                        <ImageAsset path="ui/topPanel/deck.png" alt="Last 50 Selected" className="w-5 h-5 mr-1.5" />
                        <span>選択回数（直近50戦）</span>
                        <SortIcon active={sortKey === 'last50Selected'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('totalWinRate')} className="cursor-pointer text-center bg-base-200/50">
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
                        <span>勝率（通算）</span>
                        <SortIcon active={sortKey === 'totalWinRate'} direction={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => handleSort('last50WinRate')} className="cursor-pointer text-center bg-base-200/50">
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
                        <span>勝率（直近50戦）</span>
                        <SortIcon active={sortKey === 'last50WinRate'} direction={sortOrder} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* モーダル */}
      {selectedBonus && (
        <NeowBonusHistoryModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          bonusKey={selectedBonus}
          character={selectedCharacter}
          runs={getRunsWithBonus(selectedBonus)}
        />
      )}
    </div>
  );
};

export default NeowBonusList; 