import { useState, useEffect } from 'react';

interface UseAssetResult {
  assetPath: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * アセットのパスを解決するカスタムフック
 * @param relativePath assets フォルダからの相対パス
 * @returns 解決されたアセットパス、ローディング状態、エラー
 */
export function useAsset(relativePath: string): UseAssetResult {
  const [assetPath, setAssetPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAsset = async () => {
      try {
        setIsLoading(true);
        
        // アセットが存在するか確認
        const exists = await window.electronAPI.assetExists(relativePath);
        if (!exists) {
          throw new Error(`Asset not found: ${relativePath}`);
        }

        // アセットパスを取得
        const path = await window.electronAPI.getAssetPath(relativePath);
        setAssetPath(path);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setAssetPath(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAsset();
  }, [relativePath]);

  return { assetPath, isLoading, error };
} 