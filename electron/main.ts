import { app, BrowserWindow, ipcMain, protocol, dialog } from 'electron';
import { join, normalize } from 'path';
import log from 'electron-log';
import { validateAssetPaths } from './utils/assetUtils';
import fs from 'fs';

// ログレベルを設定
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

log.info('Application starting...');
log.info('Process type:', process.type);
log.info('Electron version:', process.versions.electron);
log.info('Node version:', process.versions.node);
log.info('Chrome version:', process.versions.chrome);

// CommonJSスタイルでelectron-storeを読み込む
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Store = require('electron-store');

// アプリケーション名を設定
const APP_NAME = 'StS Stats Analyzer';

// Store型の定義
interface StoreSchema {
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  settings: {
    theme: 'light' | 'dark';
    language: 'en' | 'ja';
  };
}

// Store のインスタンス
let store;
try {
  log.info('Initializing Store...');
  log.info('User data path:', app.getPath('userData'));
  log.info('Store constructor type:', typeof Store);
  
  store = new Store({
    name: 'config',
    cwd: app.getPath('userData'),
    defaults: {
      windowBounds: {
        width: 1280,
        height: 720
      },
      settings: {
        theme: 'light',
        language: 'ja'
      }
    }
  });
  log.info('Store initialized successfully');
} catch (error) {
  log.error('Failed to initialize store:', error);
  app.exit(1);
}

// メインウィンドウへの参照を保持
let mainWindow: BrowserWindow | null = null;

// IPC ハンドラーの初期化
function initializeIpcHandlers() {
  // テーマ設定のハンドラー
  ipcMain.handle('get-theme', () => {
    try {
      const settings = store.get('settings');
      return settings.theme;
    } catch (error) {
      log.error('Error getting theme:', error);
      return 'light'; // デフォルト値を返す
    }
  });

  ipcMain.handle('set-theme', (_, theme: 'light' | 'dark') => {
    try {
      const settings = store.get('settings');
      settings.theme = theme;
      store.set('settings', settings);
      return theme;
    } catch (error) {
      log.error('Error setting theme:', error);
      throw error;
    }
  });
  
  // アセットパス関連のハンドラー
  ipcMain.handle('get-resource-path', () => {
    // ビルドモードに応じてパスを返す
    if (app.isPackaged) {
      return join(process.resourcesPath, 'assets');
    } else {
      return join(app.getAppPath(), 'public', 'assets');
    }
  });
  
  // アセットファイルの存在確認ハンドラー
  ipcMain.handle('asset-exists', (_, assetPath: string) => {
    try {
      // assetPathが'assets/'で始まる場合は削除（二重のassets/を防ぐ）
      let normalizedAssetPath = assetPath;
      if (normalizedAssetPath.startsWith('assets/')) {
        normalizedAssetPath = normalizedAssetPath.substring('assets/'.length);
        log.debug(`[asset-exists] パスから'assets/'プレフィックスを削除: ${assetPath} -> ${normalizedAssetPath}`);
      }
      
      // get-asset-pathハンドラーと同様のロジックでパスを解決
      let resolvedPath: string | undefined;
      
      if (app.isPackaged) {
        if (process.platform === 'win32') {
          // Windows本番環境でのパス解決
          const winPaths = [
            join(process.resourcesPath, 'assets', normalizedAssetPath),
            join(process.resourcesPath, 'app.asar.unpacked', 'assets', normalizedAssetPath),
            join(app.getPath('exe'), '..', 'resources', 'assets', normalizedAssetPath),
            join(app.getPath('exe'), '..', 'assets', normalizedAssetPath)
          ];
          
          for (const candidatePath of winPaths) {
            const normalizedPath = normalize(candidatePath);
            log.debug(`[asset-exists] Windowsパス検証: ${candidatePath} -> ${normalizedPath}`);
            
            // ファイルの存在確認
            let exists = false;
            try {
              exists = fs.existsSync(normalizedPath);
              if (!exists && process.platform === 'win32') {
                // Windowsでは大文字小文字を区別しないため、パスの大文字小文字を変えて再試行
                const lowerPath = normalizedPath.toLowerCase();
                const upperPath = normalizedPath.toUpperCase();
                exists = fs.existsSync(lowerPath) || fs.existsSync(upperPath);
                if (exists) {
                  log.debug(`[asset-exists] Found with case-insensitive check: ${normalizedPath}`);
                }
              }
            } catch (error) {
              log.warn(`[asset-exists] Error checking path existence: ${normalizedPath}`, error);
            }
            
            if (exists) {
              resolvedPath = normalizedPath;
              log.debug(`[asset-exists] Windowsで有効なパスを発見: ${normalizedPath}`);
              break;
            }
          }
        } else {
          // macOS/Linux本番環境でのパス解決
          const paths = [
            join(process.resourcesPath, 'app.asar.unpacked', 'assets', normalizedAssetPath),
            join(process.resourcesPath, 'assets', normalizedAssetPath),
            join(process.resourcesPath, 'app.asar', 'assets', normalizedAssetPath)
          ];
          
          for (const candidatePath of paths) {
            if (fs.existsSync(candidatePath)) {
              resolvedPath = candidatePath;
              break;
            }
          }
        }
      } else {
        // 開発環境でのパス解決
        const devPaths = [
          join(app.getAppPath(), 'public', 'assets', normalizedAssetPath),
          join(app.getAppPath(), 'resources', 'assets', normalizedAssetPath),
          join(app.getAppPath(), 'dist', 'assets', normalizedAssetPath)
        ];

        for (const candidatePath of devPaths) {
          const normalizedPath = normalize(candidatePath);
          if (fs.existsSync(normalizedPath)) {
            resolvedPath = normalizedPath;
            break;
          }
        }
      }
      
      const exists = resolvedPath ? fs.existsSync(resolvedPath) : false;
      log.debug(`[asset-exists] ファイルの存在確認: ${assetPath} (解決後: ${resolvedPath || '未解決'}) - ${exists ? '存在します' : '存在しません'}`);
      return exists;
    } catch (error) {
      log.error(`[asset-exists] エラー: ${assetPath}`, error);
      return false;
    }
  });
  
  // アセットパスの解決ハンドラー
  ipcMain.handle('get-asset-path', (event, assetPath: string) => {
    try {
      // レンダラープロセスにログを送信
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('main-process-log', {
          level: 'info',
          message: `[get-asset-path] リクエスト: ${assetPath}`
        });
      }
      
      // assetPathが'assets/'で始まる場合は削除（二重のassets/を防ぐ）
      let normalizedAssetPath = assetPath;
      if (normalizedAssetPath.startsWith('assets/')) {
        normalizedAssetPath = normalizedAssetPath.substring('assets/'.length);
        log.debug(`[get-asset-path] パスから'assets/'プレフィックスを削除: ${assetPath} -> ${normalizedAssetPath}`);
      }
      
      let resolvedPath;
      
      if (app.isPackaged) {
        // プラットフォーム固有のパス解決
        if (process.platform === 'darwin') {
          // macOSでの特別なパス解決
          const macPaths = [
            // app.asar.unpackedを最優先（asarパッケージング時のアンパック領域）
            join(process.resourcesPath, 'app.asar.unpacked', 'assets', normalizedAssetPath),
            // 標準の場所: resourcesディレクトリ
            join(process.resourcesPath, 'assets', normalizedAssetPath),
            // アプリバンドル内の代替パス
            join(app.getAppPath(), '..', '..', 'Resources', 'assets', normalizedAssetPath),
            join(app.getAppPath(), '..', 'Resources', 'assets', normalizedAssetPath),
            // Contents/Resourcesを直接指定
            join(app.getAppPath(), '..', '..', 'assets', normalizedAssetPath),
            // app.asar内部
            join(process.resourcesPath, 'app.asar', 'assets', normalizedAssetPath),
            join(process.resourcesPath, 'app', 'assets', normalizedAssetPath)
          ];
          
          // 各パスを試す
          for (const path of macPaths) {
            log.debug(`[get-asset-path] macOSパス検証: ${path}`);
            if (fs.existsSync(path)) {
              resolvedPath = path;
              log.debug(`[get-asset-path] macOSで有効なパスを発見: ${path}`);
              break;
            }
          }
          
          // 有効なパスが見つかった場合は返す
          if (resolvedPath) {
            log.debug(`[get-asset-path] macOS用パス解決: ${assetPath} -> ${resolvedPath}`);
            return resolvedPath;
          }
          
          // パスが見つからなかった場合は代替策を試す
          log.warn(`[get-asset-path] macOSでパスが見つかりませんでした: ${assetPath}`);
          log.info(`[get-asset-path] ASAR環境外のパスを試します`);
          
          // app.asarの外側のassetsディレクトリを試す
          const appAsarExternalPaths = [
            join(app.getAppPath(), '..', '..', '..', 'assets', normalizedAssetPath),
            join(app.getAppPath(), '..', '..', '..', '..', 'assets', normalizedAssetPath),
            join(process.resourcesPath, '..', 'assets', normalizedAssetPath)
          ];
          
          for (const path of appAsarExternalPaths) {
            log.debug(`[get-asset-path] macOS ASAR外パス検証: ${path}`);
            if (fs.existsSync(path)) {
              resolvedPath = path;
              log.debug(`[get-asset-path] macOS ASAR外で有効なパスを発見: ${path}`);
              break;
            }
          }
          
          if (resolvedPath) {
            log.debug(`[get-asset-path] macOS ASAR外パス解決: ${assetPath} -> ${resolvedPath}`);
            return resolvedPath;
          }
        } else if (process.platform === 'win32') {
          // Windowsでの特別なパス解決
          // Windows本番環境では、extraResourcesでコピーされたassetsがprocess.resourcesPath配下に配置される
          // normalizedAssetPathは 'cards/allCards.json' や 'relics/relics.json' のような形式（assets/プレフィックスなし）
          const winPaths: string[] = [];
          
          // 1. 標準の場所: process.resourcesPath/assets/...（最優先）
          winPaths.push(join(process.resourcesPath, 'assets', normalizedAssetPath));
          
          // 2. app.asar.unpacked内（asarパッケージング時のアンパック領域）
          winPaths.push(join(process.resourcesPath, 'app.asar.unpacked', 'assets', normalizedAssetPath));
          
          // 3. 実行ファイルと同じディレクトリからの相対パス（NSISインストーラーの場合）
          const exeDir = app.getPath('exe');
          const exeDirNormalized = normalize(exeDir);
          log.debug(`[get-asset-path] Windows Exe directory: ${exeDir} -> ${exeDirNormalized}`);
          
          const exeParentDir = normalize(join(exeDir, '..'));
          winPaths.push(join(exeParentDir, 'resources', 'assets', normalizedAssetPath));
          winPaths.push(join(exeParentDir, 'assets', normalizedAssetPath));
          winPaths.push(join(exeParentDir, 'resources', normalizedAssetPath));
          
          // 4. アプリディレクトリからの相対パス
          winPaths.push(join(app.getAppPath(), 'resources', 'assets', normalizedAssetPath));
          winPaths.push(join(app.getAppPath(), '..', 'resources', 'assets', normalizedAssetPath));
          winPaths.push(join(app.getAppPath(), '..', 'assets', normalizedAssetPath));
          winPaths.push(join(app.getAppPath(), 'assets', normalizedAssetPath));
          
          // 5. app.asar内部（通常はここにはないが念のため）
          winPaths.push(join(process.resourcesPath, 'app.asar', 'assets', normalizedAssetPath));
          
          // 各パスを試す（Windowsではパスセパレータを正規化）
          for (const candidatePath of winPaths) {
            // Windowsでのパスセパレータ混在問題を解決するため、normalizeを使用
            const normalizedPath = normalize(candidatePath);
            log.debug(`[get-asset-path] Windowsパス検証: ${candidatePath} -> ${normalizedPath}`);
            
            // ファイルの存在確認
            let exists = false;
            try {
              exists = fs.existsSync(normalizedPath);
              if (!exists && process.platform === 'win32') {
                // Windowsでは大文字小文字を区別しないため、パスの大文字小文字を変えて再試行
                const lowerPath = normalizedPath.toLowerCase();
                const upperPath = normalizedPath.toUpperCase();
                exists = fs.existsSync(lowerPath) || fs.existsSync(upperPath);
                if (exists) {
                  log.debug(`[get-asset-path] Found with case-insensitive check: ${normalizedPath}`);
                }
              }
            } catch (error) {
              log.warn(`[get-asset-path] Error checking path existence: ${normalizedPath}`, error);
            }
            
            if (exists) {
              resolvedPath = normalizedPath;
              log.info(`[get-asset-path] Windowsで有効なパスを発見: ${normalizedPath}`);
              break;
            } else {
              log.warn(`[get-asset-path] Windowsパスが見つかりません: ${normalizedPath}`);
            }
          }
          
          // 有効なパスが見つかった場合は返す
          if (resolvedPath) {
            log.info(`[get-asset-path] Windows用パス解決: ${assetPath} -> ${resolvedPath}`);
            // レンダラープロセスにログを送信
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('main-process-log', {
                level: 'info',
                message: `[get-asset-path] Windows用パス解決成功: ${assetPath} -> ${resolvedPath}`
              });
            }
            return resolvedPath;
          }
          
          // パスが見つからなかった場合は警告を出力
          log.warn(`[get-asset-path] Windowsでパスが見つかりませんでした: ${assetPath} (正規化後: ${normalizedAssetPath})`);
          log.warn(`[get-asset-path] 試行したパス:`, winPaths.map(p => normalize(p)));
          // レンダラープロセスにログを送信
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('main-process-log', {
              level: 'error',
              message: `[get-asset-path] Windowsでパスが見つかりませんでした: ${assetPath}`,
              details: winPaths.map(p => normalize(p))
            });
          }
        }
        
        // プラットフォーム固有の処理で解決できなかった場合の共通フォールバック
        // 複数の可能性のあるパスを確認
        const possiblePaths = [
          // app.asar.unpackedを最優先（asarパッケージング時のアンパック領域）
          join(process.resourcesPath, 'app.asar.unpacked', 'assets', normalizedAssetPath),
          // 標準の場所: resourcesディレクトリ
          join(process.resourcesPath, 'assets', normalizedAssetPath),
          // app.asar内部
          join(process.resourcesPath, 'app.asar', 'assets', normalizedAssetPath),
          // その他の代替パス
          join(app.getAppPath(), 'resources', 'assets', normalizedAssetPath),
          join(app.getAppPath(), '..', 'assets', normalizedAssetPath),
          join(app.getAppPath(), 'assets', normalizedAssetPath)
        ];
        
        // 最初に存在するパスを使用（Windowsでのパスセパレータ混在問題を解決するため、normalizeを使用）
        for (const candidatePath of possiblePaths) {
          const normalizedPath = normalize(candidatePath);
          if (fs.existsSync(normalizedPath)) {
            resolvedPath = normalizedPath;
            break;
          }
        }
        
        // パスが見つからない場合は最初のパスを使用（存在しなくても）
        if (!resolvedPath) {
          resolvedPath = normalize(possiblePaths[0]);
          log.warn(`[get-asset-path] 警告: アセットが見つかりません: ${normalizedAssetPath}, 使用パス: ${resolvedPath}`);
        }
      } else {
        // 開発環境: アプリディレクトリからのパス
        // public/assetsを最優先（実際のファイルが存在する場所）
        const devPaths = [
          join(app.getAppPath(), 'public', 'assets', normalizedAssetPath),
          join(app.getAppPath(), 'resources', 'assets', normalizedAssetPath),
          join(app.getAppPath(), 'dist', 'assets', normalizedAssetPath)
        ];

        for (const candidatePath of devPaths) {
          // Windowsでのパスセパレータ混在問題を解決するため、normalizeを使用
          const normalizedPath = normalize(candidatePath);
          if (fs.existsSync(normalizedPath)) {
            resolvedPath = normalizedPath;
            break;
          }
        }

        // パスが見つからない場合はpublic/assetsを使用
        if (!resolvedPath) {
          resolvedPath = normalize(devPaths[0]);
        }
      }
      
      log.debug(`[get-asset-path] リクエスト: ${assetPath} (正規化: ${normalizedAssetPath}) -> 解決: ${resolvedPath}`);
      // レンダラープロセスにログを送信
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('main-process-log', {
          level: 'info',
          message: `[get-asset-path] パス解決完了: ${assetPath} -> ${resolvedPath}`
        });
      }
      return resolvedPath;
    } catch (error) {
      log.error(`[get-asset-path] エラー: ${assetPath}`, error);
      // レンダラープロセスにログを送信
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('main-process-log', {
          level: 'error',
          message: `[get-asset-path] エラー: ${assetPath}`,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      throw error;
    }
  });
  
  // 画像のBase64データを取得するハンドラー
  ipcMain.handle('get-image-base64', async (event, relativeImagePath: string) => {
    try {
      let imagePathToLoad: string | undefined;

      if (app.isPackaged) {
        // 本番環境: extraResources で 'resources/assets' を 'assets' にコピーしたと仮定
        // relativeImagePathは "ui/topPanel/deck.png" のような形式で来る可能性がある
        const pathsToTry: string[] = [];
        
        // 1. assets/プレフィックスがある場合
        if (relativeImagePath.startsWith('assets/')) {
          pathsToTry.push(join(process.resourcesPath, relativeImagePath));
          pathsToTry.push(join(process.resourcesPath, 'app.asar.unpacked', relativeImagePath));
        } else {
          // 2. assets/プレフィックスがない場合、assets/を追加
          pathsToTry.push(join(process.resourcesPath, 'assets', relativeImagePath));
          pathsToTry.push(join(process.resourcesPath, 'app.asar.unpacked', 'assets', relativeImagePath));
        }
        
        // 3. Windows本番環境での追加パス（NSISインストーラーの場合）
        if (process.platform === 'win32') {
          const exeDir = app.getPath('exe');
          if (relativeImagePath.startsWith('assets/')) {
            pathsToTry.push(join(exeDir, '..', 'resources', relativeImagePath));
            pathsToTry.push(join(exeDir, '..', 'resources', relativeImagePath.substring('assets/'.length)));
          } else {
            pathsToTry.push(join(exeDir, '..', 'resources', 'assets', relativeImagePath));
            pathsToTry.push(join(exeDir, '..', 'resources', relativeImagePath));
          }
        }
        
        // 各パスを試す（Windowsでのパスセパレータ混在問題を解決するため、normalizeを使用）
        for (const candidatePath of pathsToTry) {
          const normalizedPath = normalize(candidatePath);
          log.debug(`[get-image-base64] Checking path: ${candidatePath} -> ${normalizedPath}`);
          if (fs.existsSync(normalizedPath)) {
            imagePathToLoad = normalizedPath;
            log.debug(`[get-image-base64] Found image at: ${imagePathToLoad}`);
            break;
          }
        }
        
        if (!imagePathToLoad) {
          log.warn(`[get-image-base64] Image not found in any of the tried paths for: ${relativeImagePath}`);
          // フォールバックとして最初のパスを使用
          imagePathToLoad = normalize(pathsToTry[0]);
        }
      } else {
        // 開発環境: public/assets 配下を優先的に試す
        const devPaths = [
          join(app.getAppPath(), 'public', 'assets', relativeImagePath),
          join(app.getAppPath(), 'public', 'assets', 'assets', relativeImagePath), // 二重プレフィックスの場合
          join(app.getAppPath(), 'src', 'assets', relativeImagePath)
        ];
        
        for (const candidatePath of devPaths) {
          const normalizedPath = normalize(candidatePath);
          if (fs.existsSync(normalizedPath)) {
            imagePathToLoad = normalizedPath;
            break;
          }
        }
        
        if (!imagePathToLoad) {
          log.warn(`[get-image-base64-dev] Image not found in public/assets or src/assets. Path tried: ${devPaths.join(', ')}`);
          // 最終手段として最初のパスを使う
          imagePathToLoad = normalize(devPaths[0]);
        }
      }
      
      log.debug(`[get-image-base64] Attempting to read image from: ${imagePathToLoad} (requested: ${relativeImagePath})`);

      if (!imagePathToLoad || !fs.existsSync(imagePathToLoad)) {
        log.error(`[get-image-base64] Final check: Image file does not exist at resolved path: ${imagePathToLoad}`);
        // 開発中はエラーを投げて気づきやすくするのも手だが、本番ではnullを返してUIがクラッシュしないようにする
        if (!app.isPackaged) {
            // throw new Error(`Image file not found at ${imagePathToLoad}`);
        }
        return null; // ファイルが見つからない場合はnullを返す
      }

      const buffer = await fs.promises.readFile(imagePathToLoad);
      const extension = relativeImagePath.split('.').pop()?.toLowerCase() || 'png';
      let mimeType = 'image/png'; // Default to png
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg';
          break;
        case 'gif':
          mimeType = 'image/gif';
          break;
        case 'svg':
          mimeType = 'image/svg+xml';
          break;
        case 'webp':
          mimeType = 'image/webp';
          break;
        // Add other image types if needed
      }
      
      log.debug(`[get-image-base64] Successfully read image, generating base64 for MIME type: ${mimeType}`);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      log.error(`[get-image-base64] Failed to load image ${relativeImagePath}:`, error);
      return null;
    }
  });
  
  // ファイルのURLを生成するハンドラー
  ipcMain.handle('get-file-url-for-asset', async (_, assetPath: string) => {
    log.info(`[IPC:get-file-url-for-asset] Received original assetPath from renderer: "${assetPath}"`);
    
    let pathForProtocol = assetPath;
    if (!pathForProtocol.startsWith('assets/')) {
      // Viteのpublicディレクトリの挙動（public/assets/foo -> dist/assets/foo）を考慮し、
      // 'ui/' や 'images/' など、'public/assets/' 配下にあることがわかっているディレクトリのパスであれば、
      // 'assets/' プレフィックスを付与する。
      if (pathForProtocol.startsWith('ui/') || 
          pathForProtocol.startsWith('images/') || 
          pathForProtocol.startsWith('fonts/') || // 必要に応じて他のトップレベルディレクトリも追加
          pathForProtocol.startsWith('relics/') ||
          pathForProtocol.startsWith('localization/')) {
        log.info(`[IPC:get-file-url-for-asset] Path did not start with 'assets/'. Prepending 'assets/' to: "${pathForProtocol}"`);
        pathForProtocol = `assets/${pathForProtocol}`;
      } else {
        log.info(`[IPC:get-file-url-for-asset] Path did not start with 'assets/' and is not a known assets subdirectory. Using as is: "${pathForProtocol}"`);
      }
    } else {
      log.info(`[IPC:get-file-url-for-asset] Path already started with 'assets/'. Using as is: "${pathForProtocol}"`);
    }
    
    const assetUrl = `asset://${pathForProtocol}`;
    log.info(`[IPC:get-file-url-for-asset] Returning asset URL for protocol: "${assetUrl}"`);
    return assetUrl;
  });
  
  // デバッグ用: リソース情報取得ハンドラー
  ipcMain.handle('debug-resources', () => {
    try {
      return {
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        appPath: app.getAppPath(),
        execPath: app.getPath('exe'),
        userDataPath: app.getPath('userData'),
        appDataPath: app.getPath('appData'),
        platform: process.platform,
        arch: process.arch,
        validatedPaths: validateAssetPaths()
      };
    } catch (error) {
      log.error('[debug-resources] エラー', error);
      throw error;
    }
  });
  
  // アプリがパッケージかどうかを確認するハンドラー
  ipcMain.handle('is-app-packaged', () => {
    return app.isPackaged;
  });

  // ファイル読み込みハンドラ (preload.ts の readFile から呼び出される)
  ipcMain.handle('fs-readFile', async (event, filePath: string, encoding: string = 'utf8') => {
    try {
      // セキュリティ: 許可ディレクトリの検証
      const allowedDirs = [
        app.getPath('userData'),
        app.isPackaged
          ? join(process.resourcesPath, 'assets')
          : join(app.getAppPath(), 'public', 'assets')
      ];
      const normalizedFilePath = normalize(filePath);
      const isAllowed = allowedDirs.some(dir => normalizedFilePath.startsWith(normalize(dir)));
      if (!isAllowed) {
        log.error(`[fs-readFile] Access denied: ${filePath}`);
        throw new Error(`Access denied: ${filePath}`);
      }
      return await fs.promises.readFile(filePath, encoding as BufferEncoding);
    } catch (error) {
      log.error(`[fs-readFile] Error reading file ${filePath}:`, error);
      throw error;
    }
  });

  // app.getPath ハンドラ (preload.ts の getUserDataPath から呼び出される)
  ipcMain.handle('app-getPath', (event, name: string) => {
    try {
      return app.getPath(name as any); // name の型を electron の PathName に合わせる必要があるが、一旦 any
    } catch (error) {
      log.error(`[app-getPath] Error getting path for ${name}:`, error);
      throw error;
    }
  });

  // dialog.showOpenDialog ハンドラ (preload.ts の showOpenDialog から呼び出される)
  ipcMain.handle('dialog-showOpenDialog', async (event, options: any) => {
    // mainWindow を取得する必要がある場合がある
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      log.error('[dialog-showOpenDialog] No focused window available.');
      throw new Error('No focused window available for dialog.');
    }
    try {
      return await dialog.showOpenDialog(focusedWindow, options);
    } catch (error) {
      log.error('[dialog-showOpenDialog] Error showing open dialog with options:', options, error);
      throw error;
    }
  });

  // フォルダ選択ハンドラ (preload.ts の selectFolder から呼び出される)
  ipcMain.handle('select-folder', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) {
      log.error('[select-folder] No focused window available.');
      throw new Error('No focused window available for dialog.');
    }
    try {
      const result = await dialog.showOpenDialog(focusedWindow, {
        properties: ['openDirectory'],
        title: 'Slay the Spireのrunsフォルダを選択'
      });
      
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        log.info('[select-folder] フォルダ選択がキャンセルされました');
        return null;
      }
      
      const selectedPath = result.filePaths[0];
      log.info(`[select-folder] 選択されたフォルダ: ${selectedPath}`);
      return selectedPath;
    } catch (error) {
      log.error('[select-folder] フォルダ選択エラー:', error);
      throw error;
    }
  });

  // ランファイル読み込みハンドラ (preload.ts の loadRunFiles から呼び出される)
  ipcMain.handle('load-run-files', async (_, runFolderPath: string) => {
    try {
      log.info(`[load-run-files] フォルダパス: ${runFolderPath}`);
      
      if (!fs.existsSync(runFolderPath)) {
        throw new Error(`フォルダが見つかりません: ${runFolderPath}`);
      }

      // すべての.runファイルを再帰的に検索
      const runFiles: string[] = [];
      
      const findRunFiles = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            findRunFiles(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.run')) {
            runFiles.push(fullPath);
          }
        }
      };
      
      findRunFiles(runFolderPath);
      log.info(`[load-run-files] 見つかった.runファイル数: ${runFiles.length}`);
      
      if (runFiles.length === 0) {
        log.warn('[load-run-files] .runファイルが見つかりませんでした');
        return [];
      }

      // 進捗状況を送信する関数
      const sendProgress = (progress: number, total: number) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('load-progress', { progress, total });
        }
      };

      // 各ファイルを読み込んでパース
      const runs: any[] = [];
      for (let i = 0; i < runFiles.length; i++) {
        const filePath = runFiles[i];
        try {
          const content = await fs.promises.readFile(filePath, 'utf8');
          const runData = JSON.parse(content);
          
          // Runオブジェクトの形式に変換
          const run = {
            id: runData.play_id || filePath,
            timestamp: runData.timestamp || 0,
            character: runData.character_chosen || runData.character || 'UNKNOWN',
            character_chosen: runData.character_chosen || runData.character || 'UNKNOWN',
            ascension_level: runData.ascension_level || 0,
            victory: runData.victory || false,
            floor_reached: runData.floor_reached || 0,
            playtime: runData.playtime || 0,
            score: runData.score || 0,
            run_data: runData,
            neow_bonus: runData.neow_bonus || runData.run_data?.neow_bonus || undefined,
            neow_cost: runData.neow_cost || runData.run_data?.neow_cost || undefined
          };
          
          runs.push(run);
          
          // 進捗状況を送信
          sendProgress(i + 1, runFiles.length);
        } catch (error) {
          log.error(`[load-run-files] ファイルの読み込みエラー: ${filePath}`, error);
          // エラーが発生しても処理を続行
        }
      }
      
      log.info(`[load-run-files] 読み込み完了: ${runs.length}件のランを読み込みました`);
      return runs;
    } catch (error) {
      log.error('[load-run-files] エラー:', error);
      throw error;
    }
  });

  // ダミーハンドラ: get-all-runs
  ipcMain.handle('get-all-runs', async () => {
    log.info('[IPC DUMMY] get-all-runs called');
    return []; // とりあえず空の配列を返す
  });

  // ダミーハンドラ: get-run-folder
  ipcMain.handle('get-run-folder', async () => {
    log.info('[IPC DUMMY] get-run-folder called');
    return null; // とりあえずnullを返す
  });

  // ダミーハンドラ: check-for-updates（アップデート機能が無効な場合）
  ipcMain.handle('check-for-updates', async () => {
    log.info('[IPC DUMMY] check-for-updates called');
    // アップデート機能は現在無効化されているため、何もしない
    return null;
  });
}

// メインウィンドウの作成と初期化
async function createWindow() {
  try {
    log.info('Creating main window...');

    // アプリケーションのアセットパスを検証
    log.info('アセットパスの検証を開始...');
    const validPaths = validateAssetPaths();
    log.info('有効なアセットパス:', validPaths);

    // ウィンドウの作成前にStoreが初期化されているか確認
    if (!store) {
      log.error('Store is not initialized');
      app.exit(1);
      return;
    }

    const bounds = store.get('windowBounds');
    log.info('Window bounds from store:', bounds);

    // ウィンドウの作成
    const window = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        // sandbox: false を維持（preloadスクリプトでipcRendererが必要なため）
        // 将来的にはsandbox: trueに移行し、すべてのNode.js APIをIPCハンドラー経由にすることを推奨
        sandbox: false
      }
    });
    
    // グローバル変数に設定
    mainWindow = window;

    // 開発環境の場合はDevToolsを開く
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      window.webContents.openDevTools();
    }

    // 初期化処理の実行
    try {
      log.info('Initializing application components...');

      // IPC ハンドラーの初期化
      initializeIpcHandlers();

      // ウィンドウのロード
      if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        log.info('Loading development URL...');
        await window.loadURL('http://localhost:5173');
      } else {
        log.info('Loading production file...');
        log.info('__dirname:', __dirname);
        log.info('app.getAppPath():', app.getAppPath());
        log.info('process.resourcesPath:', process.resourcesPath);
        log.info('app.isPackaged:', app.isPackaged);
        
        // Windows本番環境でのindex.htmlのパス解決（複数の候補を試す）
        const possibleIndexPaths: string[] = [];
        
        if (process.platform === 'win32') {
          // Windows本番環境でのパス候補
          // extraResourcesで配置されたdistを最優先（app.asarの外に配置される）
          possibleIndexPaths.push(
            join(process.resourcesPath, 'dist', 'index.html'),
            join(app.getPath('exe'), '..', 'resources', 'dist', 'index.html'),
            // app.asar.unpacked/dist（念のため）
            join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html'),
            join(app.getPath('exe'), '..', 'resources', 'app.asar.unpacked', 'dist', 'index.html'),
            // app.asar内のdist（アンパックされていない場合）
            join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
            join(app.getPath('exe'), '..', 'resources', 'app.asar', 'dist', 'index.html'),
            // その他の候補
            join(__dirname, '../dist/index.html'),
            join(__dirname, '../../dist/index.html'),
            join(__dirname, 'dist/index.html'),
            join(app.getAppPath(), 'dist/index.html'),
            join(app.getAppPath(), '../dist/index.html')
          );
        } else {
          // macOS/Linux本番環境でのパス候補
          possibleIndexPaths.push(
            join(__dirname, '../dist/index.html'),
            join(__dirname, '../../dist/index.html'),
            join(app.getAppPath(), 'dist/index.html'),
            join(process.resourcesPath, 'app.asar/dist/index.html'),
            join(process.resourcesPath, 'app.asar.unpacked/dist/index.html')
          );
        }
        
        let indexPath: string | undefined;
        for (const candidatePath of possibleIndexPaths) {
          const normalizedPath = normalize(candidatePath);
          log.info(`[createWindow] Checking index.html path: ${candidatePath} -> ${normalizedPath}`);
          if (fs.existsSync(normalizedPath)) {
            indexPath = normalizedPath;
            log.info(`[createWindow] Found index.html at: ${indexPath}`);
            break;
          }
        }
        
        if (!indexPath) {
          log.error('[createWindow] index.html not found in any of the tried paths');
          log.error('[createWindow] Tried paths:', possibleIndexPaths.map(p => normalize(p)));
          throw new Error(`index.html not found. Tried paths: ${possibleIndexPaths.join(', ')}`);
        }
        
        log.info('[createWindow] Loading index.html from:', indexPath);
        
        // distディレクトリのパスを取得（index.htmlの親ディレクトリ）
        const distDir = normalize(join(indexPath, '..'));
        log.info('[createWindow] dist directory:', distDir);
        
        // distディレクトリ内のリソース（CSS、JS）の存在確認
        const distAssetsDir = join(distDir, 'assets');
        log.info('[createWindow] dist/assets directory:', distAssetsDir);
        if (fs.existsSync(distAssetsDir)) {
          const assetsFiles = fs.readdirSync(distAssetsDir);
          log.info('[createWindow] Files in dist/assets:', assetsFiles.slice(0, 10)); // 最初の10個のみ表示
        } else {
          log.warn('[createWindow] dist/assets directory not found:', distAssetsDir);
        }
        
        // リソース読み込みエラーのハンドリング（loadFileの前に設定）
        window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
          if (isMainFrame) {
            log.error(`[createWindow] Failed to load main frame: ${errorCode} - ${errorDescription} - ${validatedURL}`);
          } else {
            log.warn(`[createWindow] Failed to load resource: ${errorCode} - ${errorDescription} - ${validatedURL}`);
            // リソースのパスを解析して、正しいパスを提案
            if (validatedURL) {
              const urlPath = validatedURL.replace(/^file:\/\/\//, '').replace(/\//g, process.platform === 'win32' ? '\\' : '/');
              log.warn(`[createWindow] Attempted resource path: ${urlPath}`);
              log.warn(`[createWindow] Expected dist directory: ${distDir}`);
              const expectedPath = join(distDir, urlPath.replace(distDir, '').replace(/^[\/\\]/, ''));
              log.warn(`[createWindow] Expected resource path: ${expectedPath}`);
              log.warn(`[createWindow] Resource exists: ${fs.existsSync(expectedPath)}`);
            }
          }
        });
        
        // リソース読み込み成功のログ
        window.webContents.on('did-finish-load', () => {
          log.info('[createWindow] Page finished loading');
        });
        
        // loadFileを使用（相対パスでリソースを読み込む際に正しく解決される）
        // Windows本番環境でもloadFileを使用することで、distディレクトリ内のリソースが正しく解決される
        await window.loadFile(indexPath);
      }

      // ウィンドウサイズの保存
      window.on('resize', () => {
        try {
          const { width, height } = window.getBounds();
          store.set('windowBounds', { width, height });
          log.info('Window bounds saved:', { width, height });
        } catch (error) {
          log.error('Error saving window bounds:', error);
        }
      });

      log.info('Application initialized successfully');
      return window;
    } catch (error) {
      log.error('Error during application initialization:', error);
      throw error;
    }
  } catch (error) {
    log.error('Error creating window:', error);
    throw error;
  }
}

// アプリケーションの起動
app.on('ready', async () => {
  try {
    log.info('App ready event fired');

    // macOS向けファイルアクセス対策
    // if (app.isPackaged && process.platform === 'darwin') {
    //   log.info('macOS向けファイルプロトコルハンドラを登録します');
      
    //   // 既存のプロトコルが登録されていないことを確認
    //   if (protocol.isProtocolHandled('file')) {
    //     log.info('既にfileプロトコルが登録されています。再登録しません。');
    //   } else {
    //     const registered = protocol.registerFileProtocol('file', (request, callback) => {
    //       try {
    //         // file:///path/to/file 形式のURLを処理
    //         let filePath = decodeURIComponent(request.url.replace('file:///', ''));
            
    //         // フォーワードスラッシュをバックスラッシュに変換（Windowsの場合）
    //         if (process.platform === 'win32') {
    //           filePath = filePath.replace(/\//g, '\\');
    //         }
            
    //         log.debug(`[file-protocol] リクエスト: ${request.url} -> ${filePath}`);
            
    //         if (fs.existsSync(filePath)) {
    //           log.debug(`[file-protocol] ファイル存在確認: ${filePath} ✓`);
    //           return callback({ path: filePath });
    //         } else {
    //           // ファイルが存在しない場合、複数の場所を探索
    //           const possibleAssetPaths = [
    //             join(process.resourcesPath, 'assets', filePath.substring(filePath.lastIndexOf('/') + 1)),
    //             join(app.getAppPath(), 'assets', filePath.substring(filePath.lastIndexOf('/') + 1))
    //           ];
              
    //           for (const p of possibleAssetPaths) {
    //             if (fs.existsSync(p)) {
    //               log.debug(`[file-protocol] 代替パスでファイル存在確認: ${p} ✓`);
    //               return callback({ path: p });
    //             }
    //           }
              
    //           log.error(`[file-protocol] ファイルが見つかりません: ${filePath}`);
    //           return callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
    //         }
    //       } catch (e) {
    //         log.error('[file-protocol] エラー:', e);
    //         return callback({ error: -2 }); // net::ERR_FAILED
    //       }
    //     });
        
    //     if (registered) {
    //       log.info('ファイルプロトコルハンドラが正常に登録されました');
    //     } else {
    //       log.error('ファイルプロトコルハンドラの登録に失敗しました');
    //     }
    //   }
    // }

    // 追加: アセットプロトコルハンドラを登録
    if (!protocol.isProtocolHandled('asset')) {
      log.info("Registering 'asset' protocol handler");
      protocol.registerFileProtocol('asset', (request, callback) => {
        try {
          log.info(`[asset-protocol] --------------- Request Start ---------------`);
          log.info(`[asset-protocol] Intercepted request.url: "${request.url}"`);
          
          // レンダラープロセスにログを送信
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('main-process-log', {
              level: 'info',
              message: `[asset-protocol] リクエスト: ${request.url}`
            });
          }
          
          const decodedUrl = decodeURIComponent(request.url);
          log.info(`[asset-protocol] Decoded request.url: "${decodedUrl}"`);

          let requestedAssetPath = decodedUrl.replace('asset://', '');
          log.info(`[asset-protocol] Initial requestedAssetPath (after 'asset://' removal): "${requestedAssetPath}"`);

          // パスの正規化ステップ
          if (requestedAssetPath.startsWith('./')) {
            const oldPath = requestedAssetPath;
            requestedAssetPath = requestedAssetPath.substring(2);
            log.warn(`[asset-protocol] Normalized leading './': "${oldPath}" -> "${requestedAssetPath}"`);
          }

          if (requestedAssetPath.startsWith('assets/assets/')) {
            const oldPath = requestedAssetPath;
            requestedAssetPath = requestedAssetPath.substring('assets/'.length);
            log.warn(`[asset-protocol] Normalized double 'assets/' prefix: "${oldPath}" -> "${requestedAssetPath}"`);
          }
          
          log.info(`[asset-protocol] Requested asset (normalized): "${requestedAssetPath}"`);

          const pathsToTry: {path: string, description: string}[] = [];

          if (!app.isPackaged) {
            // 開発環境のパス解決
            // Vite dev server は public ディレクトリをルートとして提供し、
            // src/assets も解決できる場合がある。
            // requestedAssetPath が "assets/ui/..." のような形式で来ることを想定
            
            // 1. public ディレクトリ直下 (例: public/assets/ui/... -> assets/ui/...)
            //    Vite の publicDir の挙動により、ビルド時には dist/assets/ui/... になるが、
            //    開発時は requestedAssetPath が public を省略したパス (assets/ui/...) になっていることが多い。
            //    そのため、app.getAppPath() と 'public' を結合し、そこからの相対パスとして解決を試みる。
            pathsToTry.push({ path: join(app.getAppPath(), 'public', requestedAssetPath), description: `Dev (public/${requestedAssetPath})`});
            
            // 2. src ディレクトリ直下 (例: src/assets/ui/... -> assets/ui/...)
            //    念のため src/assets からのパスも試す
            pathsToTry.push({ path: join(app.getAppPath(), 'src', requestedAssetPath), description: `Dev (src/${requestedAssetPath})`});

            // 3. Viteのdevサーバがルート ('/') から提供する場合、requestedAssetPath がそのままプロジェクトルートからの相対パスを示している可能性
            //    (例: 'assets/images/cards/ironclad/attack/anger.png')
            //    この場合、`public` や `src` プレフィックスなしで `app.getAppPath()` から結合
            //    ただし、requestedAssetPathが既に 'assets/' で始まっている場合は、上記の public/assets や src/assets でカバーされる。
            //    もし 'ui/...' のような 'assets/' が抜けた形で来た場合に備える。
            if (!requestedAssetPath.startsWith('assets/')) {
                 pathsToTry.push({ path: join(app.getAppPath(), 'public', 'assets', requestedAssetPath), description: `Dev (public/assets/${requestedAssetPath})`});
                 pathsToTry.push({ path: join(app.getAppPath(), 'src', 'assets', requestedAssetPath), description: `Dev (src/assets/${requestedAssetPath})`});
            }

          } else {
            // 本番環境（パッケージ済み）のパス解決
            const viteOutputDirName = 'dist'; 
            
            // デバッグ情報をログに出力
            log.info(`[asset-protocol] Production environment detected`);
            log.info(`[asset-protocol] Platform: ${process.platform}`);
            log.info(`[asset-protocol] process.resourcesPath: ${process.resourcesPath}`);
            log.info(`[asset-protocol] app.getAppPath(): ${app.getAppPath()}`);
            log.info(`[asset-protocol] app.getPath('exe'): ${app.getPath('exe')}`);
            log.info(`[asset-protocol] requestedAssetPath: "${requestedAssetPath}"`);

            // プラットフォーム固有のパス解決
            if (process.platform === 'win32') {
              // Windows本番環境でのパス解決
              // extraResourcesでコピーされたassetsがprocess.resourcesPath配下に配置される
              // requestedAssetPathは "assets/ui/..." または "ui/..." の形式で来る可能性がある
              
              // 1. assets/プレフィックスがある場合のパス解決（最優先）
              if (requestedAssetPath.startsWith('assets/')) {
                // process.resourcesPath/assets/ui/... の形式
                pathsToTry.push({ 
                  path: join(process.resourcesPath, requestedAssetPath), 
                  description: `Windows Direct Resources (with assets/ prefix)` 
                });
                // app.asar.unpacked内も試す
                pathsToTry.push({ 
                  path: join(process.resourcesPath, 'app.asar.unpacked', requestedAssetPath), 
                  description: `Windows Unpacked ASAR (with assets/ prefix)` 
                });
              } else {
                // 2. assets/プレフィックスがない場合、assets/を追加して試す
                const withAssetsPrefix = `assets/${requestedAssetPath}`;
                pathsToTry.push({ 
                  path: join(process.resourcesPath, withAssetsPrefix), 
                  description: `Windows Direct Resources (added assets/ prefix)` 
                });
                pathsToTry.push({ 
                  path: join(process.resourcesPath, 'app.asar.unpacked', withAssetsPrefix), 
                  description: `Windows Unpacked ASAR (added assets/ prefix)` 
                });
              }
              
              // 3. その他の代替パス（後方互換性のため）
              pathsToTry.push({ 
                path: join(process.resourcesPath, 'app.asar.unpacked', requestedAssetPath), 
                description: `Windows Unpacked ASAR (original path)` 
              });
              pathsToTry.push({ 
                path: join(process.resourcesPath, requestedAssetPath), 
                description: `Windows Direct Resources (original path)` 
              });
              
              // 4. app.asar内部も試す（通常はここにはないが念のため）
              pathsToTry.push({ 
                path: join(process.resourcesPath, 'app.asar', viteOutputDirName, requestedAssetPath), 
                description: `Windows ASAR dist` 
              });
              pathsToTry.push({ 
                path: join(process.resourcesPath, 'app.asar', requestedAssetPath), 
                description: `Windows ASAR` 
              });
              
              // 5. 実行ファイルと同じディレクトリからの相対パス（NSISインストーラーの場合）
              const exeDir = app.getPath('exe');
              const exeDirNormalized = normalize(exeDir);
              log.debug(`[asset-protocol] Windows Exe directory: ${exeDir} -> ${exeDirNormalized}`);
              
              // 実行ファイルの親ディレクトリからの相対パス
              const exeParentDir = normalize(join(exeDir, '..'));
              
              if (requestedAssetPath.startsWith('assets/')) {
                // assets/プレフィックスがある場合
                pathsToTry.push({ 
                  path: join(exeParentDir, 'resources', requestedAssetPath), 
                  description: `Windows Exe Resources (with assets/ prefix)` 
                });
                pathsToTry.push({ 
                  path: join(exeParentDir, 'resources', requestedAssetPath.substring('assets/'.length)), 
                  description: `Windows Exe Resources (no assets/ prefix)` 
                });
                pathsToTry.push({ 
                  path: join(exeParentDir, requestedAssetPath), 
                  description: `Windows Exe Parent (with assets/ prefix)` 
                });
              } else {
                // assets/プレフィックスがない場合
                pathsToTry.push({ 
                  path: join(exeParentDir, 'resources', 'assets', requestedAssetPath), 
                  description: `Windows Exe Resources (added assets/ prefix)` 
                });
                pathsToTry.push({ 
                  path: join(exeParentDir, 'resources', requestedAssetPath), 
                  description: `Windows Exe Resources (no assets/ prefix)` 
                });
                pathsToTry.push({ 
                  path: join(exeParentDir, 'assets', requestedAssetPath), 
                  description: `Windows Exe Parent (added assets/ prefix)` 
                });
              }
            } else {
              // macOS/Linux本番環境でのパス解決（既存のロジック）
              const potentialBasePathsInAsar = [
                join(process.resourcesPath, 'app.asar', viteOutputDirName), 
                join(process.resourcesPath, 'app.asar')                   
              ];

              const potentialBasePathsUnpacked = [
                join(process.resourcesPath, 'app.asar.unpacked', viteOutputDirName),
                join(process.resourcesPath, 'app.asar.unpacked')
              ];
              
              const directResourcesPath = process.resourcesPath;

              for (const basePath of potentialBasePathsInAsar) {
                pathsToTry.push({ path: join(basePath, requestedAssetPath), description: `ASAR (${basePath})` });
              }

              for (const basePath of potentialBasePathsUnpacked) {
                pathsToTry.push({ path: join(basePath, requestedAssetPath), description: `Unpacked (${basePath})` });
              }
              
              pathsToTry.push({ path: join(directResourcesPath, requestedAssetPath), description: "Direct Resources" });
              if (requestedAssetPath.startsWith('assets/')) {
                pathsToTry.push({ path: join(directResourcesPath, requestedAssetPath.substring('assets/'.length)), description: "Direct Resources (no 'assets/' prefix)" });
              }
            }
          }
          
          let resolvedPath: string | undefined;
          for (const pInfo of pathsToTry) {
            // Windowsでのパスセパレータ混在問題を解決するため、normalizeを使用
            const normalizedPath = normalize(pInfo.path);
            log.info(`[asset-protocol] Checking (${pInfo.description}): "${pInfo.path}" -> "${normalizedPath}"`);
            
            // ファイルの存在確認（Windowsでは大文字小文字を区別しないが、念のため）
            let exists = false;
            try {
              exists = fs.existsSync(normalizedPath);
              if (!exists && process.platform === 'win32') {
                // Windowsでは大文字小文字を区別しないため、パスの大文字小文字を変えて再試行
                const lowerPath = normalizedPath.toLowerCase();
                const upperPath = normalizedPath.toUpperCase();
                exists = fs.existsSync(lowerPath) || fs.existsSync(upperPath);
                if (exists) {
                  log.debug(`[asset-protocol] Found with case-insensitive check: ${normalizedPath}`);
                }
              }
            } catch (error) {
              log.warn(`[asset-protocol] Error checking path existence: ${normalizedPath}`, error);
            }
            
            if (exists) {
              resolvedPath = normalizedPath;
              log.info(`[asset-protocol] SUCCESS: Asset found at "${resolvedPath}"`);
              break;
            } else {
              log.warn(`[asset-protocol] FAILED: Asset not found at "${normalizedPath}"`);
            }
          }

          if (resolvedPath) {
            log.info(`[asset-protocol] Calling callback with resolved path: "${resolvedPath}"`);
            // レンダラープロセスにログを送信
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('main-process-log', {
                level: 'info',
                message: `[asset-protocol] パス解決成功: ${requestedAssetPath} -> ${resolvedPath}`
              });
            }
            callback({ path: resolvedPath });
          } else {
            log.error(`[asset-protocol] ERROR: Could not resolve asset for requestedAssetPath: "${requestedAssetPath}". All checks failed.`);
            log.error(`[asset-protocol] Tried ${pathsToTry.length} paths:`);
            pathsToTry.forEach((pInfo, index) => {
              const normalized = normalize(pInfo.path);
              log.error(`[asset-protocol]   ${index + 1}. ${pInfo.description}: "${pInfo.path}" -> "${normalized}"`);
            });
            // レンダラープロセスにログを送信
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('main-process-log', {
                level: 'error',
                message: `[asset-protocol] パス解決失敗: ${requestedAssetPath}`,
                details: pathsToTry.map((pInfo, index) => {
                  const normalized = normalize(pInfo.path);
                  return `${index + 1}. ${pInfo.description}: "${pInfo.path}" -> "${normalized}"`;
                })
              });
            }
            callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
          }
          log.info(`[asset-protocol] --------------- Request End ---------------`);
        } catch (error) {
          log.error('[asset-protocol] Unexpected error in protocol handler:', error);
          callback({ error: -2 }); // net::ERR_FAILED
          log.info(`[asset-protocol] --------------- Request End (Error) ---------------`);
        }
      });
    }

    // 自動更新を無効化
    if (app.isPackaged) {
      log.info('Auto-update is disabled in production');
      // autoUpdater関連の処理をコメントアウト
      /*
      autoUpdater.checkForUpdatesAndNotify().catch((error) => {
        log.error('Auto-update error:', error);
      });
      */
    }

    const mainWindow = await createWindow();
    
    // エラーハンドリングを追加
    process.on('uncaughtException', (error) => {
      log.error('Uncaught exception:', error);
      app.exit(1);
    });

    process.on('unhandledRejection', (error) => {
      log.error('Unhandled rejection:', error);
      app.exit(1);
    });
  } catch (error) {
    log.error('Error in app ready handler:', error);
    app.exit(1);
  }
});

// アプリケーションの終了
app.on('window-all-closed', () => {
  log.info('All windows closed, quitting application');
  app.quit();
}); 