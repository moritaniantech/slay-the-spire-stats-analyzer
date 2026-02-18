/// <reference types="vite/client" />

/**
 * Electron API の正本型定義
 *
 * Window.electronAPI に関する型定義はこのファイルを唯一のソースとする。
 * 他ファイル（global.d.ts, types/electron-api.d.ts）では重複定義しないこと。
 */

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

interface IElectronAPI {
  // ラン読み込み
  loadRunFiles: (runFolderPath: string) => Promise<Run[]>;
  getAllRuns: () => Promise<Run[]>;
  selectFolder: () => Promise<string | null>;
  getRunFolder: () => Promise<string | null>;
  onLoadProgress: (callback: (progress: LoadProgress) => void) => () => void;
  onNewRunDetected: (callback: (run: any) => void) => () => void;
  deleteRun: (run: any) => Promise<void>;
  // テーマ
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;
  // SQLite
  sqlite: SQLiteAPI;
  // アップデート
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  startUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (info: ProgressInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: unknown) => void) => () => void;
  // アセット
  resolveAssetPath: (assetPath: string) => Promise<string>;
  getResourcePath: () => Promise<string>;
  resolveImagePath: (imagePath: string) => Promise<string>;
  getAssetPath: (assetPath: string) => Promise<string>;
  assetExists: (assetPath: string) => Promise<boolean>;
  debugResources: () => Promise<any>;
  getFileURLForAsset: (assetPath: string) => Promise<string>;
  getImageBase64: (relativeImagePath: string) => Promise<string | null>;
  // ファイル・システム
  readFile: (filePath: string, encoding?: string) => Promise<string>;
  getUserDataPath: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  showOpenDialog: (options: any) => Promise<any>;
  // 環境情報
  isDevelopment: boolean;
  isPackaged: boolean;
  platform: string;
}

interface Window {
  electronAPI: IElectronAPI;
}
