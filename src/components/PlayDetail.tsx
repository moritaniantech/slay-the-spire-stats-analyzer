import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { format } from 'date-fns';
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/20/solid';
import { getAssetUrl, normalizeRelicName } from '../utils/assetUtils';
import ImageAsset from './common/ImageAsset';
import Tab from './common/Tab';
import { useTranslation } from 'react-i18next';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import Card from './Card';
import StatsTooltip from './StatsTooltip';
import { AllCharacterStats, createEmptyAllCharacterStats } from '../models/StatsModel';
import { calculateCardStats } from '../services/StatsService';

// プレイヤーキャラクターのタイプ
type CharacterType = 'ironclad' | 'silent' | 'defect' | 'watcher' | 'all';

// マップのアイコンのタイプ
const MAP_ICONS = {
  M: 'monster',
  E: 'elite',
  '?': 'unknown',
  $: 'shop',
  T: 'chest',
  R: 'rest',
  BOSS: 'boss',
};

// 特殊アイコンの定義
const SPECIAL_MAP_ICONS = {
  unknownMonster: 'unknownMonster',
  unknownShop: 'unknownShop',
  unknownChest: 'unknownChest',
  bosschest: 'bosschest',
};

// 階層情報の型
interface FloorInfo {
  floor: number;
  icon: string;
  currentHp?: number;
  maxHp?: number;
  hpDiff?: number;
  gold?: number;
  enemies?: string;
  potions?: string[];
  cards?: { card: string; action: 'added' | 'removed' | 'transformed' | 'upgraded' | 'not_picked' }[];
  content?: string[];
  content_short?: string; // 簡易表示用のコンテンツ
  relics?: Array<{ key: string; picked: boolean } | string>;
}

const PlayDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { runs, settings } = useStore();
  const navigate = useNavigate();
  const [run, setRun] = useState<any | null>(null);
  const [floorInfos, setFloorInfos] = useState<FloorInfo[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // StatsTooltip用のstate
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [tooltipCardId, setTooltipCardId] = useState<string | null>(null);
  const [tooltipCardName, setTooltipCardName] = useState('');

  // JSONデータを保持するstate
  const [cardsTranslationData, setCardsTranslationData] = useState<any | null>(null);
  const [monstersTranslationData, setMonstersTranslationData] = useState<any | null>(null);
  const [potionsTranslationData, setPotionsTranslationData] = useState<any | null>(null);
  const [relicsTranslationData, setRelicsTranslationData] = useState<any | null>(null);
  const [eventsTranslationData, setEventsTranslationData] = useState<any | null>(null);
  const [neowBonusTranslationData, setNeowBonusTranslationData] = useState<any | null>(null);
  const [allCardsJson, setAllCardsJson] = useState<any | null>(null); // allCards.json のデータ
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // カードの統計情報を計算（メモ化）
  const cardStats = useMemo(() => {
    if (!tooltipCardId || !settings.enableStatsTooltip) {
      return createEmptyAllCharacterStats();
    }
    return calculateCardStats(runs, tooltipCardId);
  }, [tooltipCardId, runs, settings.enableStatsTooltip]);

  // カードにマウスオーバーした際の処理
  const handleCardMouseEnter = (cardId: string, cardName: string, event: React.MouseEvent) => {
    if (!settings.enableStatsTooltip) return;
    
    setTooltipCardId(cardId);
    setTooltipCardName(cardName);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    setTooltipVisible(true);
  };

  // カードからマウスが離れた際の処理
  const handleCardMouseLeave = () => {
    setTooltipVisible(false);
  };

  // マウス移動時の処理
  const handleCardMouseMove = (event: React.MouseEvent) => {
    if (tooltipVisible) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  // JSONデータの読み込みuseEffect
  useEffect(() => {
    const fetchJsonData = async () => {
      try {
        // 本番環境ではIPC経由でファイルを読み込む
        if (import.meta.env.PROD && window.electronAPI) {
          // getAssetPathにはassets/プレフィックスなしで渡す（getAssetPathが内部でassets/を追加するため）
          const jsonPaths = [
            'localization/cards.json',
            'localization/monsters.json',
            'localization/potions.json',
            'localization/relics.json',
            'localization/events.json',
            'localization/neowBonus.json',
            'cards/allCards.json'
          ];
          
          const filePaths = await Promise.all(
            jsonPaths.map(path => window.electronAPI!.getAssetPath(path))
          );
          
          console.log('[PlayDetail] Resolved file paths:', filePaths);
          
          const fileContents = await Promise.all(
            filePaths.map(path => window.electronAPI!.readFile(path, 'utf8'))
          );
          
          setCardsTranslationData(JSON.parse(fileContents[0]));
          setMonstersTranslationData(JSON.parse(fileContents[1]));
          setPotionsTranslationData(JSON.parse(fileContents[2]));
          setRelicsTranslationData(JSON.parse(fileContents[3]));
          setEventsTranslationData(JSON.parse(fileContents[4]));
          setNeowBonusTranslationData(JSON.parse(fileContents[5]));
          setAllCardsJson(JSON.parse(fileContents[6]));
          
          console.log('[PlayDetail] All JSON data loaded successfully via IPC.');
        } else {
          // 開発環境では通常のfetchを使用
          const [cardsRes, monstersRes, potionsRes, relicsRes, eventsRes, neowRes, allCardsRes] = await Promise.all([
            fetch('/assets/localization/cards.json'),
            fetch('/assets/localization/monsters.json'),
            fetch('/assets/localization/potions.json'),
            fetch('/assets/localization/relics.json'),
            fetch('/assets/localization/events.json'),
            fetch('/assets/localization/neowBonus.json'),
            fetch('/assets/cards/allCards.json')
          ]);

          if (!cardsRes.ok) throw new Error(`Failed to fetch cards.json: ${cardsRes.status}`);
          if (!monstersRes.ok) throw new Error(`Failed to fetch monsters.json: ${monstersRes.status}`);
          if (!potionsRes.ok) throw new Error(`Failed to fetch potions.json: ${potionsRes.status}`);
          if (!relicsRes.ok) throw new Error(`Failed to fetch relics.json: ${relicsRes.status}`);
          if (!eventsRes.ok) throw new Error(`Failed to fetch events.json: ${eventsRes.status}`);
          if (!neowRes.ok) throw new Error(`Failed to fetch neowBonus.json: ${neowRes.status}`);
          if (!allCardsRes.ok) throw new Error(`Failed to fetch allCards.json: ${allCardsRes.status}`);

          setCardsTranslationData(await cardsRes.json());
          setMonstersTranslationData(await monstersRes.json());
          setPotionsTranslationData(await potionsRes.json());
          setRelicsTranslationData(await relicsRes.json());
          setEventsTranslationData(await eventsRes.json());
          setNeowBonusTranslationData(await neowRes.json());
          setAllCardsJson(await allCardsRes.json());
          
          console.log('[PlayDetail] All JSON data loaded successfully.');
        }
      } catch (error) {
        console.error("[PlayDetail] Failed to fetch JSON data:", error);
        setLoadingError('詳細データの読み込みに失敗しました。');
      }
    };
    fetchJsonData();
  }, []);

  // カード名の正規化用マップをメモ化
  const cardNameMap = useMemo(() => {
    const nameMap = new Map<string, string>();
    if (!allCardsJson) return nameMap; // データロード待ち
    
    if (allCardsJson.alias) {
      Object.entries(allCardsJson.alias).forEach(([alias, originalName]) => {
        const lowerAlias = alias.toLowerCase();
        nameMap.set(lowerAlias, originalName as string);
      });
    }
    if (allCardsJson.cards) {
      allCardsJson.cards.forEach((card: any) => {
        if (card.name) {
          const originalName = card.name;
          const noSpaceName = originalName.replace(/\s+/g, '').toLowerCase();
          nameMap.set(noSpaceName, originalName);
          const lowerCaseName = originalName.toLowerCase();
          nameMap.set(lowerCaseName, originalName);
          if (card.alias) {
            const aliases = Array.isArray(card.alias) ? card.alias : [card.alias];
            aliases.forEach((alias: string) => {
              const lowerAlias = alias.toLowerCase();
              nameMap.set(lowerAlias, originalName);
            });
          }
        }
      });
    }
    return nameMap;
  }, [allCardsJson]); // allCardsJson がロードされたら再計算

  // runデータとJSONデータの両方がロードされてからメインの処理を実行
  useEffect(() => {
    let isMounted = true;
    if (!id) {
      if (isMounted) navigate('/404');
      return;
    }
    if (
      !runs ||
      runs.length === 0 ||
      !allCardsJson ||
      !cardsTranslationData ||
      !monstersTranslationData ||
      !potionsTranslationData ||
      !relicsTranslationData ||
      !eventsTranslationData ||
      !neowBonusTranslationData
    ) {
      console.log('[PlayDetail] Waiting for run data and JSON data to load...');
      return; // 必要なデータが揃うまで待機
    }

    const foundRun = runs.find((r) => r.id === id);
    if (foundRun) {
      if (isMounted) {
        setRun(foundRun);
        processRunData(foundRun); // processRunData は allCardsJson や翻訳データを使う可能性があるので、ロード後に呼ぶ
        setDataLoaded(true); // 全てのデータがロード完了
      }
    } else {
      if (isMounted) navigate('/404');
    }
    return () => { isMounted = false; };
  }, [
    id,
    runs,
    navigate,
    allCardsJson,
    cardsTranslationData,
    monstersTranslationData,
    potionsTranslationData,
    relicsTranslationData,
    eventsTranslationData,
    neowBonusTranslationData,
  ]);

  // カード名を正規化する関数
  const normalizeCardName = (rawCardName: string): string => {
    // アップグレード表記を保持するために分離
    const isUpgraded = rawCardName.includes('+');
    let baseName = isUpgraded ? rawCardName.replace('+', '') : rawCardName;
    
    // 大文字小文字を区別せず検索
    const lowerName = baseName.toLowerCase();
    
    // スペースなしバージョンも検索
    const noSpaceName = lowerName.replace(/\s+/g, '');
    
    // カード名のマッピングから検索
    let normalizedName = baseName;
    
    if (cardNameMap.has(lowerName)) {
      normalizedName = cardNameMap.get(lowerName) || baseName;
    } else if (cardNameMap.has(noSpaceName)) {
      normalizedName = cardNameMap.get(noSpaceName) || baseName;
    }
    
    // アップグレードの表記を復元
    return isUpgraded ? `${normalizedName}+` : normalizedName;
  };

  // ランデータを処理して階層情報を生成
  const processRunData = (runData: any) => {
    if (!runData.run_data) return;
    
    const data = runData.run_data;
    const infos: FloorInfo[] = [];
    
    // 経路データ
    const pathTaken = data.path_taken || [];
    const pathPerFloor = data.path_per_floor || [];
    
    // 体力データ
    const currentHpPerFloor = data.current_hp_per_floor || [];
    const maxHpPerFloor = data.max_hp_per_floor || [];
    
    // ゴールドデータ
    const goldPerFloor = data.gold_per_floor || [];
    
    // ダメージ履歴
    const damageTaken = data.damage_taken || [];
    
    // ポーション履歴
    const potionsObtained = data.potions_obtained || [];
    
    // カード選択履歴
    const cardChoices = data.card_choices || [];
    
    // レリック取得履歴
    const relicsObtained = data.relics_obtained || [];
    
    // ボスレリック選択履歴
    const bossRelics = data.boss_relics || [];
    
    // イベント選択履歴
    const eventChoices = data.event_choices || [];
    
    // キャンプファイヤー選択履歴
    const campfireChoices = data.campfire_choices || [];
    
    // floor_reachedを取得して確実に全階層を表示する
    const floorReached = runData.floor_reached || pathPerFloor.length;
    
    // pathPerFloorのインデックスとpathTakenのインデックスのずれを計算するための変数
    let pathTakenOffset = 0;
    
    // 各階層ごとの情報を生成
    for (let i = 0; i < floorReached; i++) {
      // 現在の階層（1始まり）
      const currentFloor = i + 1;
      
      // 特殊階層の判定
      const isBossChest17 = currentFloor === 17;
      const isBossChest34 = currentFloor === 34;
      const isSpecialFloor52 = currentFloor === 52;
      const isSpecialFloor57 = currentFloor === 57;
      
      // 基本情報
      const info: FloorInfo = {
        floor: currentFloor,
        icon: 'unknown', // デフォルト値
      };
      
      // アイコンの設定
      if (isBossChest17 || isBossChest34) {
        // ボスチェスト
        info.icon = 'bosschest';
        
        // ボスレリック
        if (isBossChest17 && bossRelics.length > 0) {
          // 選択したレリック
          info.relics = [{ key: bossRelics[0].picked, picked: true }];
          
          // 選択しなかったレリック
          if (bossRelics[0].not_picked && bossRelics[0].not_picked.length > 0) {
            info.relics = [...info.relics, ...bossRelics[0].not_picked.map((relic: string) => ({ key: relic, picked: false }))];
          }
        } else if (isBossChest34 && bossRelics.length > 1) {
          // 選択したレリック
          info.relics = [{ key: bossRelics[1].picked, picked: true }];
          
          // 選択しなかったレリック
          if (bossRelics[1].not_picked && bossRelics[1].not_picked.length > 0) {
            info.relics = [...info.relics, ...bossRelics[1].not_picked.map((relic: string) => ({ key: relic, picked: false }))];
          }
        }
        
        // path_taken がずれる（17階と34階はpath_takenには含まれていない）ため、オフセットを増やす
        pathTakenOffset++;
      } else if (isSpecialFloor52 || isSpecialFloor57) {
        // 52階層と57階層は特別扱い
        info.icon = 'unknown';
        
        // 52階層はpath_takenに含まれないのでオフセットを増やす
        if (isSpecialFloor52) {
          pathTakenOffset++;
        }
      } else {
        // 通常の階層
        const pathTakenIndex = i - pathTakenOffset;
        if (pathTakenIndex >= 0 && pathTakenIndex < pathTaken.length) {
          const pathType = pathTaken[pathTakenIndex];
          const pathPerFloorType = pathPerFloor[i] || '';
          info.icon = getMapIcon(pathType, pathPerFloorType);
        }
      }
      
      // 体力情報
      if (i < currentHpPerFloor.length && i < maxHpPerFloor.length) {
        info.currentHp = currentHpPerFloor[i];
        info.maxHp = maxHpPerFloor[i];
        
        // 前の階層との体力差
        if (i > 0) {
          const hpDiff = currentHpPerFloor[i] - currentHpPerFloor[i - 1];
          info.hpDiff = hpDiff;
        }
      }
      
      // ゴールド情報
      if (i < goldPerFloor.length) {
        info.gold = goldPerFloor[i];
      }
      
      // 敵情報（ゲームデータのfloorは1始まりなのでインデックスiと比較）
      const enemy = damageTaken.find((d: any) => d.floor === currentFloor);
      if (enemy) {
        info.enemies = enemy.enemies;
      }
      
      // ポーション情報（ゲームデータのfloorは0始まりなのでインデックスiと比較）
      const potions = potionsObtained.filter((p: any) => p.floor === currentFloor);
      if (potions.length > 0) {
        info.potions = potions.map((p: any) => p.key);
      }
      
      // カード情報（ゲームデータのfloorは0始まりなのでインデックスiと比較）
      const cards = cardChoices.filter((c: any) => c.floor === currentFloor);
      if (cards.length > 0) {
        const cardInfos: { card: string; action: 'added' | 'removed' | 'transformed' | 'upgraded' | 'not_picked' }[] = [];
        
        cards.forEach((choice: any) => {
          // 選択したカード
          if (choice.picked !== 'SKIP') {
            // +1をプラスに変換して正規化
            const cardNameRaw = choice.picked.replace('+1', '+');
            const normalizedCardName = normalizeCardName(cardNameRaw);
            cardInfos.push({
              card: normalizedCardName,
              action: 'added'
            });
          }
          
          // 選択しなかったカード
          if (choice.not_picked) {
            choice.not_picked.forEach((card: string) => {
              // +1をプラスに変換して正規化
              const cardNameRaw = card.replace('+1', '+');
              const normalizedCardName = normalizeCardName(cardNameRaw);
              cardInfos.push({
                card: normalizedCardName,
                action: 'not_picked'
              });
            });
          }
        });
        
        info.cards = cardInfos;
      }
      
      // レリック情報（ゲームデータのfloorは0始まりなのでインデックスiと比較）
      const relics = relicsObtained.filter((r: any) => r.floor === currentFloor);
      if (relics.length > 0) {
        info.relics = relics.map((r: any) => ({ key: r.key, picked: true }));
      }
      
      // イベント情報（ゲームデータのfloorは0始まりなのでインデックスiと比較）
      const events = eventChoices.filter((e: any) => e.floor === currentFloor);
      if (events.length > 0) {
        info.content = events.map((e: any) => `${e.event_name}: ${e.player_choice}`);
      }
      
      // 休憩マスの情報を処理
      const campfires = campfireChoices.filter((c: any) => c.floor === currentFloor);
      if (campfires.length > 0) {
        const campfireContent = campfires.map((campfire: any) => `${campfire.key}`);
        info.content = info.content ? [...info.content, ...campfireContent] : campfireContent;
      }
      
      // Act 4のボスチェスト（51階）
      if (currentFloor === 51 && bossRelics.length > 2) {
        info.icon = 'bosschest';
        
        // 選択したレリック
        info.relics = [{ key: bossRelics[2].picked, picked: true }];
        
        // 選択しなかったレリック
        if (bossRelics[2].not_picked && bossRelics[2].not_picked.length > 0) {
          info.relics = [...info.relics, ...bossRelics[2].not_picked.map((relic: string) => ({ key: relic, picked: false }))];
        }
      }
      
      // 階層情報を追加
      infos.push(info);
    }
    
    setFloorInfos(infos);
  };

  // マップアイコンを取得する関数
  const getMapIcon = (pathType: string, pathPerFloor: string): string => {
    // イベントマスから派生する特殊マス
    if (pathType === '?') {
      if (pathPerFloor === 'M') return SPECIAL_MAP_ICONS.unknownMonster;
      if (pathPerFloor === '$') return SPECIAL_MAP_ICONS.unknownShop;
      if (pathPerFloor === 'T') return SPECIAL_MAP_ICONS.unknownChest;
    }
    return MAP_ICONS[pathType as keyof typeof MAP_ICONS] || 'unknown';
  };

  // プレイ時間のフォーマット
  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // キャラクターのフルネームを取得
  const getCharacterFullName = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return 'The Ironclad';
      case 'silent': return 'The Silent';
      case 'defect': return 'The Defect';
      case 'watcher': return 'The Watcher';
      default: return character;
    }
  };

  // キャラクターの色を取得
  const getCharacterColor = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return 'text-[#ff6563]';
      case 'silent': return 'text-[#7fff00]';
      case 'defect': return 'text-[#87ceeb]';
      case 'watcher': return 'text-[#a600ff]';
      default: return 'text-base-content';
    }
  };

  // キャラクターの背景色を取得
  const getCharacterBgColor = (character: string) => {
    switch (character.toLowerCase()) {
      case 'ironclad': return 'bg-[#ff6563]/10';
      case 'silent': return 'bg-[#7fff00]/10';
      case 'defect': return 'bg-[#87ceeb]/10';
      case 'watcher': return 'bg-[#a600ff]/10';
      default: return 'bg-base-200';
    }
  };

  // 結果の色を取得
  const getResultColor = (victory: boolean) => {
    return victory ? 'text-success' : 'text-error';
  };

  // 体力変化のアイコンと色を取得
  const getHpChangeStyle = (hpDiff?: number) => {
    if (!hpDiff) return { icon: <ArrowRightIcon className="w-4 h-4 text-yellow-500" />, color: 'text-yellow-500' };
    if (hpDiff > 0) return { icon: <ArrowUpIcon className="w-4 h-4 text-green-500" />, color: 'text-green-500' };
    if (hpDiff < 0) return { icon: <ArrowDownIcon className="w-4 h-4 text-red-500" />, color: 'text-red-500' };
    return { icon: <ArrowRightIcon className="w-4 h-4 text-yellow-500" />, color: 'text-yellow-500' };
  };

  // 名前を日本語に変換する関数
  const translateName = (name: string, type: 'card' | 'monster' | 'potion' | 'relic' | 'event' | 'neow'): string => {
    if (!name) return '';
    const lowerName = name.toLowerCase();
    let translationSet: any = null;
    switch (type) {
      case 'card':    translationSet = cardsTranslationData; break;
      case 'monster': translationSet = monstersTranslationData; break;
      case 'potion':  translationSet = potionsTranslationData; break;
      case 'relic':   translationSet = relicsTranslationData; break;
      case 'event':   translationSet = eventsTranslationData; break;
      case 'neow':    translationSet = neowBonusTranslationData; break;
    }
    if (translationSet && translationSet[lowerName] && translationSet[lowerName].NAME) {
      return translationSet[lowerName].NAME;
    }
    if (translationSet && translationSet[name] && translationSet[name].NAME) { // 元のキーも試す
        return translationSet[name].NAME;
    }
    // 特定のキーが存在しない場合のフォールバック (例: "Golden Idol" -> "golden idol")
    if (type === 'relic' && relicsTranslationData && relicsTranslationData[name.replace(/\s/g, '').toLowerCase()]) {
        return relicsTranslationData[name.replace(/\s/g, '').toLowerCase()].NAME;
    }
    return name; // 見つからなければ元の名前を返す
  };

  // カード名を日本語に変換（アップグレード対応）
  const translateCardName = (cardName: string): { name: string, upgraded: boolean } => {
    if (!cardName) return { name: '', upgraded: false };
    
    // アップグレードの判定
    const upgraded = cardName.endsWith('+');
    const baseName = upgraded ? cardName.slice(0, -1) : cardName;
    
    // 日本語名を取得
    const translatedName = translateName(baseName, 'card');
    
    return { name: translatedName, upgraded };
  };

  // 必要な定数と関数を定義
  const isCompactView = false; // コンパクトビューのフラグ（必要に応じて状態変数に変更可能）

  // マップアイコンをレンダリングする関数
  const renderMapIcon = (iconType: string) => {
    return (
      <div className="flex items-center justify-center">
        <img 
          src={getAssetUrl(`images/mapIcons/${iconType}.png`) || ''} 
          alt={iconType} 
          className="w-8 h-8"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getAssetUrl('images/mapIcons/unknown.png');
          }}
        />
      </div>
    );
  };

  // カードをレンダリングする関数
  const renderCards = (cards?: { card: string; action: 'added' | 'removed' | 'transformed' | 'upgraded' | 'not_picked' }[]) => {
    if (!cards || cards.length === 0) return "-";
    
    return (
      <div className="flex flex-col gap-1">
        {cards.map((card, idx) => {
          // アップグレードの判定（+を含む場合）
          const isUpgraded = card.card.includes('+');
          // 英語名を取得
          let cardBaseName = card.card;
          if (isUpgraded) {
            cardBaseName = card.card.replace('+', '');
          }
          
          return (
            <div key={idx} className="flex items-center gap-1">
              {/* 選択したカードか選択しなかったカードかを表示 */}
              {card.action === 'added' ? (
                <span className="text-success text-xs mr-1">✓</span>
              ) : card.action === 'not_picked' ? (
                <span className="text-error text-xs mr-1">✗</span>
              ) : null}
              
              {/* カード名（アップグレードされたカードは緑色で表示） */}
              {isUpgraded ? (
                <span style={{ color: '#76F900' }}>{cardBaseName}+</span>
              ) : (
                <span>{cardBaseName}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ポーションをレンダリングする関数
  const renderPotions = (potions?: string[]) => {
    if (!potions || potions.length === 0) return "-";
    
    return (
      <div className="flex flex-wrap gap-1">
        {potions.map((potion, idx) => {
          // ポーション名からPotion単語を省略
          const potionKey = potion;
          const potionDisplayName = potionKey.replace(/\s*[Pp]otion$/, '');
          
          // 日本語名を取得
          const potionJapaneseName = translateName(potionKey, 'potion');
          
          return (
            <div key={idx} className="tooltip" data-tip={potionDisplayName}>
              <img
                src={getAssetUrl(`images/potion/${potionKey.toLowerCase()}.png`) || ''}
                alt={potionJapaneseName}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.dataset.retried) {
                    target.dataset.retried = "true";
                    target.src = getAssetUrl('ui/intent/unknown.png');
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // レリックをレンダリングする関数
  const renderRelics = (relics?: Array<{ key: string; picked: boolean } | string>) => {
    if (!relics || relics.length === 0) return "-";
    
    // relics.jsonからエイリアスマッピングを取得
    const relicAlias = (relicsTranslationData as any).alias || {};
    
    return (
      <div className="flex flex-wrap gap-1">
        {relics.map((relic, idx) => {
          // レリックの情報を取得
          const relicKey = typeof relic === 'string' ? relic : relic.key;
          const isPicked = typeof relic === 'object' ? relic.picked : true;
          
          // レリック名の翻訳（ツールチップ用には英語名を使用）
          const relicJapaneseName = translateName(relicKey, 'relic');
          
          // レリック画像のパスを正規化
          const normalizedRelicKey = normalizeRelicName(relicKey);
          
          return (
            <div key={idx} className="tooltip" data-tip={relicKey}>
              <div className="relative">
                <img
                  src={getAssetUrl(`images/relics/${normalizedRelicKey}.png`) || ''}
                  alt={relicJapaneseName}
                  className={`w-10 h-10 object-contain ${!isPicked ? 'opacity-50' : ''}`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.retried) {
                      target.dataset.retried = "true";
                      target.src = getAssetUrl('ui/intent/unknown.png');
                    }
                  }}
                />
                {!isPicked && (
                  <span className="absolute -top-1 -right-1 text-error text-xs">✗</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // イベント内容をレンダリングする関数を追加
  const renderContent = (content?: string[]) => {
    if (!content || content.length === 0) return "-";

    return (
      <div className="flex flex-col gap-2">
        {content.map((item, idx) => {
          // イベント情報
          if (item.includes(':')) {
            const [eventName, playerChoice] = item.split(':', 2);
            return (
              <div key={idx} className="flex flex-col gap-1">
                <div className="tooltip" data-tip={eventName}>
                  <div className="flex items-center gap-2">
                    <img
                      src={getAssetUrl(`images/events/${eventName.toLowerCase().replace(/\s+/g, '')}.jpg`) || ''}
                      alt={translateName(eventName, 'event')}
                      className="w-10 h-10 object-contain rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.retried) {
                          target.dataset.retried = "true";
                          target.src = getAssetUrl('ui/intent/unknown.png');
                        }
                      }}
                    />
                    <span className="text-sm">{eventName}: {playerChoice.trim()}</span>
                  </div>
                </div>
              </div>
            );
          }
          // 休憩マスの情報
          else if (['REST', 'SMITH', 'LIFT', 'DIG', 'RECALL', 'PURGE'].includes(item)) {
            return (
              <div key={idx} className="tooltip" data-tip={item}>
                <div className="flex items-center gap-2">
                  <img
                    src={getAssetUrl(`ui/campfire/${item.toLowerCase()}.png`) || ''}
                    alt={item}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.retried) {
                        target.dataset.retried = "true";
                        target.src = getAssetUrl('ui/intent/unknown.png');
                      }
                    }}
                  />
                  <span>{item}</span>
                </div>
              </div>
            );
          }
          // その他の内容
          else {
            return (
              <div key={idx} className="text-sm">{item}</div>
            );
          }
        })}
      </div>
    );
  };

  // テーブルにレリック列を追加
  const renderFloorRows = () => {
    return floorInfos.map((floorInfo, index) => {
      const mapIcon = renderMapIcon(floorInfo.icon);
      const cardsDisplay = renderCards(floorInfo.cards);
      const potionsDisplay = renderPotions(floorInfo.potions);
      const relicsDisplay = renderRelics(floorInfo.relics);
      const contentDisplay = renderContent(floorInfo.content);

      return (
        <tr key={index} className={index % 2 === 0 ? "bg-base-200" : ""}>
          <td className="px-2">{floorInfo.floor}</td>
          <td className="px-2">{mapIcon}</td>
          <td className="px-2">
            {floorInfo.currentHp !== undefined && floorInfo.maxHp !== undefined
              ? `${floorInfo.currentHp}/${floorInfo.maxHp}`
              : "-"}
          </td>
          <td className="px-2">{floorInfo.gold !== undefined ? floorInfo.gold : "-"}</td>
          <td className="px-2">{floorInfo.enemies ?? "-"}</td>
          <td className="px-2">{cardsDisplay}</td>
          <td className="px-2">{potionsDisplay}</td>
          <td className="px-2">{relicsDisplay}</td>
          <td className="px-2 whitespace-normal">
            {isCompactView 
              ? floorInfo.content_short ?? "-" 
              : contentDisplay}
          </td>
        </tr>
      );
    });
  };

  // ネオーの祝福を日本語表示する関数
  const getLocalizedNeowBonus = (neowBonusKey: string): string => {
    if (!neowBonusTranslationData || !neowBonusTranslationData[neowBonusKey]) {
      return neowBonusKey; // データがないか、キーがなければ元のキーを返す
    }
    return neowBonusTranslationData[neowBonusKey].NAME || neowBonusKey;
  };

  if (loadingError) {
    return <div className="p-4 text-center text-error">{loadingError}</div>;
        }

  if (!dataLoaded || !run) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 text-lg">{t('loading_run_detail', 'プレイ詳細を読み込んでいます...')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1920px]">
      {/* ヘッダーセクション */}
      <div className={`card-navy mb-8`}>
        <div className="card-body p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* キャラクターアイコン */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-base-100/50 flex items-center justify-center">
              <ImageAsset
                path={`images/characters/${run.character.toLowerCase()}.png`}
                alt={run.character}
                className="w-20 h-20 object-contain"
                fallbackPath="ui/char/unknown.png"
              />
            </div>
            
            {/* 実行情報 */}
            <div className="flex-1">
              <h1 className={`text-3xl font-bold ${getCharacterColor(run.character)}`}>
                {getCharacterFullName(run.character)}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="stat bg-navy-light rounded-box p-3 text-primary-custom">
                  <div className="stat-title">日時</div>
                  <div className="stat-value text-xl">
                    {format(new Date(run.timestamp), 'yyyy-MM-dd HH:mm')}
                  </div>
                </div>
                <div className="stat bg-navy-light rounded-box p-3 text-primary-custom">
                  <div className="stat-title">アセンション</div>
                  <div className="stat-value text-xl flex items-center gap-2">
                    <ImageAsset
                      path="ui/topPanel/ascension.png"
                      alt="Ascension"
                      className="w-6 h-6"
                    />
                    {run.ascension_level}
                  </div>
                </div>
                <div className="stat bg-navy-light rounded-box p-3 text-primary-custom">
                  <div className="stat-title">結果</div>
                  <div className={`stat-value text-xl ${getResultColor(run.victory)}`}>
                    {run.victory ? '勝利' : '敗北'}
                  </div>
                </div>
                <div className="stat bg-navy-light rounded-box p-3 text-primary-custom">
                  <div className="stat-title">到達階層</div>
                  <div className="stat-value text-xl flex items-center gap-2">
                    <ImageAsset
                      path="ui/topPanel/floor.png"
                      alt="Floor"
                      className="w-6 h-6"
                    />
                    {run.floor_reached}
                  </div>
                </div>
                <div className="stat bg-navy-light rounded-box p-3 text-primary-custom">
                  <div className="stat-title">プレイ時間</div>
                  <div className="stat-value text-xl flex items-center gap-2">
                    <ImageAsset
                      path="ui/timerIcon.png"
                      alt="Time"
                      className="w-5 h-5"
                    />
                    {formatPlaytime(run.playtime)}
                  </div>
                </div>
                {run.run_data?.neow_bonus && (
                  <div className="stat bg-base-200/50 rounded-box p-3 md:col-span-2">
                    <div className="stat-title">ネオーの祝福</div>
                    <div className="stat-value text-xl">
                      {getLocalizedNeowBonus(run.run_data.neow_bonus)}
                      {run.run_data.neow_cost && run.run_data.neow_cost !== 'NONE' && (
                        <span className="text-error text-sm ml-2">
                          コスト: {getLocalizedNeowBonus(run.run_data.neow_cost)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* プレイ詳細 */}
      <div className="card bg-base-100 shadow mb-8">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">プレイ履歴詳細</h2>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
              <thead>
                <tr>
                  <th className="w-12 px-2">階層</th>
                  <th className="w-12 px-2">マップ</th>
                  <th className="w-16 px-2 text-center">{isCompactView ? "HP" : "体力"}</th>
                  <th className="w-16 px-2 text-center">所持金</th>
                  <th className="w-36 px-2">敵</th>
                  <th className="w-48 px-2">カード</th>
                  <th className="w-24 px-2">ポーション</th>
                  <th className="w-28 px-2">レリック</th>
                  <th className="px-2">{isCompactView ? "内容" : "内容/選択肢詳細"}</th>
                </tr>
              </thead>
              <tbody>
                {renderFloorRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* デッキ情報 */}
      {run.run_data?.master_deck && (
        <div className="card bg-base-100 shadow mb-8">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">デッキ ({run.run_data.master_deck.length} 枚)</h2>
            <div className="grid grid-cols-12 gap-x-[-80px] gap-y-4">
              {run.run_data.master_deck.map((card: string, index: number) => {
                // カード情報のパース
                // +1をプラスに変換
                const rawCard = card.replace('+1', '+');
                
                // カード名の正規化
                const normalizedCard = normalizeCardName(rawCard);
                const isUpgraded = normalizedCard.includes('+');
                const baseName = isUpgraded ? normalizedCard.slice(0, -1) : normalizedCard;
                
                // カード情報の取得
                const cardInfo = allCardsJson.cards.find((c: any) => 
                  c.name.toLowerCase() === baseName.toLowerCase() ||
                  (c.alias && (
                    (Array.isArray(c.alias) && c.alias.some((a: string) => a.toLowerCase() === baseName.toLowerCase())) ||
                    (!Array.isArray(c.alias) && c.alias.toLowerCase() === baseName.toLowerCase())
                  ))
                );

                if (!cardInfo) return null;

                // カードクラスの型を修正
                const cardClass = (() => {
                  switch (cardInfo.class.toLowerCase()) {
                    case 'ironclad':
                    case 'red':
                      return 'ironclad';
                    case 'silent':
                    case 'green':
                      return 'silent';
                    case 'defect':
                    case 'blue':
                      return 'defect';
                    case 'watcher':
                    case 'purple':
                      return 'watcher';
                    case 'colorless':
                      return 'colorless';
                    case 'curse':
                      return 'curse';
                    default:
                      return 'colorless';
                  }
                })() as 'ironclad' | 'silent' | 'defect' | 'watcher' | 'colorless' | 'curse';

                // カードタイプの型を修正
                const cardType = (() => {
                  if (cardClass === 'curse') return 'curse';
                  switch (cardInfo.type.toLowerCase()) {
                    case 'attack':
                      return 'attack';
                    case 'skill':
                      return 'skill';
                    case 'power':
                      return 'power';
                    case 'status':
                      return 'status';
                    default:
                      return 'skill';
                  }
                })() as 'attack' | 'skill' | 'power' | 'status' | 'curse';

                // レアリティの型を修正
                const cardRarity = (() => {
                  switch (cardInfo.rarity.toLowerCase()) {
                    case 'starter':
                      return 'starter';
                    case 'common':
                      return 'common';
                    case 'uncommon':
                      return 'uncommon';
                    case 'rare':
                      return 'rare';
                    case 'special':
                      return 'special';
                    case 'curse':
                      return 'curse';
                    default:
                      return 'common';
                  }
                })() as 'starter' | 'common' | 'uncommon' | 'rare' | 'special' | 'curse';

                // アップグレード後のコストを設定
                const currentCost = isUpgraded && cardInfo.upgradedCost !== undefined ? cardInfo.upgradedCost : cardInfo.cost;

                return (
                  <div 
                    key={`${index}-${card}`} 
                    className="transform hover:scale-150 hover:z-50 transition-all duration-200 ease-in-out"
                    style={{ 
                      transformOrigin: 'center center',
                      zIndex: index
                    }}
                    onMouseEnter={(e) => handleCardMouseEnter(cardInfo.name, translateName(cardInfo.name, 'card'), e)}
                    onMouseLeave={handleCardMouseLeave}
                    onMouseMove={handleCardMouseMove}
                  >
                    <Card
                      name={cardInfo.name}
                      class={cardClass}
                      type={cardType}
                      cost={currentCost}
                      description={isUpgraded && cardInfo.upgradedEffect ? cardInfo.upgradedEffect : cardInfo.effect}
                      rarity={cardRarity}
                      upgraded={isUpgraded}
                      originalDescription={cardInfo.effect}
                      originalCost={cardInfo.cost}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 統計情報ツールチップ */}
      <StatsTooltip
        stats={cardStats}
        title={tooltipCardName}
        visible={tooltipVisible}
        x={tooltipPosition.x}
        y={tooltipPosition.y}
      />

      {/* レリック情報 */}
      {run.run_data?.relics && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">レリック ({run.run_data.relics.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {run.run_data.relics.map((relic: string, index: number) => {
                const relicName = translateName(relic, 'relic');
                const normalizedRelicKey = normalizeRelicName(relic);
                return (
                  <div key={index} className="bg-base-200/30 p-4 rounded-box">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-base-300 rounded-full flex items-center justify-center tooltip" data-tip={relic}>
                        <img
                          src={getAssetUrl(`images/relics/${normalizedRelicKey}.png`) || ''}
                          alt={relicName}
                          className="w-12 h-12 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = "true";
                              target.src = getAssetUrl('ui/intent/unknown.png');
                            }
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="font-medium">{relicName}</h4>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayDetail; 