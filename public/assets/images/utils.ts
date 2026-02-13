// WebpackのRequireContextの型定義
import { isDevelopment, isProduction, isElectron } from '../../utils/environment';
import { getAssetUrl, normalizeAssetPath } from '../../utils/assetUtils';

interface RequireContext {
  keys(): string[];
  (id: string): string;
  <T>(id: string): T;
  resolve(id: string): string;
  /** The module id of the context module. This may be useful for module.hot.accept. */
  id: string;
}

declare global {
  interface Window {
    electron: {
      getResourcePath: () => Promise<string>;
      resolveImagePath: (imagePath: string) => Promise<string>;
      isDevelopment: boolean;
      isPackaged: boolean;
      getAssetPath: (assetPath: string) => Promise<string>;
      assetExists: (assetPath: string) => Promise<boolean>;
      debugResources: () => Promise<any>;
      platform: string;
    };
  }
}

export function importAll(r: RequireContext) {
  const images: { [key: string]: string } = {};
  r.keys().forEach((item: string) => {
    const key = item.replace('./', '').replace(/\.(png|jpe?g|svg)$/, '');
    images[key] = r(item);
  });
  return images;
}

// デバッグログを強化
export const importImage = async (imagePath: string): Promise<string> => {
  try {
    const normalizedPath = normalizeAssetPath(imagePath);
    
    // より詳細な環境情報のログ出力
    console.log('[importImage] 詳細環境チェック:', {
      時刻: new Date().toISOString(),
      リクエストパス: imagePath,
      正規化パス: normalizedPath,
      isDevelopment: isDevelopment(),
      isProduction: isProduction(),
      isElectron: isElectron(),
      platform: window.electron?.platform,
      location: window.location.href,
      protocol: window.location.protocol
    });

    // 新しいgetAssetUrl関数を使用
    const assetUrl = getAssetUrl(normalizedPath);
    console.log(`[importImage] 生成したアセットURL: ${assetUrl}`);
    
    // アセットがHTMLにロードされた後のコールバックを登録
    setTimeout(() => {
      // 画像要素を探して状態をログ出力
      const imgElements = document.querySelectorAll('img');
      console.log(`[importImage] ページ内の画像要素数: ${imgElements.length}`);
      
      imgElements.forEach((img, index) => {
        if (img.src.includes(normalizedPath)) {
          console.log(`[importImage] 画像[${index}] 状態:`, {
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            error: img.error
          });
        }
      });
    }, 1000);
    
    return assetUrl;
  } catch (error) {
    console.error(`[importImage] 重大エラー:`, error);
    return '';
  }
};

// ページロード完了時にDOMから全アセット参照を検出するスクリプトを追加
export const scanAllAssetReferences = () => {
  console.log('[AssetScan] DOM内のアセット参照スキャン開始...');
  
  // 画像要素のスキャン
  const imgElements = document.querySelectorAll('img');
  console.log(`[AssetScan] 画像要素数: ${imgElements.length}`);
  
  const imageReferences = Array.from(imgElements).map(img => ({
    src: img.src,
    alt: img.alt,
    complete: img.complete,
    naturalSize: img.naturalWidth > 0 && img.naturalHeight > 0
  }));
  
  console.log('[AssetScan] 画像参照一覧:', imageReferences);
  
  // CSSからの背景画像参照をスキャン
  const stylesheets = Array.from(document.styleSheets);
  let cssImageReferences = [];
  
  try {
    stylesheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSStyleRule) {
            const style = rule.style;
            if (style.backgroundImage) {
              const urlMatch = style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (urlMatch) {
                cssImageReferences.push({
                  selector: rule.selectorText,
                  url: urlMatch[1]
                });
              }
            }
          }
        });
      } catch (e) {
        console.warn('[AssetScan] CSSルールアクセスエラー:', e);
      }
    });
    
    console.log('[AssetScan] CSS背景画像参照:', cssImageReferences);
  } catch (e) {
    console.error('[AssetScan] CSSスキャンエラー:', e);
  }
  
  // 結果をまとめて返す
  return {
    images: imageReferences,
    cssBackgrounds: cssImageReferences,
    timestamp: new Date().toISOString()
  };
};

// カードの背景色を定義
export const cardColors = {
  ironclad: '#ff6563',
  silent: '#7fff00',
  defect: '#87ceeb',
  watcher: '#dda0dd',
  colorless: '#808080',
  curse: '#4a0072',
};

// カードのレアリティ色を定義
export const rarityColors = {
  starter: '#ffffff',
  common: '#808080',
  uncommon: '#87ceeb',
  rare: '#ffd700',
  special: '#dda0dd',
  curse: '#4a0072',
};

// デバッグ用の関数を追加
export const debugImageLoading = async (): Promise<any> => {
  try {
    // リソース情報を取得
    const resourceInfo = await window.electron.debugResources();
    console.log('Resource debug info:', resourceInfo);
    
    // テスト用の画像パスを複数試す
    const testPaths = [
      'cards/ironclad/bash.png',
      'cards/silent/survivor.png',
      'images/cards/ironclad/bash.png',
      'images/cards/silent/survivor.png'
    ];
    
    const pathResults: Record<string, { exists?: boolean; resolvedPath?: string; error?: string }> = {};
    
    // 各パスのテスト結果を収集
    for (const testPath of testPaths) {
      try {
        // 新しいgetAssetUrl関数を使用してパスを解決
        const resolvedPath = getAssetUrl(testPath);
        let exists = false;
        
        if (window.electron?.assetExists) {
          exists = await window.electron.assetExists(testPath);
        }
        
        pathResults[testPath] = {
          exists,
          resolvedPath
        };
      } catch (error) {
        pathResults[testPath] = {
          error: (error as Error).message
        };
      }
    }
    
    return {
      resourceInfo,
      pathTests: pathResults,
      environment: {
        isDevelopment: isDevelopment(),
        isProduction: isProduction(),
        isElectron: isElectron()
      }
    };
  } catch (error) {
    console.error('Error in debug image loading:', error);
    return {
      error: (error as Error).message
    };
  }
}; 