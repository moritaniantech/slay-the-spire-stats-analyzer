import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearStatsCache } from './services/StatsService';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Run {
  id?: string;
  timestamp: number;
  character: string;
  character_chosen?: string;
  ascension_level: number;
  victory: boolean;
  floor_reached: number;
  playtime: number;
  score: number;
  run_data: RunData;
  neow_bonus?: string;
  neow_cost?: string;
}

interface AppSettings {
  enableStatsTooltip: boolean;  // 統計情報ツールチップの有効/無効
  precalculateStats: boolean;   // 統計情報の事前計算の有効/無効
  lowMemoryMode: boolean;       // 低メモリモード（メモリ使用量を削減）
  maxCacheSize: number;         // キャッシュの最大サイズ
  showStats: boolean;           // 戦績表示の有効/無効
}

interface Store {
  runs: Run[];
  settings: AppSettings;
  setRuns: (runs: Run[]) => void;
  addRun: (run: Run) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

// デフォルト設定
const defaultSettings: AppSettings = {
  enableStatsTooltip: true,
  precalculateStats: true,
  lowMemoryMode: false,
  maxCacheSize: 100,
  showStats: true  // デフォルトで戦績を表示
};

// Reduxスライスの定義
const runsSlice = createSlice({
  name: 'runs',
  initialState: {
    runs: [] as Run[]
  },
  reducers: {
    setRuns: (state, action: PayloadAction<Run[]>) => {
      state.runs = action.payload;
    }
  }
});

// Reduxストアの設定
export const store = configureStore({
  reducer: {
    runs: runsSlice.reducer
  }
});

// RootState型のエクスポート
export type RootState = ReturnType<typeof store.getState>;

// Zustandストアの設定
export const useStore = create<Store>()(
  persist(
    (set) => ({
      runs: [],
      settings: defaultSettings,
      setRuns: (runs) => {
        // プレイデータが更新されたらキャッシュをクリア
        clearStatsCache();

        set({ runs: runs.map(run => {
          const runData = typeof run.run_data === 'string' ? JSON.parse(run.run_data) : run.run_data;
          return {
            ...run,
            run_data: runData,
            neow_bonus: run.neow_bonus || runData?.neow_bonus
          };
        })});
        // Reduxストアも更新
        store.dispatch(runsSlice.actions.setRuns(runs));
      },
      addRun: (run) => {
        set((state) => {
          // 重複チェック（id ベース。timestamp 単独では誤除外の可能性があるため使用しない）
          const exists = state.runs.some(
            (r) => r.id && run.id && r.id === run.id
          );
          if (exists) return state;

          // キャッシュクリア
          clearStatsCache();

          const runData = typeof run.run_data === 'string' ? JSON.parse(run.run_data) : run.run_data;
          const newRun = {
            ...run,
            run_data: runData,
            neow_bonus: run.neow_bonus || runData?.neow_bonus
          };

          const newRuns = [...state.runs, newRun];
          // Reduxストアも更新
          store.dispatch(runsSlice.actions.setRuns(newRuns));
          return { runs: newRuns };
        });
      },
      updateSettings: (newSettings) => set((state) => {
        // 設定が変更されたらキャッシュをクリア
        if (
          newSettings.lowMemoryMode !== undefined && 
          newSettings.lowMemoryMode !== state.settings.lowMemoryMode
        ) {
          clearStatsCache();
        }
        
        if (
          newSettings.maxCacheSize !== undefined && 
          newSettings.maxCacheSize !== state.settings.maxCacheSize
        ) {
          clearStatsCache();
        }
        
        return {
          settings: { ...state.settings, ...newSettings }
        };
      })
    }),
    {
      name: 'slay-the-spire-stats',
      partialize: (state) => ({ 
        settings: state.settings,
        runs: state.runs 
      })
    }
  )
);