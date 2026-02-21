import { app } from 'electron';
import { join } from 'path';
import fs from 'fs';
import log from 'electron-log';

const BACKUP_INTERVAL = 1000 * 60 * 60; // 1時間ごと
const MAX_BACKUPS = 5;

export function startBackupInterval() {
  // バックアップディレクトリの作成
  const backupDir = join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 定期的なバックアップの実行
  setInterval(() => {
    try {
      const dbPath = join(app.getPath('userData'), 'slay-the-spire-stats.db');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = join(backupDir, `backup-${timestamp}.db`);

      // データベースファイルのコピー
      fs.copyFileSync(dbPath, backupPath);
      log.info(`Backup created: ${backupPath}`);

      // 古いバックアップの削除
      const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup-'))
        .sort()
        .reverse();

      if (backups.length > MAX_BACKUPS) {
        backups.slice(MAX_BACKUPS).forEach(file => {
          // nosemgrep: path-join-resolve-traversal — file は readdirSync(backupDir) 由来
          const oldBackupPath = join(backupDir, file);
          fs.unlinkSync(oldBackupPath);
          log.info(`Old backup removed: ${oldBackupPath}`);
        });
      }
    } catch (error) {
      log.error('Error creating backup:', error);
    }
  }, BACKUP_INTERVAL);

  log.info('Backup interval started');
} 