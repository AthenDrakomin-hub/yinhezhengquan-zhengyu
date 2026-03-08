import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 懒加载图片组件
 * 使用 Intersection Observer API 实现图片懒加载
 */
export const LazyImage = ({
  src,
  alt,
  className = '',
  width = '100%',
  height = 'auto',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3C/svg%3E',
  loading = 'lazy',
  onLoad,
  onError,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 对于轮播图的图片，直接显示，不使用懒加载
    if (loading === 'eager' || !imgRef.current) {
      setIsInView(true);
      return;
    }

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // 图片进入视口后，取消观察
            if (imgRef.current) {
              observer.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px', // 提前50px加载
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    console.warn(`图片加载失败: ${src}`);
    setHasError(true);
    onError?.();
  };

  // 如果图片未加载，显示占位符
  if (!isInView && loading === 'lazy') {
    return (
      <div
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      />
    );
  }

  // 如果加载出错，显示错误占位符
  if (hasError) {
    return (
      <div
        className="bg-gray-200 flex items-center justify-center text-gray-500 text-xs"
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load: ${alt}`}
      >
        加载失败
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ width, height }}
      loading={loading === 'eager' ? undefined : 'lazy'}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};

export default LazyImage;
