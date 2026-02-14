// ゲームデータのキャラクター名を正規化するユーティリティ
// THE_SILENT → silent のようにプレフィックスを除去する

// 既知のキャラクター名マップ
const CANONICAL_NAMES: Record<string, string> = {
  ironclad: 'ironclad',
  silent: 'silent',
  defect: 'defect',
  watcher: 'watcher',
};

/**
 * ゲームデータのキャラクター名を正規化する
 * "THE_" プレフィックスを一般的に除去し、既知の名前にマッピングする
 * 例: "THE_SILENT" → "silent", "IRONCLAD" → "ironclad"
 */
export function normalizeCharacterName(name: string): string {
  const cleaned = name.trim().toLowerCase().replace(/^the[_\s-]+/, '');
  return CANONICAL_NAMES[cleaned] ?? cleaned;
}

/**
 * キャラクター名から画像パスを生成する
 * 例: "THE_SILENT" → "images/characters/silent.png"
 */
export function getCharacterImagePath(character: string): string {
  const normalized = normalizeCharacterName(character);
  return `images/characters/${normalized}.png`;
}
