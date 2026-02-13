import React, { useState, useEffect } from 'react';
import { normalizeAssetPath, getAssetFallbackUrl, getAssetUrl } from '../../utils/assetUtils';

interface ImageAssetProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  fallbackPath?: string;
  alt?: string;
  className?: string;
  onImageLoaded?: () => void;
  onImageError?: () => void;
}

/**
 * アセット画像を表示するコンポーネント
 * 環境に応じて適切なパスを自動的に解決します
 */
const ImageAsset: React.FC<ImageAssetProps> = ({ 
  path, 
  fallbackPath, 
  alt = '', 
  className,
  onImageLoaded,
  onImageError,
  ...props 
}) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    console.log(`[CommonImageAsset] Component mounted/updated. Path: "${path}", Fallback: "${fallbackPath}"`);
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);
    setImageUrl(undefined); // Reset on path change

    const loadAndSetImage = async () => {
      if (!path) {
        if (isMounted) {
          setImageUrl(fallbackPath ?? undefined);
          setIsLoading(false);
        }
        return;
      }

      const normalizedPathKey = normalizeAssetPath(path);
      if (!normalizedPathKey) {
        if (isMounted) {
          setImageUrl(fallbackPath ?? undefined);
          setIsLoading(false);
        }
        return;
      }

      // Electron環境（開発環境・本番環境共通）: IPC経由でURLを取得
      if (typeof window.electronAPI?.getFileURLForAsset === 'function') {
        const urlFromMain = await getAssetFallbackUrl(normalizedPathKey); // Uses IPC (get-file-url-for-asset)
        if (isMounted) {
          if (urlFromMain) {
            setImageUrl(urlFromMain ?? undefined);
          } else {
            console.warn(`[CommonImageAsset] IPC経由のURL取得失敗: ${normalizedPathKey}. asset:// スキームを試行します。`);
            const assetProtocolUrl = `asset://${normalizedPathKey}`;
            setImageUrl(assetProtocolUrl);
          }
        }
      } else if (import.meta.env.DEV) {
        // 開発環境（非Electron環境）: Vite開発サーバーから直接読み込む
        const directUrl = getAssetUrl(normalizedPathKey);
        if (isMounted) {
          console.log(`[CommonImageAsset] Development URL for ${normalizedPathKey}: ${directUrl}`);
          setImageUrl(directUrl ?? fallbackPath ?? undefined);
        }
      } else {
        // 非Electron本番環境 (e.g. static deployment)
        const directUrl = getAssetUrl(normalizedPathKey);
        if (isMounted) {
          setImageUrl(directUrl ?? fallbackPath ?? undefined);
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadAndSetImage();

    return () => {
      isMounted = false;
    };
  }, [path, fallbackPath]);

  const handleImageLoad = () => {
    if (onImageLoaded) onImageLoaded();
  };

  const handleImageError = () => {
    if (!hasError) {
        setHasError(true);
    }
    setIsLoading(false);
    if (onImageError) onImageError();
  };

  if (isLoading) {
    return <div data-testid={`loading-${alt || 'image'}`} className={className}>Loading...</div>;
  }

  if (hasError && (!imageUrl || imageUrl === path)) {
    return <div data-testid={`error-${alt || 'image'}`} className={className}>Error: {alt}</div>;
  }
  
  if (!imageUrl) {
      return <div data-testid={`error-no-url-${alt || 'image'}`} className={className}>Error: {alt} (no URL)</div>;
  }
  
  return (
    <img 
      src={imageUrl ?? ''}
      alt={alt} 
      className={className}
      onLoad={handleImageLoad}
      onError={handleImageError}
      {...props} 
      data-asset-path={normalizeAssetPath(path)}
    />
  );
};

export default ImageAsset; 