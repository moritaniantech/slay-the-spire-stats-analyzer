/** グローバル変数の型定義 */

// Viteの環境変数
declare const __ASSET_BASE_PATH__: string;
declare const __IS_DEVELOPMENT__: boolean;
declare const __IS_PRODUCTION__: boolean;

// Electronから公開された環境情報
interface ElectronEnv {
  isDevelopment: boolean;
  isPackaged: boolean;
  platform: string;
  time: string;
}

// アセットパス解決関数の型
type AssetPathResolver = (assetPath: string) => Promise<string | null>;

interface Window {
  // 既存のElectron APIに加えて、新しいグローバル変数を定義
  __ASSET_BASE_PATH__: string;
  __ENV__: ElectronEnv;
  __resolveAssetPath__: AssetPathResolver;
  
  // 既存のElectron APIの型定義
  electron: {
    loadRunFiles: (runFolderPath: string) => Promise<any[]>;
    getAllRuns: () => Promise<any[]>;
    getTheme: () => Promise<string>;
    setTheme: (theme: string) => Promise<string>;
    selectFolder: () => Promise<string | null>;
    getRunFolder: () => Promise<string | null>;
    onLoadProgress: (callback: (progress: { progress: number; total: number }) => void) => () => void;
    deleteRun: (run: any) => Promise<void>;
    sqlite: {
      execute: (sql: string, params?: any[]) => Promise<any>;
      query: (sql: string, params?: any[]) => Promise<any[]>;
      get: (sql: string, params?: any[]) => Promise<any>;
    };
    resolveAssetPath: (assetPath: string) => Promise<string>;
    getResourcePath: () => Promise<string>;
    isDevelopment: boolean;
    resolveImagePath: (imagePath: string) => Promise<string>;
    getAssetPath: (assetPath: string) => Promise<string>;
    assetExists: (assetPath: string) => Promise<boolean>;
    debugResources: () => Promise<any>;
    getFileURLForAsset: (assetPath: string) => Promise<string>;
  };
  
  electronAPI: {
    getTheme: () => Promise<string>;
    setTheme: (theme: string) => Promise<string>;
    openFile: () => Promise<string>;
    importRun: (filePath: string) => Promise<any>;
    getAllRuns: () => Promise<any[]>;
    getRun: (id: string) => Promise<any>;
    deleteRun: (id: string | any) => Promise<void>;
    checkForUpdates: () => Promise<void>;
    downloadUpdate: () => Promise<void>;
    startUpdate: () => Promise<void>;
    getAssetPath: (assetPath: string) => Promise<string>;
    assetExists: (assetPath: string) => Promise<boolean>;
    getFileURLForAsset: (assetPath: string) => Promise<string>;
    // ファイル・フォルダ操作
    loadRunFiles: (runFolderPath: string) => Promise<any[]>;
    selectFolder: () => Promise<string | null>;
    getRunFolder: () => Promise<string | null>;
    onLoadProgress: (callback: (progress: { progress: number; total: number }) => void) => () => void;
    onNewRunDetected: (callback: (run: any) => void) => () => void;
    readFile: (filePath: string, encoding?: string) => Promise<string>;
    getUserDataPath: () => Promise<string>;
    showOpenDialog: (options: any) => Promise<any>;
    // 画像・アセット関連
    getImageBase64: (relativeImagePath: string) => Promise<string | null>;
    resolveAssetPath: (assetPath: string) => Promise<string>;
    getResourcePath: () => Promise<string>;
    debugResources: () => Promise<any>;
    // 環境情報
    platform: string;
    isPackaged: boolean;
    isDevelopment: boolean;
    // SQLite
    sqlite: {
      execute: (sql: string, params?: any[]) => Promise<any>;
      query: (sql: string, params?: any[]) => Promise<any[]>;
      get: (sql: string, params?: any[]) => Promise<any>;
    };
    // アップデート関連
    onUpdateAvailable: (callback: (info: any) => void) => () => void;
    onUpdateProgress: (callback: (info: any) => void) => () => void;
    onUpdateDownloaded: (callback: (info: any) => void) => () => void;
    onUpdateError: (callback: (error: unknown) => void) => () => void;
  };
  
  // アプリケーション設定
  __APP_SETTINGS__: {
    lowMemoryMode: boolean;
    maxCacheSize: number;
  };
} 