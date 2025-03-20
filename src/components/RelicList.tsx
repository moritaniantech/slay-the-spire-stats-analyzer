import React, { useState, useEffect, useMemo } from 'react';
import allRelics from '../assets/relics/relics.json';
import { motion, AnimatePresence } from 'framer-motion';
import './RelicList.css'; // スクロールバーのスタイル用CSSをインポート
import { COLORS, RELIC_KEYWORDS } from '../constants/keywords';
import { useStore } from '../store';
import { calculateRelicStats } from '../services/StatsService';
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

// レリックフレームのインポート
import relicFrameCommon from '../assets/ui/relicFrames/relicFrameCommon.png';
import relicFrameUncommon from '../assets/ui/relicFrames/relicFrameUncommon.png';
import relicFrameRare from '../assets/ui/relicFrames/relicFrameRare.png';
import relicFrameBoss from '../assets/ui/relicFrames/relicFrameBoss.png';
import relicPopup from '../assets/ui/relicFrames/relicPopup.png';

interface RelicData {
  name: string;
  effect: string;
  class: string;
  rarity: string;
  flavor?: string;
}

type RelicClass = 'ironclad' | 'silent' | 'defect' | 'watcher' | 'all' | 'all_classes';
type RelicRarity = 'starter' | 'common' | 'uncommon' | 'rare' | 'boss' | 'shop' | 'event';

interface FormattedRelic {
  id: string;
  englishName: string;
  name: string;
  description: string;
  class: RelicClass;
  rarity: RelicRarity;
  imagePath: string;
  flavor?: string;
}

const tabImages: Record<RelicClass, string> = {
  ironclad: tabIronclad,
  silent: tabSilent,
  defect: tabDefect,
  watcher: tabWatcher,
  all: tabColorless,
  all_classes: tabCurse,
};

const classTabConfig = [
  {
    id: 'ironclad',
    name: 'IRONCLAD',
    searchBgColor: 'bg-[#ff6563]/20',
    textColor: 'text-[#ff6563]',
    costFrame: '/src/assets/cards/design/ironclad/ironclad.png'
  },
  {
    id: 'silent',
    name: 'SILENT',
    searchBgColor: 'bg-[#7fff00]/20',
    textColor: 'text-[#7fff00]',
    costFrame: '/src/assets/cards/design/silent/silent.png'
  },
  {
    id: 'defect',
    name: 'DEFECT',
    searchBgColor: 'bg-[#87ceeb]/20',
    textColor: 'text-[#87ceeb]',
    costFrame: '/src/assets/cards/design/defect/defect.png'
  },
  {
    id: 'watcher',
    name: 'WATCHER',
    searchBgColor: 'bg-[#a600ff]/20',
    textColor: 'text-[#a600ff]',
    costFrame: '/src/assets/cards/design/watcher/watcher.png'
  },
  {
    id: 'all',
    name: 'COLORLESS',
    searchBgColor: 'bg-base-200/50',
    textColor: 'text-base-content',
    costFrame: '/src/assets/cards/design/colorless/colorless.png'
  },
  {
    id: 'all_classes',
    name: 'ALL RELICS',
    searchBgColor: 'bg-[#574aa8]/20',
    textColor: 'text-[#574aa8]',
    costFrame: null
  }
];

// レリックのレアリティに応じたフレーム画像を取得する関数
const getRelicFrame = (rarity: RelicRarity) => {
  switch (rarity) {
    case 'common':
      return relicFrameCommon;
    case 'uncommon':
      return relicFrameUncommon;
    case 'rare':
    case 'shop':
    case 'event':
      return relicFrameRare;
    case 'boss':
      return relicFrameBoss;
    case 'starter':
    default:
      return relicFrameCommon;
  }
};

// レリックのレアリティに応じた色を取得する関数
const getRarityColor = (rarity: RelicRarity): string => {
  switch (rarity) {
    case 'uncommon':
      return COLORS.RARITY_UNCOMMON;
    case 'rare':
    case 'shop':
    case 'event':
      return COLORS.RARITY_RARE;
    case 'boss':
      return COLORS.RARITY_BOSS;
    case 'starter':
    case 'common':
    default:
      return COLORS.RARITY_COMMON;
  }
};

// レリックのレアリティ表示テキストを取得する関数
const getRarityDisplayText = (rarity: RelicRarity): string => {
  return `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Relic`;
};

// レリックフレームのサイズ設定
const defaultRelicFrameSizes = {
  frameSizeDesktop: 1200,
  relicSizeDesktop: 600
};

// 複数単語のキーワードチェック（現在の単語が複数単語キーワードの一部かどうか）
const checkMultiWordKeyword = (keywordList: readonly string[], word: string) => {
  // 一般的な単語（前置詞、冠詞など）は除外
  const commonWords = ['of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or'];
  if (commonWords.includes(word.toLowerCase())) {
    return false;
  }
  
  return keywordList.some(keyword => {
    if (keyword.includes(' ')) {
      const parts = keyword.split(' ');
      // 現在の単語がキーワードの一部であるかチェック
      return parts.includes(word);
    }
    return false;
  });
};

// キーワードに色を付ける関数
const colorizeKeywords = (text: string, rarity: RelicRarity, searchTerm: string = '') => {
  if (!text) return null;
  
  const searchTermLower = searchTerm.toLowerCase();
  const hasSearchTerm = searchTerm && searchTermLower.length > 0;
  
  // 文末にドットがない場合は追加
  if (!text.endsWith('.')) {
    text = text + '.';
  }

  // 文章が長い場合（50文字以上）またはBoss Relicの場合は改行しない
  if (text.length > 50 || rarity === 'boss') {
    // 単語と数値（%を含む）を検出する正規表現
    const regex = /(\d+%?)|(\s+|[.,!?])|([^\s.,!?]+)/g;
    const matches = Array.from(text.matchAll(regex));
    
    return (
      <div className="w-full">
        {matches.map((match, index) => {
          const [fullMatch] = match;
          
          // スペースや句読点はそのまま返す
          if (/^\s+$/.test(fullMatch) || /^[.,!?]$/.test(fullMatch)) {
            return <React.Fragment key={index}>{fullMatch}</React.Fragment>;
          }
          
          // 数値（%を含む）の場合は青色で表示
          if (/^\d+%?$/.test(fullMatch)) {
            return <span key={index} className="relic-number">{fullMatch}</span>;
          }
          
          // 検索ワードに一致するかチェック
          if (hasSearchTerm && fullMatch.toLowerCase().includes(searchTermLower)) {
            const startIndex = fullMatch.toLowerCase().indexOf(searchTermLower);
            const endIndex = startIndex + searchTermLower.length;
            
            return (
              <span key={`highlight-${index}`}>
                {fullMatch.substring(0, startIndex)}
                <span style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)', color: '#ffffff' }}>
                  {fullMatch.substring(startIndex, endIndex)}
                </span>
                {fullMatch.substring(endIndex)}
              </span>
            );
          }
          
          // キーワードの色分け
          const word = fullMatch;
          
          // スペースを含むキーワードのチェック
          const isYellowKeyword = RELIC_KEYWORDS.YELLOW.some(keyword => keyword === word);
          const isRedKeyword = RELIC_KEYWORDS.RED.some(keyword => keyword === word);
          const isBlueKeyword = RELIC_KEYWORDS.BLUE.some(keyword => keyword === word);
          const isGreenKeyword = RELIC_KEYWORDS.GREEN.some(keyword => keyword === word);
          const isPurpleKeyword = RELIC_KEYWORDS.PURPLE.some(keyword => keyword === word);
          
          if (isYellowKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.YELLOW, word)) {
            return <span key={index} style={{ color: COLORS.KEYWORD }} className="relic-keyword">{word}</span>;
          } else if (isRedKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.RED, word)) {
            return <span key={index} style={{ color: COLORS.KEYWORD_RED }} className="relic-keyword">{word}</span>;
          } else if (isBlueKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.BLUE, word)) {
            return <span key={index} style={{ color: COLORS.KEYWORD_BLUE }} className="relic-keyword">{word}</span>;
          } else if (isGreenKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.GREEN, word)) {
            return <span key={index} style={{ color: COLORS.KEYWORD_GREEN }} className="relic-keyword">{word}</span>;
          } else if (isPurpleKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.PURPLE, word)) {
            return <span key={index} style={{ color: COLORS.KEYWORD_PURPLE }} className="relic-keyword">{word}</span>;
          }
          
          return <React.Fragment key={index}>{word}</React.Fragment>;
        })}
      </div>
    );
  }
  
  // 通常のレリック（短い文章）はドットで文を分割し、各文を処理
  const sentences = text.split(/(\.\s*)/).filter(Boolean);
  
  return (
    <div className="w-full">
      {sentences.map((sentence, sentenceIndex) => {
        // ドットだけの場合はそのまま返す
        if (/^\.\s*$/.test(sentence)) {
          return <React.Fragment key={`sentence-${sentenceIndex}`}>{sentence}<br /></React.Fragment>;
        }
        
        // 単語と数値（%を含む）を検出する正規表現
        const regex = /(\d+%?)|(\s+|[.,!?])|([^\s.,!?]+)/g;
        const matches = Array.from(sentence.matchAll(regex));
        
        return (
          <React.Fragment key={`sentence-${sentenceIndex}`}>
            {matches.map((match, index) => {
              const [fullMatch] = match;
              
              // スペースや句読点はそのまま返す
              if (/^\s+$/.test(fullMatch) || /^[.,!?]$/.test(fullMatch)) {
                return <React.Fragment key={`${sentenceIndex}-${index}`}>{fullMatch}</React.Fragment>;
              }
              
              // 数値（%を含む）の場合は青色で表示
              if (/^\d+%?$/.test(fullMatch)) {
                return <span key={`${sentenceIndex}-${index}`} className="relic-number">{fullMatch}</span>;
              }
              
              // 検索ワードに一致するかチェック
              if (hasSearchTerm && fullMatch.toLowerCase().includes(searchTermLower)) {
                const startIndex = fullMatch.toLowerCase().indexOf(searchTermLower);
                const endIndex = startIndex + searchTermLower.length;
                
                return (
                  <span key={`highlight-${sentenceIndex}-${index}`}>
                    {fullMatch.substring(0, startIndex)}
                    <span style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)', color: '#ffffff' }}>
                      {fullMatch.substring(startIndex, endIndex)}
                    </span>
                    {fullMatch.substring(endIndex)}
                  </span>
                );
              }
              
              // キーワードの色分け
              const word = fullMatch;
              
              // スペースを含むキーワードのチェック
              const isYellowKeyword = RELIC_KEYWORDS.YELLOW.some(keyword => keyword === word);
              const isRedKeyword = RELIC_KEYWORDS.RED.some(keyword => keyword === word);
              const isBlueKeyword = RELIC_KEYWORDS.BLUE.some(keyword => keyword === word);
              const isGreenKeyword = RELIC_KEYWORDS.GREEN.some(keyword => keyword === word);
              const isPurpleKeyword = RELIC_KEYWORDS.PURPLE.some(keyword => keyword === word);
              
              if (isYellowKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.YELLOW, word)) {
                return <span key={`${sentenceIndex}-${index}`} style={{ color: COLORS.KEYWORD }} className="relic-keyword">{word}</span>;
              } else if (isRedKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.RED, word)) {
                return <span key={`${sentenceIndex}-${index}`} style={{ color: COLORS.KEYWORD_RED }} className="relic-keyword">{word}</span>;
              } else if (isBlueKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.BLUE, word)) {
                return <span key={`${sentenceIndex}-${index}`} style={{ color: COLORS.KEYWORD_BLUE }} className="relic-keyword">{word}</span>;
              } else if (isGreenKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.GREEN, word)) {
                return <span key={`${sentenceIndex}-${index}`} style={{ color: COLORS.KEYWORD_GREEN }} className="relic-keyword">{word}</span>;
              } else if (isPurpleKeyword || checkMultiWordKeyword(RELIC_KEYWORDS.PURPLE, word)) {
                return <span key={`${sentenceIndex}-${index}`} style={{ color: COLORS.KEYWORD_PURPLE }} className="relic-keyword">{word}</span>;
              }
              
              return <React.Fragment key={`${sentenceIndex}-${index}`}>{word}</React.Fragment>;
            })}
            {/* 文の終わりに改行を追加（最後の文以外） */}
            {sentenceIndex < sentences.length - 1 && sentence.endsWith('.') && <br />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// フレーバーテキストからエスケープされていないダブルクォーテーションを削除する関数
const formatFlavorText = (flavor: string | undefined) => {
  if (!flavor) return '';
  return flavor.replace(/^"|"$/g, '');
};

// 個別のレリックコンポーネント
const Relic: React.FC<{ 
  relic: FormattedRelic;
  onMouseEnter: (relicId: string, relicName: string, event: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onMouseMove: (event: React.MouseEvent) => void;
  searchTerm?: string;
}> = ({ relic, onMouseEnter, onMouseLeave, onMouseMove, searchTerm = '' }) => {
  const relicFrame = getRelicFrame(relic.rarity);
  const rarityColor = getRarityColor(relic.rarity);
  const rarityText = getRarityDisplayText(relic.rarity);
  
  // フレーバーテキストの整形
  const formattedFlavorText = formatFlavorText(relic.flavor);
  
  return (
    <div 
      className="flex flex-col items-center w-full relic-card relative"
    >
      <div className="relative w-full h-full">
        {/* 背景画像 */}
        <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden">
          <img src={relicPopup} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
          
          {/* レリック名 - 上部に配置 (少し下にずらす) */}
          <div className="absolute top-[20%] left-0 right-0 flex flex-col items-center z-10">
            <div className="text-center font-['Kreon'] font-bold text-lg relic-text-shadow px-2">
              {searchTerm && relic.name.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                <span>
                  {relic.name.split(new RegExp(`(${searchTerm})`, 'i')).map((part, i) => 
                    part.toLowerCase() === searchTerm.toLowerCase() ? 
                      <span key={i} style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)' }}>{part}</span> : 
                      <span key={i}>{part}</span>
                  )}
                </span>
              ) : (
                relic.name
              )}
            </div>
            <div className="text-center text-base font-['Kreon'] relic-text-shadow mt-1" style={{ color: rarityColor }}>
              {rarityText}
            </div>
          </div>
          
          {/* レリック画像とフレーム - 中央に配置 */}
          <div className="absolute top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-full h-full flex items-center justify-center">
            <div className="relative flex items-center justify-center w-full h-full">
              {/* フレーム画像 - 別クラスで定義 */}
              <div className="relic-frame-container w-full h-full">
                <img 
                  src={relicFrame} 
                  alt="Frame" 
                  className="relic-frame-img"
                />
              </div>
              
              {/* レリック画像 - 別クラスで定義 (下にずらす) */}
              <div 
                className="relic-image-container absolute inset-0 flex items-center justify-center cursor-pointer" 
                style={{ transform: `translateY(65%)` }}
                onMouseEnter={(e) => onMouseEnter(relic.id, relic.name, e)}
                onMouseLeave={onMouseLeave}
                onMouseMove={onMouseMove}
              >
                <img 
                  src={`/src/assets/images/relics/${relic.imagePath}.png`}
                  alt={relic.name}
                  className="relic-img"
                />
              </div>
            </div>
          </div>
          
          {/* レリックの説明 - 下部に配置 */}
          <div className="relic-description-wrapper">
            <div className="relic-description-container">
              {colorizeKeywords(relic.description, relic.rarity, searchTerm)}
            </div>
          </div>
          
          {/* フレーバーテキスト - 説明の下に配置 */}
          {formattedFlavorText && (
            <div className="relic-flavor-wrapper">
              <div className="relic-flavor-text">
                {searchTerm && formattedFlavorText.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                  <span>
                    {formattedFlavorText.split(new RegExp(`(${searchTerm})`, 'i')).map((part, i) => 
                      part.toLowerCase() === searchTerm.toLowerCase() ? 
                        <span key={i} style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)' }}>{part}</span> : 
                        <span key={i}>{part}</span>
                    )}
                  </span>
                ) : (
                  formattedFlavorText
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RelicList: React.FC = () => {
  const { runs, settings, updateSettings } = useStore();
  const [selectedClass, setSelectedClass] = useState<RelicClass>('ironclad');
  const [searchTerm, setSearchTerm] = useState('');
  const [relics, setRelics] = useState<FormattedRelic[]>([]);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RelicRarity | ''>('');
  const [sortBy, setSortBy] = useState<'rarity' | 'name'>('rarity');
  
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipRelicId, setTooltipRelicId] = useState<string | null>(null);
  const [tooltipRelicName, setTooltipRelicName] = useState('');
  
  useEffect(() => {
    // レリックデータを整形
    const formattedRelics: FormattedRelic[] = [];

    // 重複チェック用のセット
    const processedRelics = new Set<string>();

    allRelics.relics.forEach((relic) => {
      // 重複チェック
      if (processedRelics.has(relic.name)) {
        return;
      }
      processedRelics.add(relic.name);

      // クラスの判定
      let relicClass: RelicClass;
      const normalizedClass = relic.class.toLowerCase().trim();
      
      // 明示的なクラス判定
      if (normalizedClass === 'all') {
        relicClass = 'all';
      } else {
        switch (normalizedClass) {
          case 'ironclad':
          case 'red':
            relicClass = 'ironclad';
            break;
          case 'silent':
          case 'green':
            relicClass = 'silent';
            break;
          case 'defect':
          case 'blue':
            relicClass = 'defect';
            break;
          case 'watcher':
          case 'purple':
            relicClass = 'watcher';
            break;
          default:
            relicClass = 'all';
        }
      }

      // レアリティの判定
      let relicRarity: RelicRarity;
      const normalizedRarity = relic.rarity.toLowerCase();
      switch (normalizedRarity) {
        case 'starter':
          relicRarity = 'starter';
          break;
        case 'common':
          relicRarity = 'common';
          break;
        case 'uncommon':
          relicRarity = 'uncommon';
          break;
        case 'rare':
          relicRarity = 'rare';
          break;
        case 'boss':
          relicRarity = 'boss';
          break;
        case 'shop':
          relicRarity = 'shop';
          break;
        case 'event':
          relicRarity = 'event';
          break;
        default:
          relicRarity = 'common';
      }

      // 画像パスの生成（キャメルケースに変換）
      const imagePath = relic.name
        .replace(/\s+/g, '')
        .replace(/([A-Z])/g, (match) => match.toLowerCase())
        .replace(/^(.)/, (match) => match.toLowerCase());

      // aliasが存在する場合はそちらを使用
      const finalImagePath = allRelics.alias && 
        Object.prototype.hasOwnProperty.call(allRelics.alias, relic.name) 
        ? (allRelics.alias as Record<string, string>)[relic.name] 
        : imagePath;

      formattedRelics.push({
        id: relic.name,
        englishName: relic.name,
        name: relic.name,
        description: relic.effect,
        class: relicClass,
        rarity: relicRarity,
        imagePath: finalImagePath,
        flavor: relic.flavor
      });
    });

    setRelics(formattedRelics);
  }, []);

  // 全クラス検索がONになったときの処理
  useEffect(() => {
    if (isGlobalSearch) {
      setSelectedClass('ironclad');
    }
  }, [isGlobalSearch]);

  // タブが選択されたときの処理
  const handleTabSelect = (classId: RelicClass) => {
    setSelectedClass(classId);
    setIsGlobalSearch(classId === 'all_classes');
  };

  // 検索背景色の取得
  const getSearchBgColor = () => {
    if (isGlobalSearch) return 'bg-base-200/50';
    return classTabConfig.find(config => config.id === selectedClass)?.searchBgColor || 'bg-base-200/50';
  };

  // フィルタリングされたレリックリスト
  const filteredRelics = useMemo(() => {
    return relics
      .filter(relic => {
        const matchesSearch =
          relic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          relic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (relic.flavor && relic.flavor.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRarity = !rarityFilter || relic.rarity === rarityFilter;

        const matchesClass = isGlobalSearch || relic.class === selectedClass || (selectedClass === 'all' && relic.class === 'all');

        return matchesSearch && matchesRarity && matchesClass;
      })
      .sort((a, b) => {
        if (sortBy === 'rarity') {
          // レアリティでソート（starter, common, uncommon, rare, boss, shop, event の順）
          const rarityOrder = { 'starter': 0, 'common': 1, 'uncommon': 2, 'rare': 3, 'boss': 4, 'shop': 5, 'event': 6 };
          return rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.name.localeCompare(b.name);
        } else {
          // 名前でソート
          return a.name.localeCompare(b.name);
        }
      });
  }, [relics, selectedClass, searchTerm, rarityFilter, sortBy, isGlobalSearch]);

  // フィルターのリセット
  const resetFilters = () => {
    setSearchTerm('');
    setRarityFilter('');
    setSortBy('rarity');
  };

  // レリックの統計情報を計算（メモ化）
  const relicStats = React.useMemo(() => {
    // ツールチップが表示されていなくても、レリックIDが設定されていれば計算する
    if (!tooltipRelicId) {
      return createEmptyAllCharacterStats();
    }
    return calculateRelicStats(runs, tooltipRelicId);
  }, [tooltipRelicId, runs]);

  // 右クリックメニューのハンドラー
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    updateSettings({ showStats: !settings.showStats });
  };

  // レリックにマウスを合わせた時のハンドラー
  const handleMouseEnter = (relicId: string, relicName: string, event: React.MouseEvent) => {
    if (!settings.showStats) return;
    
    setTooltipRelicId(relicId);
    setTooltipRelicName(relicName);
    setTooltipVisible(true);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  // レリックからマウスが離れた時のハンドラー
  const handleMouseLeave = () => {
    setTooltipVisible(false);
    setTooltipRelicId(null);
    setTooltipRelicName('');
  };

  // マウス移動のハンドラー
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!tooltipVisible) return;
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div 
      className="card bg-base-100 shadow-xl overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      <div className="w-screen h-screen flex flex-col overflow-hidden">
        <div className="container mx-auto w-full max-w-[1920px] h-full flex flex-col overflow-hidden">
          <h1 className="text-2xl font-bold mb-6 flex-shrink-0 pt-2 px-2">レリック一覧</h1>
          
          {/* タブバー */}
          <div className="w-full relative mx-auto bg-transparent">
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
                  onClick={() => handleTabSelect(classConfig.id as RelicClass)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img
                      src={tabImages[classConfig.id as RelicClass]}
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
                          ${selectedClass === classConfig.id ? classConfig.textColor : ''}
                          transition-all duration-200 text-center
                        `}
                        style={{ fontFamily: 'Kreon, serif' }}
                      >
                        {classConfig.name}
                      </span>
                      {classConfig.costFrame && (
                        <div className="flex-shrink-0 w-6 h-6 items-center justify-center">
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

          {/* 検索窓と検索条件 - タブの下に配置 */}
          <div className={`flex flex-row items-center gap-4 ${getSearchBgColor()} p-4 rounded-t-none rounded-b-lg mt-0 mb-4 z-40`}>
            {/* 検索ボックス */}
            <div className="relative flex-grow z-40">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <img src={searchIcon} alt="Search" className="w-5 h-5 opacity-70 z-50" />
              </div>
              <input
                type="text"
                placeholder="レリック名や効果で検索..."
                className="input input-bordered w-full pl-10 pr-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* レアリティフィルター */}
            <div className="flex-shrink-0">
              <select
                className="select select-bordered w-full max-w-xs"
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as RelicRarity | '')}
              >
                <option value="">全レアリティ</option>
                <option value="starter">スターター</option>
                <option value="common">コモン</option>
                <option value="uncommon">アンコモン</option>
                <option value="rare">レア</option>
                <option value="boss">ボス</option>
                <option value="shop">ショップ</option>
                <option value="event">イベント</option>
              </select>
            </div>

            {/* ソート順 */}
            <div className="flex-shrink-0">
              <select
                className="select select-bordered w-full max-w-xs"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rarity' | 'name')}
              >
                <option value="rarity">レアリティ順</option>
                <option value="name">名前順</option>
              </select>
            </div>

            {/* 全クラス検索トグル */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span>全クラス検索</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={isGlobalSearch}
                onChange={() => setIsGlobalSearch(!isGlobalSearch)}
              />
            </div>

            {/* リセットボタン */}
            <button
              className="btn btn-sm btn-outline flex-shrink-0"
              onClick={resetFilters}
            >
              リセット
            </button>
          </div>

          {/* 検索結果 */}
          <div className="mb-4 px-2 flex-shrink-0">
            <span className="text-base-content/70 font-['Kreon']">
              {filteredRelics.length} 件のレリックが見つかりました
            </span>
          </div>
          
          {/* レリック一覧 - スクロール可能なエリア */}
          <div className="flex-grow overflow-y-auto overflow-x-hidden pb-8 relative no-scrollbar">
            <AnimatePresence>
              <motion.div 
                className="grid gap-6 justify-items-center px-2 w-full"
                style={{ 
                  minHeight: '200px',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredRelics.map((relic) => (
                  <Relic 
                    key={relic.id} 
                    relic={relic} 
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                    searchTerm={searchTerm}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
            
            {/* 結果がない場合 */}
            {filteredRelics.length === 0 && (
              <div className="text-center py-10 text-base-content/70 font-['Kreon']">
                条件に一致するレリックが見つかりませんでした。
              </div>
            )}
          </div>
        </div>
        
        {/* 統計情報ツールチップ */}
        <StatsTooltip
          stats={relicStats}
          title={tooltipRelicName}
          visible={tooltipVisible}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />
      </div>
    </div>
  );
};

export default RelicList; 