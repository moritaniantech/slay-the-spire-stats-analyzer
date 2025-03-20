import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import neowBonusTranslations from './assets/localization/neowBonus.json';

const resources = {
  en: {
    translation: {
      title: 'Slay the Spire Stats Analyzer',
      runHistory: 'Run History',
      statistics: 'Statistics',
      character: 'Character',
      result: 'Result',
      ascension: 'Ascension',
      floor: 'Floor',
      time: 'Time',
      score: 'Score',
      date: 'Date',
      victory: 'Victory',
      defeat: 'Defeat',
      victories: 'Victories',
      defeats: 'Defeats',
      overallStats: 'Overall Stats',
      totalRuns: 'Total Runs',
      winRate: 'Win Rate',
      victoryRate: 'Victory Rate',
      characterDistribution: 'Character Distribution',
      ironclad: 'Ironclad',
      silent: 'Silent',
      defect: 'Defect',
      watcher: 'Watcher',
      ...neowBonusTranslations
    },
  },
  ja: {
    translation: {
      title: 'Slay the Spire 統計分析',
      runHistory: 'プレイ履歴',
      statistics: '統計',
      character: 'キャラクター',
      result: '結果',
      ascension: '強化レベル',
      floor: '到達階層',
      time: 'プレイ時間',
      score: 'スコア',
      date: '日時',
      victory: '勝利',
      defeat: '敗北',
      victories: '勝利',
      defeats: '敗北',
      overallStats: '全体統計',
      totalRuns: '総プレイ回数',
      winRate: '勝率',
      victoryRate: '勝敗割合',
      characterDistribution: 'キャラクター分布',
      ironclad: 'アイアンクラッド',
      silent: 'サイレント',
      defect: 'ディフェクト',
      watcher: 'ウォッチャー',
      ...neowBonusTranslations
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ja',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;