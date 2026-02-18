/// <reference types="vite/client" />

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
  downloadUpdate: () => Promise<void>;
  startUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (info: ProgressInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: unknown) => void) => () => void;
  resolveAssetPath: (assetPath: string) => Promise<string>;
  getResourcePath: () => Promise<string>;
  isDevelopment: boolean;
  isPackaged: boolean;
  platform: string;
  resolveImagePath: (imagePath: string) => Promise<string>;
  getAssetPath: (assetPath: string) => Promise<string>;
  assetExists: (assetPath: string) => Promise<boolean>;
  debugResources: () => Promise<any>;
  getFileURLForAsset: (assetPath: string) => Promise<string>;
  getImageBase64: (relativeImagePath: string) => Promise<string | null>;
  readFile: (filePath: string, encoding?: string) => Promise<string>;
  getUserDataPath: () => Promise<string>;
  showOpenDialog: (options: any) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
