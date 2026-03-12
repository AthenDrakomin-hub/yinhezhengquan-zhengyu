/**
 * 人脸数据上传组件
 */
import React, { useState, useCallback } from 'react';
import { ICONS } from '../../../lib/constants';
import { uploadUserFace } from '../../../services/supabaseStorageService';
import { supabase } from '../../../lib/supabase';

interface FaceUploadProps {
  userId: string;
  onUploadSuccess?: (key: string, url: string) => void;
  onUploadError?: (error: Error) => void;
}

const FaceUpload: React.FC<FaceUploadProps> = ({
  userId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [faceKey, setFaceKey] = useState<string | null>(null);

  // 处理文件选择
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('请上传 JPEG、PNG 或 WebP 格式的图片');
      return;
    }

    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传文件
    setUploading(true);
    try {
      const { key, url, error } = await uploadUserFace(userId, file);

      if (error) {
        throw error;
      }

      setFaceKey(key);

      // 更新用户资料
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          face_image_key: key,
          face_image_url: url,
          face_verified: true,
          face_verified_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      onUploadSuccess?.(key, url);
      alert('人脸数据上传成功！');
    } catch (err) {
      console.error('上传失败:', err);
      onUploadError?.(err as Error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [userId, onUploadSuccess, onUploadError]);

  // 处理摄像头拍照
  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user'; // 使用前置摄像头
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // 模拟事件触发
        const event = {
          target: { files: [file] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileSelect(event);
      }
    };
    input.click();
  }, [handleFileSelect]);

  return (
    <div className="galaxy-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[var(--color-text-primary)] uppercase tracking-widest">
          人脸数据采集
        </h3>
        {faceKey && (
          <span className="text-[10px] font-black text-[#00D4AA] bg-[#00D4AA]/10 px-2 py-1 rounded">
            已上传
          </span>
        )}
      </div>

      <div className="text-xs text-[var(--color-text-muted)] space-y-2">
        <p>• 请上传清晰的正面人脸照片</p>
        <p>• 支持 JPEG、PNG、WebP 格式</p>
        <p>• 文件大小不超过 5MB</p>
      </div>

      {/* 预览区域 */}
      <div className="relative aspect-[4/3] bg-[var(--color-surface)] rounded-2xl border-2 border-dashed border-[var(--color-border)] flex items-center justify-center overflow-hidden">
        {preview ? (
          <img
            src={preview}
            alt="预览"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-[var(--color-text-muted)]">
            <ICONS.User size={48} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs font-bold">点击上传或拍照</p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <div className="py-3 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-center text-xs font-black uppercase tracking-widest hover:bg-[var(--color-surface-hover)] transition-all">
            <ICONS.Camera size={16} className="inline-block mr-2" />
            上传图片
          </div>
        </label>

        <button
          onClick={handleCameraCapture}
          disabled={uploading}
          className="flex-1 py-3 px-4 bg-[#00D4AA] text-[var(--color-bg)] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#00D4AA]/90 transition-all disabled:opacity-50"
        >
          <ICONS.Camera size={16} className="inline-block mr-2" />
          拍照
        </button>
      </div>
    </div>
  );
};

export default FaceUpload;
