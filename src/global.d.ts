/**
 * グローバル変数の型定義
 *
 * 注意: Window.electronAPI の型定義は src/vite-env.d.ts (IElectronAPI) を正本とする。
 * ここではViteグローバル変数、レガシーAPIのみ定義する。
 */

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
  // カスタムグローバル変数
  __ASSET_BASE_PATH__: string;
  __ENV__: ElectronEnv;
  __resolveAssetPath__: AssetPathResolver;

  // アプリケーション設定
  __APP_SETTINGS__: {
    lowMemoryMode: boolean;
    maxCacheSize: number;
  };
}
