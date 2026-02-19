import React, { useState } from 'react';
import { getAssetUrl } from '../../utils/assetUtils';

interface AssetImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  fallbackPath?: string;
  alt?: string;
}

/**
 * アセット画像を表示するコンポーネント
 * 環境に応じて適切なパスを自動的に解決します
 */
const AssetImage: React.FC<AssetImageProps> = ({ 
  path, 
  fallbackPath, 
  alt = '', 
  ...props 
}) => {
  const [error, setError] = useState(false);
  
  // 画像パスを正規化して、適切なURL形式に変換
  const mainImageUrl = getAssetUrl(path);
  
  // フォールバック画像がある場合、そのパスも正規化
  const fallbackImageUrl = fallbackPath ? getAssetUrl(fallbackPath) : undefined;
  
  // エラー発生時の処理
  const handleError = () => {
    if (fallbackImageUrl && !error) {
      setError(true);
    }
  };
  
  // エラーがあり、フォールバック画像が指定されている場合はフォールバック画像を表示
  const imageUrl = (error && fallbackImageUrl) ? fallbackImageUrl : mainImageUrl;

  return (
    <img
      src={imageUrl ?? undefined}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
};

export default AssetImage; 