import { useState, useRef } from 'react';

interface CarouselImageProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * 轮播图专用图片组件
 * 优化轮播图的图片加载性能
 */
export const CarouselImage: React.FC<CarouselImageProps> = ({ src, alt, className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    console.warn(`轮播图加载失败: ${src}`);
    setHasError(true);
  };

  // 预加载图片
  useState(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = handleError;
  });

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <span className="text-gray-500 text-sm">图片加载失败</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      loading="eager"
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};
