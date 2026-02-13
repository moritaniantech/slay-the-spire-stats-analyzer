import { contextBridge, ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';

// 実行データの型定義
interface Run {
  id: string;
  character: string;
  victory: boolean;
  ascension_level: number;
  floor_reached: number;
  playtime: number;
  score: number;
  timestamp: number;
  run_data: any;
}

interface LoadProgress {
  progress: number;
  total: number;
}

// SQLite操作用の型定義
interface SQLiteAPI {
  execute: (sql: string, params?: any[]) => Promise<any>;
  query: (sql: string, params?: any[]) => Promise<any[]>;
  get: (sql: string, params?: any[]) => Promise<any>;
}

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

// APIの型定義
interface ElectronAPI {
  loadRunFiles: (runFolderPath: string) => Promise<Run[]>;
  getAllRuns: () => Promise<Run[]>;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;
  selectFolder: () => Promise<string | null>;
  getRunFolder: () => Promise<string | null>;
  onLoadProgress: (callback: (progress: LoadProgress) => void) => () => void;
  deleteRun: (run: any) => Promise<void>;
  sqlite: SQLiteAPI;
  checkForUpdates: () => Promise<void>;
  startUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (info: ProgressInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: unknown) => void) => () => void;
  resolveAssetPath: (assetPath: string) => Promise<string>;
  getResourcePath: () => Promise<string>;
  isDevelopment: boolean;
  resolveImagePath: (imagePath: string) => Promise<string>;
  getAssetPath: (assetPath: string) => Promise<string>;
  assetExists: (assetPath: string) => Promise<boolean>;
  debugResources: () => Promise<any>;
  getFileURLForAsset: (assetPath: string) => Promise<string>;
  getImageBase64: (relativeImagePath: string) => Promise<string | null>;
  platform: string;
  get isPackaged(): boolean;
  readFile: (filePath: string, encoding: string) => Promise<string>;
  getUserDataPath: () => Promise<string>;
  showOpenDialog: (options: any) => Promise<any>;
}

// SQLite APIの実装
const sqliteAPI: SQLiteAPI = {
  execute: (sql, params = []) => ipcRenderer.invoke('sqlite-execute', sql, params),
  query: (sql, params = []) => ipcRenderer.invoke('sqlite-query', sql, params),
  get: (sql, params = []) => ipcRenderer.invoke('sqlite-get', sql, params),
};

let isPackagedGlobal = process.env.NODE_ENV === 'production';
let isDevelopmentGlobal = process.env.NODE_ENV === 'development';

// APIの実装 (型注釈を削除して推論に任せるか、後で正確な ElectronAPI をつける)
const electronAPI = {
  loadRunFiles: (runFolderPath: string) => ipcRenderer.invoke('load-run-files', runFolderPath),
  getAllRuns: () => ipcRenderer.invoke('get-all-runs'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: string) => ipcRenderer.invoke('set-theme', theme),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getRunFolder: () => ipcRenderer.invoke('get-run-folder'),
  onLoadProgress: (callback: (progress: LoadProgress) => void) => {
    const progressHandler = (_event: any, data: LoadProgress) => callback(data);
    ipcRenderer.on('load-progress', progressHandler);
    return () => {
      ipcRenderer.removeListener('load-progress', progressHandler);
    };
  },
  deleteRun: (run: any) => ipcRenderer.invoke('delete-run', run),
  sqlite: sqliteAPI,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startUpdate: () => ipcRenderer.invoke('start-update'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: any, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => {
      ipcRenderer.removeListener('update-available', handler);
    };
  },
  onUpdateProgress: (callback: (info: ProgressInfo) => void) => {
    const handler = (_event: any, info: ProgressInfo) => callback(info);
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: any, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('update-downloaded', handler);
    };
  },
  onUpdateError: (callback: (error: unknown) => void) => {
    const handler = (_event: any, error: unknown) => callback(error);
    ipcRenderer.on('update-error', handler);
    return () => {
      ipcRenderer.removeListener('update-error', handler);
    };
  },
  resolveAssetPath: async (assetPath: string) => {
    try {
      const resolvedPath = await ipcRenderer.invoke('get-asset-path', assetPath);
      return resolvedPath;
    } catch (error) {
      console.error('[preload] Error in resolveAssetPath:', error);
      return assetPath;
    }
  },
  getResourcePath: () => ipcRenderer.invoke('get-resource-path'),
  get isDevelopment() { return isDevelopmentGlobal; },
  get isPackaged() { return isPackagedGlobal; },
  platform: process.platform,
  readFile: (filePath: string, encoding: string = 'utf8') => ipcRenderer.invoke('fs-readFile', filePath, encoding),
  getUserDataPath: () => ipcRenderer.invoke('app-getPath', 'userData'),
  showOpenDialog: (options: any) => ipcRenderer.invoke('dialog-showOpenDialog', options),
  resolveImagePath: (imagePath: string) => ipcRenderer.invoke('resolve-image-path', imagePath),
  getAssetPath: async (assetPath: string): Promise<string> => {
    try {
      const pathResult = await ipcRenderer.invoke('get-asset-path', assetPath);
      return pathResult;
    } catch (error) {
      console.error('[preload] getAssetPath エラー:', error);
      throw error;
    }
  },
  assetExists: async (assetPath: string): Promise<boolean> => {
    try {
      const exists = await ipcRenderer.invoke('asset-exists', assetPath);
      return exists;
    } catch (error) {
      console.error('[preload] assetExists エラー:', error);
      return false;
    }
  },
  debugResources: async (): Promise<any> => ipcRenderer.invoke('debug-resources'),
  getFileURLForAsset: async (assetPath: string) => {
      try {
        const fileUrl = await ipcRenderer.invoke('get-file-url-for-asset', assetPath);
      return fileUrl || '';
    } catch (error) {
      console.error('[preload] Error in getFileURLForAsset:', error);
      return '';
    }
  },
  getImageBase64: (relativeImagePath: string) => ipcRenderer.invoke('get-image-base64', relativeImagePath)
};

// 型チェック用 (開発時のみ)
// const _check: ElectronAPI = electronAPI;

// 初期化時にメインプロセスからisPackagedフラグを取得
ipcRenderer.invoke('is-app-packaged').then((value) => {
  isPackagedGlobal = !!value;
  isDevelopmentGlobal = !isPackagedGlobal;
  // console.log('[preload] Received isPackaged value:', isPackagedGlobal, 'isDevelopment:', isDevelopmentGlobal);
});

console.log('[preload] Final electronAPI object before exposeInMainWorld:', JSON.stringify(Object.keys(electronAPI)));
console.log('[preload] typeof electronAPI.getImageBase64 before expose:', typeof electronAPI.getImageBase64);

// メインプロセスのログを受信するリスナーを登録
ipcRenderer.on('main-process-log', (_event, logData: { level: string; message: string; details?: any; error?: string }) => {
  const { level, message, details, error } = logData;
  const logMessage = details ? `${message}\n詳細: ${JSON.stringify(details, null, 2)}` : error ? `${message}\nエラー: ${error}` : message;
  
  switch (level) {
    case 'error':
      console.error(`[Main Process] ${logMessage}`);
      break;
    case 'warn':
      console.warn(`[Main Process] ${logMessage}`);
      break;
    default:
      console.log(`[Main Process] ${logMessage}`);
  }
});

// APIをウィンドウオブジェクトに公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// アセットベースパスを設定
// const getAssetBasePath = async () => { // この関数と関連ロジックはelectronAPI内に移管するか、mainプロセスで行うべき処理のため一旦コメントアウト
//   if (isDevelopment) {
//     return '/src/assets';
//   }
//   const resourcePath = await ipcRenderer.invoke('get-resource-path');
//   return `${resourcePath}/assets`;
// };

// アセットパス解決ヘルパー関数
// const normalizeAssetPath = (assetPath: string) => { // 同上
//   // 先頭のスラッシュを削除
//   const normalizedPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
//   // @cardsを実際のパスに変換
//   return normalizedPath.replace('@cards', 'cards');
// };

// 以下の exposeInMainWorld は electronAPI に集約したため削除
// contextBridge.exposeInMainWorld('__resolveAssetPath__', async (assetPath: string) => {
//   try {
//     const basePath = await getAssetBasePath();
//     const normalizedPath = normalizeAssetPath(assetPath);
//     const fullPath = `${basePath}/${normalizedPath}`;
    
//     console.log('[preload] Resolving asset path:', {
//       original: assetPath,
//       normalized: normalizedPath,
//       base: basePath,
//       full: fullPath
//     });

//     // パスが存在するか確認
//     const exists = await ipcRenderer.invoke('asset-exists', fullPath);
//     if (!exists) {
//       console.warn(`[preload] Asset not found: ${fullPath}`);
//       return null;
//     }

//     return fullPath;
//   } catch (error) {
//     console.error('[preload] Error resolving asset path:', error);
//     return null;
//   }
// });

// アセットベースパスをグローバルに公開
// getAssetBasePath().then(basePath => { // 同上
//   contextBridge.exposeInMainWorld('__ASSET_BASE_PATH__', basePath);
//   console.log('[preload] Asset base path set:', basePath);
  
//   // アセットパスの検証
//   if (app.isPackaged) {
//     // パッケージ済み環境でのアセットパスの存在確認
//     ipcRenderer.invoke('debug-resources')
//       .then(resources => {
//         console.log('[preload] リソースパス検証結果:', resources);
//         // 有効なパスが見つからなかった場合、警告ログを出力
//         if (!resources.validatedPaths || resources.validatedPaths.length === 0) {
//           console.error('[preload] 警告: 有効なアセットパスが見つかりませんでした');
//         }
//       })
//       .catch(err => {
//         console.error('[preload] リソースパス検証エラー:', err);
//       });
//   }
// }).catch(error => {
//   console.error('[preload] Error setting asset base path:', error);
//   contextBridge.exposeInMainWorld('__ASSET_BASE_PATH__', app.isPackaged ? 'asset://' : '/src/assets');
// });

// Electronの環境情報を公開
// contextBridge.exposeInMainWorld('electron', { // 同上
//   platform: process.platform,
//   get isDevelopment() {
//     return isDevelopment;
//   },
//   get isPackaged() {
//     return isPackaged;
//   },
//   time: new Date().toISOString(),
//   getAssetPath: async (assetPath: string) => {
//     try {
//       const resolvedPath = await ipcRenderer.invoke('get-asset-path', assetPath);
//       console.log('[preload] Resolved asset path:', { assetPath, resolvedPath });
      
//       // アセットプロトコル変換 (file:// から asset:// に)
//       if (app.isPackaged && resolvedPath.startsWith('file://')) {
//         return resolvedPath.replace('file://', 'asset://');
//       }
      
//       return resolvedPath;
//     } catch (error) {
//       console.error('[preload] Error getting asset path:', error);
//       throw error;
//     }
//   },
  
//   // アセットの存在確認
//   assetExists: async (assetPath: string) => {
//     try {
//       return await ipcRenderer.invoke('asset-exists', assetPath);
//     } catch (error) {
//       console.error('[preload] Error checking asset existence:', error);
//       return false;
//     }
//   },
//   getFileURLForAsset: async (assetPath: string) => {
//     try {
//       console.log('[preload] getFileURLForAsset called for:', assetPath);
      
//       // 新しいAPIをまず試す
//       try {
//         const fileUrl = await ipcRenderer.invoke('get-file-url-for-asset', assetPath);
//         if (fileUrl) {
//           console.log('[preload] Generated file URL from main process:', fileUrl);
//           return fileUrl;
//         }
//       } catch (mainProcessError) {
//         console.error('[preload] Error getting file URL from main process:', mainProcessError);
//       }
      
//       // フォールバック: 絶対パスを取得して手動でURLを構築
//       const resolvedPath = await ipcRenderer.invoke('get-asset-path', assetPath);
//       console.log('[preload] Resolved path:', resolvedPath);
      
//       // ファイルの存在確認
//       if (fs.existsSync(resolvedPath)) {
//         // macOSでは、ファイルパスを正しい形式に変換する必要がある
//         // 'file://' + パスの形式を使用
//         // URLエンコードしてパス内のスペースなどを処理
//         const fileURL = `file://${resolvedPath.replace(/\s/g, '%20')}`;
//         console.log('[preload] Generated file URL manually:', fileURL);
//         return fileURL;
//       }
      
//       // 代替パスを試す - Resourcesフォルダからの絶対パス
//       const resourcesPath = await ipcRenderer.invoke('get-resource-path');
//       const alternativePath = path.join(resourcesPath, 'assets', assetPath);
      
//       if (fs.existsSync(alternativePath)) {
//         const fileURL = `file://${alternativePath.replace(/\s/g, '%20')}`;
//         console.log('[preload] Generated alternative file URL:', fileURL);
//         return fileURL;
//       }
      
//       console.warn('[preload] File does not exist in any location:', {
//         primaryPath: resolvedPath,
//         alternativePath
//       });
//       return '';
//     } catch (error) {
//       console.error('[preload] Error in getFileURLForAsset:', error);
//       return '';
//     }
//   }
// });

// アプリケーション設定ロード
// ... existing code ... 