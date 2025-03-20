import { Run } from '../store';
import { NeowBonusData, NeowBonusStats } from '../types/neowBonus';

export const calculateNeowBonusStats = (runs: Run[]): NeowBonusData => {
  const result: NeowBonusData = {};

  // キャラクター名のマッピング（コンポーネントの小文字から実際のデータの大文字へ）
  const characterMap: Record<string, string> = {
    'ironclad': 'IRONCLAD',
    'silent': 'THE_SILENT',
    'defect': 'DEFECT',
    'watcher': 'WATCHER'
  };

  console.log('Debug - Starting calculation with runs:', {
    totalRuns: runs.length,
    sampleRun: runs[0] && {
      character: runs[0].character_chosen || runs[0].character,
      neow_bonus: runs[0].neow_bonus,
      victory: runs[0].victory,
      fullRun: JSON.stringify(runs[0])
    },
    uniqueCharacters: [...new Set(runs.map(run => run.character_chosen || run.character))],
    uniqueNeowBonuses: [...new Set(runs.map(run => run.neow_bonus))],
    runsWithoutCharacter: runs.filter(run => !run.character_chosen && !run.character).length,
    runsWithoutNeowBonus: runs.filter(run => !run.neow_bonus).length,
    runsWithNeowBonus: runs.filter(run => run.neow_bonus).length,
    firstFewRuns: runs.slice(0, 5).map(run => ({
      character: run.character_chosen || run.character,
      neow_bonus: run.neow_bonus,
      victory: run.victory
    }))
  });

  // キャラクター毎の処理
  runs.forEach((run, index) => {
    const runCharacter = run.character_chosen || run.character;
    const neowBonus = (run.neow_bonus || (run.run_data && run.run_data.neow_bonus))?.replace('neowBonus.', '');
    
    if (!runCharacter || !neowBonus) {
      console.log('Debug - Skipping run:', { 
        index,
        character: runCharacter, 
        neow_bonus: neowBonus,
        run_neow_bonus: run.neow_bonus,
        run_data_neow_bonus: run.run_data?.neow_bonus,
        fullRun: JSON.stringify(run)
      });
      return;
    }

    // キャラクター名を正規化
    const character = Object.entries(characterMap).find(([_, value]) => value === runCharacter)?.[1] || runCharacter;
    console.log('Debug - Processing run:', { 
      index,
      originalCharacter: runCharacter, 
      normalizedCharacter: character,
      neow_bonus: neowBonus,
      victory: run.victory,
      floor_reached: run.floor_reached
    });

    if (!result[character]) {
      result[character] = {};
      console.log('Debug - Created new character entry:', character);
    }

    if (!result[character][neowBonus]) {
      result[character][neowBonus] = {
        totalSelected: 0,
        last50Selected: 0,
        totalWinRate: 0,
        last50WinRate: 0,
      };
      console.log('Debug - Created new bonus entry:', { character, bonus: neowBonus });
    }

    const stats = result[character][neowBonus];
    stats.totalSelected++;

    // 勝利数のカウント（57階以上で勝利した場合のみ）
    if (run.victory === true && run.floor_reached >= 57) {
      stats.totalWinRate++;
    }
  });

  // 勝率の計算とLast50の処理
  Object.keys(result).forEach(character => {
    const characterRuns = runs.filter(run => {
      const runCharacter = run.character_chosen || run.character;
      // キャラクター名を正規化して比較
      const normalizedCharacter = Object.entries(characterMap).find(([_, value]) => value === runCharacter)?.[1] || runCharacter;
      return normalizedCharacter === character;
    });
    console.log('Debug - Processing character stats:', {
      character,
      totalRuns: characterRuns.length,
      last50Runs: characterRuns.slice(-50).length,
      uniqueNeowBonuses: [...new Set(characterRuns.map(run => run.neow_bonus))],
      sampleRuns: characterRuns.slice(0, 3).map(run => ({
        neow_bonus: run.neow_bonus,
        victory: run.victory
      }))
    });

    const last50Runs = characterRuns.slice(-50);

    Object.keys(result[character]).forEach(bonus => {
      const stats = result[character][bonus];
      
      // Last50の計算（neowBonus.の文字列を削除して比較）
      const last50Count = last50Runs.filter(run => {
        const runBonus = (run.neow_bonus || (run.run_data && run.run_data.neow_bonus))?.replace('neowBonus.', '');
        return runBonus === bonus;
      }).length;
      const last50Wins = last50Runs.filter(run => {
        const runBonus = (run.neow_bonus || (run.run_data && run.run_data.neow_bonus))?.replace('neowBonus.', '');
        return runBonus === bonus && run.victory === true && run.floor_reached >= 57;
      }).length;

      stats.last50Selected = last50Count;
      stats.last50WinRate = last50Count > 0 ? (last50Wins / last50Count) * 100 : 0;
      
      // 全体の勝率を百分率に変換
      stats.totalWinRate = stats.totalSelected > 0 
        ? (stats.totalWinRate / stats.totalSelected) * 100 
        : 0;
    });
  });

  // 全キャラクター合計の計算
  result['ALL'] = calculateTotalStats(result);

  console.log('Debug - Final result:', {
    characters: Object.keys(result),
    characterData: Object.fromEntries(
      Object.entries(result).map(([char, data]) => [
        char,
        {
          bonusCount: Object.keys(data).length,
          bonuses: Object.keys(data)
        }
      ])
    ),
    sampleCharacterData: result[Object.keys(result)[0]]
  });

  return result;
};

const calculateTotalStats = (data: NeowBonusData): { [key: string]: NeowBonusStats } => {
  const totalStats: { [key: string]: NeowBonusStats } = {};
  const characters = Object.keys(data).filter(char => char !== 'ALL');

  // 全キャラクターのボーナスを集計
  characters.forEach(character => {
    Object.entries(data[character]).forEach(([bonus, stats]) => {
      if (!totalStats[bonus]) {
        totalStats[bonus] = {
          totalSelected: 0,
          last50Selected: 0,
          totalWinRate: 0,
          last50WinRate: 0,
        };
      }

      totalStats[bonus].totalSelected += stats.totalSelected;
      totalStats[bonus].last50Selected += stats.last50Selected;
    });
  });

  // 合計の勝率を計算
  Object.keys(totalStats).forEach(bonus => {
    let totalWins = 0;
    let last50Wins = 0;

    characters.forEach(character => {
      if (data[character][bonus]) {
        totalWins += (data[character][bonus].totalWinRate * data[character][bonus].totalSelected) / 100;
        last50Wins += (data[character][bonus].last50WinRate * data[character][bonus].last50Selected) / 100;
      }
    });

    const stats = totalStats[bonus];
    stats.totalWinRate = stats.totalSelected > 0 
      ? (totalWins / stats.totalSelected) * 100 
      : 0;
    stats.last50WinRate = stats.last50Selected > 0 
      ? (last50Wins / stats.last50Selected) * 100 
      : 0;
  });

  return totalStats;
}; 