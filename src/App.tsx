import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StatsOverview } from "./components/StatsOverview";
import RunList from "./components/RunList";
import { FolderSelector } from "./components/FolderSelector";
import {
  HashRouter,
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  Link,
  useParams
} from "react-router-dom";
import RunDetail from "./components/RunDetail";
import PlayDetail from "./components/PlayDetail";
import { Run, useStore } from "./store";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/20/solid";
import CardList from "./components/CardList";
import RelicList from "./components/RelicList";
import { precalculateCardStats, precalculateRelicStats, clearStatsCache, setCacheMaxSize } from "./services/StatsService";
// allCards と allRelics は CardList と RelicList コンポーネント内で IPC 経由で読み込むため、
// 静的インポートは不要（public/assets に存在するため、Vite のビルド時にバンドルされない）
// import allCards from "./assets/cards/allCards.json";
// import allRelics from "./assets/relics/relics.json";
import NeowBonusList from './components/NeowBonusList';
import UpdateNotification from './components/UpdateNotification';
import { scanAllAssetReferences } from './utils/imageAssetUtils';
import { isDevelopment, isProduction, isElectron } from './utils/environment';
import { FilePickerOptions } from 'electron-api';
import { getAssetUrl } from './utils/assetUtils';

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

  // アセット参照の診断を実行
  useEffect(() => {
    // DOMが完全に読み込まれた後にスキャンを実行
    const runAssetScan = () => {
      console.log('[App] アセット参照診断を開始します...');
      try {
        const scanResults = scanAllAssetReferences();
        console.log('[App] アセット参照診断結果:', scanResults);
        
        // 環境情報も記録
        console.log('[App] 環境情報:', {
          isProd: isProduction(),
          electronAvailable: isElectron(),
          isPackaged: window.electronAPI?.isPackaged,
          platform: window.electronAPI?.platform,
          url: window.location.href,
          protocol: window.location.protocol
        });
        
        // 問題のある画像を特定
        const problematicImages = scanResults.images.filter(img =>
          !img.complete || !img.naturalSize || img.src.includes(getAssetUrl('') || '')
        );

        if (problematicImages.length > 0) {
          console.warn('[App] 問題のある画像が見つかりました:', problematicImages);
        } else {
          console.log('[App] すべての画像は正常に読み込まれています');
        }

        // CSSの問題も確認
        const problematicCssRefs = scanResults.cssBackgrounds.filter(ref =>
          ref.url.includes(getAssetUrl('') || '')
        );
        
        if (problematicCssRefs.length > 0) {
          console.warn('[App] 問題のあるCSS背景参照が見つかりました:', problematicCssRefs);
        }
      } catch (error) {
        console.error('[App] アセット参照診断中にエラーが発生しました:', error);
      }
    };
    
    // ページロード完了後に実行
    if (document.readyState === 'complete') {
      runAssetScan();
    } else {
      window.addEventListener('load', runAssetScan);
      return () => window.removeEventListener('load', runAssetScan);
    }
  }, []);

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
    console.log(`テーマを ${theme} から ${newTheme} に切り替えます`);
    try {
      if (window.electronAPI) {
        await window.electronAPI.setTheme(newTheme);
        console.log(`テーマが ${newTheme} に設定されました`);
      }
      setTheme(newTheme);
      applyTheme(newTheme);
      console.log(`テーマ適用完了: ${newTheme}`);
    } catch (error) {
      console.error("Error setting theme:", error);
    }
  };

  return (
    <div className="min-h-screen bg-navy-dark w-full overflow-x-hidden">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header onThemeToggle={handleThemeToggle} theme={theme} />
        <div className="bg-navy-base border-b border-navy">
          <div className="container mx-auto px-4 py-2 relative max-w-[1920px]">
            <div className="absolute left-4 flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-ghost btn-circle text-primary-custom hover:bg-navy-light transition-colors"
                disabled={location.pathname === "/home"}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate(1)}
                className="btn btn-ghost btn-circle text-primary-custom hover:bg-navy-light transition-colors"
                disabled={
                  !window.history.state ||
                  window.history.state.idx === window.history.length - 1
                }
              >
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link
                to="/home"
                className={`btn btn-ghost btn-sm text-primary-custom hover:bg-navy-light transition-colors ${
                  location.pathname === "/home" ? "bg-navy-accent" : ""
                }`}
              >
                ホーム
              </Link>
              <Link
                to="/cards"
                className={`btn btn-ghost btn-sm text-primary-custom hover:bg-navy-light transition-colors ${
                  location.pathname === "/cards" ? "bg-navy-accent" : ""
                }`}
              >
                カード一覧
              </Link>
              <Link
                to="/relics"
                className={`btn btn-ghost btn-sm text-primary-custom hover:bg-navy-light transition-colors ${
                  location.pathname === "/relics" ? "bg-navy-accent" : ""
                }`}
              >
                レリック一覧
              </Link>
              <Link
                to="/neow-bonus"
                className={`btn btn-ghost btn-sm text-primary-custom hover:bg-navy-light transition-colors ${
                  location.pathname === "/neow-bonus" ? "bg-navy-accent" : ""
                }`}
              >
                ネオーの祝福
              </Link>
              <Link
                to="/settings"
                className={`btn btn-ghost btn-sm text-primary-custom hover:bg-navy-light transition-colors ${
                  location.pathname === "/settings" ? "bg-navy-accent" : ""
                }`}
              >
                設定
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="pt-32 pb-8">
        {children}
      </div>
      <UpdateNotification />
    </div>
  );
}

function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRuns } = useStore();

  const handleFolderSelect = async (folderPath: string) => {
    if (isLoading || !("electronAPI" in window) || !window.electronAPI) return;

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
        <div className="card-navy">
          <div className="card-body p-4">
            <h2 className="card-title text-lg mb-4 text-primary-custom font-jp">
              Slay the Spireのrunsフォルダ
            </h2>
            <FolderSelector onFolderSelect={handleFolderSelect} />
          </div>
        </div>

        {isLoading ? (
          <div className="card-navy">
            <div className="card-body flex items-center justify-center">
              <div className="loading loading-spinner loading-lg text-navy-accent" />
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.1)] bg-status-error/20 border-status-error text-status-error">
            <div className="flex flex-col">
              <p className="font-medium">エラーが発生しました</p>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card-navy">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-4 text-primary-custom font-jp">プレイ統計</h2>
                <StatsOverview />
              </div>
            </div>
            <div className="card-navy">
              <div className="card-body p-4">
                <h2 className="card-title text-lg mb-4 text-primary-custom font-jp">プレイ履歴</h2>
                <RunList />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// パラメータ付きのリダイレクトコンポーネント
function PlayToRunsRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // コンポーネントマウント時に一度だけ実行
  useEffect(() => {
    if (id) {
      console.log(`[Redirect] ${location.pathname} から /runs/${id} へリダイレクトします`);
      navigate(`/runs/${id}`, { replace: true });
    } else {
      console.error('[Redirect] リダイレクト先のIDが見つかりません', { path: location.pathname, params: useParams() });
      navigate('/404', { replace: true });
    }
  }, [id, navigate, location.pathname]);
  
  // リダイレクト中は読み込み表示
  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <span className="loading loading-spinner loading-lg mb-4"></span>
      <p className="text-lg">プレイデータへリダイレクト中...</p>
      <p className="text-sm text-base-content/70 mt-2">ID: {id || 'なし'}</p>
    </div>
  );
}

function App() {
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // アセットの読み込み状態をチェック
  useEffect(() => {
    // アセットの読み込み状態をチェックする関数
    const checkAssetLoadStatus = async () => {
      try {
        console.log('[App] アセットロードステータスのチェックを開始...');
        console.log('[App] typeof window.electronAPI:', typeof window.electronAPI);
        if (window.electronAPI) {
          console.log('[App] window.electronAPI object:', JSON.stringify(Object.keys(window.electronAPI)));
        }
        
        // Electron環境でgetFileURLForAssetが利用可能な場合（macOS/Windows共通）
        if (isElectron() && window.electronAPI?.getFileURLForAsset) {
          const platform = window.electronAPI.platform || 'unknown';
          console.log(`[App] ${platform} platform detected. Using getFileURLForAsset.`);
          try {
            const testAssetPath = 'ui/topPanel/deck.png'; // public/assets からの相対パス
            console.log(`[App] ${platform}: Calling getFileURLForAsset for:`, testAssetPath);
            const fileUrl = await window.electronAPI.getFileURLForAsset(testAssetPath);
            
            if (fileUrl) {
              console.log(`[App] ${platform}: ファイルURLの取得に成功:`, fileUrl);
              const img = new Image();
              img.onload = () => {
                console.log(`[App] ${platform}: 画像のロードに成功 (サイズ:`, img.width, 'x', img.height, ')');
                setAssetStatus('ready');
              };
              img.onerror = (err) => {
                console.error(`[App] ${platform}: ファイルURLでの画像ロードに失敗:`, err, 'Falling back to regular path check.');
                checkWithRegularPath(); // 代替手段を試す
              };
              img.src = fileUrl;
              return;
            } else {
              console.warn(`[App] ${platform}: ファイルURLの取得に失敗. Falling back to regular path check.`);
              checkWithRegularPath(); // 代替手段を試す
            }
          } catch (platformErr) {
            console.error(`[App] ${platform}固有の処理中にエラー:`, platformErr, 'Falling back to regular path check.');
            checkWithRegularPath(); // 代替手段を試す
          }
          return; // プラットフォーム処理が終わったら、checkWithRegularPathは呼ばない（エラー時フォールバックを除く）
        }
        
        console.log('[App] getFileURLForAsset not available or not Electron, proceeding with regular path check.');
        checkWithRegularPath();
        
      } catch (error) {
        console.error('[App] アセットステータスチェック中に予期せぬエラーが発生:', error);
        setAssetStatus('error');
      }
    };
    
    const checkWithRegularPath = async () => {
      console.log('[App] checkWithRegularPath: Starting...');
      console.log('[App] checkWithRegularPath: typeof window.electronAPI:', typeof window.electronAPI);
      if (window.electronAPI) {
        console.log('[App] checkWithRegularPath: window.electronAPI object keys:', JSON.stringify(Object.keys(window.electronAPI)));
        console.log('[App] checkWithRegularPath: typeof window.electronAPI.getImageBase64:', typeof window.electronAPI.getImageBase64);
      }

      try {
        const testAssetRelativePath = 'ui/topPanel/deck.png';
        console.log('[App] checkWithRegularPath: テストアセット相対パス:', testAssetRelativePath);
        
        if (window.electronAPI && typeof window.electronAPI.getImageBase64 === 'function') {
          console.log('[App] checkWithRegularPath: Calling getImageBase64...');
          const base64Data = await window.electronAPI.getImageBase64(testAssetRelativePath);
          console.log('[App] checkWithRegularPath: getImageBase64 returned.', base64Data ? 'Data received' : 'No data');

          if (!base64Data) {
            console.error('[App] checkWithRegularPath: テストアセット画像のBase64データ取得に失敗。');
            setAssetStatus('error');
            return;
          }
          
          const img = new Image();
          img.onload = () => {
            if (img.width === 0 || img.height === 0) {
              console.error('[App] checkWithRegularPath: アセット画像は読み込まれましたが、サイズが0です');
              setAssetStatus('error');
              return;
            }
            console.log('[App] checkWithRegularPath: アセット画像の読み込みに成功 (サイズ:', img.width, 'x', img.height, ')');
          setAssetStatus('ready');
        };
        img.onerror = (err) => {
            console.error('[App] checkWithRegularPath: テストアセット画像の読み込みに失敗 (Base64からのロード):', err);
            setAssetStatus('error');
          };
          img.src = base64Data;
        } else {
          console.error('[App] checkWithRegularPath: window.electronAPI.getImageBase64 が利用できません。');
          setAssetStatus('error');
        }
      } catch (imgErr) {
        console.error('[App] checkWithRegularPath: 画像読み込み処理中にエラー:', imgErr);
        setAssetStatus('error');
      }
    };
    
    checkAssetLoadStatus();
  }, []);


  // アセットのロード中
  if (assetStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg mb-4"></div>
        <p className="text-lg">アセットを読み込み中...</p>
      </div>
    )
  }

  // Electron本番環境（file://プロトコル）ではHashRouterを使用
  // BrowserRouterはHTML5 History APIに依存するため、file://では動作しない
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

  return (
    <Router>
      {/* アセットエラー時の警告バナー */}
      {assetStatus === 'error' && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-error/90 text-error-content p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold">⚠ アセット読み込みエラー</span>
              <span className="text-sm">
                ゲームアセットの読み込みに失敗しました。一部の画像が表示されない可能性があります。
              </span>
            </div>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setAssetStatus('loading')}
            >
              再試行
            </button>
          </div>
        </div>
      )}

      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/play-detail/:id" element={<PlayDetail />} />
          <Route path="/cards" element={<CardList />} />
          <Route path="/relics" element={<RelicList />} />
          <Route path="/neow-bonus" element={<NeowBonusList />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/play/:id" element={<PlayToRunsRedirect />} />
          <Route path="/run/:id" element={<PlayToRunsRedirect />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
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
      <div className="card-navy">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4 text-primary-custom font-jp">アプリケーション設定</h2>
          
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text text-primary-custom font-jp">統計情報ツールチップを表示する</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={settings.enableStatsTooltip}
                onChange={handleToggleStatsTooltip}
              />
            </label>
            <p className="text-sm text-muted-custom ml-2 font-jp">
              カードやレリックにカーソルを合わせたときに取得率や勝率を表示します。
              無効にするとパフォーマンスが向上します。
            </p>
          </div>
          
          <div className="form-control mt-4">
            <label className="label cursor-pointer">
              <span className="label-text text-primary-custom font-jp">統計情報を事前計算する</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={settings.precalculateStats}
                onChange={handleTogglePrecalculate}
              />
            </label>
            <p className="text-sm text-muted-custom ml-2 font-jp">
              アプリケーション起動時に人気のカードやレリックの統計情報を事前計算します。
              有効にすると初回表示が高速になりますが、起動時の負荷が増加します。
            </p>
          </div>
          
          <div className="mt-8">
            <p className="text-sm text-muted-custom font-jp">
              ※設定はブラウザに保存され、アプリケーションを再起動しても維持されます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 404 Notfoundページコンポーネント
function NotFoundPage() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <h1 className="text-3xl font-bold mb-4 text-primary-custom font-jp">ページが見つかりません</h1>
      <p className="mb-6 text-secondary-custom font-jp">
        お探しのページは存在しないか、移動された可能性があります。
      </p>
      <button 
        className="btn btn-navy-primary font-jp"
        onClick={() => navigate('/home')}
      >
        ホームに戻る
      </button>
    </div>
  );
}

export default App;
