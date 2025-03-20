export interface NeowBonusStats {
  totalSelected: number;
  last50Selected: number;
  totalWinRate: number;
  last50WinRate: number;
}

export interface NeowBonusData {
  [character: string]: {
    [bonusKey: string]: NeowBonusStats;
  };
}

export interface NeowBonusState {
  selectedCharacter: string;
  bonusData: NeowBonusData;
  isLoading: boolean;
  error: string | null;
} 