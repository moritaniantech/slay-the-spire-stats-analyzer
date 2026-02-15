import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderIcon } from '@heroicons/react/20/solid';
import type { LoadProgress } from '../types';

interface Props {
  onFolderSelect: (folderPath: string) => void;
}

export const FolderSelector: React.FC<Props> = ({ onFolderSelect }) => {
  useTranslation();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 進捗状況の監視を設定
  useEffect(() => {
    if (typeof window === 'undefined' || !('electronAPI' in window)) return;

    const unsubscribe = window.electronAPI.onLoadProgress((data: LoadProgress) => {
      setProgress(data);
      // 読み込みが完了したら進捗表示をクリア
      if (data.progress >= data.total) {
        setTimeout(() => {
          setProgress(null);
        }, 1000); // 完了表示を1秒間表示してからクリア
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // 保存されているフォルダパスを取得（初回のみ）
  useEffect(() => {
    const loadSavedPath = async () => {
      if (isInitialized || typeof window === 'undefined' || !('electronAPI' in window)) return;

      try {
        const path = await window.electronAPI.getRunFolder() as string;
        if (path) {
          setCurrentPath(path);
          // 起動時はパス表示のみ（getAllRunsで既にデータ読み込み済み）
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading saved path:', error);
        setError(error instanceof Error ? error.message : 'パスの読み込みに失敗しました');
        setIsInitialized(true);
      }
    };

    loadSavedPath();
  }, [onFolderSelect, isInitialized]);

  const handleClick = async () => {
    if (!('electronAPI' in window)) return;

    try {
      const folderPath = await window.electronAPI.selectFolder() as string;
      if (folderPath) {
        setCurrentPath(folderPath);
        onFolderSelect(folderPath);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      setError(error instanceof Error ? error.message : 'フォルダの選択に失敗しました');
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-base-200/50 rounded-lg">
      <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />

      {currentPath ? (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-base-content">
              {currentPath}
            </p>
            {progress && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-base-300 rounded-full h-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all duration-300"
                    style={{
                      width: `${(progress.progress / progress.total) * 100}%`
                    }}
                  />
                </div>
                <span className="text-xs opacity-70 flex-shrink-0">
                  {Math.round((progress.progress / progress.total) * 100)}%
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleClick}
            disabled={!!progress}
            className="btn btn-sm btn-ghost flex-shrink-0"
          >
            変更
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-base-content/70 flex-1">
            フォルダを選択してください
          </span>
          <button
            onClick={handleClick}
            disabled={!!progress}
            className="btn btn-sm btn-primary flex-shrink-0"
          >
            選択
          </button>
        </>
      )}

      {error && (
        <p className="text-xs text-error ml-2">
          {error}
        </p>
      )}
    </div>
  );
};

export default FolderSelector; 