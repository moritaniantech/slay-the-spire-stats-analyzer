/**
 * 日付フォーマットユーティリティ
 */

/**
 * タイムスタンプ（秒）を日付文字列にフォーマット
 * @param timestamp - UNIXタイムスタンプ（秒）
 * @returns フォーマットされた日付文字列 (YYYY/MM/DD HH:mm)
 */
export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  
  // timestampが秒単位の場合はミリ秒に変換
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * タイムスタンプ（秒）を短い日付文字列にフォーマット
 * @param timestamp - UNIXタイムスタンプ（秒）
 * @returns フォーマットされた日付文字列 (MM/DD)
 */
export function formatShortDate(timestamp: number): string {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${month}/${day}`;
}

/**
 * プレイ時間（秒）を読みやすい形式にフォーマット
 * @param seconds - プレイ時間（秒）
 * @returns フォーマットされた時間文字列 (Xh Xm Xs または Xm Xs)
 */
export function formatPlaytime(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

