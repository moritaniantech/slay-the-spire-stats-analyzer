import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import Card from "./Card";

// キャラクター画像のインポート
import ironclad from "../assets/images/characters/ironclad.png";
import silent from "../assets/images/characters/silent.png";
import defect from "../assets/images/characters/defect.png";
import watcher from "../assets/images/characters/watcher.png";

// マップアイコンのインポート
import monsterIcon from "../assets/images/mapicons/monster.png";
import eliteIcon from "../assets/images/mapicons/elite.png";
import unknownIcon from "../assets/images/mapicons/unknown.png";
import shopIcon from "../assets/images/mapicons/shop.png";
import chestIcon from "../assets/images/mapicons/chest.png";
import restIcon from "../assets/images/mapicons/rest.png";
import bossIcon from "../assets/images/mapicons/boss.png";
import bossChestIcon from "../assets/images/mapicons/bosschest.png";
import unknownMonsterIcon from "../assets/images/mapicons/unknownMonster.png";
import unknownShopIcon from "../assets/images/mapicons/unknownShop.png";
import unknownChestIcon from "../assets/images/mapicons/unknownChest.png";

// 日本語ローカライズデータのインポート
import jpnMonsters from "../assets/localization/monsters.json";
import jpnRelics from "../assets/localization/relics.json";
import jpnCards from "../assets/localization/cards.json";
import jpnEvents from "../assets/localization/events.json";
import jpnPotions from "../assets/localization/potions.json";

// ローカライズデータの型定義
interface LocalizedData {
  NAME: string;
  [key: string]: any;
}

interface LocalizationMap {
  [key: string]: LocalizedData;
}

// 型アサーション
const monsters = jpnMonsters as LocalizationMap;
const relics = jpnRelics as unknown as LocalizationMap;
const cards = jpnCards as unknown as LocalizationMap;
const events = jpnEvents as unknown as LocalizationMap;
const potions = jpnPotions as unknown as LocalizationMap;

const characterImages: { [key: string]: string } = {
  IRONCLAD: ironclad,
  SILENT: silent,
  DEFECT: defect,
  WATCHER: watcher,
};

const mapIcons: { [key: string]: string } = {
  M: monsterIcon,
  E: eliteIcon,
  "?": unknownIcon,
  $: shopIcon,
  T: chestIcon,
  R: restIcon,
  BOSS: bossIcon,
  BOSS_CHEST: bossChestIcon,
  unknownMonster: unknownMonsterIcon,
  unknownShop: unknownShopIcon,
  unknownChest: unknownChestIcon,
};

// モンスター画像のインポート
import monsterImages from "../assets/images/monsters";
import relicImages from "../assets/images/relics";
import potionImages from "../assets/images/potion";
import allCards from "../assets/cards/allCards.json";
import relicsData from "../assets/relics/relics.json";

interface CardChoice {
  picked: string;
  not_picked: string[];
  floor: number;
}

interface RelicInfo {
  type: "obtained" | "lost";
  relic: string;
}

interface EventInfo {
  name: string;
  choice: string;
  damageHealed: number;
  maxHpGain: number;
  maxHpLoss: number;
  goldGain: number;
  goldLoss: number;
  damageTaken: number;
}

interface RestChoice {
  key: string;
  data?: any;
}

interface FloorInfo {
  floor: number;
  type: string;
  pathPerFloor?: string;
  currentHp: number;
  maxHp: number;
  previousHp?: number;
  gold: number;
  enemies?: string;
  damage?: number;
  turns?: number;
  cards?: {
    type: "obtained" | "removed" | "upgraded" | "skipped";
    card: string;
  }[];
  potions?: string[];
  relics?: RelicInfo[];
  event?: EventInfo;
  restChoice?: RestChoice;
  shopPurchases?: string[];
}

// ネオーの祝福の日本語化
const neowBonusLocalization: { [key: string]: string } = {
  THREE_CARDS: "3枚のカードから1枚を選択",
  ONE_RANDOM_RARE_CARD: "レアカードをランダムに1枚獲得",
  REMOVE_CARD: "カードを1枚削除",
  UPGRADE_CARD: "カードを1枚アップグレード",
  TRANSFORM_CARD: "カードを1枚変化",
  RANDOM_COLORLESS: "無色のカードをランダムに1枚獲得",
  THREE_SMALL_POTIONS: "小さいポーションを3つ獲得",
  RANDOM_COMMON_RELIC: "コモンレリックをランダムに1つ獲得",
  TEN_PERCENT_HP_BONUS: "最大HPが10%増加",
  THREE_ENEMY_KILL: "次の3体の敵が1HPで開始",
  HUNDRED_GOLD: "100ゴールド獲得",
  RANDOM_COLORLESS_2: "無色のレアカードを1枚選択して獲得",
  REMOVE_TWO: "カードを2枚削除",
  ONE_RARE_RELIC: "レアレリックをランダムに1つ獲得",
  TWO_FIFTY_GOLD: "250ゴールド獲得",
  TRANSFORM_TWO_CARDS: "カードを2枚変化",
  TWENTY_PERCENT_HP_BONUS: "最大HPが20%増加",
};

const neowCostLocalization: { [key: string]: string } = {
  TEN_PERCENT_HP_LOSS: "最大HPが10%減少",
  NO_GOLD: "ゴールドをすべて失う",
  CURSE: "呪いカードを1枚獲得",
  THREE_CARDS: "カードを3枚失う",
  PERCENT_DAMAGE: "現在のHPの30%のダメージを受ける",
};

const getLocalizedName = (
  key: string,
  type: "monster" | "relic" | "card" | "event" | "potion"
) => {
  try {
    switch (type) {
      case "monster":
        return monsters[key]?.NAME || key;
      case "relic":
        return relics[key]?.NAME || key;
      case "card":
        return cards[key]?.NAME || key;
      case "event":
        return events[key]?.NAME || key;
      case "potion":
        return potions[key]?.NAME || key;
      default:
        return key;
    }
  } catch (error) {
    return key;
  }
};

const getNeowBonusResult = (runData: any): React.ReactNode | null => {
  if (!runData.neow_bonus) return null;

  let resultParts: React.ReactNode[] = [];

  // カードの取得（floor=0のcard_choicesから）
  const cardsObtained = runData.card_choices?.filter((c: any) => c.floor === 0);
  if (cardsObtained?.length > 0) {
    resultParts.push(
      <div key="cards" className="space-y-2">
        <p>
          <span className="font-medium">カード選択:</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {cardsObtained.map((choice: any, idx: number) => {
            const cardName = choice.picked;
            const isUpgraded = cardName.includes("+1");
            const baseCardName = cardName.replace("+1", "");

            // キャラクターのクラスを判定（サフィックスから）
            let characterClass = "";
            if (baseCardName.endsWith("_R")) characterClass = "ironclad";
            else if (baseCardName.endsWith("_G")) characterClass = "silent";
            else if (baseCardName.endsWith("_B")) characterClass = "defect";
            else if (baseCardName.endsWith("_P")) characterClass = "watcher";

            // カード情報を取得
            const cardInfo = findCardInfo(baseCardName);

            // カードのクラスを決定
            let cardClass:
              | "ironclad"
              | "silent"
              | "defect"
              | "watcher"
              | "colorless"
              | "curse" = "colorless";

            // スターターカードの場合はキャラクターのクラスを使用
            if (characterClass) {
              cardClass = characterClass as
                | "ironclad"
                | "silent"
                | "defect"
                | "watcher";
            } else {
              // 通常のカードの場合は cardInfo から判定
              if (cardInfo.class.toLowerCase() === "curse") {
                cardClass = "curse";
              } else if (cardInfo.class.toLowerCase() === "colorless") {
                cardClass = "colorless";
              } else {
                switch (cardInfo.class.toLowerCase()) {
                  case "ironclad":
                  case "red":
                    cardClass = "ironclad";
                    break;
                  case "silent":
                  case "green":
                    cardClass = "silent";
                    break;
                  case "defect":
                  case "blue":
                    cardClass = "defect";
                    break;
                  case "watcher":
                  case "purple":
                    cardClass = "watcher";
                    break;
                  default:
                    cardClass = "colorless";
                }
              }
            }

            // カードタイプを決定
            let cardType: "attack" | "skill" | "power" | "status" | "curse" =
              "skill";
            if (cardClass === "curse") {
              cardType = "curse";
            } else if (cardInfo.isPlaceholder) {
              cardType = "skill"; // プレースホルダーの場合はデフォルトでskill
            } else {
              switch (cardInfo.type.toLowerCase()) {
                case "attack":
                  cardType = "attack";
                  break;
                case "skill":
                  cardType = "skill";
                  break;
                case "power":
                  cardType = "power";
                  break;
                case "status":
                  cardType = "status";
                  break;
                default:
                  cardType = "skill";
              }
            }

            // レアリティの調整（Starterカードの場合はcommonとして扱う）
            const adjustedRarity =
              cardInfo.rarity === "starter" ? "common" : cardInfo.rarity;

            return (
              <div
                key={idx}
                className="transform scale-50 origin-center hover:z-10 hover:scale-60 transition-all duration-200 -mx-6 -my-10"
              >
                <Card
                  name={cardInfo.name}
                  class={cardClass}
                  type={cardType}
                  cost={
                    isUpgraded && cardInfo.upgradedCost !== undefined
                      ? cardInfo.upgradedCost
                      : cardInfo.cost
                  }
                  description={
                    isUpgraded
                      ? cardInfo.upgradedEffect || cardInfo.effect
                      : cardInfo.effect
                  }
                  rarity={
                    adjustedRarity as
                      | "starter"
                      | "common"
                      | "uncommon"
                      | "rare"
                      | "special"
                      | "curse"
                  }
                  upgraded={isUpgraded}
                  originalDescription={isUpgraded ? cardInfo.effect : undefined}
                  originalCost={isUpgraded ? cardInfo.cost : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Starter Relicsを除外するためのリスト
  const starterRelics = [
    "Burning Blood",
    "Ring of the Snake",
    "Cracked Core",
    "Pure Water",
  ];

  // 1. relics_obtainedから取得したレリック（Starter Relicを除く）
  const relicsObtained = runData.relics_obtained?.filter(
    (r: any) => r.floor === 0 && !starterRelics.includes(r.key)
  );

  // 2. relicsとrelics_obtainedの差分からネオーの祝福で取得したレリックを特定
  const allRelics = new Set(runData.relics || []);
  const obtainedRelics = new Set(
    runData.relics_obtained?.map((r: any) => r.key) || []
  );
  const purchasedRelics = new Set(
    runData.items_purchased?.filter((item: string) => relics[item]) || []
  );
  const eventRelics = new Set(
    runData.event_choices?.flatMap((e: any) => e.relics_obtained || []) || []
  );
  const bossRelics = new Set(
    runData.boss_relics?.flatMap((br: any) =>
      br.picked !== "SKIP" ? [br.picked] : []
    ) || []
  );

  // ネオーの祝福で取得したレリック
  const neowRelics = Array.from(allRelics).filter(
    (relic: string) =>
      !obtainedRelics.has(relic) &&
      !purchasedRelics.has(relic) &&
      !eventRelics.has(relic) &&
      !bossRelics.has(relic) &&
      !starterRelics.includes(relic)
  );

  // 両方のソースからのレリックを結合し、重複を削除
  const allNeowRelics = [
    ...new Set([
      ...(relicsObtained?.map((r: any) => r.key) || []),
      ...neowRelics,
    ]),
  ].filter((relic: string) => {
    // Starterレリックを除外
    if (starterRelics.includes(relic)) return false;

    // relics.jsonからレリック情報を取得して、rarityがStarterのレリックを除外
    const relicInfo = relicsData?.relics?.find(
      (r) =>
        r.name.toLowerCase() === relic.toLowerCase() ||
        normalizeRelicName(r.name).toLowerCase() ===
          normalizeRelicName(relic).toLowerCase()
    );

    return !(relicInfo && relicInfo.rarity.toLowerCase() === "starter");
  });

  if (allNeowRelics.length > 0) {
    resultParts.push(
      <div key="relics" className="space-y-2">
        <p>
          <span className="font-medium">レリック取得:</span>
        </p>
        <div className="flex flex-wrap gap-4">
          {allNeowRelics.map((relic, index) => (
            <div key={index} className="flex flex-col items-center">
              <p>{relic}</p>
              <img
                src={getRelicImagePath(relic)}
                alt={relic}
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.tried) {
                    target.dataset.tried = "true";
                    target.src = "/src/assets/images/relics/default.png";
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 最大HPの変更（floor=0のみ）
  if (
    runData.max_hp_per_floor &&
    runData.max_hp_per_floor[0] !== runData.max_hp_per_floor[1]
  ) {
    const diff = runData.max_hp_per_floor[1] - runData.max_hp_per_floor[0];
    resultParts.push(
      <p key="maxhp">
        <span className="font-medium">
          最大HP{diff > 0 ? "+" : ""}
          {diff}
        </span>
      </p>
    );
  }

  // ゴールドの変更（floor=0のみ）
  if (runData.gold_per_floor && runData.gold_per_floor[0] !== 99) {
    resultParts.push(
      <p key="gold">
        <span className="font-medium">ゴールド:</span>{" "}
        {runData.gold_per_floor[0]}
      </p>
    );
  }

  return resultParts.length > 0 ? (
    <div className="space-y-2">{resultParts}</div>
  ) : null;
};

const getLocalizedMonsterName = (name: string): string => {
  // 数値を抽出
  const match = name.match(/^(\d+)\s*x?\s*(.+)$/i);
  if (match) {
    const [_, count, monsterName] = match;
    // 空白を削除し、複数形を単数形に変換して検索
    const searchName = monsterName
      .replace(/s$/, "")
      .replace(/\s+/g, "")
      .replace(/^the\s+/i, "");
    return `${count}× ${monsters[searchName]?.NAME || monsterName}`;
  }

  // andで分割（改行で区切る）
  if (name.toLowerCase().includes(" and ")) {
    const parts = name.split(/\s+and\s+/i);
    return parts
      .map((part) => {
        const searchName = part
          .replace(/s$/, "")
          .replace(/\s+/g, "")
          .replace(/^the\s+/i, "");
        return monsters[searchName]?.NAME || part;
      })
      .join("\n");
  }

  // theを削除し、空白を削除して検索
  const searchName = name
    .replace(/^the\s+/i, "")
    .replace(/s$/, "")
    .replace(/\s+/g, "");
  return monsters[searchName]?.NAME || name;
};

// レリック名を正規化する関数を修正
const normalizeRelicName = (name: string): string => {
  // 特殊なケースの処理
  const specialCases: { [key: string]: string } = {
    "Frozen Egg": "FrozenEgg2",
    "Toxic Egg": "ToxicEgg2",
    "Molten Egg": "MoltenEgg2",
    "Cables": "GoldPlatedCables",
    "Mercury Hourglass": "MercuryHourglass",
    "WarpedTongs": "warpedTongs",
    "Bag of Marbles": "BagOfMarbles",
    "Bag of Prep": "BagOfPrep",
    "OrangePellets": "orangePellets",
    "Bronze Scales": "bronzeScales",
    "WingedGreaves": "wingBoots",
    "Calipers": "calipers",
    "Charons Ashes": "charonsAshes",
    "Symbiotic Virus": "symbioticVirus",
    "Preserved Insect": "PreservedInsect",
    "Cloak Clasp": "CloakClasp",
    "Dolly's Mirror": "DollysMirror",
    "Strike Dummy": "StrikeDummy",
    "Overcharged Core": "OverchargedCore",
    "Teardrop Locket": "TeardropLocket",
    "Peace Pipe": "PeacePipe",
    "World of Goop": "worldOfGoop",
    "The Library": "Library",
    "The Joust": "theJoust",
    "The Ssssserpent": "theSerpent",
    "Pleading Vagrant": "pleadingVagrant",
    "Ancient Writing": "ancientWriting",
    "Old Beggar": "oldBeggar",
    "Big Fish": "bigFish",
    "The Woman in Blue": "womanInBlue",
    "Cursed Tome": "cursedTome",
    "Drug Dealer": "drugDealer",
    "Face Trader": "faceTrader",
    "Falling": "falling",
    "Forgotten Altar": "forgottenAltar",
    "Golden Shrine": "goldenShrine",
    "Knowing Skull": "knowingSkull",
    "Lab": "lab",
    "Match and Keep": "matchAndKeep",
    "Masked Bandits": "maskedBandits",
    "Mind Bloom": "mindBloom",
    "Mysterious Sphere": "mysteriousSphere",
    "Purifier": "purifier",
    "Scrap Ooze": "scrapOoze",
    "Secret Portal": "secretPortal",
    "Sensory Stone": "sensoryStone",
    "Shining Light": "shiningLight",
    "Tomb of Lord Red Mask": "tombofLordRedMask",
    "Transmogrifier": "transmogrifier",
    "Upgrade Shrine": "upgradeShrine",
    "We Meet Again": "weMeetAgain",
    "Wheel of Change": "wheelOfChange",
    "Winding Halls": "winding",
    "A Note For Yourself": "noteForYourself",
    "Back to Basics": "backToBasics",
    "Colosseum": "colosseum",
    "Designer": "designer",
    "Duplicator": "duplicator",
    "Fountain of Cleansing": "fountainOfCleansing",
    "Ghosts": "ghosts",
    "Mushrooms": "mushrooms",
    "N'loth": "nloth",
    "Vampires": "vampires",
    "Nest": "theNest",
    "Council of Ghosts": "councilOfGhosts",
    "Bonfire Spirits": "bonfireSpirits",
    "Addict": "addict",
    "Beggar": "beggar",
    "Bandits": "bandits",
    "Fountain": "fountain",
    "Hypnotizing Colored Rocks": "hypnotizingColoredRocks",
    "Liars Game": "sssserpent",
    "Moai Head": "moaiHead",
    "Ominous Forge": "ominousForge",
    "Secret Garden": "secretGarden",
    "The Divine Fountain": "theDivineFountain",
    "The Mausoleum": "theMausoleum",
    "The Nest": "theNest",
    "The Cleric": "theCleric",
    "The Serpent": "theSsssserpent",
    "The Woman In Blue": "theWomanInBlue"
  };

  // 特殊なケースのチェック
  if (specialCases[name]) {
    return specialCases[name];
  }

  // relics.jsonからaliasを取得
  const relicAliases = relicsData?.alias?.[0] || {};

  // 基本的な正規化処理
  const normalizedName = name
    .replace(/^the\s+/i, "") // theを削除
    .replace(/s$/, "") // 末尾のsを削除
    .replace(/[\s-]+/g, "") // すべての空白とハイフンを削除
    .replace(/[^\w]/g, ""); // 英数字以外の文字を削除

  // 正規化した名前でaliasを検索
  for (const [aliasKey, aliasValue] of Object.entries(relicAliases)) {
    if (normalizedName.toLowerCase() === aliasKey.toLowerCase()) {
      return aliasKey;
    }
  }

  // 直接aliasに登録されているか確認
  if (relicAliases && typeof name === "string") {
    for (const [aliasKey, aliasValue] of Object.entries(relicAliases)) {
      if (name.toLowerCase() === aliasValue.toLowerCase()) {
        return aliasKey;
      }
    }
  }

  return normalizedName;
};

// レリック表示名をフォーマットする関数
const formatRelicDisplayName = (name: string): string => {
  // relics.jsonからレリック情報を取得
  let relicInfo = relicsData?.relics?.find(
    (relic) =>
      relic.name.toLowerCase() === name.toLowerCase() ||
      normalizeRelicName(relic.name).toLowerCase() ===
        normalizeRelicName(name).toLowerCase()
  );

  // 直接検索で見つからない場合、aliasを確認
  if (!relicInfo && relicsData?.alias?.[0]) {
    const relicAliases = relicsData.alias[0];
    // aliasに登録されているか確認
    if (typeof name === "string" && name in relicAliases) {
      const aliasName = relicAliases[name as keyof typeof relicAliases];
      // aliasから取得した名前で再検索
      relicInfo = relicsData.relics.find(
        (relic) =>
          relic.name.toLowerCase() === aliasName.toLowerCase() ||
          normalizeRelicName(relic.name).toLowerCase() ===
            normalizeRelicName(aliasName).toLowerCase()
      );
    }
  }

  if (relicInfo) {
    return relicInfo.name; // relics.jsonに登録されている正確な名前を返す
  }

  // 特殊なケースの処理
  if (name.includes("Egg 2")) {
    return name.replace(" 2", "");
  }

  // 単語の先頭を大文字にする
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
};

// イベント名を正規化する関数を追加
const normalizeEventName = (name: string): string => {
  // 特殊なケースの処理
  const specialCases: Record<string, string> = {
    "Accursed Blacksmith": "accursedBlacksmith",
    "Dead Adventurer": "deadAdventurer",
    "Living Wall": "livingWall",
    "Golden Wing": "goldenWing",
    "Golden Idol": "goldenIdol",
    "World of Goop": "worldOfGoop",
    "The Library": "Library",
    "Pleading Vagrant": "pleadingVagrant",
    "Ancient Writing": "ancientWriting",
    "Old Beggar": "oldBeggar",
    "Big Fish": "bigFish",
    "Cursed Tome": "cursedTome",
    "Drug Dealer": "drugDealer",
    "Face Trader": "faceTrader",
    "Falling": "falling",
    "Forgotten Altar": "forgottenAltar",
    "Golden Shrine": "goldenShrine",
    "Knowing Skull": "knowingSkull",
    "Lab": "lab",
    "Match and Keep": "matchAndKeep",
    "Mind Bloom": "mindBloom",
    "Mysterious Sphere": "mysteriousSphere",
    "Purifier": "purifier",
    "Scrap Ooze": "scrapOoze",
    "Secret Portal": "secretPortal",
    "Sensory Stone": "sensoryStone",
    "Shining Light": "shiningLight",
    "Tomb of Lord Red Mask": "tombofLordRedMask",
    "Transmogrifier": "transmogrifier",
    "We Meet Again": "weMeetAgain",
    "Wheel of Change": "wheelOfChange",
    "Winding Halls": "winding",
    "A Note For Yourself": "noteForYourself",
    "Back to Basics": "backToBasics",
    "Colosseum": "colosseum",
    "Designer": "designer",
    "Duplicator": "duplicator",
    "Fountain of Cleansing": "fountainOfCleansing",
    "Ghosts": "ghosts",
    "Mushrooms": "mushrooms",
    "N'loth": "nloth",
    "Vampires": "vampires",
    "Council of Ghosts": "councilOfGhosts",
    "Bonfire Spirits": "bonfireSpirits",
    "Addict": "addict",
    "Beggar": "beggar",
    "Bandits": "bandits",
    "Fountain": "fountain",
    "Liars Game": "sssserpent",
    "Moai Head": "moaiHead",
    "Ominous Forge": "ominousForge",
    "Secret Garden": "secretGarden",
    "The Divine Fountain": "theDivineFountain",
    "The Mausoleum": "theMausoleum",
    "The Nest": "theNest",
    "The Cleric": "theCleric",
    "The Joust": "theJoust",
    "The Serpent": "theSsssserpent",
    "The Woman In Blue": "theWomanInBlue",
    "Upgrade Shrine": "upgradeShrine",
    "Hypnotizing Colored Rocks": "hypnotizingColoredRocks"
  };

  // 特殊なケースのチェック
  if (specialCases[name]) {
    return specialCases[name];
  }

  // 基本的な正規化処理
  const normalized = name
    .replace(/^the\s+/i, "") // 先頭の'the'を削除
    .replace(/\s+/g, "") // 空白を削除
    .replace(/[^\w]/g, "") // 英数字以外の文字を削除
    .toLowerCase(); // 小文字に変換

  return normalized;
};

// イベント名の表示用フォーマット関数を追加
const formatEventDisplayName = (name: string): string => {
  // 特殊なケースの処理
  const specialCases: { [key: string]: string } = {
    MindBloom: "Mind Bloom",
    FaceTrader: "Face Trader",
    SecretPortal: "Secret Portal",
    SensoryStone: "Sensory Stone",
    ShiningLight: "Shining Light",
    ScrapOoze: "Scrap Ooze",
    GoldenShrine: "Golden Shrine",
    GoldenIdol: "Golden Idol",
    KnowingSkull: "Knowing Skull",
    MatchAndKeep: "Match And Keep",
    WheelOfChange: "Wheel Of Change",
    WindingHalls: "Winding Halls",
    WorldOfGoop: "World Of Goop",
    ForgottenAltar: "Forgotten Altar",
    MysteriousSphere: "Mysterious Sphere",
    TombofLordRedMask: "Tomb of Lord Red Mask",
    BackToBasics: "Back To Basics",
    FountainOfCleansing: "Fountain Of Cleansing",
    BonfireSpirits: "Bonfire Spirits",
    CouncilOfGhosts: "Council Of Ghosts",
    DeadAdventurer: "Dead Adventurer",
    LivingWall: "Living Wall",
    GoldenWing: "Golden Wing",
    PleadingVagrant: "Pleading Vagrant",
    AncientWriting: "Ancient Writing",
    OldBeggar: "Old Beggar",
    BigFish: "Big Fish",
    CursedTome: "Cursed Tome",
    DrugDealer: "Drug Dealer",
    WeMeetAgain: "We Meet Again",
    NoteForYourself: "A Note For Yourself",
    AccursedBlacksmith: "Accursed Blacksmith",
    MoaiHead: "Moai Head",
    OminousForge: "Ominous Forge",
    SecretGarden: "Secret Garden",
    TheDivineFountain: "The Divine Fountain",
    TheMausoleum: "The Mausoleum",
    TheNest: "The Nest",
    TheCleric: "The Cleric",
    TheJoust: "The Joust",
    TheSerpent: "The Ssssserpent",
    TheWomanInBlue: "The Woman In Blue",
    UpgradeShrine: "Upgrade Shrine",
    HypnotizingColoredRocks: "Hypnotizing Colored Rocks",
  };

  // 特殊なケースのチェック
  if (specialCases[name]) {
    return specialCases[name];
  }

  // 基本的な処理: 単語の先頭を大文字にする
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
};

// イベント内容をフォーマットする関数を修正
const formatEventContent = (event: EventInfo): string => {
  const parts: string[] = [];

  if (event.choice) parts.push(`選択: ${event.choice}`);
  if (event.damageHealed > 0) parts.push(`HP回復: ${event.damageHealed}`);
  if (event.maxHpGain > 0) parts.push(`最大HP +${event.maxHpGain}`);
  if (event.maxHpLoss > 0) parts.push(`最大HP -${event.maxHpLoss}`);
  if (event.goldGain > 0) parts.push(`ゴールド +${event.goldGain}`);
  if (event.goldLoss > 0) parts.push(`ゴールド -${event.goldLoss}`);
  if (event.damageTaken > 0) parts.push(`ダメージ: ${event.damageTaken}`);

  return parts.join("\n");
};

// カード名を正規化する関数を修正
const normalizeCardName = (name: string): string => {
  // キャラクター固有のサフィックスを削除
  const baseName = name.replace(/_(R|G|B|P)$/, "");

  return baseName
    .replace(/^the\s+/i, "") // 先頭の'the'を削除
    .replace(/s$/, "") // 末尾のsを削除（単純な複数形）
    .replace(/\s+/g, "") // 空白を削除
    .toLowerCase(); // 小文字に変換
};

// カード情報の型を定義
interface CardInfo {
  name: string;
  cost: number | string;
  type: string;
  class: string;
  rarity: string;
  effect: string;
  upgradedCost?: number | string;
  upgradedEffect?: string;
  isPlaceholder?: boolean;
}

// カード情報を検索する関数を修正
const findCardInfo = (cardName: string): CardInfo => {
  // キャラクター固有のサフィックスを削除し、基本カード名を取得
  const baseCardName = cardName
    .replace(/_(R|G|B|P)$/, "") // キャラクター固有のサフィックスを削除
    .replace("+1", ""); // アップグレード表記を削除

  // カード名を単語単位で分割して再結合（例: "bootsequence" -> "Boot Sequence"）
  const formattedName = baseCardName
    .replace(/([A-Z])/g, " $1") // 大文字の前にスペースを挿入
    .trim() // 余分なスペースを削除
    .replace(/\s+/g, " "); // 連続するスペースを1つに

  // 正規化された名前で検索
  const normalizedSearchName = normalizeCardName(formattedName);

  // 最初に直接検索
  let cardInfo = allCards.cards.find(
    (card) => normalizeCardName(card.name) === normalizedSearchName
  );

  // 直接検索で見つからない場合、エイリアスを確認
  if (!cardInfo && allCards.alias) {
    // まず完全一致でエイリアスを確認
    if (formattedName in allCards.alias) {
      const aliasName =
        allCards.alias[formattedName as keyof typeof allCards.alias];
      cardInfo = allCards.cards.find(
        (card) => normalizeCardName(card.name) === normalizeCardName(aliasName)
      );
    }
    // 完全一致で見つからない場合、正規化した名前でエイリアスを確認
    else {
      for (const [alias, realName] of Object.entries(allCards.alias)) {
        if (normalizeCardName(alias) === normalizedSearchName) {
          cardInfo = allCards.cards.find(
            (card) =>
              normalizeCardName(card.name) === normalizeCardName(realName)
          );
          if (cardInfo) break;
        }
      }
    }
  }

  // カード情報が見つからない場合のフォールバック情報を返す
  if (!cardInfo) {
    return {
      name: baseCardName,
      cost: 0,
      type: "skill",
      class: "colorless",
      rarity: "special",
      effect: "(Card data not found)",
      isPlaceholder: true,
    };
  }

  // basicカードの場合、rarityをcommonとして扱う
  if (cardInfo.rarity.toLowerCase() === "basic") {
    return {
      ...cardInfo,
      rarity: "common",
    };
  }

  return cardInfo as CardInfo;
};

interface RunDetailProps {}

// レリック画像を取得する関数を修正
const getRelicImagePath = (relicName: string): string => {
  // 特殊なケースの処理
  const specialImagePaths: { [key: string]: string } = {
    PreservedInsect: "preservedinsect",
    CloakClasp: "cloakclasp",
    DollysMirror: "dollysmirror",
    StrikeDummy: "strikedummy",
    OverchargedCore: "overchargedcore",
    TeardropLocket: "teardroplocket",
    PeacePipe: "peacepipe",
  };

  // relics.jsonからaliasを取得
  const relicAliases = relicsData?.alias || {};
  
  // aliasに登録されているか確認
  if (relicAliases && typeof relicName === "string") {
    // 特殊なケース: Charon's Ashes
    if (relicName === "Charon's Ashes") {
      return `/src/assets/images/relics/charonsashes.png`;
    }
    
    // aliasに登録されている場合
    const aliasValue = relicAliases[relicName as keyof typeof relicAliases];
    if (aliasValue) {
      const valueStr = String(aliasValue);
      return `/src/assets/images/relics/${valueStr.toLowerCase()}.png`;
    }
  }

  // 正規化されたレリック名を取得
  const normalizedName = normalizeRelicName(relicName);

  // 特殊なケースのチェック
  if (specialImagePaths[normalizedName]) {
    return `/src/assets/images/relics/${specialImagePaths[normalizedName]}.png`;
  }

  // 小文字に変換して返す
  return `/src/assets/images/relics/${normalizedName.toLowerCase()}.png`;
};

import { calculateCardStats, calculateRelicStats } from '../services/StatsService';
import { createEmptyAllCharacterStats } from '../models/StatsModel';
import StatsTooltip from './StatsTooltip';

export const RunDetail: React.FC<RunDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const { runs, settings } = useStore();
  const [run, setRun] = useState<any>(null);
  const [floorInfo, setFloorInfo] = useState<FloorInfo[]>([]);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{
    total: number;
    current: number;
  }>({ total: 0, current: 0 });
  const [searchMatches, setSearchMatches] = useState<HTMLElement[]>([]);
  const [deckVisible, setDeckVisible] = useState(false);
  const [relicsVisible, setRelicsVisible] = useState(false);
  const deckRef = React.useRef<HTMLDivElement>(null);
  const relicsRef = React.useRef<HTMLDivElement>(null);
  
  // 統計情報ツールチップ用の状態
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipItemId, setTooltipItemId] = useState<string | null>(null);
  const [tooltipItemName, setTooltipItemName] = useState('');
  const [tooltipItemType, setTooltipItemType] = useState<'card' | 'relic'>('card');
  
  // カードアニメーションのスタイルを追加
  useEffect(() => {
    // スタイルシートを作成
    const styleSheet = document.createElement("style");
    styleSheet.id = "card-animation-styles";

    // キーフレームアニメーションを定義
    const cssText = `
      @keyframes dealCard {
        0% {
          opacity: 0;
          transform: translateY(-150px) scale(0.3) rotate(-15deg);
        }
        70% {
          opacity: 1;
          transform: translateY(15px) scale(0.7) rotate(8deg);
        }
        85% {
          transform: translateY(-5px) scale(0.68) rotate(-3deg);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(0.67) rotate(0);
        }
      }
      
      @keyframes dealRelic {
        0% {
          opacity: 0;
          transform: translateY(-50px) scale(0.5);
        }
        70% {
          opacity: 1;
          transform: translateY(5px) scale(1.1);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;

    // CSSStyleSheetを使用して安全にスタイルを適用
    if ('styleSheet' in styleSheet) {
      (styleSheet as any).styleSheet.cssText = cssText;
    } else {
      styleSheet.textContent = cssText;
    }

    // ドキュメントに追加
    document.head.appendChild(styleSheet);

    // クリーンアップ関数
    return () => {
      const existingStyle = document.getElementById("card-animation-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Intersection Observerを使用してデッキ一覧とレリック一覧の表示を検出
  useEffect(() => {
    if (!deckRef.current && !relicsRef.current) return;

    const observerOptions = { threshold: 0.1 }; // 10%以上表示されたら検出

    const deckObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setDeckVisible(true);
          deckObserver.disconnect(); // 一度検出したら監視を停止
        }
      });
    }, observerOptions);

    const relicsObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setRelicsVisible(true);
          relicsObserver.disconnect(); // 一度検出したら監視を停止
        }
      });
    }, observerOptions);

    if (deckRef.current) {
      deckObserver.observe(deckRef.current);
    }

    if (relicsRef.current) {
      relicsObserver.observe(relicsRef.current);
    }

    return () => {
      deckObserver.disconnect();
      relicsObserver.disconnect();
    };
  }, [run]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    highlightSearchResults(value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateToNextSearchResult();
    }
  };

  const navigateToNextSearchResult = () => {
    if (searchMatches.length > 0) {
      const nextIndex = searchResults.current % searchMatches.length;
      const element = searchMatches[nextIndex];
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setSearchResults((prev) => ({
        ...prev,
        current: nextIndex + 1,
      }));
    }
  };

  const createHighlightedElement = (text: string, searchValue: string): HTMLElement => {
    const container = document.createElement('span');
    const normalizedSearchValue = searchValue.toLowerCase();
    let lastIndex = 0;
    const parts: Node[] = [];

    text.split(new RegExp(`(${searchValue})`, 'gi')).forEach((part) => {
      if (part.toLowerCase() === normalizedSearchValue) {
        const highlight = document.createElement('span');
        highlight.className = 'search-highlight bg-warning text-black font-bold';
        highlight.textContent = part;
        parts.push(highlight);
      } else {
        parts.push(document.createTextNode(part));
      }
    });

    parts.forEach(part => container.appendChild(part));
    return container;
  };

  const highlightSearchResults = (searchValue: string) => {
    if (!searchValue) {
      setSearchResults({ total: 0, current: 0 });
      setSearchMatches([]);
      // 既存のハイライトを削除
      document.querySelectorAll(".search-highlight").forEach((el) => {
        if (el.parentNode) {
          el.replaceWith(document.createTextNode(el.textContent || ''));
        }
      });
      return;
    }

    // 検索語を正規化
    const normalizedSearchValue = searchValue.toLowerCase().trim();
    const tableRows = document.querySelectorAll("tbody tr");
    const matches: HTMLElement[] = [];

    // 既存のハイライトをクリア
    document.querySelectorAll(".search-highlight").forEach((el) => {
      if (el.parentNode) {
        el.replaceWith(document.createTextNode(el.textContent || ''));
      }
    });

    tableRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      let rowMatches = false;

      cells.forEach((cell) => {
        const originalText = cell.textContent || "";
        if (originalText.toLowerCase().includes(normalizedSearchValue)) {
          rowMatches = true;

          // カード情報を含むセルの特別な処理
          if (cell.querySelector(".flex.items-center.gap-2")) {
            const cardElements = cell.querySelectorAll(
              ".flex.items-center.gap-2"
            );
            cardElements.forEach((cardEl) => {
              const textEl = cardEl.querySelector("span");
              if (
                textEl &&
                textEl.textContent &&
                textEl.textContent.toLowerCase().includes(normalizedSearchValue)
              ) {
                const highlightedElement = createHighlightedElement(
                  textEl.textContent,
                  searchValue
                );
                textEl.replaceWith(highlightedElement);
              }
            });
          } else {
            // テキストノードを処理
            const walkNode = (node: Node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || "";
                if (text.toLowerCase().includes(normalizedSearchValue)) {
                  const highlightedElement = createHighlightedElement(
                    text,
                    searchValue
                  );
                  node.parentNode?.replaceChild(highlightedElement, node);
                }
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                // 画像や既にハイライトされた要素はスキップ
                if (
                  node.nodeName === "IMG" ||
                  (node as Element).classList?.contains("search-highlight")
                ) {
                  return;
                }

                // 子ノードを再帰的に処理
                Array.from(node.childNodes).forEach(walkNode);
              }
            };

            // セル内のすべてのノードを処理
            Array.from(cell.childNodes).forEach(walkNode);
          }
        }
      });

      if (rowMatches) {
        matches.push(row as HTMLElement);
      }
    });

    // 重複を削除
    const uniqueMatches = Array.from(new Set(matches));
    setSearchMatches(uniqueMatches);
    setSearchResults({
      total: uniqueMatches.length,
      current: uniqueMatches.length > 0 ? 1 : 0,
    });

    // 最初の結果にスクロール
    if (uniqueMatches.length > 0) {
      uniqueMatches[0].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    const foundRun = runs.find((r) => r.id === id);
    if (!foundRun) {
      navigate("/home");
      return;
    }
    setRun(foundRun);
    try {
      processRunData(foundRun);
    } catch (error) {
      console.error("Error processing run data:", error);
      navigate("/home");
    }
  }, [id, runs, navigate]);

  const processRunData = (runData: any) => {
    try {
      const data = runData.run_data;
      if (!data) {
        throw new Error("No run data available");
      }
      const floors: FloorInfo[] = [];

      let pathIndex = 0;
      let actualFloor = 1;
      let previousHp = data.current_hp_per_floor[0];

      // ショップでの購入アイテムの処理
      const purchasesByFloor = new Map<number, string[]>();
      if (data.items_purchased && data.item_purchase_floors) {
        data.items_purchased.forEach((item: string, index: number) => {
          const floor = data.item_purchase_floors[index];
          if (!purchasesByFloor.has(floor)) {
            purchasesByFloor.set(floor, []);
          }
          purchasesByFloor.get(floor)?.push(item);
        });
      }

      // Calling Bellで取得したレリックを追跡
      const callingBellRelics = new Map<number, string[]>();
      if (data.relics?.includes("Calling Bell")) {
        // Calling Bellと同じ階層で取得されたレリックを記録
        data.relics_obtained?.forEach(
          (relic: { floor: number; key: string }) => {
            if (relic.floor === 0 || relic.floor === 17 || relic.floor === 34) {
              if (!callingBellRelics.has(relic.floor)) {
                callingBellRelics.set(relic.floor, []);
              }
              callingBellRelics.get(relic.floor)?.push(relic.key);
            }
          }
        );
      }

      while (pathIndex < data.path_taken.length) {
        // ボスチェストと特殊イベントの処理
        if (
          actualFloor === 17 ||
          actualFloor === 34 ||
          actualFloor === 52 ||
          actualFloor === 57
        ) {
          const currentHp = data.current_hp_per_floor[actualFloor - 1];
          const maxHp = data.max_hp_per_floor[actualFloor - 1];
          const gold = data.gold_per_floor[actualFloor - 1];

          if (actualFloor === 17 || actualFloor === 34) {
            const bossRelicIndex = actualFloor === 17 ? 0 : 1;
            if (data.boss_relics && data.boss_relics[bossRelicIndex]) {
              const bossRelicChoice = data.boss_relics[bossRelicIndex];
              floors.push({
                floor: actualFloor,
                type: "BOSS_CHEST",
                currentHp,
                maxHp,
                previousHp,
                gold,
                relics:
                  bossRelicChoice.picked !== "SKIP"
                    ? [
                        {
                          type: "obtained",
                          relic: bossRelicChoice.picked,
                        },
                      ]
                    : [],
                cards: [], // スキップされたボスレリックは表示しない
              });
            }
          } else {
            // 52階と57階の特殊イベント処理
            floors.push({
              floor: actualFloor,
              type: "?",
              pathPerFloor: "?", // 特殊イベントの場合は'?'を設定
              currentHp,
              maxHp,
              previousHp,
              gold,
            });
          }
          previousHp = currentHp;
          actualFloor++;
          continue;
        }

        const floorData: FloorInfo = {
          floor: actualFloor,
          type: data.path_taken[pathIndex],
          pathPerFloor: data.path_per_floor?.[actualFloor - 1], // actualFloorを基準にインデックスを計算
          currentHp: data.current_hp_per_floor[actualFloor - 1],
          maxHp: data.max_hp_per_floor[actualFloor - 1],
          previousHp,
          gold: data.gold_per_floor[actualFloor - 1],
          cards: [],
          potions: [],
          relics: [],
        };

        // ダメージと敵の情報
        const damage = data.damage_taken?.find(
          (d: any) => d.floor === actualFloor
        );
        if (damage) {
          floorData.enemies = damage.enemies;
          floorData.damage = damage.damage;
          floorData.turns = damage.turns;
        }

        // カードの処理
        const cardChoices = data.card_choices?.filter(
          (c: any) => c.floor === actualFloor
        );
        if (cardChoices) {
          cardChoices.forEach((choice: CardChoice) => {
            if (choice.picked !== "SKIP") {
              floorData.cards?.push({
                type: "obtained",
                card: choice.picked,
              });
              choice.not_picked.forEach((card: string) => {
                floorData.cards?.push({
                  type: "skipped",
                  card,
                });
              });
            }
          });
        }

        // カード削除の処理
        const purgeIndex = data.items_purged_floors?.indexOf(actualFloor);
        if (purgeIndex !== -1) {
          floorData.cards?.push({
            type: "removed",
            card: data.items_purged[purgeIndex],
          });
        }

        // ショップでの購入アイテムの処理
        if (purchasesByFloor.has(actualFloor)) {
          const purchases = purchasesByFloor.get(actualFloor) || [];
          purchases.forEach((item) => {
            // カードの場合
            if (cards[item]) {
              floorData.cards?.push({
                type: "obtained",
                card: item,
              });
            }
            // ポーションの場合
            else if (potions[item]) {
              if (!floorData.potions) {
                floorData.potions = [];
              }
              floorData.potions.push(item);
            }
            // レリックの場合
            else if (relics[item]) {
              if (!floorData.relics) {
                floorData.relics = [];
              }
              floorData.relics.push({
                type: "obtained",
                relic: item,
              });
            }
          });
        }

        // ポーションの処理
        const obtainedPotions = data.potions_obtained?.filter(
          (p: any) => p.floor === actualFloor
        );
        if (obtainedPotions) {
          if (!floorData.potions) {
            floorData.potions = [];
          }
          floorData.potions.push(...obtainedPotions.map((p: any) => p.key));
        }

        // レリックの処理を修正
        const obtainedRelics = data.relics_obtained?.filter(
          (r: any) => r.floor === actualFloor
        );
        if (obtainedRelics) {
          obtainedRelics.forEach((relic: { key: string }) => {
            floorData.relics?.push({
              type: "obtained",
              relic: relic.key,
            });
          });

          // Calling Bellで取得したレリックを追加
          if (callingBellRelics.has(actualFloor)) {
            callingBellRelics.get(actualFloor)?.forEach((bellRelic) => {
              floorData.relics?.push({
                type: "obtained",
                relic: bellRelic,
              });
            });
          }
        }

        // イベントの処理
        const event = data.event_choices?.find(
          (e: any) => e.floor === actualFloor
        );
        if (event) {
          floorData.event = {
            name: event.event_name,
            choice: event.player_choice,
            damageHealed: event.damage_healed || 0,
            maxHpGain: event.max_hp_gain || 0,
            maxHpLoss: event.max_hp_loss || 0,
            goldGain: event.gold_gain || 0,
            goldLoss: event.gold_loss || 0,
            damageTaken: event.damage_taken || 0,
          };

          // カードの削除処理
          if (event.cards_removed) {
            event.cards_removed.forEach((card: string) => {
              floorData.cards?.push({
                type: "removed",
                card,
              });
            });
          }

          // カードの取得処理
          if (event.cards_obtained) {
            event.cards_obtained.forEach((card: string) => {
              floorData.cards?.push({
                type: "obtained",
                card,
              });
            });
          }

          // カードのアップグレード処理
          if (event.cards_upgraded) {
            event.cards_upgraded.forEach((card: string) => {
              floorData.cards?.push({
                type: "upgraded",
                card,
              });
            });
          }

          // レリックの取得処理
          if (event.relics_obtained) {
            event.relics_obtained.forEach((relic: string) => {
              floorData.relics?.push({
                type: "obtained",
                relic,
              });
            });
          }

          // レリックの喪失処理
          if (event.relics_lost) {
            event.relics_lost.forEach((relic: string) => {
              floorData.relics?.push({
                type: "lost",
                relic,
              });
            });
          }
        }

        // 休憩の処理
        const rest = data.campfire_choices?.find(
          (c: any) => c.floor === actualFloor
        );
        if (rest) {
          floorData.restChoice = {
            key: rest.key,
            data: rest.data,
          };

          // SMITHの場合、アップグレードされたカードをカード列に追加
          if (rest.key === "SMITH" && rest.data) {
            floorData.cards?.push({
              type: "upgraded",
              card: rest.data,
            });
          }
        }

        floors.push(floorData);
        previousHp = floorData.currentHp;
        pathIndex++;
        actualFloor++;
      }

      setFloorInfo(floors);
    } catch (error) {
      console.error("Error in processRunData:", error);
      throw error;
    }
  };

  const getMapIcon = (floor: FloorInfo) => {
    // ボスチェストの処理
    if (floor.type === "BOSS_CHEST") {
      return mapIcons.BOSS_CHEST;
    }

    // イベントマスの分岐処理
    if (floor.type === "?") {
      // path_per_floorの値に基づいてアイコンを決定
      switch (floor.pathPerFloor) {
        case "M":
          return mapIcons.unknownMonster;
        case "T":
          return mapIcons.unknownChest;
        case "$":
          return mapIcons.unknownShop;
        case "?":
          return mapIcons["?"];
        default:
          return mapIcons["?"];
      }
    }

    // 通常のマスの処理
    return mapIcons[floor.type] || mapIcons["?"];
  };

  const getResultBadgeClass = (run: any) => {
    if (run.victory && run.floor_reached < 57) {
      return "badge-warning";
    }
    return run.victory ? "badge-success" : "badge-error";
  };

  const getResultText = (run: any) => {
    if (run.victory && run.floor_reached < 57) {
      return "勝利？";
    }
    return run.victory ? "勝利" : "敗北";
  };

  const formatPlaytime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, "0")}`;
  };

  const filterFloorInfo = (floors: FloorInfo[]) => {
    if (!searchTerm) return floors;

    const searchLower = searchTerm.toLowerCase();
    return floors.filter((floor) => {
      const hasMatchingCard = floor.cards?.some((card) => {
        const baseCard = card.card.replace("+1", "");
        return baseCard.toLowerCase().includes(searchLower);
      });

      const hasMatchingPotion = floor.potions?.some((potion) =>
        potion.toLowerCase().includes(searchLower)
      );

      const hasMatchingRelic = floor.relics?.some((relic) =>
        relic.relic.toLowerCase().includes(searchLower)
      );

      const hasMatchingEvent =
        floor.event &&
        (floor.event.name.toLowerCase().includes(searchLower) ||
          floor.event.choice.toLowerCase().includes(searchLower));

      const hasMatchingEnemy =
        floor.enemies && floor.enemies.toLowerCase().includes(searchLower);

      const hasMatchingRestChoice =
        floor.restChoice &&
        floor.restChoice.key.toLowerCase().includes(searchLower);

      return (
        hasMatchingCard ||
        hasMatchingPotion ||
        hasMatchingRelic ||
        hasMatchingEvent ||
        hasMatchingEnemy ||
        hasMatchingRestChoice
      );
    });
  };

  // 統計情報を計算（メモ化）
  const itemStats = useMemo(() => {
    // ツールチップが表示されていなくても、アイテムIDが設定されていれば計算する
    if (!tooltipItemId || !tooltipItemType || !runs.length) {
      return createEmptyAllCharacterStats();
    }
    
    if (tooltipItemType === 'card') {
      return calculateCardStats(runs, tooltipItemId);
    } else {
      return calculateRelicStats(runs, tooltipItemId);
    }
  }, [tooltipItemId, tooltipItemType, runs]);

  // アイテムにマウスオーバーした際の処理
  const handleItemMouseEnter = (
    itemId: string, 
    itemName: string, 
    itemType: 'card' | 'relic', 
    event: React.MouseEvent
  ) => {
    // 統計情報ツールチップが無効の場合は何もしない
    if (!settings.enableStatsTooltip) return;
    
    // 状態を更新
    setTooltipItemId(itemId);
    setTooltipItemName(itemName);
    setTooltipItemType(itemType);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    
    // 即座にツールチップを表示
    setTooltipVisible(true);
  };

  // アイテムからマウスが離れた際の処理
  const handleItemMouseLeave = () => {
    setTooltipVisible(false);
  };

  // マウス移動時の処理
  const handleItemMouseMove = (event: React.MouseEvent) => {
    if (tooltipVisible) {
      // 前回の位置から一定以上移動した場合のみ更新（ちらつき防止）
      const dx = Math.abs(event.clientX - tooltipPosition.x);
      const dy = Math.abs(event.clientY - tooltipPosition.y);
      if (dx > 20 || dy > 20) {
        setTooltipPosition({ x: event.clientX, y: event.clientY });
      }
    }
  };

  if (!run) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const runData = run.run_data;

  return (
    <div className="container mx-auto px-4 py-6 relative">
      <div className="max-w-[1920px] mx-auto space-y-6 relative">
        <h1 className="text-2xl font-bold mt-4">詳細</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本情報 */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body p-4">
              <h2 className="card-title mb-4">基本情報</h2>
              <div className="space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2 w-full">
                  <span className="font-medium">プレイ日時:</span>
                  <span>
                    {new Date(run.timestamp * 1000).toLocaleString("ja-JP")}
                  </span>
                  <span className="font-medium">キャラクター:</span>
                  <div className="flex items-center gap-2">
                    <img
                      src={characterImages[run.character]}
                      alt={run.character}
                      className="w-8 h-8 rounded-full"
                    />
                  </div>
                  <span className="font-medium">アセンション:</span>
                  <span>{run.ascension_level}</span>
                  <span className="font-medium">結果:</span>
                  <span>
                    <span
                      className={`badge ${getResultBadgeClass(run)} badge-sm`}
                    >
                      {getResultText(run)}
                    </span>
                  </span>
                  <span className="font-medium">到達階層:</span>
                  <span>{run.floor_reached}</span>
                  <span className="font-medium">プレイ時間:</span>
                  <span>{formatPlaytime(run.playtime)}</span>
                  <span className="font-medium">スコア:</span>
                  <span>{run.score.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ネオーの祝福 */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body p-4">
              <h2 className="card-title mb-4">ネオーの祝福</h2>
              <div className="space-y-2">
                {runData.neow_cost && (
                  <p>
                    <span className="font-medium">デメリット:</span>{" "}
                    {neowCostLocalization[runData.neow_cost] ||
                      runData.neow_cost}
                  </p>
                )}
                {runData.neow_bonus && (
                  <p>
                    <span className="font-medium">ボーナス:</span>{" "}
                    {neowBonusLocalization[runData.neow_bonus] ||
                      runData.neow_bonus}
                  </p>
                )}
                {getNeowBonusResult(runData)}
              </div>
            </div>
          </div>
        </div>

        {/* 検索バー - スクロール追従 */}

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-4">
            <div className="form-control w-full">
              <div className="relative">
                <input
                  type="text"
                  placeholder="カード、ポーション、レリック、イベント、敵で検索..."
                  className="input input-bordered w-full pr-24"
                  value={searchTerm}
                  onChange={handleSearch}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchResults.total > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm opacity-70">
                    {searchResults.current}/{searchResults.total}件
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* プレイ履歴 */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body p-4">
            <div className="max-w-[1920px] mx-auto w-full">
              <h2 className="card-title mb-4">階層の詳細</h2>
              <div className="overflow-x-auto">
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body p-0">
                    <table className="table table-zebra w-full">
                      <thead className="sticky top-[0px] z-30 bg-base-100 shadow-md">
                        <tr className="text-base">
                          <th className="bg-base-100/80 border-b-2 border-primary w-16 text-center">
                            階層
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-16 text-center">
                            マス
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-32 text-center">
                            体力
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-24 text-center">
                            ダメージ
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-24 text-center">
                            ターン
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-24 text-center">
                            ゴールド
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-32 text-center">
                            敵
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-48 text-center">
                            カード
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-32 text-center">
                            ポーション
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-32 text-center">
                            レリック
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-32 text-center">
                            イベント
                          </th>
                          <th className="bg-base-100/80 border-b-2 border-primary w-32 text-center">
                            イベント内容
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-base-100">
                        {filterFloorInfo(floorInfo).map((floor) => (
                          <tr
                            key={floor.floor}
                            className="text-base hover:bg-base-200/50"
                          >
                            <td className="border-b border-base-content/20 py-3 text-center">
                              <div className="card-body p-2">
                                {floor.floor}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3 text-center">
                              <div className="card-body p-2">
                                <img
                                  src={getMapIcon(floor)}
                                  alt={floor.type}
                                  title={floor.type}
                                  className="w-6 h-6 mx-auto"
                                />
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3 text-center">
                              <div className="card-body p-2">
                                <div className="flex items-center justify-center gap-2">
                                  <span>
                                    {floor.currentHp}/{floor.maxHp}
                                  </span>
                                  {floor.previousHp !== undefined &&
                                    (floor.currentHp > floor.previousHp ? (
                                      <ArrowUpIcon className="w-4 h-4 text-success" />
                                    ) : floor.currentHp < floor.previousHp ? (
                                      <ArrowDownIcon className="w-4 h-4 text-error" />
                                    ) : (
                                      <ArrowRightIcon className="w-4 h-4 text-warning" />
                                    ))}
                                </div>
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3 text-center">
                              <div className="card-body p-2">
                                {floor.damage || "-"}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3 text-center">
                              <div className="card-body p-2">
                                {floor.turns || "-"}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3 text-center">
                              <div className="card-body p-2">
                                {floor.gold}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3">
                              <div className="card-body p-2">
                                {floor.enemies && (
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-sm">{floor.enemies}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3">
                              <div className="card-body p-2">
                                {floor.cards?.map((card, cardIndex) => {
                                  const isUpgraded =
                                    card.card.includes("+1") ||
                                    card.type === "upgraded";
                                  const baseCard = card.card.replace("+1", "");
                                  const iconClass = "w-4 h-4";

                                  const cardInfo = findCardInfo(baseCard);
                                  const displayName = cardInfo.isPlaceholder
                                    ? baseCard
                                    : cardInfo.name;

                                  return (
                                    <div
                                      key={cardIndex}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      {card.type === "obtained" && (
                                        <PlusIcon
                                          className={`${iconClass} text-blue-500`}
                                        />
                                      )}
                                      {card.type === "removed" && (
                                        <MinusIcon
                                          className={`${iconClass} text-red-500`}
                                        />
                                      )}
                                      {card.type === "upgraded" && (
                                        <ArrowUpIcon className="w-4 h-4 text-success" />
                                      )}
                                      {card.type === "skipped" && (
                                        <XMarkIcon
                                          className={`${iconClass} text-gray-500`}
                                        />
                                      )}
                                      <span
                                        className={isUpgraded ? "text-success" : ""}
                                      >
                                        {displayName}
                                        {isUpgraded ? "+" : ""}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3">
                              <div className="card-body p-2">
                                {floor.potions?.map((potion, potionIndex) => (
                                  <div
                                    key={potionIndex}
                                    className="flex items-center gap-2 justify-center"
                                  >
                                    <span className="text-sm">
                                      {potion.replace(/\s*Potion\s*/g, "")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3">
                              <div className="card-body p-2">
                                {floor.relics?.map((relic, index) => (
                                  <div
                                    key={index}
                                    className="flex flex-col items-center"
                                  >
                                    <img
                                      src={getRelicImagePath(relic.relic)}
                                      alt={relic.relic}
                                      className={`w-12 h-12 object-contain ${
                                        relic.type === "lost" ? "opacity-60" : ""
                                      }`}
                                      loading="lazy"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.tried) {
                                          target.dataset.tried = "true";
                                          target.src = `/src/assets/images/relics/${normalizeRelicName(
                                            relic.relic
                                          )}.png`;
                                        } else if (target.dataset.tried === "true") {
                                          target.dataset.tried = "done";
                                          target.src =
                                            "/src/assets/images/relics/default.png";
                                        }
                                      }}
                                    />
                                    <span
                                      className={`text-xs text-center ${
                                        relic.type === "lost" ? "text-red-500" : ""
                                      }`}
                                    >
                                      {relic.type === "lost"
                                        ? `${formatRelicDisplayName(
                                            relic.relic
                                          )} (lost)`
                                        : formatRelicDisplayName(relic.relic)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3">
                              <div className="card-body p-2">
                                {floor.event && (
                                  <div className="flex flex-col items-center gap-2 justify-center">
                                    <img
                                      src={`/src/assets/images/events/${normalizeEventName(
                                        floor.event.name
                                      )}.jpg`}
                                      alt={floor.event.name}
                                      className="w-12 h-12 object-contain"
                                      loading="lazy"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.tried) {
                                          target.dataset.tried = "true";
                                          target.src = `/src/assets/images/events/${normalizeEventName(
                                            floor.event?.name || ""
                                          )}.png`;
                                        } else if (target.dataset.tried === "true") {
                                          target.dataset.tried = "done";
                                          target.src =
                                            "/src/assets/images/events/default.jpg";
                                        }
                                      }}
                                    />
                                    <span className="text-sm text-center">
                                      {formatEventDisplayName(floor.event.name)}
                                    </span>
                                  </div>
                                )}
                                {floor.restChoice && (
                                  <div className="flex flex-col items-center gap-2 justify-center">
                                    <img
                                      src={`/src/assets/ui/campfire/${floor.restChoice.key.toLowerCase()}.png`}
                                      alt={floor.restChoice.key}
                                      className="w-12 h-12 object-contain"
                                      loading="lazy"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.tried) {
                                          target.dataset.tried = "true";
                                          target.src =
                                            "/src/assets/ui/campfire/outline.png";
                                        }
                                      }}
                                    />
                                    <span className="text-sm">
                                      {floor.restChoice.key === "REST"
                                        ? "Rest"
                                        : floor.restChoice.key === "DIG"
                                        ? "Dig"
                                        : floor.restChoice.key === "LIFT"
                                        ? "Lift"
                                        : floor.restChoice.key === "TOKE"
                                        ? "Toke"
                                        : floor.restChoice.key === "RECALL"
                                        ? "Recall"
                                        : floor.restChoice.key === "MEDITATE"
                                        ? "Meditate"
                                        : floor.restChoice.key === "TRAIN"
                                        ? "Train"
                                        : floor.restChoice.key === "SMITH"
                                        ? "Smith"
                                        : floor.restChoice.key}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-base-content/20 py-3">
                              <div className="card-body p-2">
                                {floor.event && (
                                  <div className="flex items-center gap-2 justify-center">
                                    <span className="text-sm whitespace-pre-line">
                                      {formatEventContent(floor.event)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* カード一覧 */}
        <div className="card bg-base-200 shadow-xl" ref={deckRef}>
          <div className="card-body p-4">
            <h2 className="card-title mb-4">デッキ一覧</h2>
            <div className="grid grid-cols-10 gap-1 px-4 py-6">
              {runData.master_deck?.map((cardName: string, index: number) => {
                const isUpgraded = cardName.includes("+1");
                const baseCardName = cardName.replace("+1", "");

                // キャラクターのクラスを判定（サフィックスから）
                let characterClass = "";
                if (baseCardName.endsWith("_R")) characterClass = "ironclad";
                else if (baseCardName.endsWith("_G")) characterClass = "silent";
                else if (baseCardName.endsWith("_B")) characterClass = "defect";
                else if (baseCardName.endsWith("_P"))
                  characterClass = "watcher";

                // カード情報を取得
                const cardInfo = findCardInfo(baseCardName);

                // カードのクラスを決定
                let cardClass:
                  | "ironclad"
                  | "silent"
                  | "defect"
                  | "watcher"
                  | "colorless"
                  | "curse" = "colorless";

                // スターターカードの場合はキャラクターのクラスを使用
                if (characterClass) {
                  cardClass = characterClass as
                    | "ironclad"
                    | "silent"
                    | "defect"
                    | "watcher";
                } else {
                  // 通常のカードの場合は cardInfo から判定
                  if (cardInfo.class.toLowerCase() === "curse") {
                    cardClass = "curse";
                  } else if (cardInfo.class.toLowerCase() === "colorless") {
                    cardClass = "colorless";
                  } else {
                    switch (cardInfo.class.toLowerCase()) {
                      case "ironclad":
                      case "red":
                        cardClass = "ironclad";
                        break;
                      case "silent":
                      case "green":
                        cardClass = "silent";
                        break;
                      case "defect":
                      case "blue":
                        cardClass = "defect";
                        break;
                      case "watcher":
                      case "purple":
                        cardClass = "watcher";
                        break;
                      default:
                        cardClass = "colorless";
                    }
                  }
                }

                // カードタイプを決定
                let cardType:
                  | "attack"
                  | "skill"
                  | "power"
                  | "status"
                  | "curse" = "skill";
                if (cardClass === "curse") {
                  cardType = "curse";
                } else if (cardInfo.isPlaceholder) {
                  cardType = "skill"; // プレースホルダーの場合はデフォルトでskill
                } else {
                  switch (cardInfo.type.toLowerCase()) {
                    case "attack":
                      cardType = "attack";
                      break;
                    case "skill":
                      cardType = "skill";
                      break;
                    case "power":
                      cardType = "power";
                      break;
                    case "status":
                      cardType = "status";
                      break;
                    default:
                      cardType = "skill";
                  }
                }

                // レアリティの調整（Starterカードの場合はcommonとして扱う）
                const adjustedRarity =
                  cardInfo.rarity === "starter" ? "common" : cardInfo.rarity;

                // カードのクラスに応じたグロー効果の色を設定
                const glowColor = (() => {
                  switch (cardClass) {
                    case 'ironclad': return 'rgba(227, 97, 89, 0.8)'; // 赤
                    case 'silent': return 'rgba(98, 195, 95, 0.8)'; // 緑
                    case 'defect': return 'rgba(89, 188, 227, 0.8)'; // 青
                    case 'watcher': return 'rgba(191, 98, 195, 0.8)'; // 紫
                    case 'curse': return 'rgba(148, 71, 67, 0.8)'; // 暗赤色
                    default: return 'rgba(255, 255, 255, 0.6)'; // 無色/デフォルト
                  }
                })();

                return (
                  <div
                    key={index}
                    className="transform scale-50 origin-center hover:z-10 hover:scale-60 transition-all duration-300 ease-in-out -mx-6 -my-10 group relative"
                    onMouseEnter={(e) => handleItemMouseEnter(baseCardName, cardInfo.name, 'card', e)}
                    onMouseLeave={handleItemMouseLeave}
                    onMouseMove={handleItemMouseMove}
                  >
                    <div 
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out z-0 blur-md"
                      style={{ backgroundColor: glowColor }}
                    ></div>
                    <div 
                      className="relative z-10 transition-all duration-300 ease-in-out"
                      style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0))' }}
                      data-glow-color={glowColor}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        const color = target.dataset.glowColor || 'rgba(255,255,255,0.6)';
                        target.style.filter = `drop-shadow(0 0 10px ${color})`;
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.filter = 'drop-shadow(0 0 10px rgba(0,0,0,0))';
                      }}
                    >
                      <Card
                        name={cardInfo.name}
                        class={cardClass}
                        type={cardType}
                        cost={
                          isUpgraded && cardInfo.upgradedCost !== undefined
                            ? cardInfo.upgradedCost
                            : cardInfo.cost
                        }
                        description={
                          isUpgraded
                            ? cardInfo.upgradedEffect || cardInfo.effect
                            : cardInfo.effect
                        }
                        rarity={
                          adjustedRarity as
                            | "starter"
                            | "common"
                            | "uncommon"
                            | "rare"
                            | "special"
                            | "curse"
                        }
                        upgraded={isUpgraded}
                        originalDescription={isUpgraded ? cardInfo.effect : undefined}
                        originalCost={isUpgraded ? cardInfo.cost : undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* レリック一覧 */}
        <div className="card bg-base-200 shadow-xl" ref={relicsRef}>
          <div className="card-body p-4">
            <h2 className="card-title mb-4">レリック一覧</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4 px-4 py-6">
              {runData.relics?.map((relicName: string, index: number) => {
                const relicInfo = relicsData.relics.find(
                  (r: any) => r.name === formatRelicDisplayName(relicName)
                );
                
                if (!relicInfo) return null;
                
                return (
                  <div 
                    key={index} 
                    className="flex flex-col items-center group relative"
                    onMouseEnter={(e) => handleItemMouseEnter(relicName, relicInfo.name, 'relic', e)}
                    onMouseLeave={handleItemMouseLeave}
                    onMouseMove={handleItemMouseMove}
                  >
                    {/* レアリティに応じたグロー効果の色を設定 */}
                    {(() => {
                      // レアリティに応じた色を設定
                      const glowColor = (() => {
                        switch (relicInfo.rarity.toLowerCase()) {
                          case 'common': return 'rgba(150, 150, 150, 0.8)'; // 灰色
                          case 'uncommon': return 'rgba(0, 100, 255, 0.8)'; // 青
                          case 'rare': return 'rgba(255, 215, 0, 0.8)'; // 金色
                          case 'boss': return 'rgba(255, 0, 0, 0.8)'; // 赤
                          case 'shop': return 'rgba(0, 200, 0, 0.8)'; // 緑
                          case 'starter': return 'rgba(200, 200, 200, 0.8)'; // 薄い灰色
                          case 'special': return 'rgba(255, 0, 255, 0.8)'; // 紫
                          default: return 'rgba(255, 255, 255, 0.6)'; // デフォルト
                        }
                      })();
                      
                      return (
                        <div 
                          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out z-0 blur-md"
                          style={{ backgroundColor: glowColor }}
                        ></div>
                      );
                    })()}
                    <div 
                      className="relative w-16 h-16 flex items-center justify-center transition-all duration-300 ease-in-out"
                      data-glow-color={(() => {
                        switch (relicInfo.rarity.toLowerCase()) {
                          case 'common': return 'rgba(150, 150, 150, 0.8)';
                          case 'uncommon': return 'rgba(0, 100, 255, 0.8)';
                          case 'rare': return 'rgba(255, 215, 0, 0.8)';
                          case 'boss': return 'rgba(255, 0, 0, 0.8)';
                          case 'shop': return 'rgba(0, 200, 0, 0.8)';
                          case 'starter': return 'rgba(200, 200, 200, 0.8)';
                          case 'special': return 'rgba(255, 0, 255, 0.8)';
                          default: return 'rgba(255, 255, 255, 0.6)';
                        }
                      })()}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        const color = target.dataset.glowColor || 'rgba(255,255,255,0.6)';
                        target.style.filter = `drop-shadow(0 0 10px ${color})`;
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.filter = 'drop-shadow(0 0 10px rgba(0,0,0,0))';
                      }}
                    >
                      <img
                        src={getRelicImagePath(relicName)}
                        alt={relicInfo.name}
                        className="w-12 h-12 object-contain z-10"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/src/assets/ui/relicSilhouette.png";
                        }}
                      />
                    </div>
                    <div className="text-center text-xs mt-1">{relicInfo.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* 統計情報ツールチップ */}
        <StatsTooltip
          stats={itemStats}
          title={tooltipItemName}
          visible={tooltipVisible}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
        />
      </div>
    </div>
  );
};

export default RunDetail;
