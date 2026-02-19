import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

// ロギングの設定（本番はinfo以上、開発はdebug）
log.transports.file.level = app.isPackaged ? 'info' : 'debug';
autoUpdater.logger = log;

// アップデートの確認間隔（12時間）
const CHECK_INTERVAL = 12 * 60 * 60 * 1000;

// アップデーターの設定
autoUpdater.autoDownload = true;
autoUpdater.allowDowngrade = false;
autoUpdater.allowPrerelease = false;
autoUpdater.channel = 'latest';
autoUpdater.requestHeaders = {
  'User-Agent': 'StS Stats Analyzer',
  'Accept': 'application/vnd.github+json'
};

// GitHub APIのURLを設定
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'moritaniantech',
  repo: 'slay-the-spire-stats-analyzer',
  private: false,
  releaseType: 'release'
});

export class UpdateHandler {
  private mainWindow: BrowserWindow;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.initialize();
  }

  /** ウィンドウが破棄されていない場合のみ webContents.send を実行 */
  private safeSend(channel: string, ...args: unknown[]) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  private initialize() {
    // 既存リスナーをクリアして重複登録を防止
    autoUpdater.removeAllListeners();

    // アップデートが利用可能な場合
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.safeSend('update-available', info);
    });

    // アップデートのダウンロード進捗
    autoUpdater.on('download-progress', (progressObj) => {
      log.debug('Download progress:', progressObj);
      this.safeSend('download-progress', progressObj);
    });

    // アップデートのダウンロード完了
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.safeSend('update-downloaded', info);
    });

    // エラーハンドリング
    autoUpdater.on('error', (err) => {
      log.error('AutoUpdater error:', err);
      if (err instanceof Error && err.message.includes('404')) {
        log.info('No updates available or release not found');
        return;
      }
      // エラーオブジェクトをサニタイズ（内部パス・スタックトレースを除去）
      const sanitizedError = {
        message: err instanceof Error ? err.message : 'Unknown update error'
      };
      this.safeSend('update-error', sanitizedError);
    });

    // IPCハンドラーの設定（二重登録を防止）
    try {
      ipcMain.handle('check-for-updates', () => {
        return this.checkForUpdates();
      });
    } catch {
      // 既に登録済みの場合はスキップ
      log.warn('[UpdateHandler] check-for-updates handler already registered');
    }

    try {
      ipcMain.handle('download-update', () => {
        return autoUpdater.downloadUpdate();
      });
    } catch {
      log.warn('[UpdateHandler] download-update handler already registered');
    }

    try {
      ipcMain.handle('start-update', () => {
        autoUpdater.quitAndInstall();
      });
    } catch {
      log.warn('[UpdateHandler] start-update handler already registered');
    }

    // 定期的なアップデートチェック（戻り値を保存してクリーンアップ可能に）
    this.checkIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, CHECK_INTERVAL);

    // 初回起動時のアップデートチェック
    if (app.isPackaged) {
      setTimeout(() => {
        this.checkForUpdates();
      }, 5000); // 5秒後にチェック
    }
  }

  /** リソースのクリーンアップ */
  destroy() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    autoUpdater.removeAllListeners();
  }

  private async checkForUpdates() {
    if (!app.isPackaged) {
      log.info('App is not packaged, skipping update check');
      return;
    }

    try {
      log.info('Checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      log.info('Update check result:', result);
      return result;
    } catch (error) {
      log.error('Error checking for updates:', error);
      if (error instanceof Error && error.message.includes('404')) {
        log.info('No updates available or release not found');
        return null;
      }
      return null;
    }
  }
}
