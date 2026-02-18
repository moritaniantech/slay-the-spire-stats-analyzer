import React, { useEffect, useState } from 'react';
import { useStore } from '../store';

const Settings: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const [appVersion, setAppVersion] = useState('');

  const handleEnableStatsTooltipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ enableStatsTooltip: e.target.checked });
  };

  const handlePrecalculateStatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ precalculateStats: e.target.checked });
  };

  const handleLowMemoryModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ lowMemoryMode: e.target.checked });
  };

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(setAppVersion).catch(() => {});
  }, []);

  const handleMaxCacheSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ maxCacheSize: parseInt(e.target.value, 10) });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-2xl font-bold mb-6">設定</h1>
        
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">統計情報</h2>
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start">
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary mr-4" 
                  checked={settings.enableStatsTooltip}
                  onChange={handleEnableStatsTooltipChange}
                />
                <span className="label-text">カード・レリックにホバーした際に統計情報を表示する</span>
              </label>
              <p className="text-sm text-base-content/70 ml-14 mt-1">
                カードやレリックにマウスを合わせた際に、取得率や勝率などの統計情報を表示します。
              </p>
            </div>
            
            <div className="form-control mt-4">
              <label className="label cursor-pointer justify-start">
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary mr-4" 
                  checked={settings.precalculateStats}
                  onChange={handlePrecalculateStatsChange}
                />
                <span className="label-text">統計情報を事前計算する</span>
              </label>
              <p className="text-sm text-base-content/70 ml-14 mt-1">
                アプリケーション起動時に、よく使われるカードやレリックの統計情報を事前に計算します。
                これにより、初回表示時の遅延が軽減されます。
              </p>
            </div>
          </div>
        </div>
        
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title mb-4">パフォーマンス</h2>
            
            <div className="form-control">
              <label className="label cursor-pointer justify-start">
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary mr-4" 
                  checked={settings.lowMemoryMode}
                  onChange={handleLowMemoryModeChange}
                />
                <span className="label-text">低メモリモード</span>
              </label>
              <p className="text-sm text-base-content/70 ml-14 mt-1">
                メモリ使用量を削減するモードです。統計情報の事前計算を制限し、キャッシュサイズを小さくします。
                メモリ使用量が多い場合に有効にしてください。
              </p>
            </div>
            
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">キャッシュの最大サイズ</span>
              </label>
              <select 
                className="select select-bordered w-full max-w-xs" 
                value={settings.maxCacheSize}
                onChange={handleMaxCacheSizeChange}
              >
                <option value="50">小 (50アイテム)</option>
                <option value="100">中 (100アイテム)</option>
                <option value="200">大 (200アイテム)</option>
                <option value="500">特大 (500アイテム)</option>
              </select>
              <p className="text-sm text-base-content/70 mt-1">
                統計情報のキャッシュサイズを設定します。大きいほど多くのカード・レリック情報をメモリに保持しますが、
                メモリ使用量が増加します。低メモリモードが有効な場合は、小さい値を選択することをお勧めします。
              </p>
            </div>
          </div>
        </div>

        {appVersion && (
          <div className="text-center text-sm text-base-content/50 mt-8">
            StS Stats Analyzer v{appVersion}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings; 