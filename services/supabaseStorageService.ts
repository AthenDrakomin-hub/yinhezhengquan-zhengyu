/**
 * Supabase 存储服务 - 用于存储用户人脸数据和投教内容
 */
import { supabase } from '../lib/supabase';

// 存储桶名称
export const BUCKETS = {
  FACES: 'faces',
  EDUCATION: 'education',
  AVATARS: 'avatars',
  DOCUMENTS: 'documents',
} as const;

// 文件类型定义
export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

/**
 * 上传文件到指定存储桶
 * @param bucket 存储桶名称
 * @param path 文件路径（包含文件名）
 * @param file 文件内容（File、Blob 或 ArrayBuffer）
 * @returns 上传结果
 */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  file: File | Blob | ArrayBuffer
): Promise<{ key: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('上传文件失败:', error);
      return { key: '', error };
    }

    return { key: data.path, error: null };
  } catch (err) {
    console.error('上传文件异常:', err);
    return { key: '', error: err as Error };
  }
}

/**
 * 获取文件的公开访问URL（仅适用于公开存储桶）
 * @param bucket 存储桶名称
 * @param path 文件路径
 * @returns 公开URL
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * 创建文件的签名访问URL（适用于私有存储桶）
 * @param bucket 存储桶名称
 * @param path 文件路径
 * @param expiresIn 过期时间（秒），默认1小时
 * @returns 签名URL
 */
export async function createSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('创建签名URL失败:', error);
      return { url: '', error };
    }

    return { url: data.signedUrl, error: null };
  } catch (err) {
    console.error('创建签名URL异常:', err);
    return { url: '', error: err as Error };
  }
}

/**
 * 删除文件
 * @param bucket 存储桶名称
 * @param paths 文件路径或路径数组
 * @returns 删除结果
 */
export async function deleteFile(
  bucket: BucketName,
  paths: string | string[]
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    const { error } = await supabase.storage.from(bucket).remove(pathArray);

    if (error) {
      console.error('删除文件失败:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('删除文件异常:', err);
    return { success: false, error: err as Error };
  }
}

/**
 * 列出存储桶中的文件
 * @param bucket 存储桶名称
 * @param folder 文件夹路径
 * @returns 文件列表
 */
export async function listFiles(
  bucket: BucketName,
  folder: string = ''
): Promise<{ files: any[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      console.error('列出文件失败:', error);
      return { files: [], error };
    }

    return { files: data || [], error: null };
  } catch (err) {
    console.error('列出文件异常:', err);
    return { files: [], error: err as Error };
  }
}

/**
 * 检查文件是否存在
 * @param bucket 存储桶名称
 * @param path 文件路径
 * @returns 是否存在
 */
export async function fileExists(
  bucket: BucketName,
  path: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(path.split('/').slice(0, -1).join('/'), {
      search: path.split('/').pop(),
    });

    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}

// ==================== 业务特定方法 ====================

/**
 * 上传用户人脸数据
 * @param userId 用户ID
 * @param file 人脸图片文件
 * @returns 存储路径
 */
export async function uploadUserFace(
  userId: string,
  file: File | Blob
): Promise<{ key: string; url: string; error: Error | null }> {
  const timestamp = Date.now();
  const fileName = `face_${timestamp}.jpg`;
  const path = `${userId}/${fileName}`;

  const { key, error } = await uploadFile(BUCKETS.FACES, path, file);

  if (error) {
    return { key: '', url: '', error };
  }

  // 创建签名URL（有效期7天）
  const { url } = await createSignedUrl(BUCKETS.FACES, key, 604800);

  return { key, url, error: null };
}

/**
 * 上传投教视频
 * @param contentId 内容ID
 * @param file 视频文件
 * @returns 存储路径
 */
export async function uploadEducationVideo(
  contentId: string,
  file: File
): Promise<{ key: string; url: string; error: Error | null }> {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `videos/${contentId}/video.${ext}`;

  const { key, error } = await uploadFile(BUCKETS.EDUCATION, path, file);

  if (error) {
    return { key: '', url: '', error };
  }

  const { url } = await createSignedUrl(BUCKETS.EDUCATION, key, 604800);

  return { key, url, error: null };
}

/**
 * 上传投教封面图
 * @param contentId 内容ID
 * @param file 图片文件
 * @returns 存储路径
 */
export async function uploadEducationCover(
  contentId: string,
  file: File | Blob
): Promise<{ key: string; url: string; error: Error | null }> {
  const ext = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg';
  const path = `covers/${contentId}/cover.${ext}`;

  const { key, error } = await uploadFile(BUCKETS.EDUCATION, path, file);

  if (error) {
    return { key: '', url: '', error };
  }

  const { url } = await createSignedUrl(BUCKETS.EDUCATION, key, 604800);

  return { key, url, error: null };
}

/**
 * 上传投教文档
 * @param contentId 内容ID
 * @param file 文档文件
 * @returns 存储路径
 */
export async function uploadEducationDocument(
  contentId: string,
  file: File
): Promise<{ key: string; url: string; error: Error | null }> {
  const ext = file.name.split('.').pop() || 'pdf';
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `documents/${contentId}/${fileName}`;

  const { key, error } = await uploadFile(BUCKETS.EDUCATION, path, file);

  if (error) {
    return { key: '', url: '', error };
  }

  const { url } = await createSignedUrl(BUCKETS.EDUCATION, key, 604800);

  return { key, url, error: null };
}

/**
 * 上传用户头像
 * @param userId 用户ID
 * @param file 头像文件
 * @returns 公开URL
 */
export async function uploadUserAvatar(
  userId: string,
  file: File | Blob
): Promise<{ key: string; url: string; error: Error | null }> {
  const timestamp = Date.now();
  const ext = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg';
  const path = `${userId}/avatar_${timestamp}.${ext}`;

  const { key, error } = await uploadFile(BUCKETS.AVATARS, path, file);

  if (error) {
    return { key: '', url: '', error };
  }

  // 头像存储桶是公开的，直接获取公开URL
  const url = getPublicUrl(BUCKETS.AVATARS, key);

  return { key, url, error: null };
}
