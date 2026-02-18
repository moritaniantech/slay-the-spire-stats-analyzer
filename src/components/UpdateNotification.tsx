import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface ProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

interface UpdateError extends Error {
  message: string;
}

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

const UpdateNotification: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    window.electronAPI.checkForUpdates().catch((err: UpdateError) => {
      console.error('Error checking for updates:', err);
    });

    const removeUpdateAvailable = window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setError(null);
      setDismissed(false);
      // ダウンロード中・完了状態では available に戻さない
      setState((prev) => (prev === 'downloading' || prev === 'downloaded' ? prev : 'available'));
    });

    const removeUpdateProgress = window.electronAPI.onUpdateProgress((info: ProgressInfo) => {
      setDownloadProgress(info);
      setState('downloading');
      setError(null);
    });

    const removeUpdateDownloaded = window.electronAPI.onUpdateDownloaded((_info: UpdateInfo) => {
      setState('downloaded');
      setError(null);
    });

    const removeUpdateError = window.electronAPI.onUpdateError((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setState('error');
    });

    return () => {
      removeUpdateAvailable();
      removeUpdateProgress();
      removeUpdateDownloaded();
      removeUpdateError();
    };
  }, []);

  if (process.env.NODE_ENV === 'development') return null;
  if (dismissed || state === 'idle') return null;

  const handleDownload = () => {
    setState('downloading');
    setDownloadProgress({ bytesPerSecond: 0, percent: 0, transferred: 0, total: 0 });
    window.electronAPI.downloadUpdate().catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setState('error');
    });
  };

  const handleInstall = () => {
    window.electronAPI.startUpdate();
  };

  // エラー状態
  if (state === 'error') {
    return (
      <div className="toast toast-end toast-bottom z-50">
        <div className="alert alert-error shadow-lg max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold">{t('update.error', 'アップデートエラー')}</p>
            <p className="text-xs opacity-80 line-clamp-2">{error}</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-xs" onClick={() => setDismissed(true)}>✕</button>
            {updateInfo && (
              <button className="btn btn-error btn-xs" onClick={handleDownload}>
                {t('update.retry', '再試行')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ダウンロード完了 → インストール促進
  if (state === 'downloaded') {
    return (
      <div className="toast toast-end toast-bottom z-50">
        <div className="alert alert-success shadow-lg max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold">{t('update.ready', 'アップデート準備完了')}</p>
            <p className="text-xs opacity-80">
              {t('update.restartMessage', '再起動してアップデートを適用します')}
            </p>
          </div>
          <button className="btn btn-success btn-sm" onClick={handleInstall}>
            {t('update.restart', '再起動')}
          </button>
        </div>
      </div>
    );
  }

  // ダウンロード中
  if (state === 'downloading' && downloadProgress) {
    const percent = Math.round(downloadProgress.percent);
    const mbTransferred = (downloadProgress.transferred / 1024 / 1024).toFixed(0);
    const mbTotal = (downloadProgress.total / 1024 / 1024).toFixed(0);

    return (
      <div className="toast toast-end toast-bottom z-50">
        <div className="alert alert-info shadow-lg max-w-md">
          <span className="loading loading-spinner loading-sm"></span>
          <div className="flex-1">
            <p className="text-sm font-bold">{t('update.downloading', 'ダウンロード中')}</p>
            <p className="text-xs opacity-80">{mbTransferred} / {mbTotal} MB ({percent}%)</p>
            <progress className="progress progress-info w-full mt-1" value={percent} max="100"></progress>
          </div>
        </div>
      </div>
    );
  }

  // アップデート利用可能 → ダウンロードボタン
  if (state === 'available' && updateInfo) {
    return (
      <div className="toast toast-end toast-bottom z-50">
        <div className="alert alert-warning shadow-lg max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold">
              {t('update.available', '新しいバージョンが利用可能です')}
            </p>
            <p className="text-xs opacity-80">v{updateInfo.version}</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-ghost btn-xs" onClick={() => setDismissed(true)}>
              {t('update.later', '後で')}
            </button>
            <button className="btn btn-warning btn-sm" onClick={handleDownload}>
              {t('update.download', 'ダウンロード')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UpdateNotification;
