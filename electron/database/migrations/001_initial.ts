import { Database as SQLiteDatabase } from 'sqlite3';

export const version = 1;

export async function up(db: SQLiteDatabase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // settings テーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      // runs テーブル
      db.run(`
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          character TEXT NOT NULL,
          victory INTEGER NOT NULL,
          ascension_level INTEGER NOT NULL,
          floor_reached INTEGER NOT NULL,
          playtime INTEGER NOT NULL,
          score INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          run_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}

export async function down(db: SQLiteDatabase): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS runs', (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      db.run('DROP TABLE IF EXISTS settings', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
} 