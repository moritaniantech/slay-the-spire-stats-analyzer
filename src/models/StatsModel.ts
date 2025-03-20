/**
 * キャラクタータイプの定義
 */
export type CharacterType = 'ironclad' | 'silent' | 'defect' | 'watcher';

/**
 * キャラクターの色の定義
 */
export const CHARACTER_COLORS: Record<CharacterType, string> = {
  ironclad: '#ff6563',
  silent: '#7fff00',
  defect: '#87ceeb',
  watcher: '#a600ff'
};

/**
 * 単一キャラクターの統計情報
 */
export interface CharacterStats {
  totalPlays: number;
  obtainCount: number;
  victoryCount: number;
  obtainRate: number;
  victoryObtainRate: number;
  winRate: number;
  recent50Plays: number;
  recent50ObtainCount: number;
  recent50VictoryCount: number;
  recent50ObtainRate: number;
  recent50WinRate: number;
}

/**
 * すべてのキャラクターの統計情報
 */
export interface AllCharacterStats {
  ironclad: CharacterStats;
  silent: CharacterStats;
  defect: CharacterStats;
  watcher: CharacterStats;
}

/**
 * カードの統計情報
 */
export interface CardStats {
  cardId: string;
  stats: AllCharacterStats;
}

/**
 * レリックの統計情報
 */
export interface RelicStats {
  relicId: string;
  stats: AllCharacterStats;
}

/**
 * 統計情報の初期値を生成する関数
 */
export function createEmptyCharacterStats(): CharacterStats {
  return {
    totalPlays: 0,
    obtainCount: 0,
    victoryCount: 0,
    obtainRate: 0,
    victoryObtainRate: 0,
    winRate: 0,
    recent50Plays: 0,
    recent50ObtainCount: 0,
    recent50VictoryCount: 0,
    recent50ObtainRate: 0,
    recent50WinRate: 0
  };
}

/**
 * すべてのキャラクターの空の統計情報を生成する関数
 */
export function createEmptyAllCharacterStats(): AllCharacterStats {
  return {
    ironclad: createEmptyCharacterStats(),
    silent: createEmptyCharacterStats(),
    defect: createEmptyCharacterStats(),
    watcher: createEmptyCharacterStats()
  };
} 