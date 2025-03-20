import React from 'react';
import { KEYWORDS, COLORS } from '../constants/keywords';

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
  // カードのベース画像パスを生成
  const baseCardPath = cardClass === 'curse' 
    ? `/src/assets/cards/design/curse/curse_curse.png`
    : type === 'status'
      ? `/src/assets/cards/design/colorless/colorless_skill.png`
      : `/src/assets/cards/design/${cardClass}/${cardClass}_${type}.png`;
  
  // フレームとバナーのパスを生成
  const adjustedRarity = rarity === 'starter' || rarity === 'special' || rarity === 'curse' ? 'common' : rarity;
  const adjustedType = type === 'curse' || type === 'status' ? 'skill' : type;
  const framePath = `/src/assets/cards/design/frame/frame_${adjustedRarity}_${adjustedType}.png`;
  const bannerPath = `/src/assets/cards/design/banner/banner_${adjustedRarity}.png`;
  
  // コストの枠画像パスを生成
  const costFramePath = type === 'status'
    ? `/src/assets/cards/design/colorless/colorless.png`
    : `/src/assets/cards/design/${cardClass}/${cardClass}.png`;
  
  // カード画像のパスを生成（英語名を小文字に変換し、スペースをアンダースコアに置換）
  const cardImagePath = cardClass === 'curse'
    ? `/src/assets/images/cards/${cardClass}/${name.toLowerCase().replace(/\s+/g, '_')}.png`
    : type === 'status'
      ? `/src/assets/images/cards/status/${name.toLowerCase().replace(/\s+/g, '_')}.png`
      : `/src/assets/images/cards/${cardClass}/${type}/${name.toLowerCase().replace(/\s+/g, '_')}.png`;

  // カードタイプの英語表示
  const typeDisplay = {
    'attack': 'Attack',
    'skill': 'Skill',
    'power': 'Power',
    'status': 'Status',
    'curse': 'Curse'
  }[type];

  // コストの変更を強調表示
  const displayCost = () => {
    // アップグレードされていない場合は通常のコストを表示
    if (!upgraded) {
      return typeof cost === 'string' ? cost.toUpperCase() : cost;
    }

    // アップグレード時のコスト処理
    const normalizeValue = (value: number | string | undefined): string => {
      if (value === undefined) return '';
      if (typeof value === 'string') return value.toUpperCase();
      return String(value);
    };

    // コストの正規化（undefinedの場合も考慮）
    const originalCostValue = originalCost;
    const currentCostValue = cost;

    // 数値型の場合は数値として比較
    if (typeof originalCostValue === 'number' && typeof currentCostValue === 'number') {
      if (originalCostValue !== currentCostValue) {
        return <span style={{ color: COLORS.UPGRADE }}>{currentCostValue}</span>;
      }
      return currentCostValue;
    }

    // 文字列型の場合は正規化して比較
    const normalizedOriginal = normalizeValue(originalCostValue);
    const normalizedCurrent = normalizeValue(currentCostValue);

    if (normalizedOriginal !== normalizedCurrent) {
      return <span style={{ color: COLORS.UPGRADE }}>{normalizedCurrent}</span>;
    }

    return normalizedCurrent;
  };

  // キーワードに色を付ける関数
  const colorizeKeywords = (text: string) => {
    // 文を文単位で分割（ピリオドで区切る）
    const sentences = text.split(/(?<=\.)/).filter(Boolean);
    const result: React.ReactNode[] = [];
    const searchTermLower = searchTerm.toLowerCase();
    const hasSearchTerm = searchTerm && searchTermLower.length > 0;

    sentences.forEach((sentence, index) => {
      // 文字列を単語と区切り文字に分割
      const parts = sentence.split(/([.,\s]|\d+|[A-Za-z]+)/g).filter(Boolean);
      const sentenceResult: React.ReactNode[] = [];

      parts.forEach((part, i) => {
        if (/^\s+$/.test(part)) {
          sentenceResult.push(
            <React.Fragment key={`space-${i}`}>{part}</React.Fragment>
          );
          return;
        }

        // 検索ワードに一致するかチェック
        if (hasSearchTerm && part.toLowerCase().includes(searchTermLower)) {
          const startIndex = part.toLowerCase().indexOf(searchTermLower);
          const endIndex = startIndex + searchTermLower.length;
          
          sentenceResult.push(
            <span key={`highlight-${i}`}>
              {part.substring(0, startIndex)}
              <span style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)', color: '#ffffff' }}>
                {part.substring(startIndex, endIndex)}
              </span>
              {part.substring(endIndex)}
            </span>
          );
        } else if (KEYWORDS.includes(part)) {
          sentenceResult.push(
            <span 
              key={`keyword-${i}`}
              style={{ 
                color: COLORS.KEYWORD,
                display: 'inline-block',
                verticalAlign: 'baseline'
              }}
            >
              {part}
            </span>
          );
        } else {
          sentenceResult.push(
            <React.Fragment key={`text-${i}`}>{part}</React.Fragment>
          );
        }
      });

      result.push(
        <div key={`sentence-${index}`} style={{ textAlign: 'center' }}>
          {sentenceResult}
          {index < sentences.length - 1 && <br />}
        </div>
      );
    });

    return (
      <div style={{ display: 'inline-block', whiteSpace: 'pre-wrap', width: '100%', textAlign: 'center' }}>
        {result}
      </div>
    );
  };

  // 説明文の差分を強調表示する関数
  const highlightDifferences = (original: string, upgraded: string) => {
    if (!original || !upgraded) return colorizeKeywords(upgraded);
    const searchTermLower = searchTerm.toLowerCase();
    const hasSearchTerm = searchTerm && searchTermLower.length > 0;

    // 文頭のキーワードを特別処理
    const handleLeadingKeywords = (text: string): { prefix: string[], rest: string } => {
      const leadingKeywords = ['Innate', 'Retain', 'Ethereal'];
      const prefixes: string[] = [];
      let rest = text;

      // 文頭のキーワードを順番に検出
      let changed = true;
      while (changed) {
        changed = false;
        for (const keyword of leadingKeywords) {
          if (rest.startsWith(`${keyword}.`)) {
            prefixes.push(`${keyword}.`);
            rest = rest.slice(keyword.length + 1).trim();
            changed = true;
            break;
          }
          if (rest.startsWith(`${keyword} `)) {
            prefixes.push(`${keyword}.`);
            rest = rest.slice(keyword.length + 1).trim();
            changed = true;
            break;
          }
        }
      }

      return { prefix: prefixes, rest };
    };

    const originalParts = handleLeadingKeywords(original);
    const upgradedParts = handleLeadingKeywords(upgraded);

    // 文を文単位で分割（ピリオドで区切る）
    const originalSentences = originalParts.rest.split(/(?<=\.)/).filter(Boolean);
    const upgradedSentences = upgradedParts.rest.split(/(?<=\.)/).filter(Boolean);
    const result: React.ReactNode[] = [];

    // 文頭キーワードの処理
    upgradedParts.prefix.forEach((prefix, index) => {
      const wasInOriginal = originalParts.prefix.includes(prefix);
      result.push(
        <div key={`prefix-${index}`} style={{ textAlign: 'center' }}>
          <span
            style={{
              color: wasInOriginal ? COLORS.KEYWORD : COLORS.UPGRADE,
              display: 'inline-block',
              verticalAlign: 'baseline'
            }}
          >
            {prefix}
          </span>
          {index < upgradedParts.prefix.length - 1 && <br />}
        </div>
      );
    });

    // 削除されたキーワードがある場合は、残りの文章を変更なしとして扱う
    const hasRemovedKeywords = originalParts.prefix.length > upgradedParts.prefix.length;
    if (hasRemovedKeywords && originalParts.rest === upgradedParts.rest) {
      // 残りの文章をそのまま表示（変更なしとして扱う）
      upgradedSentences.forEach((sentence, index) => {
        const sentenceResult = colorizeKeywords(sentence);
        result.push(
          <div key={`sentence-${index}`} style={{ textAlign: 'center' }}>
            {sentenceResult}
            {index < upgradedSentences.length - 1 && <br />}
          </div>
        );
      });
    } else {
      // 通常の差分検出処理
      upgradedSentences.forEach((sentence, index) => {
        const originalSentence = originalSentences[index] || '';
        
        // 単純化したトークン化関数
        const tokenize = (text: string): string[] => {
          // 単語、数字、空白、句読点に分割
          return text.split(/(\s+|\d+|[A-Za-z]+|[.,!?])/).filter(Boolean);
        };

        const originalTokens = tokenize(originalSentence);
        const upgradedTokens = tokenize(sentence);

        // 単純な差分検出（完全一致のみ）
        const changes: boolean[] = new Array(upgradedTokens.length).fill(false);
        
        // 各トークンが元のテキストに存在するかチェック
        upgradedTokens.forEach((token, idx) => {
          // キーワードの場合
          if (KEYWORDS.includes(token)) {
            // 元のテキストにキーワードが含まれていない場合は変更とマーク
            changes[idx] = !originalTokens.includes(token);
            return;
          }
          
          // 数字の場合
          if (/^\d+$/.test(token)) {
            // 元のテキストに同じ数字がない場合は変更とマーク
            changes[idx] = !originalTokens.includes(token);
            return;
          }
          
          // その他のトークン
          // 元のテキストに同じトークンがない場合は変更とマーク
          changes[idx] = !originalTokens.includes(token);
        });

        // 結果の生成
        const sentenceResult: React.ReactNode[] = [];
        upgradedTokens.forEach((token, idx) => {
          if (/^\s+$/.test(token)) {
            sentenceResult.push(<React.Fragment key={`space-${idx}`}>{token}</React.Fragment>);
            return;
          }

          // 検索ワードに一致するかチェック
          if (hasSearchTerm && token.toLowerCase().includes(searchTermLower)) {
            const startIndex = token.toLowerCase().indexOf(searchTermLower);
            const endIndex = startIndex + searchTermLower.length;
            
            sentenceResult.push(
              <span key={`highlight-${idx}`}>
                {token.substring(0, startIndex)}
                <span style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)', color: '#ffffff' }}>
                  {token.substring(startIndex, endIndex)}
                </span>
                {token.substring(endIndex)}
              </span>
            );
            return;
          }

          if (KEYWORDS.includes(token)) {
            const isChanged = changes[idx];
            sentenceResult.push(
              <span
                key={`keyword-${idx}`}
                style={{
                  color: isChanged ? COLORS.UPGRADE : COLORS.KEYWORD,
                  display: 'inline-block',
                  verticalAlign: 'baseline'
                }}
              >
                {token}
              </span>
            );
            return;
          }

          if (/^\d+$/.test(token)) {
            sentenceResult.push(
              changes[idx] ? (
                <span key={`number-${idx}`} style={{ color: COLORS.UPGRADE }}>{token}</span>
              ) : (
                <React.Fragment key={`number-${idx}`}>{token}</React.Fragment>
              )
            );
            return;
          }

          sentenceResult.push(
            changes[idx] ? (
              <span key={`text-${idx}`} style={{ color: COLORS.UPGRADE }}>{token}</span>
            ) : (
              <React.Fragment key={`text-${idx}`}>{token}</React.Fragment>
            )
          );
        });

        result.push(
          <div key={`sentence-${index}`} style={{ textAlign: 'center' }}>
            {sentenceResult}
            {index < upgradedSentences.length - 1 && <br />}
          </div>
        );
      });
    }

    return (
      <div style={{ display: 'inline-block', whiteSpace: 'pre-wrap', width: '100%', textAlign: 'center' }}>
        {result}
      </div>
    );
  };

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
      <img
        src={baseCardPath}
        alt="Base Card"
        className="absolute top-0 left-0 w-[190px] h-[252px]"
        onError={(e) => {
          e.currentTarget.src = `/src/assets/cards/design/colorless/colorless_${type === 'curse' ? 'skill' : type}.png`;
        }}
      />

      {/* カードの絵柄 */}
      <img
        src={cardImagePath}
        alt={name}
        className="absolute top-[26px] left-[17.5px] w-[162px] h-[116px]"
        onError={(e) => {
          e.currentTarget.src = `/src/assets/images/cards/colorless/${type === 'curse' ? 'skill' : type}/default.png`;
        }}
      />

      {/* フレーム */}
      <img
        src={framePath}
        alt="Frame"
        className="absolute top-[3px] left-[10px] w-[171.5px] h-[147px]"
      />

      {/* バナー */}
      <img
        src={bannerPath}
        alt="Banner"
        className="absolute top-[5px] left-[0px] w-[250px] h-[45px] transform scale-x-[1.1]"
      />

      {/* コストの枠（呪いカードまたはコストが-1以外の場合のみ表示） */}
      {cardClass !== 'curse' && cost !== -1 && (
        <>
          <img
            src={costFramePath}
            alt="Cost Frame"
            className="absolute top-[-16px] left-[-14px] w-[46px] h-[46px]"
            onError={(e) => {
              e.currentTarget.src = `/src/assets/cards/design/colorless/colorless.png`;
            }}
          />
          <div 
            className="card-cost absolute text-[20px] font-bold w-[46px] h-[46px] flex items-center justify-center"
            style={{ 
              color: '#FFF6E1',
              top: '-16px',
              left: '-14px',
              textShadow: `
                -2px -2px 0 #4c4943, -2px -1px 0 #4c4943, -2px 0 0 #4c4943,
                -2px 1px 0 #4c4943, -2px 2px 0 #4c4943, -1px -2px 0 #4c4943,
                -1px -1px 0 #4c4943, -1px 0 0 #4c4943, -1px 1px 0 #4c4943,
                -1px 2px 0 #4c4943, 0 -2px 0 #4c4943, 0 -1px 0 #4c4943,
                0 0 0 #4c4943, 0 1px 0 #4c4943, 0 2px 0 #4c4943,
                1px -2px 0 #4c4943, 1px -1px 0 #4c4943, 1px 0 0 #4c4943,
                1px 1px 0 #4c4943, 1px 2px 0 #4c4943, 2px -2px 0 #4c4943,
                2px -1px 0 #4c4943, 2px 0 0 #4c4943, 2px 1px 0 #4c4943,
                2px 2px 0 #4c4943
              `
            }}
            lang="en"
          >
            {displayCost()}
          </div>
        </>
      )}

      {/* カード名 */}
      <div 
        className="absolute w-full text-center text-[16px] capitalize"
        style={{ 
          fontFamily: 'Kreon, serif',
          color: upgraded ? '#76F900' : '#FFF6E1',
          top: '2.8%',
          left: '50%',
          transform: 'translate(-50%)',
          textShadow: `
            3px 3px 0 #59564f,
            2px 2px 0 #59564f,
            -1px -1px 0 #59564f,
            1px -1px 0 #59564f,
            -1px 1px 0 #59564f,
            1px 1px 0 #59564f
          `
        }}
        lang="en"
      >
        {searchTerm && name.toLowerCase().includes(searchTerm.toLowerCase()) ? (
          <span>
            {name.split(new RegExp(`(${searchTerm})`, 'i')).map((part, i) => 
              part.toLowerCase() === searchTerm.toLowerCase() ? 
                <span key={i} style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)' }}>{part}</span> : 
                <span key={i}>{part}</span>
            )}
            {upgraded && '+'}
          </span>
        ) : (
          <>
            {name}
            {upgraded && '+'}
          </>
        )}
      </div>

      {/* カードタイプ */}
      <div 
        className="card-type absolute"
        style={{ 
          color: '#595959',
          fontWeight: 700,
          left: '50.5%',
          marginLeft: '0.5%',
          top: '53.2%',
          transform: 'translate(-50%)'
        }}
        lang="en"
      >
        {typeDisplay}
      </div>

      {/* 説明文 */}
      <div 
        className="absolute flex flex-col items-center justify-center text-[12px] whitespace-pre-wrap"
        style={{ 
          fontFamily: 'Kreon, serif',
          color: '#FFF6E1',
          top: '60%',
          left: '50%',
          transform: 'translate(-50%)',
          width: '69%',
          height: '30%',
          textShadow: '1px 1px 0 #1d1d18',
          textAlign: 'center'
        }}
        lang="en"
      >
        {upgraded && originalDescription
          ? highlightDifferences(originalDescription, description)
          : colorizeKeywords(description)}
      </div>
    </div>
  );
};

export default Card;