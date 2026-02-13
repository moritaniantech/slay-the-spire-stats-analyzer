import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// グローバル型定義は src/global.d.ts を参照

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

const UpdateNotification: React.FC = () => {
  const { t } = useTranslation();
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ProgressInfo | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 開発環境ではアップデートチェックを行わない
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // アップデートの確認
    window.electronAPI.checkForUpdates().catch((err: UpdateError) => {
      console.error('Error checking for updates:', err);
    });

    // アップデートが利用可能な場合
    const removeUpdateAvailable = window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateAvailable(info);
      setError(null);
    });

    // ダウンロードの進捗
    const removeUpdateProgress = window.electronAPI.onUpdateProgress((info: ProgressInfo) => {
      setDownloadProgress(info);
      setError(null);
    });

    // ダウンロード完了
    const removeUpdateDownloaded = window.electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
      setIsDownloaded(true);
      setError(null);
    });

    // エラー処理
    const removeUpdateError = window.electronAPI.onUpdateError((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    });

    // クリーンアップ
    return () => {
      removeUpdateAvailable();
      removeUpdateProgress();
      removeUpdateDownloaded();
      removeUpdateError();
    };
  }, []);

  // 開発環境では何も表示しない
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  const handleUpdate = () => {
    window.electronAPI.startUpdate();
  };

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>{t('update.error')}: {error}</p>
      </div>
    );
  }

  if (isDownloaded) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <p>{t('update.ready')}</p>
        <button
          onClick={handleUpdate}
          className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
          {t('update.restart')}
        </button>
      </div>
    );
  }

  if (downloadProgress) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <p>{t('update.downloading')}: {Math.round(downloadProgress.percent)}%</p>
        <div className="w-full bg-gray-200 rounded h-2 mt-2">
          <div
            className="bg-blue-500 rounded h-2"
            style={{ width: `${downloadProgress.percent}%` }}
          />
        </div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p>{t('update.available')}: v{updateAvailable.version}</p>
        {updateAvailable.releaseNotes && (
          <p className="mt-2 text-sm">{updateAvailable.releaseNotes}</p>
        )}
      </div>
    );
  }

  return null;
};

export default UpdateNotification; 