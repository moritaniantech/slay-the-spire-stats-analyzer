"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const fs = require("fs");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const version = 1;
async function up(db2) {
  return new Promise((resolve, reject) => {
    db2.serialize(() => {
      db2.run(`
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
      db2.run(`
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
async function down(db2) {
  return new Promise((resolve, reject) => {
    db2.serialize(() => {
      db2.run("DROP TABLE IF EXISTS runs", (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      db2.run("DROP TABLE IF EXISTS settings", (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}
const initial = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  down,
  up,
  version
}, Symbol.toStringTag, { value: "Module" }));
const migrations = [
  initial
];
async function ensureSchemaVersionsTable(db2) {
  return new Promise((resolve, reject) => {
    db2.run(`
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
async function getCurrentVersion(db2) {
  return new Promise((resolve, reject) => {
    db2.get(
      "SELECT MAX(version) as version FROM schema_versions",
      (err, row) => {
        if (err) {
          if (err.message.includes("no such table")) {
            resolve(0);
            return;
          }
          reject(err);
          return;
        }
        resolve((row == null ? void 0 : row.version) || 0);
      }
    );
  });
}
async function migrateDatabase(db2) {
  try {
    await ensureSchemaVersionsTable(db2);
    const currentVersion = await getCurrentVersion(db2);
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion);
    if (pendingMigrations.length === 0) {
      console.log("データベースは最新です。");
      return;
    }
    console.log(`${pendingMigrations.length}個のマイグレーションを適用します...`);
    for (const migration of pendingMigrations) {
      try {
        await migration.up(db2);
        await new Promise((resolve, reject) => {
          db2.run(
            "INSERT INTO schema_versions (version) VALUES (?)",
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
    console.log("マイグレーションが完了しました。");
  } catch (error) {
    console.error("マイグレーション中にエラーが発生しました:", error);
    throw error;
  }
}
function validateFilePath(filePath, allowedDirectories) {
  try {
    const normalizedPath = path__namespace.normalize(filePath);
    const isSubPath = allowedDirectories.some((dir) => {
      const normalizedDir = path__namespace.normalize(dir);
      const relative = path__namespace.relative(normalizedDir, normalizedPath);
      return relative && !relative.startsWith("..") && !path__namespace.isAbsolute(relative);
    });
    if (!isSubPath) {
      console.error("Invalid file path: Directory traversal attempt detected");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error validating file path:", error);
    return false;
  }
}
async function safeReadFile(filePath, allowedDirectories) {
  if (!validateFilePath(filePath, allowedDirectories)) {
    throw new Error("Invalid file path");
  }
  try {
    const content = await fs__namespace.promises.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error("Error reading file:", error);
    throw error;
  }
}
async function safeWriteFile(filePath, content, allowedDirectories) {
  if (!validateFilePath(filePath, allowedDirectories)) {
    throw new Error("Invalid file path");
  }
  try {
    await fs__namespace.promises.writeFile(filePath, content, "utf-8");
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
}
const sqlite3 = require("sqlite3");
const APP_NAME = "StS Stats Analyzer";
electron.app.setName(APP_NAME);
if (process.platform === "darwin") {
  try {
    electron.app.setName(APP_NAME);
    electron.app.setAboutPanelOptions({
      applicationName: APP_NAME,
      applicationVersion: electron.app.getVersion(),
      copyright: "Copyright © 2024 moritaniantech",
      credits: "Created by moritaniantech"
    });
  } catch (e) {
    console.error("Failed to set app name:", e);
  }
} else if (process.platform === "win32") {
  try {
    electron.app.setAppUserModelId(`com.moritaniantech.${APP_NAME}`);
  } catch (e) {
    console.error("Failed to set app user model id:", e);
  }
}
const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
const DIST_ELECTRON = path__namespace.join(__dirname, "../dist-electron");
const DIST = path__namespace.join(__dirname, "../dist");
electron.app.isPackaged ? DIST : path__namespace.join(__dirname, "../public");
const ICON = path__namespace.resolve(__dirname, "../public/icons/icon.png");
let store;
async function initializeStore() {
  try {
    const Store2 = (await import("electron-store")).default;
    store = new Store2({
      name: APP_NAME,
      defaults: {
        theme: "dark"
      }
    });
    return store;
  } catch (error) {
    console.error("Error initializing store:", error);
    return {
      get: () => "dark",
      set: () => {
      },
      store: { theme: "dark" }
    };
  }
}
let db = null;
async function initializeDatabase() {
  const dbPath = path__namespace.join(electron.app.getPath("userData"), "slay-the-spire-stats.db");
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error("Database initialization error:", err);
        reject(err);
        return;
      }
      try {
        if (!db) {
          throw new Error("Database not initialized");
        }
        await migrateDatabase(db);
        resolve();
      } catch (error) {
        console.error("Migration error:", error);
        reject(error);
      }
    });
  });
}
async function createWindow() {
  electron.session.defaultSession.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data:",
            "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com" + (isDev ? " ws://localhost:*" : ""),
            "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join("; ")
        }
      });
    }
  );
  const mainWindow = new electron.BrowserWindow({
    title: APP_NAME,
    icon: ICON,
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path__namespace.join(DIST_ELECTRON, "preload.js"),
      sandbox: true,
      devTools: isDev,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: ""
    }
  });
  mainWindow.setTitle(APP_NAME);
  if (process.platform === "darwin") {
    electron.app.dock.setIcon(ICON);
  }
  if (isDev) {
    mainWindow.webContents.openDevTools();
    try {
      await mainWindow.loadURL("http://localhost:5173");
    } catch (error) {
      console.error("Failed to load dev server:", error);
      process.exit(1);
    }
  } else {
    await mainWindow.loadFile(path__namespace.join(DIST, "index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedOrigins = isDev ? /* @__PURE__ */ new Set(["http://localhost:5173"]) : /* @__PURE__ */ new Set([`file://${path__namespace.join(DIST, "index.html")}`]);
    const urlObj = new URL(url);
    if (!allowedOrigins.has(urlObj.origin)) {
      event.preventDefault();
      console.warn(`Navigation blocked to: ${url}`);
    }
  });
  electron.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = /* @__PURE__ */ new Set([
      "clipboard-read",
      "clipboard-write",
      "media"
      // 必要な場合のみ
    ]);
    if (isDev) {
      allowedPermissions.add("notifications");
    }
    callback(allowedPermissions.has(permission));
  });
  electron.session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const restrictedPermissions = /* @__PURE__ */ new Set([
      "openExternal",
      "notifications"
    ]);
    if (restrictedPermissions.has(permission)) {
      return isDev;
    }
    return true;
  });
  return mainWindow;
}
electron.app.whenReady().then(async () => {
  try {
    electron.app.setName(APP_NAME);
    if (process.platform === "darwin") {
      electron.app.dock.setIcon(ICON);
      electron.app.setAboutPanelOptions({
        applicationName: APP_NAME,
        applicationVersion: electron.app.getVersion(),
        copyright: "Copyright © 2024 moritaniantech",
        credits: "Created by moritaniantech"
      });
    } else if (process.platform === "win32") {
      electron.app.setAppUserModelId(`com.moritaniantech.${APP_NAME}`);
    }
    await initializeStore();
    await initializeDatabase();
    await createWindow();
    electron.app.on("activate", async () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  } catch (error) {
    console.error("Application initialization error:", error);
    electron.app.quit();
  }
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.handle("select-folder", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  return result.filePaths[0];
});
electron.ipcMain.handle("get-run-folder", async () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.get("SELECT value FROM settings WHERE key = ?", ["runFolderPath"], (err, row) => {
      if (err) {
        console.error("Error getting run folder path:", err);
        reject(err);
      } else {
        resolve(row ? row.value : null);
      }
    });
  });
});
electron.ipcMain.handle("load-run-files", async (_, folderPath) => {
  try {
    const characters = ["IRONCLAD", "SILENT", "DEFECT", "WATCHER"];
    let allRuns = [];
    for (const character of characters) {
      const characterPath = path__namespace.join(folderPath, character);
      if (!fs__namespace.existsSync(characterPath)) continue;
      const files = await fs__namespace.promises.readdir(characterPath);
      const runFiles = files.filter((file) => file.endsWith(".run"));
      for (const file of runFiles) {
        const filePath = path__namespace.join(characterPath, file);
        const content = await safeReadFile(filePath, [folderPath]);
        const data = JSON.parse(content);
        const existingRun = await new Promise((resolve, reject) => {
          db == null ? void 0 : db.get(
            "SELECT id FROM runs WHERE timestamp = ?",
            [data.timestamp],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });
        if (!existingRun) {
          await new Promise((resolve, reject) => {
            db == null ? void 0 : db.run(
              `INSERT INTO runs (
                id, character, victory, ascension_level, floor_reached,
                playtime, score, timestamp, run_data
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                file.replace(".run", ""),
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
            id: file.replace(".run", ""),
            character,
            ...data
          });
        }
      }
    }
    return new Promise((resolve, reject) => {
      db == null ? void 0 : db.all("SELECT * FROM runs ORDER BY timestamp DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => ({
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
    console.error("Error loading run files:", error);
    throw error;
  }
});
electron.ipcMain.handle("get-all-runs", async () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.all("SELECT * FROM runs ORDER BY timestamp DESC", (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map((row) => ({
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
electron.ipcMain.handle("get-theme", async () => {
  return store.get("theme");
});
electron.ipcMain.handle("set-theme", async (_, theme) => {
  store.set("theme", theme);
  return theme;
});
electron.ipcMain.handle("export-data", async () => {
  if (!db) throw new Error("Database not initialized");
  const exportPath = path__namespace.join(electron.app.getPath("userData"), "backup.json");
  const runs = await new Promise((resolve, reject) => {
    db == null ? void 0 : db.all("SELECT * FROM runs", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  await safeWriteFile(exportPath, JSON.stringify(runs, null, 2), [electron.app.getPath("userData")]);
  return exportPath;
});
electron.ipcMain.handle("import-data", async (_, filePath) => {
  if (!db) throw new Error("Database not initialized");
  const content = await safeReadFile(filePath, [path__namespace.dirname(filePath)]);
  const runs = JSON.parse(content);
  for (const run of runs) {
    await new Promise((resolve, reject) => {
      db == null ? void 0 : db.run(
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
electron.ipcMain.handle("delete-run", async (_, run) => {
  if (!db) throw new Error("Database not initialized");
  return new Promise((resolve, reject) => {
    db == null ? void 0 : db.run(
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
electron.ipcMain.handle("sqlite-execute", async (_, sql, params = []) => {
  if (!db) throw new Error("Database not initialized");
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
});
electron.ipcMain.handle("sqlite-query", async (_, sql, params = []) => {
  if (!db) throw new Error("Database not initialized");
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
});
electron.ipcMain.handle("sqlite-get", async (_, sql, params = []) => {
  if (!db) throw new Error("Database not initialized");
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
});
async function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    db.run("PRAGMA optimize", [], (err) => {
      if (err) {
        console.error("Error optimizing database:", err);
      }
      db.close((err2) => {
        if (err2) {
          console.error("Error closing database:", err2);
          reject(err2);
        } else {
          db = null;
          resolve();
        }
      });
    });
  });
}
const BACKUP_INTERVAL = 24 * 60 * 60 * 1e3;
const MAX_BACKUPS = 7;
async function backupDatabase() {
  if (!db) return;
  const backupDir = path__namespace.join(electron.app.getPath("userData"), "backups");
  if (!fs__namespace.existsSync(backupDir)) {
    fs__namespace.mkdirSync(backupDir);
  }
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const backupPath = path__namespace.join(backupDir, `backup-${timestamp}.json`);
  try {
    const runs = await new Promise((resolve, reject) => {
      db == null ? void 0 : db.all("SELECT * FROM runs", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    const settings = await new Promise((resolve, reject) => {
      db == null ? void 0 : db.all("SELECT * FROM settings", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    await fs__namespace.promises.writeFile(
      backupPath,
      JSON.stringify({ runs, settings }, null, 2)
    );
    const files = await fs__namespace.promises.readdir(backupDir);
    const backupFiles = files.filter((f) => f.startsWith("backup-")).sort().reverse();
    if (backupFiles.length > MAX_BACKUPS) {
      for (const file of backupFiles.slice(MAX_BACKUPS)) {
        await fs__namespace.promises.unlink(path__namespace.join(backupDir, file));
      }
    }
    console.log(`バックアップを作成しました: ${backupPath}`);
  } catch (error) {
    console.error("バックアップ作成中にエラーが発生しました:", error);
  }
}
let backupInterval;
function startBackupInterval() {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
  backupInterval = setInterval(backupDatabase, BACKUP_INTERVAL);
  backupDatabase();
}
electron.app.on("ready", () => {
  startBackupInterval();
});
electron.app.on("before-quit", () => {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
});
electron.app.on("before-quit", async (event) => {
  event.preventDefault();
  try {
    await closeDatabase();
    electron.app.exit();
  } catch (error) {
    console.error("Error during application shutdown:", error);
    electron.app.exit(1);
  }
});
