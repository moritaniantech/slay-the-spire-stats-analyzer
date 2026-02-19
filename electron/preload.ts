import { contextBridge, ipcRenderer } from 'electron';

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
  run_data: Record<string, unknown>;
}

interface LoadProgress {
  progress: number;
  total: number;
}

// SQLite操作用の型定義
interface SQLiteAPI {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  get: (sql: string, params?: unknown[]) => Promise<unknown>;
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
    const progressHandler = (_event: Electron.IpcRendererEvent, data: LoadProgress) => callback(data);
    ipcRenderer.on('load-progress', progressHandler);
    return () => {
      ipcRenderer.removeListener('load-progress', progressHandler);
    };
  },
  onNewRunDetected: (callback: (run: Run) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, run: Run) => callback(run);
    ipcRenderer.on('new-run-detected', handler);
    return () => {
      ipcRenderer.removeListener('new-run-detected', handler);
    };
  },
  deleteRun: (run: Record<string, unknown>) => ipcRenderer.invoke('delete-run', run),
  sqlite: sqliteAPI,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  startUpdate: () => ipcRenderer.invoke('start-update'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => {
      ipcRenderer.removeListener('update-available', handler);
    };
  },
  onUpdateProgress: (callback: (info: ProgressInfo) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: ProgressInfo) => callback(info);
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('update-downloaded', handler);
    };
  },
  onUpdateError: (callback: (error: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: unknown) => callback(error);
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
  getAppVersion: () => ipcRenderer.invoke('app-getVersion'),
  showOpenDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog-showOpenDialog', options),
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
  debugResources: async (): Promise<Record<string, unknown>> => ipcRenderer.invoke('debug-resources'),
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

// 初期化時にメインプロセスからisPackagedフラグを取得
ipcRenderer.invoke('is-app-packaged').then((value) => {
  isPackagedGlobal = !!value;
  isDevelopmentGlobal = !isPackagedGlobal;
  // console.log('[preload] Received isPackaged value:', isPackagedGlobal, 'isDevelopment:', isDevelopmentGlobal);
});

// メインプロセスのログを受信するリスナーを登録
ipcRenderer.on('main-process-log', (_event: Electron.IpcRendererEvent, logData: { level: string; message: string; details?: unknown; error?: string }) => {
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
