import React, { useState, useEffect, useRef } from 'react';
import { getAssetUrl, getAssetFallbackUrl } from '../utils/assetUtils';

interface ImageAssetProps {
  path: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  fallbackPath?: string;
}

/**
 * アセット画像を表示するコンポーネント
 * 画像の読み込みエラーを処理し、フォールバック画像を表示します
 */
const ImageAsset: React.FC<ImageAssetProps> = ({ 
  path, 
  alt, 
  className = '',
  style = {},
  onLoad,
  onError,
  fallbackPath = 'ui/missing_image.png'
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [usedFileUrl, setUsedFileUrl] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;
  
  // コンポーネントがマウントされたときにURLを設定
  useEffect(() => {
    // 状態をリセット
    setError(false);
    setLoaded(false);
    setUsedFallback(false);
    setUsedFileUrl(false);
    retryCount.current = 0;
    
    // 初期URLを設定
    const initialUrl = getAssetUrl(path);
    console.log(`[ImageAsset] 初期URL設定: ${path} -> ${initialUrl}`);
    setImgSrc(initialUrl);
  }, [path]);
  
  // エラー時のフォールバックURL
  const fallbackSrc = getAssetUrl(fallbackPath);
  
  const handleError = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (retryCount.current >= maxRetries) {
      console.error(`[ImageAsset] 最大リトライ回数(${maxRetries})に達しました: ${path}`);
      setError(true);
      if (onError) onError();
      return;
    }
    
    retryCount.current++;
    console.warn(`[ImageAsset] 画像の読み込みに失敗 (${retryCount.current}/${maxRetries}): ${path}`, {
      現在のSrc: imgSrc,
      element: e.currentTarget,
    });
    
    try {
      // まだファイルURLを使用していない場合は、file://プロトコルを試す
      if (!usedFileUrl) {
        setUsedFileUrl(true);
        console.log(`[ImageAsset] file://プロトコルを試します: ${path}`);
        
        // electornAPIからファイルURLを取得
        if (window.electronAPI && window.electronAPI.getFileURLForAsset) {
          try {
            const fileUrl = await window.electronAPI.getFileURLForAsset(path);
            if (fileUrl) {
              console.log(`[ImageAsset] file://URLを使用: ${fileUrl}`);
              setImgSrc(fileUrl);
              return; // 再読み込みを試す
            }
          } catch (fileErr) {
            console.error(`[ImageAsset] file://URL取得エラー:`, fileErr);
          }
        }
        
        // 旧APIでも試す
        if (window.electron && window.electron.getFileURLForAsset) {
          try {
            const fileUrl = await window.electron.getFileURLForAsset(path);
            if (fileUrl) {
              console.log(`[ImageAsset] 旧API経由でfile://URLを使用: ${fileUrl}`);
              setImgSrc(fileUrl);
              return; // 再読み込みを試す
            }
          } catch (fileErr) {
            console.error(`[ImageAsset] 旧API経由でfile://URL取得エラー:`, fileErr);
          }
        }
      }
      
      // file://プロトコルも失敗した場合は、フォールバックを試す
      if (!usedFallback) {
        setUsedFallback(true);
        
        // getAssetPathを使ってみる
        if (window.electronAPI && window.electronAPI.getAssetPath) {
          try {
            const assetPath = await window.electronAPI.getAssetPath(path);
            if (assetPath) {
              // file://プロトコルを追加
              const fileUrl = `file://${assetPath}`;
              console.log(`[ImageAsset] getAssetPathを使用: ${fileUrl}`);
              setImgSrc(fileUrl);
              return; // 再読み込みを試す
            }
          } catch (assetPathErr) {
            console.error(`[ImageAsset] getAssetPathエラー:`, assetPathErr);
          }
        }
        
        // フォールバックURLを取得して設定
        try {
          const fallbackUrl = await getAssetFallbackUrl(path);
          console.log(`[ImageAsset] フォールバックURLを使用: ${fallbackUrl}`);
          setImgSrc(fallbackUrl);
          return; // 再読み込みを試す
        } catch (fallbackErr) {
          console.error(`[ImageAsset] フォールバック取得エラー:`, fallbackErr);
        }
      }
      
      // すべての方法が失敗した場合はエラー状態を設定
      console.error(`[ImageAsset] すべての読み込み方法が失敗しました: ${path}`);
      setError(true);
      if (onError) onError();
    } catch (err) {
      console.error(`[ImageAsset] エラー処理中の例外:`, err);
      setError(true);
      if (onError) onError();
    }
  };
  
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      console.warn(`[ImageAsset] 画像は読み込まれましたが、サイズが0です: ${path}`, {
        src: imgSrc,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
      handleError(e);
      return;
    }
    
    console.log(`[ImageAsset] 画像の読み込み成功: ${path}`, {
      src: imgSrc,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
    
    setLoaded(true);
    setError(false);
    if (onLoad) onLoad();
  };
  
  return (
    <img
      src={error ? (fallbackSrc ?? '') : (imgSrc ?? fallbackSrc ?? '')}
      alt={alt}
      className={`${className} ${!loaded && !error ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      data-asset-path={path} // 後でDOM経由で更新するために追加
    />
  );
};

export default ImageAsset; 