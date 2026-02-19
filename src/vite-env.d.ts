/// <reference types="vite/client" />

/**
 * Electron API の正本型定義
 *
 * Window.electronAPI に関する型定義はこのファイルを唯一のソースとする。
 * 他ファイル（global.d.ts, types/electron-api.d.ts）では重複定義しないこと。
 */

/** Slay the Spire の run_data フィールド型定義 */
interface RunData {
  neow_bonus?: string;
  neow_cost?: string;
  master_deck?: string[];
  relics?: string[];
  card_choices?: Array<{ picked: string; not_picked: string[] }>;
  relics_obtained?: Array<{ key: string; floor: number }>;
  path_taken?: string[];
  path_per_floor?: string[];
  current_hp_per_floor?: number[];
  max_hp_per_floor?: number[];
  gold_per_floor?: number[];
  damage_taken?: Array<{ damage: number; enemies: string; floor: number; turns: number }>;
  potions_obtained?: Array<{ floor: number; key: string }>;
  boss_relics?: Array<{ not_picked: string[]; picked: string }>;
  event_choices?: Array<{ damage_healed: number; damage_taken: number; event_name: string; floor: number; gold_gain: number; gold_loss: number; max_hp_gain: number; max_hp_loss: number; player_choice: string }>;
  campfire_choices?: Array<{ data: unknown; floor: number; key: string }>;
  // RunDetail で使用
  max_hp?: number;
  gold?: number;
  killed_monsters?: number;
  elites_killed?: number;
  killed_bosses?: string[];
  score_breakdown?: Record<string, number>;
  // 明示されていないフィールドへの動的アクセス用
  // eslint-disable-next-line
  [key: string]: any;
}

interface Run {
  id?: string;
  character: string;
  character_chosen?: string;
  victory: boolean;
  ascension_level: number;
  floor_reached: number;
  playtime: number;
  score: number;
  timestamp: number;
  run_data: RunData;
  neow_bonus?: string;
  neow_cost?: string;
}

interface LoadProgress {
  progress: number;
  total: number;
}

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

interface IElectronAPI {
  // ラン読み込み
  loadRunFiles: (runFolderPath: string) => Promise<Run[]>;
  getAllRuns: () => Promise<Run[]>;
  selectFolder: () => Promise<string | null>;
  getRunFolder: () => Promise<string | null>;
  onLoadProgress: (callback: (progress: LoadProgress) => void) => () => void;
  onNewRunDetected: (callback: (run: Run) => void) => () => void;
  deleteRun: (run: Record<string, unknown>) => Promise<void>;
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
  debugResources: () => Promise<Record<string, unknown>>;
  getFileURLForAsset: (assetPath: string) => Promise<string>;
  getImageBase64: (relativeImagePath: string) => Promise<string | null>;
  // ファイル・システム
  readFile: (filePath: string, encoding?: string) => Promise<string>;
  getUserDataPath: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  showOpenDialog: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  // 環境情報
  isDevelopment: boolean;
  isPackaged: boolean;
  platform: string;
}

interface Window {
  electronAPI: IElectronAPI;
}
