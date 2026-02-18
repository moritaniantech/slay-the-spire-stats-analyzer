import type { Run } from '../types';

declare module 'electron' {
  import { IpcMain, IpcMainInvokeEvent } from 'electron';
  export { IpcMain, IpcMainInvokeEvent };
}

declare module 'electron-is-dev' {
  const isDev: boolean;
  export default isDev;
}

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

interface SQLiteAPI {
  execute: (sql: string, params?: any[]) => Promise<any>;
  query: (sql: string, params?: any[]) => Promise<any[]>;
  get: (sql: string, params?: any[]) => Promise<any>;
}

interface ElectronAPI {
  loadRunFiles: (runFolderPath: string) => Promise<Run[]>;
  getAllRuns: () => Promise<Run[]>;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;
  selectFolder: () => Promise<string | null>;
  getRunFolder: () => Promise<string | null>;
  onLoadProgress: (callback: (progress: LoadProgress) => void) => () => void;
  deleteRun: (run: Run) => Promise<void>;
  sqlite: SQLiteAPI;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  startUpdate: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (info: ProgressInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: Error) => void) => () => void;
  getAssetPath: (assetPath: string) => Promise<string>;
  assetExists: (assetPath: string) => Promise<boolean>;
  readFile: (filePath: string, encoding?: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 