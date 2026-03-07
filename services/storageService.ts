/**
 * 对象存储服务 - 用于存储用户人脸数据和投教内容
 */
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化 S3 存储客户端
export const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 存储类型定义
export type StorageCategory = 'face' | 'education' | 'avatar' | 'document';

/**
 * 上传人脸数据
 * @param userId 用户ID
 * @param fileBuffer 文件Buffer
 * @param fileName 文件名
 * @returns 存储的key
 */
export async function uploadFaceData(
  userId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const key = await storage.uploadFile({
    fileContent: fileBuffer,
    fileName: `faces/${userId}/${fileName}`,
    contentType: 'image/jpeg',
  });
  return key;
}

/**
 * 上传投教内容
 * @param category 内容分类（video, image, document）
 * @param contentId 内容ID
 * @param fileBuffer 文件Buffer
 * @param fileName 文件名
 * @param contentType MIME类型
 * @returns 存储的key
 */
export async function uploadEducationContent(
  category: 'video' | 'image' | 'document',
  contentId: string,
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const key = await storage.uploadFile({
    fileContent: fileBuffer,
    fileName: `education/${category}/${contentId}/${fileName}`,
    contentType,
  });
  return key;
}

/**
 * 上传用户头像
 * @param userId 用户ID
 * @param fileBuffer 文件Buffer
 * @param fileName 文件名
 * @returns 存储的key
 */
export async function uploadAvatar(
  userId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const key = await storage.uploadFile({
    fileContent: fileBuffer,
    fileName: `avatars/${userId}/${fileName}`,
    contentType: 'image/jpeg',
  });
  return key;
}

/**
 * 获取文件访问URL
 * @param key 文件key
 * @param expireTime 过期时间（秒），默认1天
 * @returns 签名URL
 */
export async function getFileUrl(key: string, expireTime: number = 86400): Promise<string> {
  return await storage.generatePresignedUrl({
    key,
    expireTime,
  });
}

/**
 * 删除文件
 * @param key 文件key
 * @returns 是否删除成功
 */
export async function deleteFile(key: string): Promise<boolean> {
  return await storage.deleteFile({ fileKey: key });
}

/**
 * 检查文件是否存在
 * @param key 文件key
 * @returns 是否存在
 */
export async function fileExists(key: string): Promise<boolean> {
  return await storage.fileExists({ fileKey: key });
}

/**
 * 列出指定前缀的文件
 * @param prefix 文件前缀
 * @param maxKeys 最大返回数量
 * @returns 文件列表
 */
export async function listFiles(prefix: string, maxKeys: number = 100) {
  return await storage.listFiles({ prefix, maxKeys });
}
