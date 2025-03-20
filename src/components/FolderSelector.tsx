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
          onFolderSelect(path);
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
    <div className="container mx-auto px-4">
      <div className="card bg-base-100 shadow">
        <div className="card-body max-w-[1920px] mx-auto w-full p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleClick}
              disabled={!!progress}
              className={`btn btn-ghost btn-sm gap-2 ${
                progress ? 'btn-disabled' : ''
              }`}
            >
              <FolderIcon className="h-5 w-5" />
              フォルダを選択
            </button>
          </div>
          {currentPath && (
            <p className="text-xs opacity-70 truncate">
              {currentPath}
            </p>
          )}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs opacity-70">
                <span>ファイル読み込み中...</span>
                <span>{Math.round((progress.progress / progress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-base-200 rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${(progress.progress / progress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderSelector; 