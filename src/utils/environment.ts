/**
 * 環境関連のユーティリティ関数
 */
import { getAssetBasePath as getAssetBasePathFromAssetUtils } from './assetUtils';

/**
 * 開発環境かどうかを判定する
 * @returns 開発環境の場合true、本番環境の場合false
 */
export const isDevelopment = (): boolean => {
  // Electronの環境判定
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.isDevelopment ?? false;
  }
  if (typeof window !== 'undefined' && window.electron) {
    return typeof window.electron.isDevelopment === 'boolean' ? !window.electron.isDevelopment : false;
  }
  // Viteの環境変数
  return import.meta.env.DEV === true;
};

/**
 * 本番環境かどうかを判定する
 * @returns 本番環境の場合true、開発環境の場合false
 */
export const isProduction = (): boolean => {
  return !isDevelopment();
};

/**
 * Electronアプリ内で実行されているかどうかを判定する
 * @returns Electronアプリ内で実行されている場合true
 */
export const isElectron = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (!!window.electron || !!window.electronAPI)
  );
};

/**
 * 実行環境のプラットフォームを取得する
 * @returns プラットフォーム名 ('darwin', 'win32', 'linux' など)
 */
export const getPlatform = (): string | undefined => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.platform;
  }
  if (typeof window !== 'undefined' && window.electron) {
    // @ts-ignore - 後方互換性のため
    return window.electron.platform;
  }
  
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('windows')) return 'win32';
    if (userAgent.includes('macintosh')) return 'darwin';
    if (userAgent.includes('linux')) return 'linux';
  }
  
  return undefined;
};

/**
 * macOS環境かどうかを判定する
 * @returns macOS環境の場合true
 */
export const isMacOS = (): boolean => {
  return getPlatform() === 'darwin';
};

/**
 * Windows環境かどうかを判定する
 * @returns Windows環境の場合true
 */
export const isWindows = (): boolean => {
  return getPlatform() === 'win32';
};

/**
 * Linux環境かどうかを判定する
 * @returns Linux環境の場合true
 */
export const isLinux = (): boolean => {
  return getPlatform() === 'linux';
};

/**
 * アセットのベースパスを取得する
 * assetUtils.tsからのラッパー関数
 * @returns アセットのベースパス
 */
export const getAssetBasePath = (): string => {
  return getAssetBasePathFromAssetUtils();
};

/**
 * 現在の環境情報を取得する
 * @returns 環境情報のオブジェクト
 */
export const getEnvironmentInfo = () => {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isElectron: isElectron(),
    platform: getPlatform(),
    assetBasePath: getAssetBasePath(),
    date: new Date().toISOString()
  };
};

/**
 * 環境情報をログに出力する
 */
export const logEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  console.log('[environment] 実行環境情報:', info);
  return info;
}; 