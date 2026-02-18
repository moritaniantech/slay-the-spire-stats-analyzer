// アプリケーション全体で使用するグローバル型定義

// Window オブジェクトの拡張
interface Window {
  // アセットベースパス (Viteが環境に応じて設定し、preloadが初期化)
  __ASSET_BASE_PATH__?: string;
  
  // Electron API (preload.tsで公開)
  electron?: {
    isPackaged: boolean;
    isDevelopment: boolean;
    platform: string;
    time: string;
    getAssetPath: (path: string) => Promise<string>;
  };
  
  // Electron API のインターフェース (preload.tsで公開)
  electronAPI?: {
    loadRunFiles: (runFolderPath: string) => Promise<any[]>;
    getAllRuns: () => Promise<any[]>;
    getTheme: () => Promise<string>;
    setTheme: (theme: string) => Promise<string>;
    selectFolder: () => Promise<string | null>;
    getRunFolder: () => Promise<string | null>;
    onLoadProgress: (callback: (progress: any) => void) => () => void;
    deleteRun: (run: any) => Promise<void>;
    checkForUpdates: () => Promise<void>;
    downloadUpdate: () => Promise<void>;
    startUpdate: () => Promise<void>;
    onUpdateAvailable: (callback: (info: any) => void) => () => void;
    onUpdateProgress: (callback: (info: any) => void) => () => void;
    onUpdateDownloaded: (callback: (info: any) => void) => () => void;
    onUpdateError: (callback: (error: Error) => void) => () => void;
    getAssetPath: (assetPath: string) => Promise<string>;
    assetExists: (assetPath: string) => Promise<boolean>;
    debugResources: () => Promise<any>;
  };
  
  // パス解決ヘルパー関数 (preload.tsで公開)
  __resolveAssetPath__?: (assetPath: string) => Promise<string | null>;
  
  // 環境変数 (preload.tsで公開)
  __ENV__?: {
    isDevelopment: boolean;
    isPackaged: boolean;
    platform: string;
    time: string;
  };
}

// 環境変数の拡張 (Viteの環境変数)
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 