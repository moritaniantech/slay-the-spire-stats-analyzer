import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './RelicList.css';
import { getAssetUrl, normalizeRelicName, RELIC_FALLBACK_URL, getRelicImageUrl } from '../utils/assetUtils';
import ImageAsset from './common/ImageAsset';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS, RELIC_KEYWORDS } from '../constants/keywords';
import { useStore } from '../store';
import { calculateRelicStats } from '../services/StatsService';
import { createEmptyAllCharacterStats } from '../models/StatsModel';
import StatsTooltip from './StatsTooltip';

// レリックフレームのインポート
// import relicFrameCommon from '../assets/ui/relicFrames/relicFrameCommon.png';
// import relicFrameUncommon from '../assets/ui/relicFrames/relicFrameUncommon.png';
// import relicFrameRare from '../assets/ui/relicFrames/relicFrameRare.png';
// import relicFrameBoss from '../assets/ui/relicFrames/relicFrameBoss.png';
const relicFrameCommon = getAssetUrl('ui/relicFrames/relicFrameCommon.png') ?? undefined;
const relicFrameUncommon = getAssetUrl('ui/relicFrames/relicFrameUncommon.png') ?? undefined;
const relicFrameRare = getAssetUrl('ui/relicFrames/relicFrameRare.png') ?? undefined;
const relicFrameBoss = getAssetUrl('ui/relicFrames/relicFrameBoss.png') ?? undefined;

// 画像のパスを変数として定義
const searchIcon = getAssetUrl('ui/cursors/magGlass2.png') ?? undefined;
const relicPopup = getAssetUrl('ui/relicFrames/relicPopup.png') ?? undefined;

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
  imagePath: string | undefined;
  flavor?: string;
}

const tabImages: Record<RelicClass, string> = {
  ironclad: 'images/cardLibrary/tab_ironclad.png',
  silent: 'images/cardLibrary/tab_silent.png',
  defect: 'images/cardLibrary/tab_defect.png',
  watcher: 'images/cardLibrary/tab_watcher.png',
  all: 'images/cardLibrary/tab_colorless.png',
  all_classes: 'images/cardLibrary/tab_curse.png',
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
    name: 'COLORLESS',
    searchBgColor: 'bg-base-200/50',
    textColor: 'text-base-content',
    costFrame: 'cards/design/colorless/colorless.png'
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
  const [imagePath, setImagePath] = useState<string | undefined>(undefined);

  useEffect(() => {
    // レリック名から画像パスを取得
    if (relic.englishName) {
      const path = getRelicImageUrl(relic.englishName);
      setImagePath(path ?? undefined);
    } else if (relic.imagePath) {
      const path = getAssetUrl(`images/relics/${relic.imagePath}.png`);
      setImagePath(path ?? undefined);
    } else {
      setImagePath(undefined);
    }
  }, [relic.imagePath, relic.englishName]);

  const relicFrame = getRelicFrame(relic.rarity);
  const rarityColor = getRarityColor(relic.rarity);
  const rarityText = getRarityDisplayText(relic.rarity);
  
  // フレーバーテキストの整形
  const formattedFlavorText = formatFlavorText(relic.flavor);
  
  // HTMLの特殊文字をエスケープする関数（XSS防止）
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // 正規表現の特殊文字をエスケープする関数
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 検索語句のハイライト
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    const escapedSearchTerm = escapeRegExp(searchTerm);
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    return text.replace(regex, '<span class="bg-yellow-400 text-black">$1</span>');
  };

  // レリック名の処理（検索語句）
  const escapedRelicName = escapeHtml(relic.name);
  const highlightedName = searchTerm ? highlightSearchTerm(escapedRelicName) : escapedRelicName;

  // 縁取り用のテキストシャドウスタイル - カードと同様
  const textOutlineStyle = '1px 1px 0 #59564f, -1px -1px 0 #59564f, 1px -1px 0 #59564f, -1px 1px 0 #59564f, 0px 2px 3px rgba(0,0,0,0.7)';

  // relicPopup.pngの元のサイズは190px × 252px
  // カードサイズ420px × 520pxに拡大表示する際のスケール比
  // アスペクト比を維持するため、幅基準でスケール
  const baseWidth = 190;
  const baseHeight = 252;
  const targetWidth = 420;
  const targetHeight = 520;
  
  // 幅基準のスケール比を使用（アスペクト比を維持）
  const scale = targetWidth / baseWidth; // ≈ 2.21
  
  return (
    <div 
      className="relative w-[420px] h-[520px] mx-auto overflow-hidden" 
      style={{ 
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.5))',
        pointerEvents: 'auto',
        zIndex: 1,
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => onMouseEnter(relic.id, relic.name, e)}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {/* レリック背景（relicPopup.png） - 最背面 */}
      {relicPopup && (
        <img
          src={relicPopup}
          alt="Relic Background"
          className="absolute top-0 left-0 w-[420px] h-[520px]"
          style={{ 
            zIndex: 0,
            objectFit: 'cover'
          }}
          onError={(e) => {
            e.currentTarget.src = getAssetUrl('ui/relicFrames/relicFrameCommon.png') ?? '';
          }}
        />
      )}

      {/* レリック名（relicPopup.pngの上部枠内に配置） */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 text-center"
        style={{ 
          top: `${50 * scale}px`,
          width: `${170 * scale}px`,
          color: '#ECE8DA',
          fontSize: `${8 * scale}px`,
          fontFamily: 'Kreon, serif',
          zIndex: 4
        }}
      >
        <div 
          className="font-en font-semibold"
          style={{
            textShadow: textOutlineStyle,
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            lineHeight: '1.2'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedName }}
        />
      </div>

      {/* レアリティ表示（レリック名の直下に配置） */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 w-full text-center"
        style={{ 
          top: `${60 * scale}px`,
          zIndex: 4
        }}
      >
        <span 
          className="font-en"
          style={{ 
            fontFamily: 'Kreon, serif',
            color: rarityColor,
            fontWeight: 'bold',
            fontSize: `${6 * scale}px`
          }}
        >
          {rarityText}
        </span>
      </div>

      {/* relicFrame（relicPopup.pngの黒い枠にぴったり重なるように配置） */}
      {relicFrame && (
        <img
          src={relicFrame}
          alt="Relic Frame"
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{ 
            // relicPopup.pngの元のサイズ190×252での黒い枠の位置を基準に計算
            // 黒い枠は元のサイズで約: top=50px, left=50px, width=90px, height=90px
            top: `${3 * scale}px`,
            width: `${230 * scale}px`,
            height: `${230 * scale}px`,
            zIndex: 2,
            objectFit: 'cover' // アスペクト比を維持しつつ、指定サイズを埋める
          }}
          onError={(e) => {
            e.currentTarget.src = getAssetUrl('ui/relicFrames/relicFrameCommon.png') ?? '';
          }}
        />
      )}

      {/* レリック画像（relicFrameの内側、黒い枠内に収まるように配置） */}
      <img
        src={imagePath ?? RELIC_FALLBACK_URL ?? undefined}
        alt={relic.name}
        className="absolute left-1/2 transform -translate-x-1/2 object-contain"
        style={{
          // フレームの内側に収まるように、少し小さめに配置
          top: `${60 * scale}px`,
          width: `${65 * scale}px`,
          height: `${80 * scale}px`,
          zIndex: 3
        }}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.retried) {
            img.dataset.retried = 'true';
            const fallbackUrl = getAssetUrl('ui/relicSilhouette.png');
            if (fallbackUrl) {
              img.src = fallbackUrl;
            }
          }
        }}
      />

      {/* レリック説明（フレームの下、relicPopup.pngの範囲内に配置） */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 text-center"
        style={{
          // 黒い枠の下（元のサイズで約140px）に配置
          top: `${140 * scale}px`,
          width: `${120 * scale}px`,
          maxHeight: `${50 * scale}px`,
          zIndex: 4,
          overflow: 'hidden'
        }}
      >
        <div 
          className="text-white px-2 leading-tight" 
          style={{ 
            fontFamily: 'Kreon, serif',
            fontSize: `${6 * scale}px`,
            color: '#ECE8DA',
            lineHeight: '1.25'
          }}
        >
          {colorizeKeywords(relic.description, relic.rarity, searchTerm)}
        </div>
      </div>

      {/* フレーバーテキスト（最下部、relicPopup.pngの範囲内に配置） */}
      {formattedFlavorText && (
        <>
          {/* 区切り線 */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{
              // 元のサイズで約190pxの位置に配置
              top: `${190 * scale}px`,
              width: `${120 * scale}px`,
              height: '1px',
              backgroundColor: '#ECE8DA',
              opacity: 0.3,
              zIndex: 4
            }}
          />
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 text-center"
            style={{
              // 元のサイズで約200pxの位置に配置
              top: `${170 * scale}px`,
              width: `${120 * scale}px`,
              maxHeight: `${40 * scale}px`,
              zIndex: 4,
              overflow: 'hidden'
            }}
          >
            <p 
              className="text-white px-2 leading-tight italic" 
              style={{ 
                fontFamily: 'ZillaSlab, serif',
                color: '#FFF6E4',
                opacity: 0.9,
                fontSize: `${6 * scale}px`,
                lineHeight: '1.15'
              }}
            >
              {searchTerm && formattedFlavorText.toLowerCase().includes(searchTerm.toLowerCase()) ? (
                <span
                  dangerouslySetInnerHTML={{
                    __html: highlightSearchTerm(escapeHtml(formattedFlavorText))
                  }}
                />
              ) : (
                formattedFlavorText
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const RelicList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<RelicClass>('all_classes');
  const [selectedRarities, setSelectedRarities] = useState<RelicRarity[]>([]);
  const [hoveredRelic, setHoveredRelic] = useState<{ id: string, name: string, element: HTMLElement | null } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const { runs, settings } = useStore();
  // const allCharacterStats = useMemo(() => calculateRelicStats(runs), [runs]); // この行をコメントアウト

  // --- ここから追加 ---
  const [allRelics, setAllRelics] = useState<Record<string, RelicData>>({});
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelics = async () => {
      try {
        let jsonData: { relics: RelicData[] } & Record<string, any>;
        
        // Electron環境（開発環境・本番環境共通）: IPC経由でファイルを読み込む
        if (window.electronAPI) {
          try {
            // getAssetPathにはassets/プレフィックスなしで渡す（getAssetPathが内部でassets/を追加するため）
            const assetPath = 'relics/relics.json';
            console.log('[RelicList] Requesting asset path for:', assetPath);
            const filePath = await window.electronAPI.getAssetPath(assetPath);
            if (!filePath) {
              throw new Error('getAssetPath returned null');
            }
            console.log('[RelicList] Resolved file path:', filePath);
            
            // ファイルの存在確認（デバッグ用）
            try {
              const exists = await window.electronAPI.assetExists(assetPath);
              console.log('[RelicList] Asset exists check result:', exists);
            } catch (existsError) {
              console.warn('[RelicList] Asset exists check failed:', existsError);
            }
            
            const fileContent = await window.electronAPI.readFile(filePath, 'utf8');
            if (!fileContent || fileContent.length === 0) {
              throw new Error('File content is empty');
            }
            jsonData = JSON.parse(fileContent);
            if (!jsonData || !jsonData.relics || !Array.isArray(jsonData.relics)) {
              throw new Error('Invalid JSON structure: missing relics array');
            }
            console.log('[RelicList] JSON data loaded successfully via IPC. Relics count:', jsonData.relics.length);
          } catch (ipcError) {
            console.error('[RelicList] IPC経由の読み込みに失敗:', ipcError);
            console.error('[RelicList] Error details:', {
              message: ipcError instanceof Error ? ipcError.message : String(ipcError),
              stack: ipcError instanceof Error ? ipcError.stack : undefined
            });
            // IPC経由の読み込みが失敗した場合、フォールバックとしてfetchを試す
            console.warn('[RelicList] フォールバック: 通常のfetchを試行');
            try {
              const response = await fetch('/assets/relics/relics.json');
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              jsonData = await response.json();
              console.log('[RelicList] JSON data loaded successfully via fallback fetch.');
            } catch (fetchError) {
              console.error('[RelicList] フォールバックfetchも失敗:', fetchError);
              throw ipcError; // 元のエラーを再スロー
            }
          }
        } else {
          // 非Electron環境: 通常のfetchを使用
          const response = await fetch('/assets/relics/relics.json');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          jsonData = await response.json();
          console.log('[RelicList] JSON data loaded successfully.');
        }
        
        // Assuming the JSON structure is { relics: RelicData[], ...otherKeys }
        if (!jsonData || !Array.isArray(jsonData.relics)) {
          console.error("Invalid data structure from relics.json. Expected an object with a 'relics' array.", jsonData);
          setLoadingError('レリックデータの形式が正しくありません。');
          return;
        }

        const actualRelicsArray: RelicData[] = jsonData.relics;
        
        // Convert array to Record<string, RelicData> using relic name as key
        const relicsRecord = actualRelicsArray.reduce((acc, relic) => {
          if (relic.name && typeof relic.name === 'string') {
            acc[normalizeRelicName(relic.name)] = relic;
          }
          return acc;
        }, {} as Record<string, RelicData>);

        setAllRelics(relicsRecord);
      } catch (error) {
        console.error("Failed to fetch relics:", error);
        setLoadingError('レリックデータの読み込みに失敗しました。');
      }
    };
    fetchRelics();
  }, []);
  // --- ここまで追加 ---

  const searchRef = useRef<HTMLInputElement>(null);
  const rarityFilterRef = useRef<HTMLDivElement>(null);
  const [relics, setRelics] = useState<FormattedRelic[]>([]);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<RelicRarity | ''>('');
  const [sortBy, setSortBy] = useState<'rarity' | 'name'>('rarity');
  
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipRelicId, setTooltipRelicId] = useState<string | null>(null);
  const [tooltipRelicName, setTooltipRelicName] = useState<string | null>(null);

  const [relicImages, setRelicImages] = useState<{ [key: string]: string | undefined }>({});

  useEffect(() => {
    // レリックデータを整形
    const formattedRelics: FormattedRelic[] = [];

    // 重複チェック用のセット
    const processedRelics = new Set<string>();

    Object.entries(allRelics).forEach(([relicId, relicData]) => {
      // allRelics is now Record<string, RelicData>, relicId is the normalized name
      const originalName = relicData.name; // Use original name from relicData for display and processing

      // 重複チェック (originalName を使うべきか、relicId で良いか確認)
      // ここでは relicId (normalized name) がユニークなキーとなっている前提
      if (processedRelics.has(relicId)) {
        return;
      }
      processedRelics.add(relicId);

      // クラスの判定
      let relicClass: RelicClass;
      const normalizedClass = relicData.class.toLowerCase().trim();
      
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
            relicClass = 'all'; // Default to 'all' if class is not recognized
        }
      }

      // レアリティの判定
      let relicRarity: RelicRarity;
      const normalizedRarity = relicData.rarity.toLowerCase();
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
          relicRarity = 'common'; // Default rarity
      }

      // 画像パスの生成（getRelicImageUrl を使用）
      const imagePath = getRelicImageUrl(originalName) ?? undefined;

      formattedRelics.push({
        id: relicId, // Use the normalized relicId from the allRelics record key
        englishName: originalName, // Store original English name
        name: originalName, // For display, assuming it's already translated or should be English
        description: relicData.effect,
        class: relicClass,
        rarity: relicRarity,
        imagePath: imagePath, // Use imagePath from getRelicImageUrl
        flavor: relicData.flavor
      });
    });

    setRelics(formattedRelics);
  }, [allRelics]);

  useEffect(() => {
    const loadImages = () => {
      // 画像のプリロード
      const images: { [key: string]: string | undefined } = {};
      // Filter out undefined image paths before trying to get asset URLs
      const validImagePaths = relics.map(r => r.imagePath).filter(Boolean) as string[];
      for (const relicImagePath of validImagePaths) {
        // Assuming relicImagePath is like "ironWave" and needs full path construction
        images[relicImagePath] = getAssetUrl(`images/relics/${relicImagePath}.png`) ?? undefined;
      }
      setRelicImages(images);
    };
    if (relics.length > 0) {
        loadImages();
    }
  }, [relics]);

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
          !searchTerm ||
          relic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          relic.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (relic.flavor && relic.flavor.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRarity = !rarityFilter || relic.rarity === rarityFilter;

        // selectedClass === 'all_classes' の場合はすべてのレリックを表示
        const matchesClass = selectedClass === 'all_classes' || isGlobalSearch || relic.class === selectedClass || (selectedClass === 'all' && relic.class === 'all');

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

  // レリックの統計情報を計算
  const relicStatsMap = useMemo(() => {
    if (!relics || relics.length === 0 || !runs || runs.length === 0 || !settings.enableStatsTooltip) {
      return new Map();
    }
    console.time('RelicList:calculateAllRelicStats');
    const newStatsMap = new Map();
    relics.forEach(relic => {
      if (relic && relic.id) { 
        newStatsMap.set(relic.id, calculateRelicStats(runs, relic.id));
      }
    });
    console.timeEnd('RelicList:calculateAllRelicStats');
    return newStatsMap;
  }, [relics, runs, settings.enableStatsTooltip]);

  // 右クリックメニューのハンドラー
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    console.warn("settings and updateSettings are not defined in this component.")
  };

  // レリックにマウスを合わせた時のハンドラー
  const handleMouseEnter = (relicId: string, relicName: string, event: React.MouseEvent) => {
    setTooltipRelicId(relicId);
    setTooltipRelicName(relicName);
    setTooltipVisible(true);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  // レリックからマウスが離れた時のハンドラー
  const handleMouseLeave = () => {
    setTooltipVisible(false);
    setTooltipRelicId(null);
    setTooltipRelicName(null);
  };

  // マウス移動のハンドラー
  const handleMouseMove = (event: React.MouseEvent) => {
    if (!tooltipVisible) return;
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <div 
      className="card-navy overflow-hidden"
      onContextMenu={handleContextMenu}
    >
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <div className="container mx-auto w-full max-w-[1920px] px-4 h-full flex flex-col overflow-hidden">
          <h1 className="text-2xl font-bold mb-6 flex-shrink-0 pt-2 text-primary-custom font-jp">レリック一覧</h1>
          
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
                  onClick={() => handleTabSelect(classConfig.id as RelicClass)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageAsset
                      path={tabImages[classConfig.id as RelicClass] ?? 'images/cardLibrary/tab_colorless.png'}
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
                          <ImageAsset
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
                          <ImageAsset
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
          
          <div className="flex-1 overflow-y-auto px-2 pb-4 pt-6" style={{ pointerEvents: 'auto' }}>
            <div style={{ pointerEvents: 'auto' }}>
              <AnimatePresence>
                <motion.div 
                  className="grid auto-rows-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-[1920px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filteredRelics.map((relic) => (
                    <motion.div
                      key={relic.id}
                      className="flex justify-center items-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.3,
                        delay: Math.random() * 0.3
                      }}
                      whileHover={{
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      }}
                      style={{ pointerEvents: 'auto', zIndex: 10 }}
                    >
                      <Relic
                        relic={relic}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        onMouseMove={handleMouseMove}
                        searchTerm={searchTerm}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            {filteredRelics.length === 0 && !loadingError && (
              <div className="text-center py-10">
                <p>該当するレリックは見つかりませんでした。</p>
                {(searchTerm || rarityFilter) && (
                  <button onClick={resetFilters} className="btn btn-sm btn-outline mt-4">フィルターをリセット</button>
                )}
              </div>
            )}
            {loadingError && (
              <div className="text-center py-10 text-error">
                <p>{loadingError}</p>
              </div>
            )}
          </div>

        </div>

        {tooltipVisible && tooltipRelicId && tooltipRelicName && settings.enableStatsTooltip && (
          <StatsTooltip
            stats={relicStatsMap.get(tooltipRelicId) || createEmptyAllCharacterStats()}
            title={tooltipRelicName}
            visible={tooltipVisible}
            x={tooltipPosition.x}
            y={tooltipPosition.y}
          />
        )}
      </div>
    </div>
    </div>
  );
};

export default RelicList;
