import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const initializeI18n = async () => {
  let neowBonusTranslations = {};
  try {
    // 本番環境ではIPC経由でファイルを読み込む
    if (import.meta.env.PROD && window.electronAPI) {
      // getAssetPathにはassets/プレフィックスなしで渡す（getAssetPathが内部でassets/を追加するため）
      const assetPath = 'localization/neowBonus.json';
      const filePath = await window.electronAPI.getAssetPath(assetPath);
      if (!filePath) {
        throw new Error('getAssetPath returned null');
      }
      console.log('[i18n] Resolved file path:', filePath);
      const fileContent = await window.electronAPI.readFile(filePath, 'utf8');
      neowBonusTranslations = JSON.parse(fileContent);
      console.log('[i18n] neowBonus.json loaded successfully via IPC.');
    } else {
      // 開発環境では通常のfetchを使用
      const response = await fetch('/assets/localization/neowBonus.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      neowBonusTranslations = await response.json();
      console.log('[i18n] neowBonus.json loaded successfully.');
    }
  } catch (error) {
    console.error("Failed to fetch neowBonusTranslations:", error);
    // エラーが発生した場合でも、他の翻訳は機能するように空のオブジェクトを設定
  }

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

  await i18n.use(initReactI18next).init({
  resources,
  lng: 'ja',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

  return i18n;
};

// 初期化関数を名前付きでエクスポート
export { initializeI18n };

// export default i18n; // i18nインスタンスのデフォルトエクスポートは削除し、
                     // main.tsxでinitializeI18nの返り値を使用する形にする

// 以下のコードは不要になるか、initializeI18n の呼び出し方によって調整
// const i18nInstance = initializeI18n(); 

// const finalResources = { ... }; // これもinitializeI18n関数内に移動済みのはず
// i18n.use(initReactI18next).init({ ... }); // これもinitializeI18n関数内に移動済みのはず