import React, { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { calculateCardStats } from '../services/StatsService';
import { createEmptyAllCharacterStats } from '../models/StatsModel';
import StatsTooltip from './StatsTooltip';
import { getAssetUrl } from '../utils/assetUtils';
import ImageAsset from './common/ImageAsset';

// タブ画像のインポートを削除
// import tabIronclad from '../assets/images/cardLibrary/tab_ironclad.png';
// import tabSilent from '../assets/images/cardLibrary/tab_silent.png';
// import tabDefect from '../assets/images/cardLibrary/tab_defect.png';
// import tabWatcher from '../assets/images/cardLibrary/tab_watcher.png';
// import tabColorless from '../assets/images/cardLibrary/tab_colorless.png';
// import tabCurse from '../assets/images/cardLibrary/tab_curse.png';
// searchIconはImageAssetコンポーネントで直接使用するため、ここでは定義しない

interface AllCardData {
  name: string;
  cost: number | string;
  type: string;
  class: string;
  rarity: string;
  effect: string;
  upgradedCost?: number | string;
  upgradedEffect?: string;
}

type CardClass = 'ironclad' | 'silent' | 'defect' | 'watcher' | 'colorless' | 'curse';
type CardType = 'attack' | 'skill' | 'power' | 'status' | 'curse';
type CardRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'special' | 'curse';

interface FormattedCard {
  id: string;
  englishName: string;
  name: string;
  description: string;
  class: CardClass;
  type: CardType;
  cost: number | string;
  rarity: CardRarity;
  upgradedCost?: number | string;
  upgradedEffect?: string;
}

// tabImages の定義をパス文字列として保持（ImageAssetコンポーネントが適切に処理する）
const tabImages: Record<CardClass, string> = {
  ironclad: 'images/cardLibrary/tab_ironclad.png',
  silent: 'images/cardLibrary/tab_silent.png',
  defect: 'images/cardLibrary/tab_defect.png',
  watcher: 'images/cardLibrary/tab_watcher.png',
  colorless: 'images/cardLibrary/tab_colorless.png',
  curse: 'images/cardLibrary/tab_curse.png',
};

const classTabConfig = [
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    costFrame: 'cards/design/ironclad/ironclad.png',
    searchBgColor: 'bg-[#ff6563]/20',
    textColor: 'text-[#ff6563]'
  },
  {
    id: 'silent',
    name: 'SILENT',
    costFrame: 'cards/design/silent/silent.png',
    searchBgColor: 'bg-[#7fff00]/20',
    textColor: 'text-[#7fff00]'
  },
  {
    id: 'defect',
    name: 'DEFECT',
    costFrame: 'cards/design/defect/defect.png',
    searchBgColor: 'bg-[#87ceeb]/20',
    textColor: 'text-[#87ceeb]'
  },
  {
    id: 'watcher',
    name: 'WATCHER',
    costFrame: 'cards/design/watcher/watcher.png',
    searchBgColor: 'bg-[#a600ff]/20',
    textColor: 'text-[#a600ff]'
  },
  {
    id: 'colorless',
    name: 'COLORLESS',
    costFrame: 'cards/design/colorless/colorless.png',
    searchBgColor: 'bg-base-200/50',
    textColor: 'text-base-content'
  },
  {
    id: 'curse',
    name: 'CURSE',
    costFrame: null,
    searchBgColor: 'bg-[#574aa8]/20',
    textColor: 'text-[#574aa8]'
  }
];

const CardList: React.FC = () => {
  const { runs, settings, updateSettings } = useStore();
  const [selectedClass, setSelectedClass] = useState<CardClass>('ironclad');
  const [searchTerm, setSearchTerm] = useState('');
  const [allCardsData, setAllCardsData] = useState<{ cards: AllCardData[] }>({ cards: [] }); // allCards.json のデータを保持するstate
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [cards, setCards] = useState<FormattedCard[]>([]);
  const [upgradedCards, setUpgradedCards] = useState<Set<string>>(new Set());
  const [upgradedCardsVersion, setUpgradedCardsVersion] = useState(0);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [cardTypeFilter, setCardTypeFilter] = useState<CardType | ''>('');
  const [costFilter, setCostFilter] = useState<number | string | null>(null);
  const [sortBy, setSortBy] = useState<'rarity' | 'name'>('rarity');
  const [defaultUpgraded, setDefaultUpgraded] = useState(false);
  const [isCardClicked, setIsCardClicked] = useState(false);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipCardId, setTooltipCardId] = useState<string | null>(null);
  const [tooltipCardName, setTooltipCardName] = useState('');

  useEffect(() => {
    const fetchCards = async () => {
      try {
        // Electron環境（開発環境・本番環境共通）: IPC経由でファイルを読み込む
        if (window.electronAPI) {
          try {
            // getAssetPathにはassets/プレフィックスなしで渡す（getAssetPathが内部でassets/を追加するため）
            const assetPath = 'cards/allCards.json';
            console.log('[CardList] Requesting asset path for:', assetPath);
            const filePath = await window.electronAPI.getAssetPath(assetPath);
            if (!filePath) {
              throw new Error('getAssetPath returned null');
            }
            console.log('[CardList] Resolved file path:', filePath);
            
            // ファイルの存在確認（デバッグ用）
            try {
              const exists = await window.electronAPI.assetExists(assetPath);
              console.log('[CardList] Asset exists check result:', exists);
            } catch (existsError) {
              console.warn('[CardList] Asset exists check failed:', existsError);
            }
            
            const fileContent = await window.electronAPI.readFile(filePath, 'utf8');
            if (!fileContent || fileContent.length === 0) {
              throw new Error('File content is empty');
            }
            const data = JSON.parse(fileContent);
            if (!data || !data.cards || !Array.isArray(data.cards)) {
              throw new Error('Invalid JSON structure: missing cards array');
            }
            setAllCardsData(data);
            console.log('[CardList] JSON data loaded successfully via IPC. Cards count:', data.cards.length);
          } catch (ipcError) {
            console.error('[CardList] IPC経由の読み込みに失敗:', ipcError);
            console.error('[CardList] Error details:', {
              message: ipcError instanceof Error ? ipcError.message : String(ipcError),
              stack: ipcError instanceof Error ? ipcError.stack : undefined
            });
            // IPC経由の読み込みが失敗した場合、フォールバックとしてfetchを試す
            console.warn('[CardList] フォールバック: 通常のfetchを試行');
            try {
              const response = await fetch('/assets/cards/allCards.json');
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              setAllCardsData(data);
              console.log('[CardList] JSON data loaded successfully via fallback fetch.');
            } catch (fetchError) {
              console.error('[CardList] フォールバックfetchも失敗:', fetchError);
              throw ipcError; // 元のエラーを再スロー
            }
          }
        } else {
          // 非Electron環境: 通常のfetchを使用
          const response = await fetch('/assets/cards/allCards.json');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setAllCardsData(data);
          console.log('[CardList] JSON data loaded successfully.');
        }
      } catch (error) {
        console.error("Failed to fetch cards:", error);
        setLoadingError('カードデータの読み込みに失敗しました。');
      }
    };
    fetchCards();
  }, []);

  useEffect(() => {
    if (!allCardsData || !allCardsData.cards || allCardsData.cards.length === 0) return;

    const formattedCards: FormattedCard[] = [];

    allCardsData.cards.forEach((card: AllCardData) => { // 型を明示
      // クラスの判定
      let cardClass: CardClass;
      const normalizedClass = card.class.toLowerCase().trim();
      
      // 明示的なクラス判定
      if (normalizedClass === 'curse') {
        cardClass = 'curse';
      } else if (normalizedClass === 'colorless') {
        cardClass = 'colorless';
      } else {
        switch (normalizedClass) {
          case 'ironclad':
          case 'red':
            cardClass = 'ironclad';
            break;
          case 'silent':
          case 'green':
            cardClass = 'silent';
            break;
          case 'defect':
          case 'blue':
            cardClass = 'defect';
            break;
          case 'watcher':
          case 'purple':
            cardClass = 'watcher';
            break;
          default:
            console.log(`Skipping card with unmatched class: ${card.class}`);
            return;
        }
      }

      // タイプの判定
      let cardType: CardType;
      const normalizedType = card.type.toLowerCase();
      if (cardClass === 'curse') {
        cardType = 'curse';
      } else {
        switch (normalizedType) {
          case 'attack':
            cardType = 'attack';
            break;
          case 'skill':
            cardType = 'skill';
            break;
          case 'power':
            cardType = 'power';
            break;
          case 'status':
            cardType = 'status';
            break;
          default:
            cardType = 'skill';
        }
      }

      // レアリティの判定
      let cardRarity: CardRarity;
      const normalizedRarity = card.rarity.toLowerCase();
      switch (normalizedRarity) {
        case 'basic':
          cardRarity = 'common';
          break;
        case 'common':
          cardRarity = 'common';
          break;
        case 'uncommon':
          cardRarity = 'uncommon';
          break;
        case 'rare':
          cardRarity = 'rare';
          break;
        case 'special':
          cardRarity = 'special';
          break;
        case 'curse':
          cardRarity = 'common';
          break;
        default:
          cardRarity = 'common';
      }

      formattedCards.push({
        id: `${cardClass}_${card.name}`,  // クラスと名前の組み合わせで一意のIDを生成
        englishName: card.name,
        name: card.name,
        description: card.effect,
        class: cardClass,
        type: cardType,
        cost: card.cost,
        rarity: cardRarity,
        upgradedCost: card.upgradedCost,
        upgradedEffect: card.upgradedEffect
      });
    });

    setCards(formattedCards);
  }, [allCardsData]);

  // 全クラス検索がONになったときの処理
  useEffect(() => {
    if (isGlobalSearch) {
      setSelectedClass('ironclad');
      setUpgradedCards(new Set());
    }
  }, [isGlobalSearch]);

  // タブが選択されたときの処理
  const handleTabSelect = (classId: CardClass) => {
    setSelectedClass(classId);
    // 全クラス検索のチェックは維持する（タブ切り替えでOFFにしない）
    setIsCardClicked(false);
  };

  // 検索背景色の取得
  const getSearchBgColor = () => {
    if (isGlobalSearch) return 'bg-base-200/50';
    return classTabConfig.find(config => config.id === selectedClass)?.searchBgColor || 'bg-base-200/50';
  };

  // カードのアップグレード状態を判定
  const isCardUpgraded = (cardId: string) => {
    // カードの情報を取得
    const card = cards.find(c => c.id === cardId);
    
    // StatusカードまたはCurseカードの場合は常にアップグレードなし
    if (card?.type === 'status' || card?.class === 'curse') {
      return false;
    }
    
    if (defaultUpgraded) {
      return !upgradedCards.has(cardId); // デフォルトがアップグレード状態の場合は反転
    }
    return upgradedCards.has(cardId);
  };

  // フィルタリングされたカードリスト
  const filteredCards = useMemo(() => {
    // 全クラス検索時、同じ名前のカードが複数のクラスで存在するかどうかを判定
    const getCardNameCount = (cardName: string) => {
      return cards.filter(c => c.name === cardName).length;
    };

    return cards
      .filter(card => {
        const matchesSearch = 
          card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          card.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesType = !cardTypeFilter || card.type === cardTypeFilter;
        
        const matchesCost = costFilter === null || 
          (costFilter === 'X' && card.cost === 'X') ||
          (costFilter === -1 && card.cost === -1) ||
          card.cost === costFilter;

        if (isGlobalSearch) {
          // 全クラス検索時：同じ名前のカードが複数のクラスで存在する場合、
          // 選択されているクラスのものだけを表示して重複を防ぐ
          const cardNameCount = getCardNameCount(card.name);
          if (cardNameCount > 1) {
            // 同じ名前のカードが複数のクラスで存在する場合は、選択されているクラスのものだけを表示
            return card.class === selectedClass && matchesSearch && matchesType && matchesCost;
          }
          // その他のカードは全クラスから表示
          return matchesSearch && matchesType && matchesCost;
        } else {
          // 通常モード：選択されているクラスのカードのみ表示
          return card.class === selectedClass && matchesSearch && matchesType && matchesCost;
        }
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }

        // レアリティの順序を定義
        const rarityOrder = {
          'common': 1,
          'uncommon': 2,
          'rare': 3,
          'starter': 1,
          'special': 1,
          'curse': 1
        };

        // まずレアリティで比較
        const rarityComparison = rarityOrder[a.rarity] - rarityOrder[b.rarity];
        
        // レアリティが同じ場合はカード名でアルファベット順に並べる
        if (rarityComparison === 0) {
          return a.name.localeCompare(b.name);
        }
        
        return rarityComparison;
      });
  }, [cards, isGlobalSearch, selectedClass, searchTerm, cardTypeFilter, costFilter, sortBy]);

  const handleCardClick = (cardId: string) => {
    // Curseカードまたはステータスカードの場合は処理をスキップ
    const card = cards.find(c => c.id === cardId);
    console.log('Card clicked:', cardId, card);
    if (card?.class === 'curse' || card?.type === 'status') return;

    try {
      setIsCardClicked(true); // カードクリック時にアニメーションを無効化
      
      // カードクリック時にツールチップを非表示にしない
      // ツールチップが表示されていない場合は表示する
      if (!tooltipVisible && settings.enableStatsTooltip) {
        setTooltipCardId(card?.englishName ?? cardId);
        setTooltipCardName(card?.name || '');
        // クリック位置の近くにツールチップを表示
        const event = window.event as MouseEvent;
        if (event) {
          setTooltipPosition({ x: event.clientX, y: event.clientY });
        }
        setTooltipVisible(true);
      }
      
      setUpgradedCards(prev => {
        const newSet = new Set(prev);
        console.log('Previous upgraded cards:', Array.from(prev));
        if (newSet.has(cardId)) {
          console.log('Removing card from upgraded set:', cardId);
          newSet.delete(cardId);
        } else {
          console.log('Adding card to upgraded set:', cardId);
          newSet.add(cardId);
        }
        console.log('New upgraded cards:', Array.from(newSet));
        return newSet;
      });
      
      // 強制的に再レンダリングを行うためにバージョン番号を更新
      setUpgradedCardsVersion(prev => prev + 1);
    } catch (error) {
      console.error('Error in handleCardClick:', error);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCardTypeFilter('');
    setCostFilter(null);
    setSortBy('rarity');
    setIsGlobalSearch(false);
    setIsCardClicked(false);
  };

  // カードの統計情報を計算（メモ化）
  const cardStats = React.useMemo(() => {
    // ツールチップが表示されていなくても、カードIDが設定されていれば計算する
    if (!tooltipCardId) {
      return createEmptyAllCharacterStats();
    }
    return calculateCardStats(runs, tooltipCardId);
  }, [tooltipCardId, runs]);

  // カードにマウスオーバーした際の処理
  const handleCardMouseEnter = (cardId: string, cardName: string, event: React.MouseEvent) => {
    // 統計情報ツールチップが無効の場合は何もしない
    if (!settings.enableStatsTooltip) return;
    
    // 状態を更新
    setTooltipCardId(cardId);
    setTooltipCardName(cardName);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    
    // 即座にツールチップを表示
    setTooltipVisible(true);
  };

  // カードからマウスが離れた際の処理
  const handleCardMouseLeave = () => {
    setTooltipVisible(false);
  };

  // マウス移動時の処理
  const handleCardMouseMove = (event: React.MouseEvent) => {
    if (tooltipVisible) {
      // 前回の位置から一定以上移動した場合のみ更新（ちらつき防止）
      const dx = Math.abs(event.clientX - tooltipPosition.x);
      const dy = Math.abs(event.clientY - tooltipPosition.y);
      if (dx > 20 || dy > 20) {
        setTooltipPosition({ x: event.clientX, y: event.clientY });
      }
    }
  };

  // 右クリックメニューのハンドラー
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    updateSettings({ showStats: !settings.showStats });
  };

  return (
    <div 
      className="card-navy overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <div className="container mx-auto w-full max-w-[1920px] px-4 h-full flex flex-col overflow-hidden">
          <h1 className="text-2xl font-bold mb-6 flex-shrink-0 pt-2 text-primary-custom font-jp">カード一覧</h1>
          
          {/* タブバー */}
          <div className="w-full relative mx-auto bg-transparent overflow-x-hidden">
            <div className="flex overflow-x-auto no-scrollbar">
              {classTabConfig.map((classConfig, index) => (
                <button
                  key={classConfig.id}
                  className={`
                    relative h-[48px] overflow-hidden
                    ${index > 0 ? '-ml-16' : ''}
                    ${selectedClass === classConfig.id ? 'z-[40] scale-x-110 transition-transform duration-200' : `z-${30 - index * 5} hover:z-[35]`}
                    flex-1 min-w-[80px] flex-shrink-0
                  `}
                  onClick={() => handleTabSelect(classConfig.id as CardClass)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageAsset
                      path={tabImages[classConfig.id as CardClass] ?? 'images/cardLibrary/tab_colorless.png'} // ImageAsset に変更しフォールバック指定
                      alt={classConfig.name}
                      className={`
                        w-full h-[48px]
                        transition-all duration-200
                        ${selectedClass === classConfig.id ? 'brightness-125 contrast-110' : 'hover:brightness-105'}
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
                          <ImageAsset // ImageAsset に変更しフォールバック指定
                            path={classConfig.costFrame ?? ''}
                            alt={`${classConfig.name} cost frame`}
                            className="w-full h-full"
                          />
                        </div>
                      )}
                      <span 
                        className={`
                          font-bold text-lg text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]
                          ${selectedClass === classConfig.id ? classConfig.textColor : ''}
                          transition-all duration-200 text-center
                        `}
                        style={{ fontFamily: 'Kreon, serif' }}
                      >
                        {classConfig.name}
                      </span>
                      {classConfig.costFrame && (
                        <div className="flex-shrink-0 w-6 h-6 items-center justify-center">
                          <ImageAsset // ImageAsset に変更しフォールバック指定
                            path={classConfig.costFrame ?? ''}
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

          {/* 検索窓と検索条件 */}
          <div className={`flex flex-row items-center gap-4 ${getSearchBgColor()} p-4 rounded-t-none rounded-b-lg mt-0 mb-4 z-40 overflow-x-auto`}>
            {/* 検索ボックス */}
            <div className="relative flex-1 min-w-[200px] z-40 flex-shrink-0">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-70 z-50">
                <ImageAsset
                  path="ui/cursors/magGlass2.png"
                  alt="Search"
                  className="w-full h-full"
                />
              </div>
              <input
                type="text"
                placeholder="カード名や効果で検索..."
                className="input input-bordered input-navy w-full pl-10 pr-4 text-primary-custom"
                style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                className="select select-bordered select-navy w-[140px] text-primary-custom"
                style={{ fontFamily: 'Kreon, NotoSansCJKjp-Regular, sans-serif' }}
                value={cardTypeFilter}
                onChange={(e) => setCardTypeFilter(e.target.value as CardType | '')}
              >
                <option value="" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>全てのタイプ</option>
                <option value="attack" style={{ fontFamily: 'Kreon, serif' }}>Attack</option>
                <option value="skill" style={{ fontFamily: 'Kreon, serif' }}>Skill</option>
                <option value="power" style={{ fontFamily: 'Kreon, serif' }}>Power</option>
                <option value="status" style={{ fontFamily: 'Kreon, serif' }}>Status</option>
                <option value="curse" style={{ fontFamily: 'Kreon, serif' }}>Curse</option>
              </select>

              <select
                className="select select-bordered select-navy w-[140px] text-primary-custom"
                style={{ fontFamily: 'Kreon, NotoSansCJKjp-Regular, sans-serif' }}
                value={costFilter === null ? '' : costFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') setCostFilter(null);
                  else if (value === 'X') setCostFilter('X');
                  else setCostFilter(Number(value));
                }}
              >
                <option value="" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>全てのコスト</option>
                <option value="-1" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>コストなし</option>
                <option value="X" style={{ fontFamily: 'Kreon, serif' }}>X</option>
                <option value="0" style={{ fontFamily: 'Kreon, serif' }}>0</option>
                <option value="1" style={{ fontFamily: 'Kreon, serif' }}>1</option>
                <option value="2" style={{ fontFamily: 'Kreon, serif' }}>2</option>
                <option value="3" style={{ fontFamily: 'Kreon, serif' }}>3</option>
                <option value="4" style={{ fontFamily: 'Kreon, serif' }}>4</option>
                <option value="5" style={{ fontFamily: 'Kreon, serif' }}>5</option>
              </select>

              <select
                className="select select-bordered select-navy w-[120px] text-primary-custom"
                style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rarity' | 'name')}
              >
                <option value="rarity" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>レアリティ順</option>
                <option value="name" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>名前順</option>
              </select>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <span className="label-text" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>全クラス検索</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm"
                    checked={isGlobalSearch}
                    onChange={(e) => setIsGlobalSearch(e.target.checked)}
                  />
                </label>

                <label className="flex items-center gap-2 whitespace-nowrap">
                  <span className="label-text" style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}>デフォルトアップグレード</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm"
                    checked={defaultUpgraded}
                    onChange={(e) => {
                      setDefaultUpgraded(e.target.checked);
                      setUpgradedCards(new Set());
                      setUpgradedCardsVersion(prev => prev + 1);
                    }}
                  />
                </label>

                <button
                  className="btn btn-sm btn-outline"
                  style={{ fontFamily: 'NotoSansCJKjp-Regular, sans-serif' }}
                  onClick={resetFilters}
                >
                  リセット
                </button>
              </div>
            </div>
          </div>

          {/* カードグリッド - スクロール可能なエリア */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 pt-6" style={{ pointerEvents: 'auto' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <AnimatePresence>
                <motion.div 
                  className="grid auto-rows-auto grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-4 w-full max-w-[1920px]"
                  initial={isCardClicked ? {} : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredCards.map((card) => (
                    <motion.div
                      key={`${card.id}_${isCardUpgraded(card.id) ? 'upgraded' : 'normal'}`}
                      className="flex justify-center items-center"
                      initial={isCardClicked ? {} : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.3,
                        delay: isCardClicked ? 0 : Math.random() * 0.3
                      }}
                      whileHover={{
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      }}
                      style={{ pointerEvents: 'auto', zIndex: 10 }}
                      onMouseEnter={(e) => handleCardMouseEnter(card.englishName, card.name, e)}
                      onMouseLeave={handleCardMouseLeave}
                      onMouseMove={handleCardMouseMove}
                    >
                      <Card
                        name={card.name}
                        class={card.class}
                        type={card.type}
                        cost={isCardUpgraded(card.id) && card.upgradedCost !== undefined ? card.upgradedCost : card.cost}
                        description={isCardUpgraded(card.id) ? (card.upgradedEffect || card.description) : card.description}
                        rarity={card.rarity}
                        upgraded={isCardUpgraded(card.id)}
                        originalDescription={isCardUpgraded(card.id) ? card.description : undefined}
                        originalCost={isCardUpgraded(card.id) ? card.cost : undefined}
                        onClick={() => handleCardClick(card.id)}
                        searchTerm={searchTerm}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* 統計情報ツールチップ */}
          <StatsTooltip
            stats={cardStats}
            title={tooltipCardName}
            visible={tooltipVisible}
            x={tooltipPosition.x}
            y={tooltipPosition.y}
          />
        </div>
      </div>
    </div>
  );
};

export default CardList; 