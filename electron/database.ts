import { app } from 'electron';
import { join } from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import log from 'electron-log';

let db: Database | null = null;

export async function initializeDatabase() {
  const dbPath = join(app.getPath('userData'), 'slay-the-spire-stats.db');
  log.info('Initializing database at:', dbPath);

  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    log.info('Running database migrations...');
    await runMigrations();
    log.info('Database migrations completed successfully');

    return db;
  } catch (error) {
    log.error('Error initializing database:', error);
    throw error;
  }
}

async function runMigrations() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character TEXT NOT NULL,
      victory BOOLEAN,
      floor_reached INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS neow_bonuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      bonus_type TEXT NOT NULL,
      selected BOOLEAN,
      FOREIGN KEY (run_id) REFERENCES runs(id)
    );
  `);
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    log.info('Database connection closed');
  }
} 