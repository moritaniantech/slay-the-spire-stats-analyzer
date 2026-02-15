import React, { useMemo } from 'react';
import { KEYWORDS, COLORS } from '../constants/keywords';
import { getAssetUrl } from '../utils/assetUtils';

interface CardProps {
  name: string;
  class: 'ironclad' | 'silent' | 'defect' | 'watcher' | 'colorless' | 'curse';
  type: 'attack' | 'skill' | 'power' | 'status' | 'curse';
  cost: number | string;
  description: string;
  rarity: 'starter' | 'common' | 'uncommon' | 'rare' | 'special' | 'curse';
  upgraded?: boolean;
  originalDescription?: string;  // アップグレード前の説明文
  originalCost?: number | string;  // アップグレード前のコスト
  onClick?: () => void;  // クリックイベントハンドラ
  searchTerm?: string;  // 検索ワード
}

const Card: React.FC<CardProps> = ({ 
  name, 
  class: cardClass, 
  type, 
  cost, 
  description, 
  rarity, 
  upgraded = false,
  originalDescription,
  originalCost,
  onClick,
  searchTerm = ''
}) => {
  // 画像パスを同期的に生成（useMemoでメモ化）
  const urls = useMemo(() => {
    // カードのベース画像パスを生成
    const basePath = cardClass === 'curse'
      ? 'cards/design/curse/curse_curse.png'
      : type === 'status'
        ? 'cards/design/colorless/colorless_skill.png'
        : `cards/design/${cardClass}/${cardClass}_${type}.png`;

    // フレームとバナーのパスを生成
    const adjustedRarity = rarity === 'starter' || rarity === 'special' || rarity === 'curse' ? 'common' : rarity;
    const adjustedType = type === 'curse' || type === 'status' ? 'skill' : type;
    const framePathStr = `cards/design/frame/frame_${adjustedRarity}_${adjustedType}.png`;
    const bannerPathStr = `cards/design/banner/banner_${adjustedRarity}.png`;

    // コストの枠画像パスを生成
    const costFramePathStr = type === 'status'
      ? 'cards/design/colorless/colorless.png'
      : `cards/design/${cardClass}/${cardClass}.png`;

    // カード画像のパスを生成（英語名を小文字に変換し、スペースをアンダースコアに置換）
    const cardImagePathStr = cardClass === 'curse'
      ? `images/cards/${cardClass}/${name.toLowerCase().replace(/\s+/g, '_')}.png`
      : type === 'status'
        ? `images/cards/status/${name.toLowerCase().replace(/\s+/g, '_')}.png`
        : `images/cards/${cardClass}/${type}/${name.toLowerCase().replace(/\s+/g, '_')}.png`;

    return {
      base: getAssetUrl(basePath),
      frame: getAssetUrl(framePathStr),
      banner: getAssetUrl(bannerPathStr),
      costFrame: getAssetUrl(costFramePathStr),
      cardImage: getAssetUrl(cardImagePathStr),
    };
  }, [cardClass, type, rarity, name]);

  // カードタイプの英語表示
  const typeDisplay = {
    'attack': 'Attack',
    'skill': 'Skill',
    'power': 'Power',
    'status': 'Status',
    'curse': 'Curse'
  }[type];

  // 正規表現の特殊文字をエスケープする関数
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 説明文のキーワードをハイライト
  const getHighlightedDescription = (text: string) => {
    let highlighted = text;
    
    // アップグレード前後の説明文を比較して追加されたキーワードを検出
    const keywordsAddedAfterUpgrade: string[] = [];
    if (upgraded && originalDescription) {
      // 特定のキーワードのリスト
      const keywordsList = [
        'Unplayable', 'Ethereal', 'Weak', 'Curse', 'Innate', 'Exhaust', 'Block', 
        'Vulnerable', 'Channel', 'Lightning', 'Frost', 'Dark', 'Plasma', 'Evoke', 
        'Void', 'channeled', 'Focus', 'Strength', 'Dexterity', 'Artifact', 'upgrade', 
        'upgraded', 'Fatal', 'Burn', 'Poison', 'Shiv', 'Shiv+', 'Wrath', 'Calm', 
        'Scry', 'Stance', 'Insight', 'Retain', 'Retained', 'Mark', 'Mantra', 'Smite', 
        'Miracle', 'Miracle+', 'Safety', 'Intangible', 'Divinity', 'Expunger'
      ];
      
      // アップグレード後に追加されたキーワードを検出
      keywordsList.forEach(keyword => {
        const escapedKeyword = escapeRegExp(keyword);
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
        if (!originalDescription.match(regex) && text.match(regex)) {
          keywordsAddedAfterUpgrade.push(keyword);
        }
      });
    }
    
    // 特定のキーワードに色を適用
    const keywordsList = [
      'Unplayable', 'Ethereal', 'Weak', 'Curse', 'Innate', 'Exhaust', 'Block', 
      'Vulnerable', 'Channel', 'Lightning', 'Frost', 'Dark', 'Plasma', 'Evoke', 
      'Void', 'channeled', 'Focus', 'Strength', 'Dexterity', 'Artifact', 'upgrade', 
      'upgraded', 'Fatal', 'Burn', 'Poison', 'Shiv', 'Shiv+', 'Wrath', 'Calm', 
      'Scry', 'Stance', 'Insight', 'Retain', 'Retained', 'Mark', 'Mantra', 'Smite', 
      'Miracle', 'Miracle+', 'Safety', 'Intangible', 'Divinity', 'Expunger'
    ];
    
    keywordsList.forEach(keyword => {
      const escapedKeyword = escapeRegExp(keyword);
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      
      // アップグレード後に追加されたキーワードには #76F900 を使用、それ以外は #F0C944
      const color = keywordsAddedAfterUpgrade.includes(keyword) ? '#76F900' : '#F0C944';
      
      highlighted = highlighted.replace(regex, (match) => `<span style="color: ${color}; font-family: 'Kreon', serif;">${match}</span>`);
    });
    
    // キーワードをハイライト (以前のコードと同様)
    Object.entries(KEYWORDS).forEach(([keyword, color]) => {
      const escapedKeyword = escapeRegExp(keyword);
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => `<span style="color: ${color}; font-family: 'Kreon', serif;">${match}</span>`);
    });
    
    // 数字のハイライト (変更されたものだけハイライト)
    if (upgraded && originalDescription) {
      // アップグレード前後で単語が変化したかを検出する機能を追加
      const findAddedOrChangedWords = () => {
        // テキストから特殊文字を除去して単語に分割する関数
        const getWords = (text: string) => {
          // 句読点などを空白に置き換えて単語を抽出しやすくする
          const cleanText = text.replace(/[.,!?;:]/g, ' ');
          return cleanText.split(/\s+/).filter(word => word.length > 0);
        };
        
        const originalWords = getWords(originalDescription);
        const newWords = getWords(text);
        
        // 単語ごとの出現回数をカウント
        const originalWordCount: Record<string, number> = {};
        const newWordCount: Record<string, number> = {};
        
        originalWords.forEach(word => {
          originalWordCount[word] = (originalWordCount[word] || 0) + 1;
        });
        
        newWords.forEach(word => {
          newWordCount[word] = (newWordCount[word] || 0) + 1;
        });
        
        // 追加された単語や出現回数が増えた単語を検出
        const changedWords: string[] = [];
        
        for (const word in newWordCount) {
          // アップグレード後にのみ存在する単語、または出現回数が増えた単語
          if (!originalWordCount[word] || newWordCount[word] > originalWordCount[word]) {
            changedWords.push(word);
          }
        }
        
        return changedWords;
      };
      
      // アップグレード前後で変化した単語を検出
      const changedWords = findAddedOrChangedWords();
      
      // 変化した単語をハイライト（単語境界を考慮）
      changedWords.forEach(word => {
        // 単語が数字だけの場合は既に処理されているのでスキップ
        if (/^\d+$/.test(word)) return;
        
        // 特殊な単語（ALLなど）は単語境界を厳密にチェックしない
        const specialWords = ['ALL'];
        
        if (specialWords.includes(word)) {
          // 大文字のALLなど、特殊な単語は正確にマッチさせる
          const escapedWord = escapeRegExp(word);
          const regex = new RegExp(`(${escapedWord})`, 'g');
          highlighted = highlighted.replace(regex, `<span style="color: ${COLORS.UPGRADED_VALUE}; font-family: 'Kreon', serif;">$1</span>`);
        } else {
          // 通常の単語は単語境界をチェック（正規表現の特殊文字をエスケープ）
          const escapedWord = escapeRegExp(word);
          const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
          highlighted = highlighted.replace(regex, `<span style="color: ${COLORS.UPGRADED_VALUE}; font-family: 'Kreon', serif;">${word}</span>`);
        }
      });
      
      // アップグレード前後で数字が変化したかを確認する関数
      const findChangedNumbers = () => {
        // 元の説明文から数字を抽出
        const originalNumbers: {[key: string]: number[]} = {};
        const originalMatches = originalDescription.match(/\b(\d+)\b/g) || [];
        originalMatches.forEach(numStr => {
          if (!originalNumbers[numStr]) originalNumbers[numStr] = [];
          originalNumbers[numStr].push(1);
        });
        
        // 現在の説明文の数字を抽出して変化を確認
        const changedNumbers: string[] = [];
        const currentMatches = text.match(/\b(\d+)\b/g) || [];
        
        currentMatches.forEach(numStr => {
          // 元の説明文にその数字がなければ変化したと判定
          if (!originalNumbers[numStr]) {
            changedNumbers.push(numStr);
            return;
          }
          
          // 元の説明文に同じ数字があっても、出現回数が違えば変化したと判定
          if (originalNumbers[numStr].length > 0) {
            originalNumbers[numStr].pop();
          } else {
            changedNumbers.push(numStr);
          }
        });
        
        return changedNumbers;
      };
      
      const changedNumbers = findChangedNumbers();
      
      // 変化した数字だけをハイライト
      changedNumbers.forEach(numStr => {
        const regex = new RegExp(`\\b${numStr}\\b`, 'g');
        highlighted = highlighted.replace(regex, `<span style="color: ${COLORS.UPGRADED_VALUE}; font-family: 'Kreon', serif;">${numStr}</span>`);
      });
    }
    
    return highlighted;
  };

  // 検索語句のハイライト
  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    
    // 正規表現の特殊文字をエスケープ
    const escapedSearchTerm = escapeRegExp(searchTerm);
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    return text.replace(regex, '<span class="bg-yellow-400 text-black">$1</span>');
  };

  // 説明文の処理
  const highlightedDescription = getHighlightedDescription(description);
  const finalDescription = searchTerm ? highlightSearchTerm(highlightedDescription) : highlightedDescription;

  // 名前の処理（検索語句とアップグレード）
  let displayName = name;
  if (upgraded) {
    displayName = `${name}+`;
  }
  const highlightedName = searchTerm ? highlightSearchTerm(displayName) : displayName;

  // 縁取り用のテキストシャドウスタイル - より立体的で画像のような見た目に調整
  const textOutlineStyle = '1px 1px 0 #59564f, -1px -1px 0 #59564f, 1px -1px 0 #59564f, -1px 1px 0 #59564f, 0px 2px 3px rgba(0,0,0,0.7)';
  
  // コスト用の太い縁取りスタイル - 16方向の縁取りで隙間をなくす
  const costOutlineStyle = 
    '2px 0px 0 #59564f, ' +    // 右
    '-2px 0px 0 #59564f, ' +   // 左
    '0px 2px 0 #59564f, ' +    // 下
    '0px -2px 0 #59564f, ' +   // 上
    '2px 2px 0 #59564f, ' +    // 右下
    '-2px -2px 0 #59564f, ' +  // 左上
    '2px -2px 0 #59564f, ' +   // 右上
    '-2px 2px 0 #59564f, ' +   // 左下
    '1px 2px 0 #59564f, ' +    // 右斜め下
    '-1px 2px 0 #59564f, ' +   // 左斜め下
    '2px 1px 0 #59564f, ' +    // 右下斜め
    '-2px 1px 0 #59564f, ' +   // 左下斜め
    '1px -2px 0 #59564f, ' +   // 右斜め上
    '-1px -2px 0 #59564f, ' +  // 左斜め上
    '2px -1px 0 #59564f, ' +   // 右上斜め
    '-2px -1px 0 #59564f, ' +  // 左上斜め
    '0px 3px 4px rgba(0,0,0,0.7)';

  return (
    <div 
      className="relative w-[190px] h-[252px] mx-auto" 
      style={{ 
        filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.5))',
        pointerEvents: 'auto',
        zIndex: 1,
        cursor: type === 'status' || type === 'curse' ? 'default' : 'pointer'
      }}
      onClick={e => {
        e.stopPropagation();
        if (onClick && type !== 'status' && type !== 'curse') onClick();
      }}
    >
      {/* ベースとなるカードの枠 */}
      {urls.base && (
        <img
          src={urls.base}
          alt="Base Card"
          className="absolute top-0 left-0 w-[190px] h-[252px]"
          onError={(e) => {
            const fallback = getAssetUrl(`cards/design/colorless/colorless_${type === 'curse' ? 'skill' : type}.png`);
            if (fallback) e.currentTarget.src = fallback;
          }}
        />
      )}

      {/* カード画像 */}
      {urls.cardImage && (
        <img
          src={urls.cardImage}
          alt={name}
          className="absolute top-[25px] left-1/2 transform -translate-x-1/2 w-[220px] h-[120px] object-contain"
          onError={(e) => {
            const fallback = getAssetUrl(`images/cards/colorless/${type === 'curse' ? 'skill' : type}/default.png`);
            if (fallback) e.currentTarget.src = fallback;
          }}
        />
      )}

      {/* フレーム */}
      {urls.frame && (
        <img
          src={urls.frame}
          alt="Frame"
          className="absolute top-0 left-[10px] w-[170px] h-[150px]"
        />
      )}

      {/* バナー（カード名の背景） */}
      {urls.banner && (
        <img
          src={urls.banner}
          alt="Banner"
          className="absolute top-[4px] left-[-10px]"
          style={{
            zIndex: 1,
            width: '210px',
            maxWidth: 'none'
          }}
        />
      )}

      {/* カード名 */}
      <div 
        className="absolute top-[8px] left-1/2 transform -translate-x-1/2 w-[140px] text-center"
        style={{ 
          color: upgraded ? COLORS.UPGRADED_NAME : '#ECE8DA',
          fontSize: '15px',
          fontFamily: 'Kreon, serif',
          zIndex: 3
        }}
      >
        <div 
          className="font-en font-semibold whitespace-nowrap overflow-hidden"
          style={{
            textShadow: textOutlineStyle,
            fontWeight: 'bold',
            letterSpacing: '0.5px'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedName }}
        />
      </div>

      {/* コスト枠（コストが-1の場合は表示しない） */}
      {cost !== -1 && urls.costFrame && (
        <div className="absolute top-[-13px] left-[-16px] w-[45px] h-[45px]" style={{ zIndex: 2 }}>
          <img
            src={urls.costFrame}
            alt="Cost Frame"
            className="w-full h-full"
            onError={(e) => {
              const fallback = getAssetUrl('cards/design/colorless/colorless.png');
              if (fallback) e.currentTarget.src = fallback;
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className="font-en font-bold text-2xl text-white card-cost"
              style={{ 
                color: upgraded && originalCost !== undefined && cost !== originalCost ? COLORS.UPGRADED_VALUE : '#ECE8DA',
                fontFamily: 'Kreon, serif',
                textShadow: costOutlineStyle,
                fontWeight: 'bold'
              }}
            >
              {cost}
            </span>
          </div>
        </div>
      )}

      {/* カードタイプ */}
      <div className="absolute top-[125px] left-1/2 transform -translate-x-1/2 w-full text-center">
        <span 
          className="font-en text-white card-type"
          style={{ 
            fontFamily: 'Kreon, serif',
            color: '#59564f',
            fontWeight: 'bold',
            zIndex: 3
          }}
        >
          {typeDisplay}
        </span>
      </div>

      {/* カード説明 */}
      <div className="absolute top-[150px] left-[98px] transform -translate-x-1/2 w-[134px] h-[78px] text-center flex items-center justify-center overflow-hidden">
        <p 
          className="text-white text-xs px-2 leading-tight" 
          style={{ 
            fontFamily: 'Kreon, serif'
          }}
          dangerouslySetInnerHTML={{ __html: finalDescription }}
        />
      </div>
    </div>
  );
};

export default Card;