import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import './i18n'; // 元のインポートをコメントアウト
import { initializeI18n } from './i18n'; // 名前付きインポートに変更
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import { getAssetBasePath, logEnvironmentInfo } from './utils/environment';
import { getAssetUrl } from './utils/assetUtils';

// CSS変数を設定：アセットパスを動的に設定
const setUpCssVariables = () => {
  // アセットパスのルート変数を設定
  const assetBasePath = getAssetBasePath();
  document.documentElement.style.setProperty('--asset-path', assetBasePath);
  
  console.log('[main] CSSルート変数設定:', {
    '--asset-path': assetBasePath
  });
};

// フォントを動的に読み込む関数
const loadFonts = async () => {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const fonts = [
    { family: 'Kreon', path: 'fonts/eng/Kreon-Regular.ttf', weight: '400', style: 'normal' },
    { family: 'Kreon', path: 'fonts/eng/Kreon-Bold.ttf', weight: '700', style: 'normal' },
    { family: 'NotoSansCJKjp', path: 'fonts/jpn/NotoSansCJKjp-Regular.otf', weight: '400', style: 'normal' },
    { family: 'NotoSansCJKjp', path: 'fonts/jpn/NotoSansCJKjp-Medium.otf', weight: '500', style: 'normal' },
    { family: 'NotoSansCJKjp', path: 'fonts/jpn/NotoSansCJKjp-Bold.otf', weight: '700', style: 'normal' },
  ];

  if (isElectron) {
    console.log('[main] Electron環境でフォントを並列読み込みします...');

    const results = await Promise.allSettled(fonts.map(async (font) => {
      const fontUrl = getAssetUrl(font.path);
      if (!fontUrl) {
        console.warn(`[main] フォントURL取得失敗: ${font.family} (${font.weight})`);
        return;
      }

      const fontFace = new FontFace(font.family, `url(${fontUrl})`, {
        weight: font.weight,
        style: font.style,
        display: 'swap'
      });

      const loaded = await fontFace.load();
      document.fonts.add(loaded);
      console.log(`[main] フォント読み込み成功: ${font.family} (${font.weight})`);
    }));

    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`[main] ${failed.length}件のフォント読み込みに失敗:`, failed);
    }
  } else {
    console.log('[main] 非Electron環境: CSS内のフォント定義を使用します');
  }
};

// グローバル設定の初期化
const initializeGlobals = async () => {
  setUpCssVariables();
  logEnvironmentInfo();

  // フォントを動的に読み込む（Electron環境の場合）
  await loadFonts();
  
  // ソースマップエラーの抑制
  window.addEventListener('error', (event) => {
    if (event.filename?.includes('sourceMap')) {
      console.warn('Suppressed source map error:', event.message);
      event.preventDefault();
      return true;
    }
    return false;
  });
};

// グローバル設定の初期化を実行（非同期）
initializeGlobals().catch(error => {
  console.error('[main] Error initializing globals:', error);
});

// i18n の初期化を待ってからアプリをレンダリング
initializeI18n().then((i18nInstance) => {
  // 必要であれば i18nInstance を使って何かをする（例: I18nextProvider に渡すなど）
  // 今回の i18n.ts の実装では、i18nInstance はグローバルな i18n オブジェクトそのものなので、
  // Appコンポーネント内部の useTranslation などはそのまま機能するはず。
  console.log('[main] i18next initialized:', i18nInstance.language);
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
); 
}).catch(error => {
  console.error('[main] Failed to initialize i18next:', error);
  // エラー発生時のフォールバック処理（例: エラーメッセージを表示してアプリのレンダリングを中止）
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <div>Failed to load application resources. Please try again later.</div>
    </React.StrictMode>
  );
}); 