/**
 * Electron API の型定義
 */

declare module 'electron-api' {
  /**
   * ファイル選択ダイアログのオプション
   */
  export interface FilePickerOptions {
    /**
     * ダイアログのタイトル
     */
    title?: string;
    
    /**
     * デフォルトのファイルパス
     */
    defaultPath?: string;
    
    /**
     * ファイルフィルター
     */
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
    
    /**
     * ダイアログのプロパティ
     */
    properties?: Array<
      | 'openFile'
      | 'openDirectory'
      | 'multiSelections'
      | 'createDirectory'
      | 'showHiddenFiles'
      | 'promptToCreate'
      | 'noResolveAliases'
      | 'treatPackageAsDirectory'
      | 'dontAddToRecent'
    >;
  }

  /**
   * ファイル選択ダイアログの結果
   */
  export interface FilePickerResult {
    /**
     * ダイアログがキャンセルされたかどうか
     */
    canceled: boolean;
    
    /**
     * 選択されたファイルパスの配列
     */
    filePaths: string[];
  }
}

/**
 * Electron用のウィンドウオブジェクトの拡張
 */
interface Window {
  /**
   * Electronのメインプロセスとレンダラープロセス間の通信用API
   */
  electronAPI?: {
    /**
     * テーマを取得する
     */
    getTheme: () => Promise<string>;
    
    /**
     * テーマを設定する
     */
    setTheme: (theme: string) => Promise<void>;
    
    /**
     * ファイル選択ダイアログを開く
     */
    openFile: () => Promise<string>;
    
    /**
     * ランファイルをインポートする
     */
    importRun: (filePath: string) => Promise<any>;
    
    /**
     * 全てのランを取得する
     */
    getAllRuns: () => Promise<any[]>;
    
    /**
     * ランを削除する
     */
    deleteRun: (runId: string) => Promise<void>;
    
    /**
     * アップデートを確認する
     */
    checkForUpdates: () => Promise<any>;
    
    /**
     * アップデートをダウンロードする
     */
    downloadUpdate: () => Promise<void>;

    /**
     * アップデートをインストールして再起動する
     */
    startUpdate: () => Promise<void>;

    /**
     * 新しいランが検出された時のコールバック
     */
    onNewRunDetected: (callback: (run: any) => void) => () => void;
  };
  
  /**
   * Electron APIの別の実装
   */
  electron?: {
    /**
     * プロダクション環境かどうか
     */
    isPackaged?: boolean;
    
    /**
     * プラットフォーム情報
     */
    platform?: 'darwin' | 'win32' | 'linux';
    
    /**
     * ランファイルを読み込む
     */
    loadRunFiles: (runFolderPath: string) => Promise<any[]>;
    
    /**
     * 全てのランを取得する
     */
    getAllRuns: () => Promise<any[]>;
    
    /**
     * テーマを取得する
     */
    getTheme: () => Promise<string>;
    
    /**
     * テーマを設定する
     */
    setTheme: (theme: string) => Promise<string>;
    
    /**
     * ファイルを読み込む
     */
    readFile: (path: string) => Promise<string>;
    
    /**
     * ユーザーデータパスを取得する
     */
    getUserDataPath: () => string;
    
    /**
     * ファイル選択ダイアログを開く
     */
    showOpenDialog: (options: import('electron-api').FilePickerOptions) => Promise<import('electron-api').FilePickerResult>;
    
    /**
     * リソースをデバッグする
     */
    debugResources: () => Promise<any>;
  };
} 