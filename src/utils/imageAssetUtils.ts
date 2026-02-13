// WebpackのRequireContextの型定義
import { isDevelopment, isProduction, isElectron } from './environment'; // 相対パスを修正
import { getAssetUrl, normalizeAssetPath } from './assetUtils'; // 相対パスを修正

interface RequireContext {
  keys(): string[];
  (id: string): string;
  <T>(id: string): T;
  resolve(id: string): string;
  /** The module id of the context module. This may be useful for module.hot.accept. */
  id: string;
}

// このファイル内でのWindow.electronの型宣言は削除し、既存のWindow.electronAPIを使用する
// declare global {
//   interface Window {
//     electron?: Window['electronAPI'] & { 
//       debugResources?: () => Promise<any>;
//     };
//   }
// }

export function importAll(r: RequireContext) {
  const images: { [key: string]: string } = {};
  r.keys().forEach((item: string) => {
    const key = item.replace('./', '').replace(/\.(png|jpe?g|svg)$/, '');
    images[key] = r(item);
  });
  return images;
}

export const importImage = async (imagePath: string): Promise<string> => {
  try {
    const normalizedPath = normalizeAssetPath(imagePath);
    
    console.log('[importImage] 詳細環境チェック:', {
      時刻: new Date().toISOString(),
      リクエストパス: imagePath,
      正規化パス: normalizedPath,
      isDevelopment: isDevelopment(),
      isProduction: isProduction(),
      isElectron: isElectron(),
      platform: window.navigator.platform, // navigator.platform を使用
      location: window.location.href,
      protocol: window.location.protocol
    });

    const assetUrl = getAssetUrl(normalizedPath);
    console.log(`[importImage] 生成したアセットURL: ${assetUrl ?? ''}`);
    
    setTimeout(() => {
      const imgElements = document.querySelectorAll('img');
      console.log(`[importImage] ページ内の画像要素数: ${imgElements.length}`);
      
      imgElements.forEach((img, index) => {
        if (img.src.includes(normalizedPath)) {
          console.log(`[importImage] 画像[${index}] 状態:`, {
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        }
      });
    }, 1000);
    
    return assetUrl ?? '';
  } catch (error) {
    console.error(`[importImage] 重大エラー:`, error);
    return '';
  }
};

interface CssImageReference {
  selector: string;
  url: string;
}

export const scanAllAssetReferences = () => {
  console.log('[AssetScan] DOM内のアセット参照スキャン開始...');
  
  const imgElements = document.querySelectorAll('img');
  console.log(`[AssetScan] 画像要素数: ${imgElements.length}`);
  
  const imageReferences = Array.from(imgElements).map(img => ({
    src: img.src,
    alt: img.alt,
    complete: img.complete,
    naturalSize: img.naturalWidth > 0 && img.naturalHeight > 0,
  }));
  
  console.log('[AssetScan] 画像参照一覧:', imageReferences);
  
  const stylesheets = Array.from(document.styleSheets);
  let cssImageReferences: CssImageReference[] = [];
  
  try {
    stylesheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSStyleRule) {
            const style = rule.style;
            if (style.backgroundImage) {
              const urlMatch = style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
              if (urlMatch && urlMatch[1]) {
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
  
  return {
    images: imageReferences,
    cssBackgrounds: cssImageReferences,
    timestamp: new Date().toISOString()
  };
};

export const cardColors = {
  ironclad: '#ff6563',
  silent: '#7fff00',
  defect: '#87ceeb',
  watcher: '#dda0dd',
  colorless: '#808080',
  curse: '#4a0072',
};

export const rarityColors = {
  starter: '#ffffff',
  common: '#808080',
  uncommon: '#87ceeb',
  rare: '#ffd700',
  special: '#dda0dd',
  curse: '#4a0072',
};

export const debugImageLoading = async (): Promise<any> => {
  try {
    // let resourceInfo = 'debugResources is not available on electronAPI.';
    // if (typeof window.electronAPI?.debugResources === 'function') { // debugResources が electronAPI に存在しないためコメントアウト
    //     resourceInfo = await window.electronAPI.debugResources();
    // }
    // console.log('Resource debug info:', resourceInfo);

    const testPaths = [
      'cards/ironclad/bash.png',
      'cards/silent/survivor.png',
      'images/cards/ironclad/bash.png',
      'images/cards/silent/survivor.png'
    ];
    
    const pathResults: Record<string, { exists?: boolean; resolvedPath?: string; error?: string }> = {};
    
    for (const testPath of testPaths) {
      try {
        const resolvedPath = getAssetUrl(testPath);
        let exists = false;
        
        if (window.electronAPI?.assetExists) {
          exists = await window.electronAPI.assetExists(testPath);
        }
        
        pathResults[testPath] = {
          exists,
          resolvedPath: resolvedPath ?? undefined
        };
      } catch (error) {
        pathResults[testPath] = {
          error: (error as Error).message
        };
      }
    }
    
    return {
      // resourceInfo, // debugResources がないのでコメントアウト
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