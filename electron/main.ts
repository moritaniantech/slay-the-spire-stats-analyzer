import { app, BrowserWindow, ipcMain, session, nativeTheme, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
// sqlite3をCommonJSスタイルでインポート
const sqlite3 = require('sqlite3');
import type { Dirent } from 'fs';
import { migrateDatabase } from './database/migrations';
import Store from 'electron-store';
import { safeReadFile, safeWriteFile, safeDeleteFile, ensureDirectory } from './utils/fileUtils';

// アプリケーション名を設定（最初に設定する必要がある）
const APP_NAME = 'StS Stats Analyzer';

// Electronアプリケーション名を設定
app.setName(APP_NAME);

// macOS固有の設定
if (process.platform === 'darwin') {
  try {
    // macOSのDockアイコンとアプリケーション名を設定
    app.setName(APP_NAME);
    
    // Info.plist相当の設定
    app.setAboutPanelOptions({
      applicationName: APP_NAME,
      applicationVersion: app.getVersion(),
      copyright: 'Copyright © 2024 moritaniantech',
      credits: 'Created by moritaniantech'
    });
  } catch (e) {
    console.error('Failed to set app name:', e);
  }
}

// Windows固有の設定
else if (process.platform === 'win32') {
  try {
    // Windowsのアプリケーション名を設定
    app.setAppUserModelId(`com.moritaniantech.${APP_NAME}`);
  } catch (e) {
    console.error('Failed to set app user model id:', e);
  }
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DIST_ELECTRON = path.join(__dirname, '../dist-electron');
const DIST = path.join(__dirname, '../dist');
const PUBLIC = app.isPackaged ? DIST : path.join(__dirname, '../public');
const ICON = path.resolve(__dirname, '../public/icons/icon.png');

// 型定義
interface StoreSchema {
  theme: string;
}

interface DatabaseRow {
  id: string;
  character: string;
  victory: number;
  ascension_level: number;
  floor_reached: number;
  playtime: number;
  score: number;
  timestamp: number;
  run_data: string;
}

interface ProcessedRunData {
  id: number;
  character: string;
  victory: boolean;
  ascension_level: number;
  floor_reached: number;
  playtime: number;
  score: number;
  timestamp: number;
  run_data: any;
}

interface SQLiteRunRow {
  id: number;
  character: string;
  victory: number;
  ascension_level: number;
  floor_reached: number;
  playtime: number;
  score: number;
  timestamp: number;
  run_data: string;
}

interface ElectronStore {
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  store: { [key: string]: any };
}

type SQLiteCallback = (err: Error | null) => void;
type SQLiteRowCallback<T> = (err: Error | null, row: T) => void;
type SQLiteAllCallback<T> = (err: Error | null, rows: T[]) => void;

interface Database {
  run: (sql: string, params: any[] | SQLiteCallback, callback?: SQLiteCallback) => void;
  get: <T>(sql: string, params: any[] | SQLiteRowCallback<T>, callback?: SQLiteRowCallback<T>) => void;
  all: <T>(sql: string, params: any[] | SQLiteAllCallback<T>, callback?: SQLiteAllCallback<T>) => void;
}

// electron-storeを動的にインポート
let store: ElectronStore;

async function initializeStore() {
  try {
    // electron-storeをインポート
    const Store = (await import('electron-store')).default;
    store = new Store({
      name: APP_NAME,
      defaults: {
        theme: 'dark'
      }
    });
    return store;
  } catch (error) {
    console.error('Error initializing store:', error);
    // デフォルトのテーマを返す
    return {
      get: () => 'dark',
      set: () => {},
      store: { theme: 'dark' }
    };
  }
}

let db: Database | null = null;

// 型定義
interface SQLError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  path?: string;
}

interface HeadersReceivedDetails {
  responseHeaders: Record<string, string[]>;
  url: string;
}

interface HeadersReceivedCallback {
  (response: { responseHeaders?: Record<string, string | string[]> }): void;
}

async function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'slay-the-spire-stats.db');
  return new Promise<void>((resolve, reject) => {
    // @ts-ignore: sqlite3.Database型の互換性の問題を無視
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Database initialization error:', err);
        reject(err);
        return;
      }

      try {
        if (!db) {
          throw new Error('Database not initialized');
        }
        // マイグレーションを実行
        await migrateDatabase(db);
        resolve();
      } catch (error) {
        console.error('Migration error:', error);
        reject(error);
      }
    });
  });
}

async function createWindow() {
  // セキュリティポリシーの設定
  session.defaultSession.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data:",
            "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com" +
              (isDev ? " ws://localhost:*" : ""),
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join('; ')
        }
      });
    }
  );

  const mainWindow = new BrowserWindow({
    title: APP_NAME,
    icon: ICON,
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(DIST_ELECTRON, 'preload.js'),
      sandbox: true,
      devTools: isDev,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: '',
    },
  });

  // ウィンドウタイトルを設定
  mainWindow.setTitle(APP_NAME);
  
  // macOSのDockアイコンを設定
  if (process.platform === 'darwin') {
    app.dock.setIcon(ICON);
  }
  
  if (isDev) {
    mainWindow.webContents.openDevTools();
    try {
      await mainWindow.loadURL('http://localhost:5173');
    } catch (error) {
      console.error('Failed to load dev server:', error);
      process.exit(1);
    }
  } else {
    await mainWindow.loadFile(path.join(DIST, 'index.html'));
  }

  // 新規ウィンドウの作成を制限
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // ナビゲーションの制限を強化
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = isDev 
      ? new Set(['http://localhost:5173'])
      : new Set([`file://${path.join(DIST, 'index.html')}`]);
    
    const urlObj = new URL(url);
    if (!allowedOrigins.has(urlObj.origin)) {
      event.preventDefault();
      console.warn(`Navigation blocked to: ${url}`);
    }
  });

  // パーミッションリクエストハンドラーの設定
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // 許可するパーミッションを制限
    const allowedPermissions = new Set([
      'clipboard-read',
      'clipboard-write',
      'media', // 必要な場合のみ
    ]);

    // 開発環境でのみ追加のパーミッションを許可
    if (isDev) {
      allowedPermissions.add('notifications');
    }

    callback(allowedPermissions.has(permission));
  });

  // 追加のセキュリティ設定
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    // 特定のパーミッションのチェックをより厳格に
    const restrictedPermissions = new Set([
      'openExternal',
      'notifications',
    ]);

    if (restrictedPermissions.has(permission)) {
      return isDev;
    }

    return true;
  });

  return mainWindow;
}

// アプリケーションの初期化
app.whenReady().then(async () => {
  try {
    // アプリケーション名を再設定（確実に適用するため）
    app.setName(APP_NAME);
    
    // macOSのDockアイコンを設定
    if (process.platform === 'darwin') {
      app.dock.setIcon(ICON);
      
      // Info.plist相当の設定
      app.setAboutPanelOptions({
        applicationName: APP_NAME,
        applicationVersion: app.getVersion(),
        copyright: 'Copyright © 2024 moritaniantech',
        credits: 'Created by moritaniantech'
      });
    }
    // Windows固有の設定
    else if (process.platform === 'win32') {
      app.setAppUserModelId(`com.moritaniantech.${APP_NAME}`);
    }

    await initializeStore();
    await initializeDatabase();
    await createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  } catch (error) {
    console.error('Application initialization error:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// フォルダパスの検証
function validateRunFolder(folderPath: string): boolean {
  try {
    // フォルダ名が'run'であることを確認
    if (path.join(folderPath).split('/').pop() !== 'run') {
      return false;
    }

    // キャラクターフォルダの存在を確認
    const expectedFolders = ['IRONCLAD', 'SILENT', 'DEFECT', 'WATCHER'];
    const existingFolders = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter((dirent: Dirent) => dirent.isDirectory())
      .map((dirent: Dirent) => dirent.name);

    // 少なくとも1つのキャラクターフォルダが存在することを確認
    return expectedFolders.some(folder => existingFolders.includes(folder));
  } catch (error) {
    console.error('Error validating run folder:', error);
    return false;
  }
}

// フォルダ選択のIPC通信
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return result.filePaths[0];
});

// 保存されたフォルダパスを取得
ipcMain.handle('get-run-folder', async () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.get('SELECT value FROM settings WHERE key = ?', ['runFolderPath'], (err: SQLError | null, row: any) => {
      if (err) {
        console.error('Error getting run folder path:', err);
        reject(err);
      } else {
        resolve(row ? row.value : null);
      }
    });
  });
});

// 実行データの読み込み
ipcMain.handle('load-run-files', async (_, folderPath: string) => {
  try {
    const characters = ['IRONCLAD', 'SILENT', 'DEFECT', 'WATCHER'];
    let allRuns: any[] = [];

    // 各キャラクターのフォルダをチェック
    for (const character of characters) {
      const characterPath = path.join(folderPath, character);
      if (!fs.existsSync(characterPath)) continue;

      const files = await fs.promises.readdir(characterPath);
      const runFiles = files.filter(file => file.endsWith('.run'));
      
      for (const file of runFiles) {
        const filePath = path.join(characterPath, file);
        const content = await safeReadFile(filePath, [folderPath]);
        const data = JSON.parse(content);
        
        // タイムスタンプによる重複チェック
        const existingRun = await new Promise((resolve, reject) => {
          db?.get(
            'SELECT id FROM runs WHERE timestamp = ?',
            [data.timestamp],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!existingRun) {
          // 新規データの場合のみ保存
          await new Promise((resolve, reject) => {
            db?.run(
              `INSERT INTO runs (
                id, character, victory, ascension_level, floor_reached,
                playtime, score, timestamp, run_data
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                file.replace('.run', ''),
                character,
                data.victory ? 1 : 0,
                data.ascension_level,
                data.floor_reached,
                data.playtime,
                data.score,
                data.timestamp,
                JSON.stringify(data)
              ],
              (err) => {
                if (err) reject(err);
                else resolve(null);
              }
            );
          });

          allRuns.push({
            id: file.replace('.run', ''),
            character,
            ...data,
          });
        }
      }
    }
    
    // 保存されている全データを返す
    return new Promise((resolve, reject) => {
      db?.all('SELECT * FROM runs ORDER BY timestamp DESC', (err, rows: SQLiteRunRow[]) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          id: row.id,
          character: row.character,
          victory: Boolean(row.victory),
          ascension_level: row.ascension_level,
          floor_reached: row.floor_reached,
          playtime: row.playtime,
          score: row.score,
          timestamp: row.timestamp,
          run_data: JSON.parse(row.run_data)
        })));
      });
    });
  } catch (error) {
    console.error('Error loading run files:', error);
    throw error;
  }
});

// 全ての実行データを取得
ipcMain.handle('get-all-runs', async () => {
  return new Promise<ProcessedRunData[]>((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }

    db.all('SELECT * FROM runs ORDER BY timestamp DESC', (err, rows: SQLiteRunRow[]) => {
      if (err) reject(err);
      else resolve(rows.map(row => ({
        id: row.id,
        character: row.character,
        victory: Boolean(row.victory),
        ascension_level: row.ascension_level,
        floor_reached: row.floor_reached,
        playtime: row.playtime,
        score: row.score,
        timestamp: row.timestamp,
        run_data: JSON.parse(row.run_data)
      })));
    });
  });
});

// テーマ関連のIPC通信
ipcMain.handle('get-theme', async () => {
  return store.get('theme');
});

ipcMain.handle('set-theme', async (_, theme: string) => {
  store.set('theme', theme);
  return theme;
});

// データのエクスポート
ipcMain.handle('export-data', async () => {
  if (!db) throw new Error('Database not initialized');

  const exportPath = path.join(app.getPath('userData'), 'backup.json');
  const runs = await new Promise((resolve, reject) => {
    db?.all('SELECT * FROM runs', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  await safeWriteFile(exportPath, JSON.stringify(runs, null, 2), [app.getPath('userData')]);
  return exportPath;
});

// データのインポート
ipcMain.handle('import-data', async (_, filePath: string) => {
  if (!db) throw new Error('Database not initialized');

  const content = await safeReadFile(filePath, [path.dirname(filePath)]);
  const runs = JSON.parse(content);

  for (const run of runs) {
    await new Promise((resolve, reject) => {
      db?.run(
        `INSERT OR REPLACE INTO runs (
          id, character, victory, ascension_level, floor_reached,
          playtime, score, timestamp, run_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          run.id,
          run.character,
          run.victory,
          run.ascension_level,
          run.floor_reached,
          run.playtime,
          run.score,
          run.timestamp,
          run.run_data
        ],
        (err) => {
          if (err) reject(err);
          else resolve(null);
        }
      );
    });
  }

  return true;
});

// データの削除
ipcMain.handle('delete-run', async (_, run: any) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    db?.run(
      `DELETE FROM runs WHERE 
        timestamp = ? AND 
        character = ? AND 
        ascension_level = ? AND 
        victory = ? AND 
        floor_reached = ? AND 
        playtime = ? AND 
        score = ?`,
      [
        run.timestamp,
        run.character,
        run.ascension_level,
        run.victory ? 1 : 0,
        run.floor_reached,
        run.playtime,
        run.score
      ],
      (err) => {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
});

// SQLite3のAPIハンドラー
// SQL実行（INSERT, UPDATE, DELETE）
ipcMain.handle('sqlite-execute', async (_, sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    db!.run(sql, params, function(this: { lastID: number; changes: number }, err: Error | null) {
      if (err) {
        reject(err);
        return;
      }
      
      // this.lastIDとthis.changesを返す
      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
});

// SQL問い合わせ（複数行取得）
ipcMain.handle('sqlite-query', async (_, sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    db!.all(sql, params, (err: Error | null, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(rows);
    });
  });
});

// SQL問い合わせ（1行取得）
ipcMain.handle('sqlite-get', async (_, sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');

  return new Promise((resolve, reject) => {
    db!.get(sql, params, (err: Error | null, row: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve(row);
    });
  });
});

// データベースをクローズする関数
async function closeDatabase() {
  return new Promise<void>((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.run('PRAGMA optimize', [], (err) => {
      if (err) {
        console.error('Error optimizing database:', err);
      }
      
      // @ts-ignore: sqlite3.Database型にclose()が存在することを保証
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          db = null;
          resolve();
        }
      });
    });
  });
}

// バックアップ設定
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24時間
const MAX_BACKUPS = 7; // 最大バックアップ数

// バックアップ処理
async function backupDatabase() {
  if (!db) return;

  const backupDir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

  try {
    // 全データを取得
    const runs = await new Promise((resolve, reject) => {
      db?.all('SELECT * FROM runs', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const settings = await new Promise((resolve, reject) => {
      db?.all('SELECT * FROM settings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // バックアップファイルを作成
    await fs.promises.writeFile(
      backupPath,
      JSON.stringify({ runs, settings }, null, 2)
    );

    // 古いバックアップを削除
    const files = await fs.promises.readdir(backupDir);
    const backupFiles = files
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();

    if (backupFiles.length > MAX_BACKUPS) {
      for (const file of backupFiles.slice(MAX_BACKUPS)) {
        await fs.promises.unlink(path.join(backupDir, file));
      }
    }

    console.log(`バックアップを作成しました: ${backupPath}`);
  } catch (error) {
    console.error('バックアップ作成中にエラーが発生しました:', error);
  }
}

// 定期的なバックアップを設定
let backupInterval: NodeJS.Timeout;

function startBackupInterval() {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  backupInterval = setInterval(backupDatabase, BACKUP_INTERVAL);
  backupDatabase(); // 初回バックアップを実行
}

// アプリケーション起動時にバックアップを開始
app.on('ready', () => {
  startBackupInterval();
});

// アプリケーション終了時にインターバルをクリア
app.on('before-quit', () => {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
});

// アプリケーション終了時の処理を追加
app.on('before-quit', async (event) => {
  event.preventDefault();
  try {
    await closeDatabase();
    app.exit();
  } catch (error) {
    console.error('Error during application shutdown:', error);
    app.exit(1);
  }
}); 