/**
 * 图片资源工具函数
 * 从 lib/imageConfig.ts 集中获取图片 URL
 */

import { imageConfig } from './imageConfig';

// 从 Supabase URL 构建存储 URL，避免硬编码
const getStorageBaseUrl = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/tupian`;
  }
  return '/images';
};

/**
 * 构建完整的 Supabase Storage URL
 * @param path 文件路径（相对于存储桶根目录）
 * @param options 配置选项
 * @returns 完整的公开访问 URL
 * 
 * @example
 * // 基础用法
 * getImageUrl('logo.png')
 * // => https://xxx.supabase.co/storage/v1/object/public/tupian/logo.png
 */
export function getImageUrl(
  path: string,
  options?: {
    bucket?: string;
    width?: number;
    height?: number;
    quality?: number;
    format?: 'origin' | 'jpg' | 'png' | 'webp';
    resize?: 'cover' | 'contain' | 'fill';
  }
): string {
  const STORAGE_BASE_URL = getStorageBaseUrl();
  
  // 如果 path 已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 构建基础 URL
  const baseUrl = `${STORAGE_BASE_URL}/${path}`;
  
  // 如果配置了优化参数，使用 render API
  if (options?.width || options?.height || options?.quality) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const width = options.width || 1200;
    const height = options.height || 630;
    const quality = options.quality || 80;
    const format = options.format || 'webp';
    const resize = options.resize || 'cover';
    
    return `${supabaseUrl}/storage/v1/render/image/public/tupian/${path}?width=${width}&height=${height}&quality=${quality}&format=${format}&resize=${resize}`;
  }
  
  return baseUrl;
}

/**
 * 获取多个图片 URL（批量处理）
 * @param paths 文件路径数组
 * @param options 配置选项
 * @returns URL 数组
 */
export function getImageUrls(
  paths: string[],
  options?: Parameters<typeof getImageUrl>[1]
): string[] {
  return paths.map(path => getImageUrl(path, options));
}

/**
 * 获取 Logo URL
 */
export function getLogoUrl(): string {
  return imageConfig.logo.main || '/logo.png';
}

/**
 * 获取 Banner 图片 URL
 * @param index Banner 序号（1, 2, 3...）
 */
export function getBannerUrl(index: number): string {
  return imageConfig.banners[index - 1]?.img || '/images/banner-1.jpg';
}

/**
 * 获取轮播图 URL
 * @param index 轮播图序号（1, 2, 3...）
 */
export function getCarouselUrl(index: number): string {
  return imageConfig.carousel[index - 1]?.img || '/images/carousel-1.jpg';
}

/**
 * 获取服务图标 URL
 * @param key 图标键名
 */
export function getServiceIconUrl(key: keyof typeof imageConfig.serviceIcons): string {
  return imageConfig.serviceIcons[key] || '/logo.png';
}

/**
 * 获取头像 URL
 * @param type 头像类型
 */
export function getAvatarUrl(type: 'agent' | 'default' = 'default'): string {
  return imageConfig.avatars[type] || imageConfig.avatars.default;
}

/**
 * 获取培训营背景图 URL
 * @param key 背景图键名
 */
export function getTrainingBgUrl(key: keyof typeof imageConfig.training): string {
  return imageConfig.training[key] || '/images/bg-1.png';
}

/**
 * 检查图片 URL 是否有效（返回占位图）
 * @param url 图片 URL
 * @param fallback 备用图片路径或 data URL
 */
export function getImageWithFallback(url: string | undefined, fallback?: string): string {
  if (!url || url === '') {
    // 使用内联 SVG 作为默认占位图，避免外部文件依赖
    return fallback || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Cpath fill="%239ca3af" d="M35 40h30v20H35z"/%3E%3Cpath fill="%23d1d5db" d="M30 55l15-15 10 10 15-15v20H30z"/%3E%3C/svg%3E';
  }
  return url;
}

// 导出 imageConfig 供其他模块使用
export { imageConfig };
