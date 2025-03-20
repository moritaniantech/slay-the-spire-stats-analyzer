import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StatsOverview } from "./components/StatsOverview";
import { RunList } from "./components/RunList";
import { FolderSelector } from "./components/FolderSelector";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import { RunDetail } from "./components/RunDetail";
import { Run, useStore } from "./store";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/20/solid";
import CardList from "./components/CardList";
import RelicList from "./components/RelicList";
import { precalculateCardStats, precalculateRelicStats, clearStatsCache, setCacheMaxSize } from "./services/StatsService";
import allCards from "./assets/cards/allCards.json";
import allRelics from "./assets/relics/relics.json";
import NeowBonusList from './components/NeowBonusList';

// グローバル設定変数を定義
declare global {
  interface Window {
    __APP_SETTINGS__: {
      lowMemoryMode: boolean;
      maxCacheSize: number;
    };
  }
}

// 共通レイアウトコンポーネント
function Layout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<string>("dark");
  const navigate = useNavigate();
  const location = useLocation();
  const { runs, settings, setRuns } = useStore();

  // グローバル設定変数を初期化
  useEffect(() => {
    window.__APP_SETTINGS__ = {
      lowMemoryMode: settings.lowMemoryMode,
      maxCacheSize: settings.maxCacheSize
    };
    
    // キャッシュサイズを設定
    setCacheMaxSize(settings.maxCacheSize);
    
    // 設定変更を監視
    return () => {
      // クリーンアップ時に設定をリセット
      window.__APP_SETTINGS__ = {
        lowMemoryMode: false,
        maxCacheSize: 100
      };
    };
  }, [settings.lowMemoryMode, settings.maxCacheSize]);

  useEffect(() => {
    const initTheme = async () => {
      if (typeof window !== "undefined" && "electronAPI" in window) {
        try {
          const savedTheme = (await window.electronAPI.getTheme()) || "dark";
          setTheme(savedTheme);
          applyTheme(savedTheme);
        } catch (error) {
          console.error("Error getting theme:", error);
          applyTheme("dark");
        }
      }
    };
    initTheme();
  }, []);

  // データベースからの初期読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (window.electronAPI) {
          const allRuns = await window.electronAPI.getAllRuns() as Run[];
          setRuns(allRuns);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, []); // 初回マウント時のみ実行

  // リロード時のデータ再読み込み
  useEffect(() => {
    const handleReload = async () => {
      try {
        if (window.electronAPI) {
          const allRuns = await window.electronAPI.getAllRuns() as Run[];
          setRuns(allRuns);
        }
      } catch (error) {
        console.error('Error reloading data:', error);
      }
    };

    window.addEventListener('load', handleReload);
    return () => {
      window.removeEventListener('load', handleReload);
    };
  }, [setRuns]);

  // プレイデータが読み込まれたら統計情報を事前計算
  useEffect(() => {
    if (runs.length > 0) {
      // キャッシュをクリア（レリックIDの正規化処理が修正されたため）
      clearStatsCache();
      
      // 設定で事前計算が有効な場合のみ実行
      if (settings.precalculateStats && !settings.lowMemoryMode) {
        console.log('統計情報の事前計算を開始します...');
        
        // バックグラウンドで統計情報を事前計算（Web Workerがあればそちらを使うとより良い）
        setTimeout(() => {
          // よく使われるカードとレリックを事前計算（数を減らす）
          const popularCardIds = [
            // Ironclad（数を減らす）
            'Strike', 'Defend', 'Bash', 'Shrug It Off',
            'Battle Trance', 'Feel No Pain', 'Corruption',
            
            // Silent（数を減らす）
            'Strike', 'Defend', 'Neutralize', 'Survivor',
            'Backflip', 'Catalyst', 'Wraith Form',
            
            // Defect（数を減らす）
            'Strike', 'Defend', 'Zap', 'Dualcast',
            'Glacier', 'Defragment', 'Echo Form',
            
            // Watcher（数を減らす）
            'Strike', 'Defend', 'Eruption', 'Vigilance',
            'Talk to the Hand', 'Tantrum', 'Vault'
          ];
          
          const popularRelicIds = [
            // 代表的なレリック（数を減らす）
            'Burning Blood', 'Ring of the Snake', 'Cracked Core', 'Pure Water', // スターターレリック
            'Anchor', 'Pen Nib', 'Kunai', 'Shuriken',
            'Dead Branch', 'Mango', 'Torii', 'Incense Burner',
            // 特殊なケースのレリックを追加
            'Data Disk'
          ];
          
          // 低メモリモードの場合はさらに減らす
          const batchSize = settings.lowMemoryMode ? 3 : 5; // 低メモリモードではバッチサイズを小さく
          
          // カードの事前計算
          const processCardBatch = (startIndex: number) => {
            const endIndex = Math.min(startIndex + batchSize, popularCardIds.length);
            const batch = popularCardIds.slice(startIndex, endIndex);
            
            if (batch.length > 0) {
              console.log(`カードバッチ処理: ${startIndex + 1}〜${endIndex}/${popularCardIds.length}`);
              precalculateCardStats(runs, batch);
              
              // 次のバッチを処理（遅延を増やす）
              if (endIndex < popularCardIds.length) {
                setTimeout(() => processCardBatch(endIndex), 300); // 遅延を300msに増やす
              } else {
                console.log('カードの事前計算が完了しました');
                
                // カード計算完了後にレリック計算を開始（遅延を増やす）
                setTimeout(() => processRelicBatch(0), 500); // 遅延を500msに増やす
              }
            }
          };
          
          // レリックの事前計算
          const processRelicBatch = (startIndex: number) => {
            const endIndex = Math.min(startIndex + batchSize, popularRelicIds.length);
            const batch = popularRelicIds.slice(startIndex, endIndex);
            
            if (batch.length > 0) {
              console.log(`レリックバッチ処理: ${startIndex + 1}〜${endIndex}/${popularRelicIds.length}`);
              precalculateRelicStats(runs, batch);
              
              // 次のバッチを処理（遅延を増やす）
              if (endIndex < popularRelicIds.length) {
                setTimeout(() => processRelicBatch(endIndex), 300); // 遅延を300msに増やす
              } else {
                console.log('レリックの事前計算が完了しました');
              }
            }
          };
          
          // カードの事前計算から開始（遅延を増やす）
          setTimeout(() => processCardBatch(0), 3000); // アプリ起動から3秒後に開始
        }, 0);
      } else if (settings.lowMemoryMode) {
        console.log('低メモリモードが有効なため、事前計算をスキップします');
      }
    }
  }, [runs, settings.precalculateStats, settings.lowMemoryMode, settings.maxCacheSize]);

  const applyTheme = (newTheme: string) => {
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    try {
      if (window.electronAPI) {
        await window.electronAPI.setTheme(newTheme);
      }
      setTheme(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 w-full overflow-x-hidden">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onThemeToggle={handleThemeToggle} theme={theme} />
        <div className="bg-base-100 border-b border-base-300">
          <div className="container mx-auto px-4 py-2 relative">
            <div className="absolute left-0 flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-ghost btn-circle"
                disabled={location.pathname === "/home"}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="btn btn-ghost btn-circle"
                disabled={
                  !window.history.state ||
                  window.history.state.idx === window.history.length - 1
                }
              >
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Link
                to="/home"
                className={`btn btn-ghost btn-sm ${
                  location.pathname === "/home" ? "btn-active" : ""
                }`}
              >
                ホーム
              </Link>
              <Link
                to="/cards"
                className={`btn btn-ghost btn-sm ${
                  location.pathname === "/cards" ? "btn-active" : ""
                }`}
              >
                カード一覧
              </Link>
              <Link
                to="/relics"
                className={`btn btn-ghost btn-sm ${
                  location.pathname === "/relics" ? "btn-active" : ""
                }`}
              >
                レリック一覧
              </Link>
              <Link
                to="/neow-bonus"
                className={`btn btn-ghost btn-sm ${
                  location.pathname === "/neow-bonus" ? "btn-active" : ""
                }`}
              >
                ネオーの祝福
              </Link>
              <Link
                to="/settings"
                className={`btn btn-ghost btn-sm ${
                  location.pathname === "/settings" ? "btn-active" : ""
                }`}
              >
                設定
              </Link>
            </div>
          </div>
        </div>
      </div>
      <main className="pt-32 min-h-screen w-full">{children}</main>
    </div>
  );
}

function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRuns } = useStore();

  const handleFolderSelect = async (folderPath: string) => {
    if (isLoading || !("electronAPI" in window)) return;

    setIsLoading(true);
    setError(null);
    try {
      const runs = (await window.electronAPI.loadRunFiles(folderPath)) as Run[];
      setRuns(runs);
    } catch (error) {
      console.error("Error loading runs:", error);
      setError(
        error instanceof Error
          ? error.message
          : "データの読み込みに失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto px-4 space-y-6 max-w-[1920px]">
      <div className="grid grid-cols-1 gap-6">
        <div className="card bg-base-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
          <div className="card-body p-4">
            <h2 className="card-title text-lg mb-4">
              Slay the Spireのrunsフォルダ
            </h2>
            <FolderSelector onFolderSelect={handleFolderSelect} />
          </div>
        </div>

        {isLoading ? (
          <div className="card bg-base-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
            <div className="card-body flex items-center justify-center">
              <div className="loading loading-spinner loading-lg" />
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col">
              <p className="font-medium">エラーが発生しました</p>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card bg-base-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-4">プレイ統計</h2>
                <StatsOverview />
              </div>
            </div>
            <div className="card bg-base-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-4">プレイ履歴</h2>
                <RunList />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/cards" element={<CardList />} />
          <Route path="/relics" element={<RelicList />} />
          <Route path="/neow-bonus" element={<NeowBonusList />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/play/:id" element={<Navigate to={`/runs/:id`} replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

// 設定ページコンポーネント
function SettingsPage() {
  const { settings, updateSettings } = useStore();
  
  const handleToggleStatsTooltip = () => {
    updateSettings({ enableStatsTooltip: !settings.enableStatsTooltip });
  };
  
  const handleTogglePrecalculate = () => {
    updateSettings({ precalculateStats: !settings.precalculateStats });
  };
  
  return (
    <div className="mx-auto px-4 space-y-6 max-w-[1920px]">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">アプリケーション設定</h2>
          
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">統計情報ツールチップを表示する</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={settings.enableStatsTooltip}
                onChange={handleToggleStatsTooltip}
              />
            </label>
            <p className="text-sm text-base-content/70 ml-2">
              カードやレリックにカーソルを合わせたときに取得率や勝率を表示します。
              無効にするとパフォーマンスが向上します。
            </p>
          </div>
          
          <div className="form-control mt-4">
            <label className="label cursor-pointer">
              <span className="label-text">統計情報を事前計算する</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={settings.precalculateStats}
                onChange={handleTogglePrecalculate}
              />
            </label>
            <p className="text-sm text-base-content/70 ml-2">
              アプリケーション起動時に人気のカードやレリックの統計情報を事前計算します。
              有効にすると初回表示が高速になりますが、起動時の負荷が増加します。
            </p>
          </div>
          
          <div className="mt-8">
            <p className="text-sm text-base-content/70">
              ※設定はブラウザに保存され、アプリケーションを再起動しても維持されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
