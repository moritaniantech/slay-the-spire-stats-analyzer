import { Run, useStore } from '../store';
import { 
  AllCharacterStats, 
  CharacterStats, 
  CharacterType, 
  createEmptyAllCharacterStats, 
  createEmptyCharacterStats 
} from '../models/StatsModel';

// 統計情報のキャッシュ
const statsCache: {
  cards: Map<string, AllCharacterStats>;
  relics: Map<string, AllCharacterStats>;
  lastUpdated: number;
  maxSize: number; // キャッシュの最大サイズ
} = {
  cards: new Map(),
  relics: new Map(),
  lastUpdated: 0,
  maxSize: 100 // デフォルト値
};

// キャッシュの有効期限（ミリ秒）
const CACHE_EXPIRY = 60 * 60 * 1000; // 1時間

/**
 * キャッシュをクリアする
 */
export function clearStatsCache(): void {
  statsCache.cards.clear();
  statsCache.relics.clear();
  statsCache.lastUpdated = Date.now();
  console.log('統計情報キャッシュをクリアしました');
}

/**
 * キャッシュの最大サイズを設定する
 * @param size キャッシュの最大サイズ
 */
export function setCacheMaxSize(size: number): void {
  statsCache.maxSize = size;
  console.log(`キャッシュの最大サイズを${size}に設定しました`);
  
  // 現在のキャッシュサイズが新しい最大サイズを超えている場合は調整
  if (statsCache.cards.size > size) {
    const deleteCount = statsCache.cards.size - size;
    for (let i = 0; i < deleteCount; i++) {
      const oldestKey = statsCache.cards.keys().next().value as string | undefined;
      if (oldestKey) statsCache.cards.delete(oldestKey);
    }
  }

  if (statsCache.relics.size > size) {
    const deleteCount = statsCache.relics.size - size;
    for (let i = 0; i < deleteCount; i++) {
      const oldestKey = statsCache.relics.keys().next().value as string | undefined;
      if (oldestKey) statsCache.relics.delete(oldestKey);
    }
  }
}

/**
 * 低メモリモードかどうかを確認する
 * @returns 低メモリモードの場合はtrue
 */
export function isLowMemoryMode(): boolean {
  // ストアから設定を取得（直接アクセスできないため、グローバル変数を使用）
  // この関数はアプリケーション起動時に一度だけ呼び出される想定
  try {
    // @ts-ignore - windowオブジェクトに追加されたグローバル変数
    return window.__APP_SETTINGS__?.lowMemoryMode === true;
  } catch (e) {
    return false;
  }
}

/**
 * キャッシュが有効かどうかを確認する
 */
function isCacheValid(): boolean {
  return Date.now() - statsCache.lastUpdated < CACHE_EXPIRY;
}

/**
 * キャッシュサイズを管理する
 * @param cacheMap キャッシュマップ
 */
function manageCacheSize(cacheMap: Map<string, AllCharacterStats>): void {
  // キャッシュが最大サイズを超えた場合、古いエントリを削除
  if (cacheMap.size > statsCache.maxSize) {
    // 最も古いエントリを削除（先頭から削除）
    const oldestKey = cacheMap.keys().next().value as string | undefined;
    if (oldestKey) {
      cacheMap.delete(oldestKey);
      console.log(`キャッシュサイズ制限のため、エントリを削除: ${oldestKey}`);
    }
  }
}

/**
 * カードが取得されたかどうかを判定する
 * @param run プレイデータ
 * @param cardId カードID
 * @returns 取得された場合はtrue
 */
export function isCardObtained(run: Run, cardId: string): boolean {
  const runData = run.run_data;
  const normalizedCardId = normalizeCardId(cardId);
  
  // master_deckにカードが含まれているか確認（高速化のためにSet変換）
  if (runData.master_deck && Array.isArray(runData.master_deck)) {
    // 一時的なSetを作成（高速検索のため）
    const masterDeckSet = new Set(runData.master_deck.map((card: any) => normalizeCardId(card)));
    if (masterDeckSet.has(normalizedCardId)) {
      return true;
    }
  }
  
  // カード取得履歴からも確認
  if (runData.card_choices && Array.isArray(runData.card_choices)) {
    for (const choice of runData.card_choices) {
      if (normalizeCardId(choice.picked) === normalizedCardId) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * レリックが取得されたかどうかを判定する
 * @param run プレイデータ
 * @param relicId レリックID
 * @returns 取得された場合はtrue
 */
export function isRelicObtained(run: Run, relicId: string): boolean {
  const runData = run.run_data;
  const normalizedRelicId = normalizeRelicId(relicId);
  
  // relicsにレリックが含まれているか確認（高速化のためにSet変換）
  if (runData.relics && Array.isArray(runData.relics)) {
    // 一時的なSetを作成（高速検索のため）
    const relicsSet = new Set(runData.relics.map((relic: any) => normalizeRelicId(relic)));
    if (relicsSet.has(normalizedRelicId)) {
      return true;
    }
  }
  
  // レリック取得履歴からも確認
  if (runData.relics_obtained && Array.isArray(runData.relics_obtained)) {
    for (const relic of runData.relics_obtained) {
      if (normalizeRelicId(relic.key) === normalizedRelicId) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * カードIDを正規化する
 * @param cardId カードID
 * @returns 正規化されたカードID
 */
function normalizeCardId(cardId: string): string {
  // +1などのアップグレード情報を削除
  const withoutUpgrade = cardId.replace(/\+\d+$/, '');
  
  // キャラクター固有のサフィックスを削除
  const baseName = withoutUpgrade.replace(/_(R|G|B|P)$/, "");

  return baseName
    .replace(/^the\s+/i, "") // 先頭の'the'を削除
    .replace(/s$/, "") // 末尾のsを削除（単純な複数形）
    .replace(/\s+/g, "") // 空白を削除
    .toLowerCase(); // 小文字に変換
}

/**
 * レリックIDを正規化する
 * @param relicId レリックID
 * @returns 正規化されたレリックID
 */
function normalizeRelicId(relicId: string): string {
  // 特殊なケースの処理
  const specialCases: Record<string, string> = {
    "Data Disk": "DataDisk",
    "Frozen Egg": "FrozenEgg2",
    "Toxic Egg": "ToxicEgg2",
    "Molten Egg": "MoltenEgg2",
    "Gold-Plated Cables": "GoldPlatedCables",
    "Mercury Hourglass": "MercuryHourglass",
    "Bag of Marbles": "BagOfMarbles",
    "Bag of Preparation": "BagOfPreparation",
    "Orange Pellets": "OrangePellets",
    "Bronze Scales": "BronzeScales",
    "Wing Boots": "WingBoots",
    "Charon's Ashes": "CharonsAshes",
    "Symbiotic Virus": "SymbioticVirus",
    "Preserved Insect": "PreservedInsect",
    "Strike Dummy": "StrikeDummy",
    "Peace Pipe": "PeacePipe"
  };

  // 特殊なケースのチェック
  if (specialCases[relicId]) {
    return specialCases[relicId].toLowerCase();
  }

  // 基本的な正規化処理
  return relicId
    .replace(/\s+/g, '') // 空白を削除
    .replace(/-/g, '') // ハイフンを削除
    .toLowerCase(); // 小文字に変換
}

/**
 * カードの統計情報を計算する
 * @param runs すべてのプレイデータ
 * @param cardId カードID
 * @returns カードの統計情報
 */
export function calculateCardStats(runs: Run[], cardId: string): AllCharacterStats {
  // 正規化されたカードIDを取得
  const normalizedCardId = normalizeCardId(cardId);
  
  // キャッシュが有効で、キャッシュにデータがある場合はキャッシュから返す
  if (isCacheValid() && statsCache.cards.has(normalizedCardId)) {
    return statsCache.cards.get(normalizedCardId)!;
  }
  
  console.time(`calculateCardStats:${normalizedCardId}`);
  
  const stats = createEmptyAllCharacterStats();
  
  // キャラクターごとに統計を計算
  const characters: CharacterType[] = ['ironclad', 'silent', 'defect', 'watcher'];
  
  // キャラクターごとのプレイを事前に抽出（パフォーマンス向上）
  const characterRunsMap = new Map<CharacterType, Run[]>();
  const recent50RunsMap = new Map<CharacterType, Run[]>();
  
  characters.forEach(character => {
    // キャラクター名を大文字に変換（RunのcharacterフィールドはIRONCLADのような形式）
    const characterUpperCase = character.toUpperCase();
    
    // キャラクターのプレイを抽出
    const characterRuns = runs.filter(run => run.character === characterUpperCase);
    characterRunsMap.set(character, characterRuns);
    
    // 直近50戦を抽出
    const recent50Runs = [...characterRuns]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    recent50RunsMap.set(character, recent50Runs);
    
    // 統計情報の基本データを設定
    const characterStat = stats[character];
    characterStat.totalPlays = characterRuns.length;
    characterStat.recent50Plays = recent50Runs.length;
  });
  
  // 各キャラクターの統計を並列計算
  characters.forEach(character => {
    const characterStat = stats[character];
    const characterRuns = characterRunsMap.get(character) || [];
    const recent50Runs = recent50RunsMap.get(character) || [];
    
    // カードの取得回数と勝利回数を計算
    characterRuns.forEach(run => {
      if (isCardObtained(run, cardId)) {
        characterStat.obtainCount++;
        
        if (run.victory) {
          characterStat.victoryCount++;
        }
      }
    });
    
    // 直近50戦の取得回数と勝利回数を計算
    recent50Runs.forEach(run => {
      if (isCardObtained(run, cardId)) {
        characterStat.recent50ObtainCount++;
        
        if (run.victory) {
          characterStat.recent50VictoryCount++;
        }
      }
    });
    
    // 取得率と勝率を計算
    if (characterStat.totalPlays > 0) {
      characterStat.obtainRate = (characterStat.obtainCount / characterStat.totalPlays) * 100;
      characterStat.victoryObtainRate = (characterStat.victoryCount / characterStat.totalPlays) * 100;
      characterStat.winRate = (characterStat.victoryCount / characterStat.obtainCount) * 100 || 0;
    }
    
    if (characterStat.recent50Plays > 0) {
      characterStat.recent50ObtainRate = (characterStat.recent50ObtainCount / characterStat.recent50Plays) * 100;
      characterStat.recent50WinRate = (characterStat.recent50VictoryCount / characterStat.recent50ObtainCount) * 100 || 0;
    }
  });
  
  console.timeEnd(`calculateCardStats:${normalizedCardId}`);
  
  // 結果をキャッシュに保存
  statsCache.cards.set(normalizedCardId, stats);
  
  // キャッシュサイズを管理
  manageCacheSize(statsCache.cards);
  
  return stats;
}

/**
 * レリックの統計情報を計算する
 * @param runs すべてのプレイデータ
 * @param relicId レリックID
 * @returns レリックの統計情報
 */
export function calculateRelicStats(runs: Run[], relicId: string): AllCharacterStats {
  // 正規化されたレリックIDを取得
  const normalizedRelicId = normalizeRelicId(relicId);
  
  // キャッシュが有効で、キャッシュにデータがある場合はキャッシュから返す
  if (isCacheValid() && statsCache.relics.has(normalizedRelicId)) {
    return statsCache.relics.get(normalizedRelicId)!;
  }
  
  console.time(`calculateRelicStats:${normalizedRelicId}`);
  
  const stats = createEmptyAllCharacterStats();
  
  // キャラクターごとに統計を計算
  const characters: CharacterType[] = ['ironclad', 'silent', 'defect', 'watcher'];
  
  // キャラクターごとのプレイを事前に抽出（パフォーマンス向上）
  const characterRunsMap = new Map<CharacterType, Run[]>();
  const recent50RunsMap = new Map<CharacterType, Run[]>();
  
  characters.forEach(character => {
    // キャラクター名を大文字に変換（RunのcharacterフィールドはIRONCLADのような形式）
    const characterUpperCase = character.toUpperCase();
    
    // キャラクターのプレイを抽出
    const characterRuns = runs.filter(run => run.character === characterUpperCase);
    characterRunsMap.set(character, characterRuns);
    
    // 直近50戦を抽出
    const recent50Runs = [...characterRuns]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    recent50RunsMap.set(character, recent50Runs);
    
    // 統計情報の基本データを設定
    const characterStat = stats[character];
    characterStat.totalPlays = characterRuns.length;
    characterStat.recent50Plays = recent50Runs.length;
  });
  
  // 各キャラクターの統計を並列計算
  characters.forEach(character => {
    const characterStat = stats[character];
    const characterRuns = characterRunsMap.get(character) || [];
    const recent50Runs = recent50RunsMap.get(character) || [];
    
    // レリックの取得回数と勝利回数を計算
    characterRuns.forEach(run => {
      if (isRelicObtained(run, relicId)) {
        characterStat.obtainCount++;
        
        if (run.victory) {
          characterStat.victoryCount++;
        }
      }
    });
    
    // 直近50戦の取得回数と勝利回数を計算
    recent50Runs.forEach(run => {
      if (isRelicObtained(run, relicId)) {
        characterStat.recent50ObtainCount++;
        
        if (run.victory) {
          characterStat.recent50VictoryCount++;
        }
      }
    });
    
    // 取得率と勝率を計算
    if (characterStat.totalPlays > 0) {
      characterStat.obtainRate = (characterStat.obtainCount / characterStat.totalPlays) * 100;
      characterStat.victoryObtainRate = (characterStat.victoryCount / characterStat.totalPlays) * 100;
      characterStat.winRate = (characterStat.victoryCount / characterStat.obtainCount) * 100 || 0;
    }
    
    if (characterStat.recent50Plays > 0) {
      characterStat.recent50ObtainRate = (characterStat.recent50ObtainCount / characterStat.recent50Plays) * 100;
      characterStat.recent50WinRate = (characterStat.recent50VictoryCount / characterStat.recent50ObtainCount) * 100 || 0;
    }
  });
  
  console.timeEnd(`calculateRelicStats:${normalizedRelicId}`);
  
  // 結果をキャッシュに保存
  statsCache.relics.set(normalizedRelicId, stats);
  
  // キャッシュサイズを管理
  manageCacheSize(statsCache.relics);
  
  return stats;
}

/**
 * すべてのカードの統計情報を事前計算する
 * @param runs すべてのプレイデータ
 * @param cardIds カードIDのリスト
 */
export function precalculateCardStats(runs: Run[], cardIds: string[]): void {
  console.log(`事前計算: ${cardIds.length}枚のカードの統計情報を計算中...`);
  const startTime = Date.now();
  
  // 各カードの統計情報を計算
  cardIds.forEach(cardId => {
    calculateCardStats(runs, cardId);
  });
  
  const endTime = Date.now();
  console.log(`事前計算完了: ${(endTime - startTime) / 1000}秒`);
}

/**
 * すべてのレリックの統計情報を事前計算する
 * @param runs すべてのプレイデータ
 * @param relicIds レリックIDのリスト
 */
export function precalculateRelicStats(runs: Run[], relicIds: string[]): void {
  console.log(`事前計算: ${relicIds.length}個のレリックの統計情報を計算中...`);
  const startTime = Date.now();
  
  // 各レリックの統計情報を計算
  relicIds.forEach(relicId => {
    calculateRelicStats(runs, relicId);
  });
  
  const endTime = Date.now();
  console.log(`事前計算完了: ${(endTime - startTime) / 1000}秒`);
} 