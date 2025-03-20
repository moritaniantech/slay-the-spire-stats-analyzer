import * as fs from 'fs';
import * as path from 'path';

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