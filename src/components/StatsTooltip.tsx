import React, { useEffect, useState, useRef, memo } from 'react';
import { AllCharacterStats, CharacterType } from '../models/StatsModel';
import { useStore } from '../store';
import './StatsTooltip.css';

interface StatsTooltipProps {
  stats: AllCharacterStats;
  title: string;
  visible: boolean;
  x: number;
  y: number;
}

// 数値を小数点以下1桁のパーセント表示にフォーマット
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// キャラクターごとの表示用クラス名を取得
const getCharacterClassName = (character: CharacterType): string => {
  return `stats-tooltip-character-${character}`;
};

// メモ化したStatsTooltipコンポーネント
const StatsTooltip: React.FC<StatsTooltipProps> = memo(({ stats, title, visible, x, y }) => {
  const { settings } = useStore();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 位置の計算
  useEffect(() => {
    if (!tooltipRef.current || !visible || !settings.showStats) return;

    // ツールチップの実際のサイズを取得
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let adjustedX = x + 20; // カーソルから少し右にずらす
    let adjustedY = y;

    // 右端に近い場合
    if (adjustedX + tooltipWidth > windowWidth) {
      adjustedX = x - tooltipWidth - 10; // カーソルの左側に表示
    }

    // 下端に近い場合
    if (adjustedY + tooltipHeight > windowHeight) {
      adjustedY = Math.max(10, windowHeight - tooltipHeight - 10); // 画面下端から10px上、または画面上端から10px下の大きい方
    }

    // 上端に近い場合
    if (adjustedY < 10) {
      adjustedY = 10; // 画面上端から10px下に表示
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 位置計算結果をstateに反映
    setPosition({ x: adjustedX, y: adjustedY });

    // 位置計算が完了したらready状態にする
    setIsReady(true);
  }, [x, y, visible, settings.showStats]);

  // 表示状態が変わったときの処理
  useEffect(() => {
    if (visible && settings.showStats) {
      // 表示されたときは初期状態にリセット
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 表示切替時のリセット
      setIsReady(false);
    }
  }, [visible, settings.showStats]);

  // 表示条件
  if (!visible || !settings.showStats) {
    return null;
  }

  // キャラクター一覧
  const characters: CharacterType[] = ['ironclad', 'silent', 'defect', 'watcher'];

  return (
    <div 
      ref={tooltipRef}
      className="stats-tooltip"
      style={{ 
        left: position.x,
        top: position.y,
        opacity: isReady ? 1 : 0,
        pointerEvents: 'none', // マウスイベントを透過させる
        transition: 'opacity 0.1s ease-in-out' // フェードイン効果
      }}
    >
      <div className="stats-tooltip-title">{title}</div>
      
      {/* 取得率と勝率を横並びに配置 */}
      <div className="stats-tooltip-container">
        {/* 左側: 取得率 */}
        <div className="stats-tooltip-column">
          {/* 取得率（通算） */}
          <div className="stats-tooltip-section">
            <div className="stats-tooltip-section-title">取得率（通算）</div>
            {characters.map(character => (
              <div key={`obtain-${character}`} className="stats-tooltip-row">
                <span className={`stats-tooltip-label ${getCharacterClassName(character)}`}>
                  {character.charAt(0).toUpperCase() + character.slice(1)}
                </span>
                <span className="stats-tooltip-value">
                  {formatPercent(stats[character].obtainRate)}
                </span>
              </div>
            ))}
          </div>
          
          {/* 取得率（勝利のみ） */}
          <div className="stats-tooltip-section">
            <div className="stats-tooltip-section-title">取得率（勝利のみ）</div>
            {characters.map(character => (
              <div key={`victory-obtain-${character}`} className="stats-tooltip-row">
                <span className={`stats-tooltip-label ${getCharacterClassName(character)}`}>
                  {character.charAt(0).toUpperCase() + character.slice(1)}
                </span>
                <span className="stats-tooltip-value">
                  {formatPercent(stats[character].victoryObtainRate)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 縦の区切り線 */}
        <div className="stats-tooltip-vertical-divider"></div>
        
        {/* 右側: 勝率 */}
        <div className="stats-tooltip-column">
          {/* 勝率（通算） */}
          <div className="stats-tooltip-section">
            <div className="stats-tooltip-section-title">勝率（通算）</div>
            {characters.map(character => (
              <div key={`win-${character}`} className="stats-tooltip-row">
                <span className={`stats-tooltip-label ${getCharacterClassName(character)}`}>
                  {character.charAt(0).toUpperCase() + character.slice(1)}
                </span>
                <span className="stats-tooltip-value">
                  {formatPercent(stats[character].winRate)}
                </span>
              </div>
            ))}
          </div>
          
          {/* 勝率（直近50戦） */}
          <div className="stats-tooltip-section">
            <div className="stats-tooltip-section-title">勝率（直近50戦）</div>
            {characters.map(character => (
              <div key={`recent-win-${character}`} className="stats-tooltip-row">
                <span className={`stats-tooltip-label ${getCharacterClassName(character)}`}>
                  {character.charAt(0).toUpperCase() + character.slice(1)}
                </span>
                <span className="stats-tooltip-value">
                  {formatPercent(stats[character].recent50WinRate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default StatsTooltip;