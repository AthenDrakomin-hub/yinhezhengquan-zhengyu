/**
 * 投教内容上传组件
 */
import React, { useState, useCallback } from 'react';
import { ICONS } from '../../lib/constants';
import {
  uploadEducationVideo,
  uploadEducationCover,
  uploadEducationDocument,
} from '../../services/supabaseStorageService';
import { supabase } from '../../lib/supabase';

interface EducationUploadProps {
  contentId?: string;
  onUploadSuccess?: (type: 'cover' | 'video' | 'document', key: string, url: string) => void;
  onUploadError?: (type: string, error: Error) => void;
}

const EducationUpload: React.FC<EducationUploadProps> = ({
  contentId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [uploading, setUploading] = useState<'cover' | 'video' | 'document' | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);

  // 上传封面图
  const handleCoverUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contentId) return;

    // 验证文件类型
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('请上传 JPEG、PNG 或 WebP 格式的图片');
      return;
    }

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // 上传
    setUploading('cover');
    try {
      const { key, url, error } = await uploadEducationCover(contentId, file);
      if (error) throw error;

      // 更新数据库
      await supabase
        .from('education_content')
        .update({ cover_image_key: key, cover_image_url: url })
        .eq('id', contentId);

      onUploadSuccess?.('cover', key, url);
    } catch (err) {
      console.error('封面上传失败:', err);
      onUploadError?.('cover', err as Error);
      alert('封面上传失败');
    } finally {
      setUploading(null);
    }
  }, [contentId, onUploadSuccess, onUploadError]);

  // 上传视频
  const handleVideoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contentId) return;

    // 验证文件类型
    if (!['video/mp4', 'video/webm'].includes(file.type)) {
      alert('请上传 MP4 或 WebM 格式的视频');
      return;
    }

    // 验证文件大小（最大100MB）
    if (file.size > 100 * 1024 * 1024) {
      alert('视频大小不能超过 100MB');
      return;
    }

    setVideoName(file.name);

    // 上传
    setUploading('video');
    try {
      const { key, url, error } = await uploadEducationVideo(contentId, file);
      if (error) throw error;

      // 更新数据库
      await supabase
        .from('education_content')
        .update({ video_key: key, video_url: url })
        .eq('id', contentId);

      onUploadSuccess?.('video', key, url);
      alert('视频上传成功！');
    } catch (err) {
      console.error('视频上传失败:', err);
      onUploadError?.('video', err as Error);
      alert('视频上传失败');
    } finally {
      setUploading(null);
    }
  }, [contentId, onUploadSuccess, onUploadError]);

  // 上传文档
  const handleDocumentUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contentId) return;

    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('请上传 PDF 或 Word 文档');
      return;
    }

    setDocName(file.name);

    // 上传
    setUploading('document');
    try {
      const { key, url, error } = await uploadEducationDocument(contentId, file);
      if (error) throw error;

      // 更新数据库
      await supabase
        .from('education_content')
        .update({ document_key: key, document_url: url, document_name: file.name })
        .eq('id', contentId);

      onUploadSuccess?.('document', key, url);
      alert('文档上传成功！');
    } catch (err) {
      console.error('文档上传失败:', err);
      onUploadError?.('document', err as Error);
      alert('文档上传失败');
    } finally {
      setUploading(null);
    }
  }, [contentId, onUploadSuccess, onUploadError]);

  if (!contentId) {
    return (
      <div className="text-center py-8 text-[var(--color-text-muted)]">
        请先创建内容后再上传文件
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 封面上传 */}
      <div className="glass-card p-4 space-y-4">
        <h4 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">
          封面图片
        </h4>

        <div className="relative aspect-video bg-[var(--color-surface)] rounded-xl border-2 border-dashed border-[var(--color-border)] flex items-center justify-center overflow-hidden">
          {coverPreview ? (
            <img src={coverPreview} alt="封面预览" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-[var(--color-text-muted)]">
              <ICONS.Camera size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-[10px] font-bold">建议尺寸 16:9</p>
            </div>
          )}

          {uploading === 'cover' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverUpload}
            className="hidden"
            disabled={uploading !== null}
          />
          <div className="py-2.5 text-center text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-all">
            上传封面
          </div>
        </label>
      </div>

      {/* 视频上传 */}
      <div className="glass-card p-4 space-y-4">
        <h4 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">
          视频文件
        </h4>

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
          {videoName ? (
            <div className="flex items-center gap-3">
              <ICONS.Chart size={20} className="text-[#00D4AA]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                  {videoName}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">已上传</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-[var(--color-text-muted)]">
              <ICONS.Chart size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-[10px]">支持 MP4、WebM，最大 100MB</p>
            </div>
          )}
        </div>

        <label className="cursor-pointer block">
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoUpload}
            className="hidden"
            disabled={uploading !== null}
          />
          <div className={`py-2.5 text-center text-xs font-bold rounded-lg transition-all ${
            uploading === 'video'
              ? 'bg-[#00D4AA]/20 text-[#00D4AA]'
              : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
          }`}>
            {uploading === 'video' ? '上传中...' : '上传视频'}
          </div>
        </label>
      </div>

      {/* 文档上传 */}
      <div className="glass-card p-4 space-y-4">
        <h4 className="text-xs font-black text-[var(--color-text-primary)] uppercase tracking-widest">
          文档资料
        </h4>

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
          {docName ? (
            <div className="flex items-center gap-3">
              <ICONS.FileText size={20} className="text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                  {docName}
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)]">已上传</p>
              </div>
            </div>
          ) : (
            <div className="text-center text-[var(--color-text-muted)]">
              <ICONS.FileText size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-[10px]">支持 PDF、Word 文档</p>
            </div>
          )}
        </div>

        <label className="cursor-pointer block">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleDocumentUpload}
            className="hidden"
            disabled={uploading !== null}
          />
          <div className={`py-2.5 text-center text-xs font-bold rounded-lg transition-all ${
            uploading === 'document'
              ? 'bg-blue-500/20 text-blue-500'
              : 'bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
          }`}>
            {uploading === 'document' ? '上传中...' : '上传文档'}
          </div>
        </label>
      </div>
    </div>
  );
};

export default EducationUpload;
