import { app } from 'electron';
import { join } from 'path';
import fs from 'fs';
import log from 'electron-log';

export function validateMacOSPaths() {
  // macOSアプリケーションバンドル内の典型的なパス
  const appPath = app.getAppPath();
  const resourcesPath = process.resourcesPath;
  
  // macOS特有パスの検証
  const macPaths = [
    { name: 'Contents/Resources/assets', path: join(resourcesPath, 'assets') },
    { name: 'Contents/Resources/app.asar/assets', path: join(resourcesPath, 'app.asar', 'assets') },
    { name: '親ディレクトリ/assets', path: join(appPath, '..', 'assets') },
    { name: '親ディレクトリ/Resources/assets', path: join(appPath, '..', 'Resources', 'assets') },
    { name: 'Contents/MacOS/../Resources/assets', path: join(app.getPath('exe'), '..', '..', 'Resources', 'assets') }
  ];
  
  log.info('=========== macOS固有パス検証 開始 ===========');
  
  macPaths.forEach(({ name, path }) => {
    const exists = fs.existsSync(path);
    log.info(`macOS検証 - ${name}:`, path, `(存在: ${exists ? '✓' : '✗'})`);
    
    if (exists) {
      try {
        // ディレクトリ内容を詳細に確認
        const items = fs.readdirSync(path);
        log.info(`macOS検証 - ${name} 内のアイテム数:`, items.length);
        log.info(`macOS検証 - ${name} 内のアイテム:`, items);
        
        // 権限を確認
        const stats = fs.statSync(path);
        log.info(`macOS検証 - ${name} の権限モード:`, stats.mode.toString(8));
        log.info(`macOS検証 - ${name} 読み取り可能:`, Boolean(stats.mode & fs.constants.R_OK));
      } catch (err) {
        log.error(`macOS検証 - ${name} 読み取りエラー:`, err);
      }
    }
  });
  
  log.info('=========== macOS固有パス検証 終了 ===========');
  
  return macPaths.filter(({ path }) => fs.existsSync(path)).map(({ path }) => path);
}

export function validateAssetPaths() {
  // リソースパスの検証
  const resourcesPath = process.resourcesPath;
  const appPath = app.getAppPath();
  const appDir = app.getAppPath();
  const exePath = app.getPath('exe');
  
  log.info('=============== アセットパス検証 開始 ===============');
  log.info('パス検証 - プロセス - リソースパス:', resourcesPath);
  log.info('パス検証 - アプリケーションパス:', appPath);
  log.info('パス検証 - アプリケーションディレクトリ:', appDir);
  log.info('パス検証 - 実行ファイルパス:', exePath);
  log.info('パス検証 - Electronアプリのパッケージ状態:', app.isPackaged ? 'パッケージ済み' : '開発モード');
  log.info('パス検証 - asarパッケージ:', app.isPackaged ? 'true（asarチェックを含む）' : 'false（開発モード）');
  
  // 可能性のあるすべてのアセットパスを検証
  const possiblePaths = [
    // asar unpacked領域を最優先で確認
    { name: 'リソースパス/app.asar.unpacked/アセット', path: join(resourcesPath, 'app.asar.unpacked', 'assets') },
    
    // 標準パス
    { name: 'リソースパス/アセット', path: join(resourcesPath, 'assets') },
    
    // asarアーカイブ関連
    { name: 'リソースパス/app.asar/アセット', path: join(resourcesPath, 'app.asar', 'assets') },
    
    // アンパック領域
    { name: 'リソースパス/app/アセット', path: join(resourcesPath, 'app', 'assets') },
    
    // その他のパス
    { name: 'アプリパス/アセット', path: join(appPath, 'assets') },
    { name: 'アプリパス/リソース/アセット', path: join(appPath, 'resources', 'assets') },
    { name: 'アプリパス/src/アセット', path: join(appPath, 'src', 'assets') },
    
    // その他の可能性のあるパス
    { name: 'exeの親ディレクトリ/アセット', path: join(exePath, '..', 'assets') },
    { name: 'exeの親の親ディレクトリ/アセット', path: join(exePath, '../..', 'assets') },
    { name: 'exeの親の親/リソース/アセット', path: join(exePath, '../../Resources', 'assets') },
    { name: 'appPathの親/アセット', path: join(appPath, '..', 'assets') },
    { name: 'appPathの親/Resources/アセット', path: join(appPath, '..', 'Resources', 'assets') },
  ];
  
  // すべての可能なパスを検証
  possiblePaths.forEach(({ name, path }) => {
    const exists = fs.existsSync(path);
    log.info(`パス検証 - ${name}:`, path, `(存在: ${exists ? '✓' : '✗'})`);
    
    if (exists) {
      try {
        const stats = fs.statSync(path);
        log.info(`パス検証 - ${name} はディレクトリ:`, stats.isDirectory());
        
        if (stats.isDirectory()) {
          const items = fs.readdirSync(path);
          log.info(`パス検証 - ${name} 内のアイテム数:`, items.length);
          if (items.length > 0) {
            log.info(`パス検証 - ${name} 内のサンプルアイテム:`, items.slice(0, 5));
            
            // 重要なサブディレクトリを確認
            ['images', 'cards', 'ui', 'localization'].forEach(subDir => {
              const subPath = join(path, subDir);
              const subExists = fs.existsSync(subPath);
              log.info(`パス検証 - ${name}/${subDir}:`, `(存在: ${subExists ? '✓' : '✗'})`);
              
              if (subExists) {
                try {
                  const subItems = fs.readdirSync(subPath);
                  log.info(`パス検証 - ${name}/${subDir} 内のアイテム数:`, subItems.length);
                  if (subItems.length > 0) {
                    log.info(`パス検証 - ${name}/${subDir} 内のサンプルアイテム:`, subItems.slice(0, 3));
                  }
                } catch (err) {
                  log.error(`パス検証 - ${name}/${subDir} の読み込みエラー:`, err);
                }
              }
            });
          }
        }
      } catch (err) {
        log.error(`パス検証 - ${name} の読み込みエラー:`, err);
      }
    }
  });
  
  // macOSの場合は追加の検証を実行
  if (process.platform === 'darwin' && app.isPackaged) {
    validateMacOSPaths();
  }
  
  log.info('=============== アセットパス検証 終了 ===============');
  
  return possiblePaths.filter(({ path }) => fs.existsSync(path)).map(({ path }) => path);
} 