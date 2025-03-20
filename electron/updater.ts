import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

// ロギングの設定
log.transports.file.level = 'info';
autoUpdater.logger = log;

// アップデートの確認間隔（12時間）
const CHECK_INTERVAL = 12 * 60 * 60 * 1000;

export class UpdateHandler {
  private mainWindow: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    this.initialize();
  }

  private initialize() {
    // アップデートが利用可能な場合
    autoUpdater.on('update-available', (info) => {
      this.mainWindow.webContents.send('update-available', info);
    });

    // アップデートのダウンロード進捗
    autoUpdater.on('download-progress', (progressObj) => {
      this.mainWindow.webContents.send('download-progress', progressObj);
    });

    // アップデートのダウンロード完了
    autoUpdater.on('update-downloaded', (info) => {
      this.mainWindow.webContents.send('update-downloaded', info);
    });

    // エラーハンドリング
    autoUpdater.on('error', (err) => {
      log.error('AutoUpdater error:', err);
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
      this.checkForUpdates();
    }
  }

  private async checkForUpdates() {
    if (!app.isPackaged) return;
    
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('Error checking for updates:', error);
      return null;
    }
  }
} 