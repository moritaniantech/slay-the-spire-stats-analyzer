import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import './i18n'; // 元のインポートをコメントアウト
import { initializeI18n } from './i18n'; // 名前付きインポートに変更
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import { getAssetBasePath, getEnvironmentInfo, logEnvironmentInfo } from './utils/environment';
import { getAssetUrl, getAssetFallbackUrl } from './utils/assetUtils';

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
  
  // フォントファイルのリスト
  const fonts = [
    { family: 'Kreon', path: 'fonts/eng/Kreon-Regular.ttf', weight: '400', style: 'normal' },
    { family: 'Kreon', path: 'fonts/eng/Kreon-Bold.ttf', weight: '700', style: 'normal' },
    { family: 'NotoSansCJKjp', path: 'fonts/jpn/NotoSansCJKjp-Regular.otf', weight: '400', style: 'normal' },
    { family: 'NotoSansCJKjp', path: 'fonts/jpn/NotoSansCJKjp-Medium.otf', weight: '500', style: 'normal' },
    { family: 'NotoSansCJKjp', path: 'fonts/jpn/NotoSansCJKjp-Bold.otf', weight: '700', style: 'normal' },
  ];

  // Electron環境では、asset://プロトコルを使用してフォントを読み込む
  if (isElectron) {
    console.log('[main] Electron環境でフォントを動的に読み込みます...');
    
    for (const font of fonts) {
      try {
        // フォントパスを正規化（normalizeAssetPathを使用）
        const normalizedPath = font.path.startsWith('assets/') ? font.path : `assets/${font.path}`;
        console.log(`[main] フォント読み込み開始: ${font.family} (${font.weight}) - パス: ${normalizedPath}`);
        
        // IPC経由でURLを取得（フォールバック付き）
        let fontUrl = await getAssetFallbackUrl(font.path);
        console.log(`[main] getAssetFallbackUrl結果: ${fontUrl}`);
        
        if (!fontUrl) {
          // フォールバック: asset://スキームを使用
          fontUrl = getAssetUrl(font.path);
          console.log(`[main] getAssetUrl結果: ${fontUrl}`);
          
          if (!fontUrl) {
            // 最終フォールバック: 直接asset://スキームを使用
            fontUrl = `asset://${normalizedPath}`;
            console.log(`[main] 最終フォールバックURL: ${fontUrl}`);
          }
        }
        
        // FontFace APIを使用してフォントを読み込む
        const fontFace = new FontFace(font.family, `url(${fontUrl})`, {
          weight: font.weight,
          style: font.style,
          display: 'swap'
        });
        
        await fontFace.load();
        document.fonts.add(fontFace);
        console.log(`[main] フォント読み込み成功: ${font.family} (${font.weight}) - ${fontUrl}`);
      } catch (error) {
        console.error(`[main] フォント読み込みエラー: ${font.family} (${font.weight}) - ${font.path}`, error);
        // エラーが発生しても処理を続行（フォールバックフォントを使用）
      }
    }
  } else {
    // 非Electron環境では、CSS内のフォント定義に依存
    console.log('[main] 非Electron環境: CSS内のフォント定義を使用します');
  }
};

// フォント適用のための初期化
const initializeFonts = () => {
  // 日本語のパターン - ひらがな、カタカナ、漢字を検出
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  
  // MutationObserverを設定して動的に追加される要素にもフォント設定を適用
  const fontObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processElement(node as Element);
          }
        });
      } else if (mutation.type === 'characterData') {
        // テキスト内容が変更された場合、親要素を再処理
        if (mutation.target.parentElement) {
          processElement(mutation.target.parentElement as Element);
        }
      }
    });
  });
  
  // 要素を処理してlang属性を設定する関数
  const processElement = (element: Element) => {
    // テキストノードを持つ要素に対して処理
    if (element.textContent) {
      const text = element.textContent;
      
      // 日本語テキストが含まれているかチェック
      if (japanesePattern.test(text)) {
        // lang属性がまだない場合のみ設定
        if (!element.hasAttribute('lang')) {
          element.setAttribute('lang', 'ja');
        }
      }
    }
    
    // 子要素も再帰的に処理
    element.querySelectorAll('*').forEach(child => {
      if (child.textContent && !child.hasAttribute('lang')) {
        if (japanesePattern.test(child.textContent)) {
          child.setAttribute('lang', 'ja');
        }
      }
    });
  };
  
  // ドキュメント全体に対してMutationObserverを適用
  fontObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // 初期ロード時に既存の要素に対して処理を実行
  processElement(document.body);
  
  console.log('[main] フォント適用処理を初期化しました');
};

// グローバル設定の初期化
const initializeGlobals = async () => {
  setUpCssVariables();
  logEnvironmentInfo();
  
  // フォントを動的に読み込む（Electron環境の場合）
  await loadFonts();
  
  // フォント初期化（DOMロード後に実行）
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeFonts();
  } else {
    document.addEventListener('DOMContentLoaded', initializeFonts);
  }
  
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