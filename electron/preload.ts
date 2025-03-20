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
  onUpdateError: (callback: (error: Error) => void) => () => void;
}

// SQLite APIの実装
const sqliteAPI: SQLiteAPI = {
  execute: (sql, params = []) => ipcRenderer.invoke('sqlite-execute', sql, params),
  query: (sql, params = []) => ipcRenderer.invoke('sqlite-query', sql, params),
  get: (sql, params = []) => ipcRenderer.invoke('sqlite-get', sql, params),
};

// APIの実装
const electronAPI: ElectronAPI = {
  loadRunFiles: (runFolderPath) => ipcRenderer.invoke('load-run-files', runFolderPath),
  getAllRuns: () => ipcRenderer.invoke('get-all-runs'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getRunFolder: () => ipcRenderer.invoke('get-run-folder'),
  onLoadProgress: (callback) => {
    const progressHandler = (_: any, data: LoadProgress) => callback(data);
    ipcRenderer.on('load-progress', progressHandler);
    return () => {
      ipcRenderer.removeListener('load-progress', progressHandler);
    };
  },
  deleteRun: (run) => ipcRenderer.invoke('delete-run', run),
  sqlite: sqliteAPI,
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startUpdate: () => ipcRenderer.invoke('start-update'),
  onUpdateAvailable: (callback) => {
    const handler = (_: any, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', handler);
    return () => {
      ipcRenderer.removeListener('update-available', handler);
    };
  },
  onUpdateProgress: (callback) => {
    const handler = (_: any, info: ProgressInfo) => callback(info);
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_: any, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-downloaded', handler);
    return () => {
      ipcRenderer.removeListener('update-downloaded', handler);
    };
  },
  onUpdateError: (callback) => {
    const handler = (_: any, error: Error) => callback(error);
    ipcRenderer.on('update-error', handler);
    return () => {
      ipcRenderer.removeListener('update-error', handler);
    };
  },
};

// APIをウィンドウオブジェクトに公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI); 