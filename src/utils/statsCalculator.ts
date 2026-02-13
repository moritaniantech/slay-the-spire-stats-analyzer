import { AllCharacterStats, CharacterStats, createEmptyCharacterStats } from '../models/StatsModel';

export function createEmptyAllCharacterStats(): AllCharacterStats {
  return {
    ironclad: createEmptyCharacterStats(),
    silent: createEmptyCharacterStats(),
    defect: createEmptyCharacterStats(),
    watcher: createEmptyCharacterStats()
  };
}

export function calculateCardStats(runs: any[], cardId: string): AllCharacterStats {
  const stats = createEmptyAllCharacterStats();
  
  // キャラクター毎の統計を計算
  ['ironclad', 'silent', 'defect', 'watcher'].forEach(character => {
    const characterRuns = runs.filter(run => run.character.toLowerCase() === character);
    const totalGames = characterRuns.length;
    
    if (totalGames === 0) return;
    
    const runsWithCard = characterRuns.filter(run => 
      run.run_data?.master_deck?.some((card: string) => 
        card.replace('+1', '+').toLowerCase() === cardId.toLowerCase() ||
        card.toLowerCase() === cardId.toLowerCase()
      )
    );
    
    const winningRunsWithCard = runsWithCard.filter(run => run.victory);
    
    // 直近50戦の計算
    const recent50Runs = [...characterRuns]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    
    const recent50RunsWithCard = recent50Runs.filter(run => 
      run.run_data?.master_deck?.some((card: string) => 
        card.replace('+1', '+').toLowerCase() === cardId.toLowerCase() ||
        card.toLowerCase() === cardId.toLowerCase()
      )
    );
    
    const recent50WinningRunsWithCard = recent50RunsWithCard.filter(run => run.victory);
    
    stats[character as keyof AllCharacterStats] = {
      totalPlays: totalGames,
      obtainCount: runsWithCard.length,
      victoryCount: winningRunsWithCard.length,
      obtainRate: (runsWithCard.length / totalGames) * 100,
      victoryObtainRate: (winningRunsWithCard.length / totalGames) * 100,
      winRate: runsWithCard.length > 0 ? (winningRunsWithCard.length / runsWithCard.length) * 100 : 0,
      recent50Plays: recent50Runs.length,
      recent50ObtainCount: recent50RunsWithCard.length,
      recent50VictoryCount: recent50WinningRunsWithCard.length,
      recent50ObtainRate: (recent50RunsWithCard.length / recent50Runs.length) * 100,
      recent50WinRate: recent50RunsWithCard.length > 0 ? (recent50WinningRunsWithCard.length / recent50RunsWithCard.length) * 100 : 0
    };
  });
  
  return stats;
} 