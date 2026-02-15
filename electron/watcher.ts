import chokidar from 'chokidar';
import { BrowserWindow } from 'electron';
import { parseRunFile } from './utils/fileUtils';
import fs from 'fs';
import log from 'electron-log';

let watcher: chokidar.FSWatcher | null = null;

/**
 * ファイル監視を開始する
 * @param folderPath 監視対象のフォルダパス
 * @param mainWindow メインウィンドウの参照
 */
export function startWatching(folderPath: string, mainWindow: BrowserWindow): void {
  // 既存の監視を停止
  stopWatching();

  log.info(`[watcher] ファイル監視を開始: ${folderPath}`);

  watcher = chokidar.watch(folderPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1000 },
    depth: 10,
  });

  watcher.on('add', (filePath) => {
    if (!filePath.endsWith('.run')) return;

    log.info(`[watcher] 新しい .run ファイルを検出: ${filePath}`);

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const run = parseRunFile(filePath, content);

      if (run && mainWindow && !mainWindow.isDestroyed()) {
        log.info(`[watcher] 新しいランをレンダラープロセスに送信: ${run.id}`);
        mainWindow.webContents.send('new-run-detected', run);
      }
    } catch (err) {
      log.error(`[watcher] ファイル監視エラー: ${filePath}`, err);
    }
  });

  watcher.on('error', (error) => {
    log.error('[watcher] 監視エラー:', error);
  });
}

/**
 * ファイル監視を停止する
 */
export function stopWatching(): void {
  if (watcher) {
    log.info('[watcher] ファイル監視を停止');
    watcher.close();
    watcher = null;
  }
}
