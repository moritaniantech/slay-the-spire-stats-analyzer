import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import log from 'electron-log';

/**
 * ファイルパスのバリデーション
 */
export function validateFilePath(filePath: string, allowedDirectories: string[]): boolean {
  try {
    // パスの正規化
    const normalizedPath = path.normalize(filePath);
    
    // ディレクトリトラバーサル対策
    const isSubPath = allowedDirectories.some(dir => {
      const normalizedDir = path.normalize(dir);
      const relative = path.relative(normalizedDir, normalizedPath);
      return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    });

    if (!isSubPath) {
      console.error('Invalid file path: Directory traversal attempt detected');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating file path:', error);
    return false;
  }
}

/**
 * 安全なファイル読み込み
 */
export async function safeReadFile(filePath: string, allowedDirectories: string[]): Promise<string> {
  if (!validateFilePath(filePath, allowedDirectories)) {
    throw new Error('Invalid file path');
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
}

/**
 * 安全なファイル書き込み
 */
export async function safeWriteFile(filePath: string, content: string, allowedDirectories: string[]): Promise<void> {
  if (!validateFilePath(filePath, allowedDirectories)) {
    throw new Error('Invalid file path');
  }

  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
}

/**
 * 安全なファイル削除
 */
export async function safeDeleteFile(filePath: string, allowedDirectories: string[]): Promise<void> {
  if (!validateFilePath(filePath, allowedDirectories)) {
    throw new Error('Invalid file path');
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * ディレクトリの存在確認と作成
 */
export async function ensureDirectory(dirPath: string, allowedDirectories: string[]): Promise<void> {
  if (!validateFilePath(dirPath, allowedDirectories)) {
    throw new Error('Invalid directory path');
  }

  try {
    if (!fs.existsSync(dirPath)) {
      await fs.promises.mkdir(dirPath, { recursive: true });
    }
  } catch (error) {
    console.error('Error ensuring directory:', error);
    throw error;
  }
}

/**
 * macOS環境でのResourcesパス検証を行う
 */
function checkMacOSResourcePath() {
  if (process.platform !== 'darwin') return null;
  
  try {
    const resourcesPath = process.resourcesPath;
    const appPath = app.getAppPath();
    const exePath = app.getPath('exe');
    
    // 標準的なmacOSのバンドル構造をチェック
    const isStandardBundle = exePath.includes('.app/Contents/MacOS/');
    
    // 期待されるアセットディレクトリのパス
    const expectedAssetsPath = path.join(resourcesPath, 'assets');
    const assetsExists = fs.existsSync(expectedAssetsPath);
    
    // ディレクトリが存在する場合は内容を確認
    let assetContents: string[] = [];
    if (assetsExists) {
      try {
        assetContents = fs.readdirSync(expectedAssetsPath);
      } catch (e) {
        log.error('Error reading assets directory:', e);
      }
    }
    
    // 詳細情報を記録
    const pathInfo = {
      resourcesPath,
      appPath,
      exePath,
      isStandardBundle,
      expectedAssetsPath,
      assetsExists,
      assetContents: assetContents.slice(0, 10) // 最初の10件のみ表示
    };
    
    log.info('MacOS path validation:', pathInfo);
    return pathInfo;
  } catch (error) {
    log.error('Error checking MacOS resources path:', error);
    return null;
  }
}

/**
 * アセットパスを解決するユーティリティ関数
 * @param assetPath assets フォルダからの相対パス
 * @returns 解決された絶対パス
 */
export function resolveAssetPath(assetPath: string): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  log.info('Resolving asset path:', {
    assetPath,
    isDev,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    isPackaged: app.isPackaged,
    env: process.env.NODE_ENV,
    platform: process.platform
  });

  // 開発環境の場合
  if (isDev) {
    const devPath = path.join(app.getAppPath(), 'src/assets', assetPath);
    log.info('Development path:', devPath, 'exists:', fs.existsSync(devPath));
    return devPath;
  }

  // 本番環境の場合
  const resourcePath = path.join(process.resourcesPath, 'assets', assetPath);
  const distPath = path.join(app.getAppPath(), 'dist', 'assets', assetPath);
  
  // まずresourcesPath内のアセットを探す
  if (fs.existsSync(resourcePath)) {
    log.info('Found asset in resources path:', resourcePath);
    return resourcePath;
  }
  
  // 次にdist内のアセットを探す
  if (fs.existsSync(distPath)) {
    log.info('Found asset in dist path:', distPath);
    return distPath;
  }

  // アセットが見つからない場合は警告を出力
  log.warn('Asset not found in any location:', {
    resourcePath,
    distPath,
    exists: {
      resourcePath: fs.existsSync(resourcePath),
      distPath: fs.existsSync(distPath),
      resourcesDir: fs.existsSync(path.dirname(resourcePath)),
      distDir: fs.existsSync(path.dirname(distPath))
    }
  });

  // デフォルトでresourcesPathを返す
  return resourcePath;
}

/**
 * アセットが存在するかチェックする関数
 * @param assetPath assets フォルダからの相対パス
 * @returns 存在する場合は true
 */
export function assetExists(assetPath: string): boolean {
  try {
    const fullPath = resolveAssetPath(assetPath);
    return fs.existsSync(fullPath);
  } catch (error) {
    console.error('Error checking asset existence:', error);
    return false;
  }
}

/**
 * 指定ディレクトリ内の .run ファイルを再帰的に検索する
 * @param dir 検索対象のディレクトリ
 * @returns .run ファイルのパスの配列
 */
export function findRunFiles(dir: string): string[] {
  const runFiles: string[] = [];

  const search = (currentDir: string) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          search(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.run')) {
          runFiles.push(fullPath);
        }
      }
    } catch (error) {
      log.error(`[findRunFiles] ディレクトリ読み込みエラー: ${currentDir}`, error);
    }
  };

  search(dir);
  return runFiles;
}

/**
 * .run ファイルの内容をパースして Run オブジェクトを作成する
 * @param filePath ファイルパス
 * @param content ファイル内容（JSON文字列）
 * @returns Run オブジェクト、パース失敗時は null
 */
export function parseRunFile(filePath: string, content: string): any | null {
  try {
    const runData = JSON.parse(content);

    // Run オブジェクトの形式に変換
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

    return run;
  } catch (error) {
    log.error(`[parseRunFile] パースエラー: ${filePath}`, error);
    return null;
  }
} 