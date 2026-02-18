import React, { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
}

interface ProgressInfo {
  percent: number;
  transferred: number;
  total: number;
}

type UpdateState = 'idle' | 'downloading' | 'ready';

const UpdateNotification: React.FC = () => {
  const [state, setState] = useState<UpdateState>('idle');
  const [version, setVersion] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    // autoDownload=true なので、検出後すぐにダウンロードが始まる
    const removeAvailable = window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setVersion(info.version);
      setState('downloading');
    });

    const removeProgress = window.electronAPI.onUpdateProgress((info: ProgressInfo) => {
      setProgress(Math.round(info.percent));
    });

    const removeDownloaded = window.electronAPI.onUpdateDownloaded(() => {
      setState('ready');
    });

    // エラーは静かに処理（次回起動時に再チェック）
    const removeError = window.electronAPI.onUpdateError(() => {
      setState('idle');
    });

    return () => {
      removeAvailable();
      removeProgress();
      removeDownloaded();
      removeError();
    };
  }, []);

  if (state === 'idle') return null;

  // ダウンロード中
  if (state === 'downloading') {
    return (
      <div className="toast toast-end toast-bottom z-50">
        <div className="alert shadow-lg max-w-sm bg-base-200 border-base-300">
          <span className="loading loading-spinner loading-sm"></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">v{version} をダウンロード中...</p>
            <progress className="progress progress-info w-full mt-1" value={progress} max="100"></progress>
          </div>
        </div>
      </div>
    );
  }

  // ダウンロード完了 → 再起動ボタン
  return (
    <div className="toast toast-end toast-bottom z-50">
      <div className="alert alert-success shadow-lg max-w-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">v{version} の準備ができました</p>
        </div>
        <button
          className="btn btn-success btn-sm"
          onClick={() => window.electronAPI.startUpdate()}
        >
          再起動して更新
        </button>
      </div>
    </div>
  );
};

export default UpdateNotification;
