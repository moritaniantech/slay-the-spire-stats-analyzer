import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

// ロギングの設定
log.transports.file.level = 'debug';
autoUpdater.logger = log;

// アップデートの確認間隔（12時間）
const CHECK_INTERVAL = 12 * 60 * 60 * 1000;

// アップデーターの設定
autoUpdater.autoDownload = false;
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

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.initialize();
  }

  private initialize() {
    // アップデートが利用可能な場合
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.mainWindow.webContents.send('update-available', info);
    });

    // アップデートのダウンロード進捗
    autoUpdater.on('download-progress', (progressObj) => {
      log.debug('Download progress:', progressObj);
      this.mainWindow.webContents.send('download-progress', progressObj);
    });

    // アップデートのダウンロード完了
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.mainWindow.webContents.send('update-downloaded', info);
    });

    // エラーハンドリング
    autoUpdater.on('error', (err) => {
      log.error('AutoUpdater error:', err);
      if (err instanceof Error && err.message.includes('404')) {
        log.info('No updates available or release not found');
        return;
      }
      this.mainWindow.webContents.send('update-error', err);
    });

    // IPCハンドラーの設定
    ipcMain.handle('check-for-updates', () => {
      return this.checkForUpdates();
    });

    ipcMain.handle('start-update', () => {
      autoUpdater.quitAndInstall();
    });

    // 定期的なアップデートチェック
    setInterval(() => {
      this.checkForUpdates();
    }, CHECK_INTERVAL);

    // 初回起動時のアップデートチェック
    if (app.isPackaged) {
      setTimeout(() => {
        this.checkForUpdates();
      }, 5000); // 5秒後にチェック
    }
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