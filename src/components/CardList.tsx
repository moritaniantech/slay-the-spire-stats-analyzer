import React, { useState, useEffect } from 'react';
import Card from './Card';
import allCards from '../assets/cards/allCards.json';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { calculateCardStats } from '../services/StatsService';
import { createEmptyAllCharacterStats } from '../models/StatsModel';
import StatsTooltip from './StatsTooltip';

// タブ画像のインポート
import tabIronclad from '../assets/images/cardLibrary/tab_ironclad.png';
import tabSilent from '../assets/images/cardLibrary/tab_silent.png';
import tabDefect from '../assets/images/cardLibrary/tab_defect.png';
import tabWatcher from '../assets/images/cardLibrary/tab_watcher.png';
import tabColorless from '../assets/images/cardLibrary/tab_colorless.png';
import tabCurse from '../assets/images/cardLibrary/tab_curse.png';
import searchIcon from '../assets/ui/cursors/magGlass2.png';

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

const tabImages: Record<CardClass, string> = {
  ironclad: tabIronclad,
  silent: tabSilent,
  defect: tabDefect,
  watcher: tabWatcher,
  colorless: tabColorless,
  curse: tabCurse,
};

const classTabConfig = [
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    costFrame: '/src/assets/cards/design/ironclad/ironclad.png',
    searchBgColor: 'bg-[#ff6563]/20',
    textColor: 'text-[#ff6563]'
  },
  {
    id: 'silent',
    name: 'SILENT',
    costFrame: '/src/assets/cards/design/silent/silent.png',
    searchBgColor: 'bg-[#7fff00]/20',
    textColor: 'text-[#7fff00]'
  },
  {
    id: 'defect',
    name: 'DEFECT',
    costFrame: '/src/assets/cards/design/defect/defect.png',
    searchBgColor: 'bg-[#87ceeb]/20',
    textColor: 'text-[#87ceeb]'
  },
  {
    id: 'watcher',
    name: 'WATCHER',
    costFrame: '/src/assets/cards/design/watcher/watcher.png',
    searchBgColor: 'bg-[#a600ff]/20',
    textColor: 'text-[#a600ff]'
  },
  {
    id: 'colorless',
    name: 'COLORLESS',
    costFrame: '/src/assets/cards/design/colorless/colorless.png',
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
    // カードデータを整形
    const formattedCards: FormattedCard[] = [];

    allCards.cards.forEach((card, index) => {
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
        id: card.name,  // インデックスを付けずに純粋なカード名をIDとして使用
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
  }, []);

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
    setIsGlobalSearch(false);
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
  const filteredCards = cards
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
        return matchesSearch && matchesType && matchesCost;
      } else {
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
        setTooltipCardId(cardId);
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
      className="container mx-auto px-4 max-w-[1920px] h-screen flex flex-col overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      <h1 className="text-2xl font-bold mb-6 flex-shrink-0 pt-2">カード一覧</h1>

      {/* フィルターセクション - 固定位置 */}
      <div className="sticky top-0 z-[45] bg-base-100 w-full">
        {/* タブバー */}
        <div className="w-full relative mx-auto bg-transparent">
          <div className="flex w-full">
            {classTabConfig.map((classConfig, index) => (
              <button
                key={classConfig.id}
                className={`
                  relative h-[48px] overflow-hidden
                  ${index > 0 ? '-ml-4 sm:-ml-8 md:-ml-16 lg:-ml-20' : ''}
                  ${selectedClass === classConfig.id && !isGlobalSearch ? 'z-[40] scale-x-110 transition-transform duration-200' : `z-${30 - index * 5} hover:z-[35]`}
                  ${isGlobalSearch ? 'opacity-75 hover:opacity-100' : ''}
                  flex-1
                `}
                onClick={() => handleTabSelect(classConfig.id as CardClass)}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={`/src/assets/images/cardLibrary/tab_${classConfig.id}.png`}
                    alt={classConfig.name}
                    className={`
                      w-full h-[48px]
                      transition-all duration-200
                      ${selectedClass === classConfig.id && !isGlobalSearch ? 'brightness-125 contrast-110' : 'hover:brightness-105'}
                    `}
                    style={{
                      objectFit: 'fill',
                      objectPosition: 'center'
                    }}
                  />
                </div>
                <div className="relative z-10 flex items-center justify-center w-full h-full">
                  <div className={`flex items-center justify-center gap-1 ${classConfig.id === 'curse' ? 'w-24' : 'w-48'}`}>
                    {classConfig.costFrame && (
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        <img
                          src={classConfig.costFrame}
                          alt={`${classConfig.name} cost frame`}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                    <span 
                      className={`
                        font-bold text-lg text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]
                        ${selectedClass === classConfig.id && !isGlobalSearch ? classConfig.textColor : ''}
                        transition-all duration-200 text-center
                      `}
                      style={{ fontFamily: 'Kreon, serif' }}
                    >
                      {classConfig.name}
                    </span>
                    {classConfig.costFrame && (
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                        <img
                          src={classConfig.costFrame}
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

        {/* 検索セクション */}
        <div className={`flex items-center justify-between gap-2 ${getSearchBgColor()} p-4 rounded-t-none rounded-b-lg w-full z-40`}>
          <div className="relative flex-1 min-w-[200px] z-40">
            <img
              src={searchIcon}
              alt="Search"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-70 z-50"
            />
            <input
              type="text"
              placeholder="カード名や効果で検索..."
              className="input input-bordered w-full pl-10 pr-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              className="select select-bordered w-[140px]"
              value={cardTypeFilter}
              onChange={(e) => setCardTypeFilter(e.target.value as CardType | '')}
            >
              <option value="">全てのタイプ</option>
              <option value="attack">Attack</option>
              <option value="skill">Skill</option>
              <option value="power">Power</option>
              <option value="status">Status</option>
              <option value="curse">Curse</option>
            </select>

            <select
              className="select select-bordered w-[140px]"
              value={costFilter === null ? '' : costFilter}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') setCostFilter(null);
                else if (value === 'X') setCostFilter('X');
                else setCostFilter(Number(value));
              }}
            >
              <option value="">全てのコスト</option>
              <option value="-1">コストなし</option>
              <option value="X">X</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>

            <select
              className="select select-bordered w-[120px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rarity' | 'name')}
            >
              <option value="rarity">レアリティ順</option>
              <option value="name">名前順</option>
            </select>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 whitespace-nowrap">
                <span className="label-text">全クラス検索</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={isGlobalSearch}
                  onChange={(e) => setIsGlobalSearch(e.target.checked)}
                />
              </label>

              <label className="flex items-center gap-2 whitespace-nowrap">
                <span className="label-text">デフォルトアップグレード</span>
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
                onClick={resetFilters}
              >
                リセット
              </button>
            </div>
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
                  onMouseEnter={(e) => handleCardMouseEnter(card.id, card.name, e)}
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
  );
};

export default CardList; 