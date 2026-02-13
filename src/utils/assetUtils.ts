// src/utils/assetUtils.ts

// グローバル型定義は src/global.d.ts を参照

/**
 * アセット関連のユーティリティ関数
 */
import path from 'path-browserify';

/**
 * アセットのベースパスを取得する
 * @returns アセットのベースパス
 */
export const getAssetBasePath = (): string => {
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.__ASSET_BASE_PATH__) {
    return window.__ASSET_BASE_PATH__;
  }
  if (import.meta.env.DEV) {
    return '/assets';
  }
  return (import.meta.env.BASE_URL || './') + 'assets/';
};

/**
 * アセット用のURLを生成する
 * 
 * @param assetPath アセットのパス（例: 'cards/ironclad/bash.png'）
 * @returns 環境に応じたアセットの完全なURL、または取得できない場合はnull
 */
export const getAssetUrl = (assetPath: string): string | null => {
  const normalizedPath = normalizeAssetPath(assetPath);
  if (!normalizedPath) return null;
  
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Electron環境（開発環境・本番環境共通）: asset://スキームを返す
  // これにより、assetプロトコルハンドラーが適切にファイルを解決する
  if (isElectron) {
    if (assetFileUrlCache[normalizedPath]) {
      return assetFileUrlCache[normalizedPath];
    }
    // asset://スキームを返す（ImageAssetコンポーネントがIPC経由でURLを取得するのと同様）
    const assetProtocolUrl = `asset://${normalizedPath}`;
    assetFileUrlCache[normalizedPath] = assetProtocolUrl;
    return assetProtocolUrl;
  }

  // 非Electron環境
  // normalizedPath が "assets/images/foo.png" や "assets/ui/bar.png" のような形式であることを期待
  if (import.meta.env.DEV) {
    // 開発環境では、Vite開発サーバーがpublicディレクトリをルートにマウントするため、
    // /assets/images/foo.png のような形式でアクセスできる
    const devUrl = `/${normalizedPath}`; // 例: "/assets/images/foo.png"
    console.log(`[getAssetUrl] Development URL for ${assetPath}: ${devUrl}`);
    return devUrl;
  }
  
  const base = import.meta.env.BASE_URL || './';
  const ensuredBase = base.endsWith('/') ? base : base + '/';
  return `${ensuredBase}${normalizedPath}`;
};

// ファイルURLのキャッシュ
export const assetFileUrlCache: Record<string, string> = {};

/**
 * アセットURLのフォールバックを取得する (主にElectron本番用)
 */
export const getAssetFallbackUrl = async (assetPath: string): Promise<string | null> => {
  const normalizedPath = normalizeAssetPath(assetPath);
  if (!normalizedPath) return null;
  
  if (assetFileUrlCache[normalizedPath]) {
    return assetFileUrlCache[normalizedPath];
  }
  
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getFileURLForAsset) {
      try {
        const fileUrl = await window.electronAPI.getFileURLForAsset(normalizedPath);
        if (fileUrl) {
          assetFileUrlCache[normalizedPath] = fileUrl;
          return fileUrl;
        }
      } catch (error) {
      console.error(`[AssetUtils] Fallback URL取得エラー for ${normalizedPath}:`, error);
      }
    }
  return null;
};

/**
 * アセットパスを正規化する（先頭の /src/assets/ 等を削除）
 * @param assetPath 正規化するアセットパス
 * @returns 正規化されたパス
 */
export const normalizeAssetPath = (assetPath: string): string => {
  if (!assetPath) return '';
  let normalized = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
  normalized = normalized.replace(/\\/g, '/');

  // すでに "assets/" で始まっている場合は、それが正しい形式とみなす
  if (normalized.startsWith('assets/')) {
    return normalized; 
  }

  // それ以外の場合 (例: "images/foo.png" や "ui/bar.png") は、
  // 先頭に "assets/" を付与する。
  // これにより、すべてのパスが "assets/" から始まるように統一される。
  return `assets/${normalized}`;
};

/**
 * 2つのパスを結合する
 * 
 * @param base ベースディレクトリ
 * @param relative 相対パス
 * @returns 結合されたパス
 */
export const joinPaths = (base: string, relative: string): string => {
  return path.join(base, relative);
};

/**
 * 指定されたURLがアセットURLかどうかを判定する
 * 
 * @param url チェックするURL
 * @returns アセットURLの場合はtrue
 */
export const isAssetUrl = (url: string): boolean => {
  return url.startsWith('asset://') || url.startsWith('/assets/');
};

// カード情報の型定義 (必要に応じて拡張)
export interface CardInfo {
  class: string; // ironclad, silent, defect, watcher, colorless, curse
  type: string;  // attack, skill, power, status, curse
  rarity: string;// common, uncommon, rare, basic, special, starter, curse
  name: string;  // カード名 (英語)
}

/**
 * カード名から画像ファイル名に使用する形式に正規化します。
 * (小文字化、スペースをアンダースコアに置換、特殊文字削除)
 * @param name カード名 (英語)
 * @returns 正規化されたファイル名用文字列
 */
function normalizeCardNameForImage(name: string): string {
  if (!name) return 'unknown';
  return name.toLowerCase().replace(/\+/g, 'plus').replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
}

/**
 * カードのベース画像 (背景枠) のURLを取得します。
 */
export function getCardBaseUrl(cardClass: CardInfo['class'], type: CardInfo['type']): string | null {
  const typePath = type === 'Status' || type === 'Curse' ? type.toLowerCase() : cardClass.toLowerCase();
  return `images/cards/${typePath}`;
}

/**
 * カードの絵柄 (アート) のURLを取得します。
 */
export function getCardImageUrl(cardInfo: CardInfo): string | null {
  if (!cardInfo || !cardInfo.name) return getAssetUrl('images/cards/unknown.png');

  const { class: cardClass, type, name } = cardInfo;
  const normalizedName = normalizeCardNameForImage(name);
  let basePath = '';

  if (cardClass === 'curse') {
    basePath = 'images/cards/curse/';
  } else if (type === 'status') {
    basePath = 'images/cards/status/';
  } else if (cardClass && type) {
    basePath = `images/cards/${cardClass.toLowerCase()}/${type.toLowerCase()}/`;
  } else {
    return getAssetUrl('images/cards/unknown.png'); // 不明なカテゴリ
  }
  return getAssetUrl(`${basePath}${normalizedName}.png`);
}

/**
 * カードのフレーム画像のURLを取得します。
 */
export function getCardFrameUrl(rarity: CardInfo['rarity'], type: CardInfo['type']): string | null {
  let frameType = type.toLowerCase();
  if (type === 'Status' || type === 'Curse') {
    frameType = 'skill';
  }
  const path = `images/cardui/card_frame_${frameType}_${rarity.toLowerCase()}.png`;
  const url = getAssetUrl(path);
  if (!url) return getAssetUrl(`images/cardui/card_frame_skill_common.png`);
  return url;
}

/**
 * カードのバナー (名前表示部分) 画像のURLを取得します。
 */
export function getCardBannerUrl(rarity: CardInfo['rarity']): string | null {
  const path = `images/cardui/banner_${rarity.toLowerCase()}.png`;
  const url = getAssetUrl(path);
  if (!url) return getAssetUrl(`images/cardui/banner_common.png`);
  return url;
}

/**
 * カードのコスト表示部分の枠画像のURLを取得します。
 */
export function getCardCostFrameUrl(cardClass: CardInfo['class'], type: CardInfo['type']): string | null {
  const validClass = (type === 'status' || cardClass === 'curse') ? 'colorless' : cardClass;
  const path = `cards/design/${validClass}/${validClass}.png`;
  return getAssetUrl(path);
}

/**
 * レリック名を正規化します。
 */
export function normalizeRelicName(name: string): string {
  if (!name) return 'unknown';
  if (name === 'Red Mask') return 'redmask';

  return name.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/'/g, '')
    .replace(/\./g, '')
    .replace(/\+/g, 'plus');
}

/**
 * レリック画像のURLを取得します。
 * @param relicName レリック名 (英語)
 */
export function getRelicImageUrl(relicName: string): string | null {
  const normalized = normalizeRelicName(relicName);
  const path = `images/relics/${normalized}.png`;
  const url = getAssetUrl(path);
  if (!url) {
    return getAssetUrl('images/relics/unknown.png');
  }
  return url;
}

/**
 * レリック画像のフォールバックURL
 */
export const RELIC_FALLBACK_URL = getAssetUrl('ui/relicSilhouette.png');

/**
 * イベント名を正規化します。
 */
function normalizeEventName(name: string): string {
  if (!name) return 'unknown';
  return name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/:/g, '')
    .replace(/\?/g, '');
}

/**
 * イベント画像のURLを取得します。(.jpg優先)
 * @param eventName イベント名 (英語)
 */
export function getEventImageUrl(eventName: string): string | null {
  const normalized = normalizeEventName(eventName);
  const baseName = normalized.endsWith('.png') ? normalized.slice(0, -4) : normalized;
  const path = `images/events/${baseName}.jpg`;
  
  let url = getAssetUrl(path);
  
  if (!url) {
    const pngPath = `images/events/${baseName}.png`;
    url = getAssetUrl(pngPath);
  }

  if (!url) {
    return getAssetUrl('images/events/unknown.png');
  }
  return url;
}

/**
 * イベント画像の代替URL (.png)
 */
export function getEventImageUrlPng(eventName: string): string | null {
  const normalized = normalizeEventName(eventName);
  const path = `images/events/${normalized}.png`;
  return getAssetUrl(path);
}

/**
 * イベント画像のフォールバックURL (デフォルト画像)
 */
export const EVENT_FALLBACK_URL = getAssetUrl('images/events/default.jpg');

/**
 * キャンプファイアの選択肢画像のURLを取得します。
 * @param choiceKey 選択肢のキー (例: 'SMITH', 'REST')
 */
export function getCampfireChoiceUrl(choiceKey: string): string | null {
  if (!choiceKey) return null;
  const path = `images/ui/campfire/${choiceKey.toLowerCase()}.png`;
  return getAssetUrl(path);
}

/**
 * キャンプファイアの選択肢画像のフォールバックURL
 */
export const CAMPFIRE_FALLBACK_URL = getAssetUrl('images/ui/campfire/outline.png');

/**
 * UI要素の画像のURLを取得します。
 * @param uiElementName UI要素のパス (例: 'topPanel/deck.png')
 */
export function getUiElementUrl(uiElementPath: string): string | null {
  if (!uiElementPath) return null;
  return getAssetUrl(`images/ui/${uiElementPath}`);
}
