export interface Run {
  id: string;
  character: string;
  victory: boolean;
  ascension_level: number;
  floor_reached: number;
  playtime: number;
  score: number;
  timestamp: number;
  run_data: RunData;
  neow_cost?: string;
  neow_bonus?: string;
}

export interface LoadProgress {
  progress: number;
  total: number;
}

export interface ElectronAPI {
  loadRunFiles: (runFolderPath: string) => Promise<Run[]>;
  getAllRuns: () => Promise<Run[]>;
  selectFolder: () => Promise<string | null>;
  getRunFolder: () => Promise<string | null>;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;
  onLoadProgress: (callback: (progress: LoadProgress) => void) => () => void;
}

// グローバルな型定義は src/global.d.ts を参照

export {}; 