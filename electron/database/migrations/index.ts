import { Database as SQLiteDatabase } from 'sqlite3';
import * as initial from './001_initial';

interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
  down: (db: SQLiteDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  initial
];

// schema_versionsテーブルの作成を確認
async function ensureSchemaVersionsTable(db: SQLiteDatabase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function getCurrentVersion(db: SQLiteDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT MAX(version) as version FROM schema_versions',
      (err, row: { version: number } | null) => {
        if (err) {
          // schema_versionsテーブルが存在しない場合は0を返す
          if (err.message.includes('no such table')) {
            resolve(0);
            return;
          }
          reject(err);
          return;
        }
        resolve(row?.version || 0);
      }
    );
  });
}

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    // 最初にschema_versionsテーブルの存在を確認
    await ensureSchemaVersionsTable(db);
    
    const currentVersion = await getCurrentVersion(db);
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('データベースは最新です。');
      return;
    }

    console.log(`${pendingMigrations.length}個のマイグレーションを適用します...`);

    for (const migration of pendingMigrations) {
      try {
        await migration.up(db);
        await new Promise<void>((resolve, reject) => {
          db.run(
            'INSERT INTO schema_versions (version) VALUES (?)',
            [migration.version],
            (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            }
          );
        });
        console.log(`マイグレーション version ${migration.version} を適用しました。`);
      } catch (error) {
        console.error(`マイグレーション version ${migration.version} の適用に失敗しました:`, error);
        throw error;
      }
    }

    console.log('マイグレーションが完了しました。');
  } catch (error) {
    console.error('マイグレーション中にエラーが発生しました:', error);
    throw error;
  }
} 