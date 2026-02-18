/**
 * Electron API の補助型定義
 *
 * 注意: Window.electronAPI の型定義は src/vite-env.d.ts (IElectronAPI) を正本とする。
 * ここではダイアログ関連の補助型のみ定義する。
 */

declare module 'electron-api' {
  /**
   * ファイル選択ダイアログのオプション
   */
  export interface FilePickerOptions {
    title?: string;
    defaultPath?: string;
    filters?: Array<{
      name: string;
      extensions: string[];
    }>;
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
    canceled: boolean;
    filePaths: string[];
  }
}
