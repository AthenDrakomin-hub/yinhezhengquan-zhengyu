/**
 * 图片资源工具函数
 * 支持从 Supabase Storage 或环境变量配置获取图片 URL
 */

interface StorageConfig {
  baseUrl: string;
  bucket: string;
  folder?: string;
}

/**
 * 获取 Storage 配置
 */
const getStorageConfig = (): StorageConfig => ({
  baseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  bucket: import.meta.env.VITE_STORAGE_BUCKET || 'public',
  folder: import.meta.env.VITE_STORAGE_FOLDER || 'images',
});

/**
 * 构建完整的 Supabase Storage URL
 * @param path 文件路径（相对于存储桶根目录）
 * @param options 配置选项
 * @returns 完整的公开访问 URL
 * 
 * @example
 * // 基础用法
 * getImageUrl('logo.png')
 * // => https://xxx.supabase.co/storage/v1/object/public/public/images/logo.png
 * 
 * // 指定其他存储桶
 * getImageUrl('avatars/user1.png', { bucket: 'avatars' })
 * 
 * // 带图片优化参数
 * getImageUrl('banner.jpg', { width: 1200, quality: 80 })
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
  const config = getStorageConfig();
  const bucket = options?.bucket || config.bucket;
  const folder = config.folder ? `${config.folder}/` : '';
  
  // 如果 path 已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // 构建基础 URL
  const baseUrl = `${config.baseUrl}/storage/v1/object/public/${bucket}/${folder}${path}`;
  
  // 如果配置了优化参数，使用 render API
  if (options?.width || options?.height || options?.quality) {
    const width = options.width || 1200;
    const height = options.height || 630;
    const quality = options.quality || 80;
    const format = options.format || 'webp';
    const resize = options.resize || 'cover';
    
    return `${config.baseUrl}/storage/v1/render/image/public/${bucket}/${folder}${path}?width=${width}&height=${height}&quality=${quality}&format=${format}&resize=${resize}`;
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
 * 优先从环境变量读取，否则使用 Storage 默认路径
 */
export function getLogoUrl(): string {
  // 优先使用环境变量中配置的完整 URL
  const envLogo = import.meta.env.VITE_LOGO_URL;
  if (envLogo) return envLogo;
  
  // 默认使用 Storage 中的 logo
  return getImageUrl('logo.png');
}

/**
 * 获取 Banner 图片 URL
 * @param index Banner 序号（1, 2, 3...）
 */
export function getBannerUrl(index: number): string {
  const envKey = `VITE_BANNER_IMAGE_${index}`;
  const envUrl = import.meta.env[envKey];
  if (envUrl) return envUrl;
  
  return getImageUrl(`banner-${index}.jpg`);
}

/**
 * 获取轮播图 URL
 * @param index 轮播图序号（1, 2, 3...）
 */
export function getCarouselUrl(index: number): string {
  const envKey = `VITE_CAROUSEL_IMAGE_${index}`;
  const envUrl = import.meta.env[envKey];
  if (envUrl) return envUrl;
  
  return getImageUrl(`carousel-${index}.jpg`);
}

/**
 * 获取服务图标 URL
 * @param name 图标名称
 */
export function getServiceIconUrl(name: string): string {
  return getImageUrl(`service-icons/${name}.png`);
}

/**
 * 获取头像 URL
 * @param filename 头像文件名
 */
export function getAvatarUrl(filename: string = 'default'): string {
  const envAvatar = import.meta.env.VITE_AGENT_AVATAR_URL;
  if (envAvatar) return envAvatar;
  
  return getImageUrl(`avatars/${filename}.png`, { bucket: 'avatars' });
}

/**
 * 获取培训营背景图 URL
 * @param index 背景图序号
 */
export function getTrainingBgUrl(index: number): string {
  const envKey = `VITE_TRAINING_BG_${index}`;
  const envUrl = import.meta.env[envKey];
  if (envUrl) return envUrl;
  
  return getImageUrl(`training-bg-${index}.jpg`);
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
