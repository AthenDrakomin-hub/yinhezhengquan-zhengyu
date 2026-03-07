/**
 * 投教内容服务
 */
import { supabase } from '../lib/supabase';
import type { EducationTopic } from '../lib/types';

// 扩展类型，包含存储字段
export interface EducationContent {
  id: string;
  title: string;
  description: string | null;
  content_type: 'video' | 'article' | 'document';
  cover_image_key: string | null;
  cover_image_url: string | null;
  video_key: string | null;
  video_url: string | null;
  document_key: string | null;
  document_url: string | null;
  document_name: string | null;
  category: string;
  tags: string[];
  duration: number | null;
  author: string | null;
  author_title: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sort_order: number;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 获取投教内容列表
 */
export async function getEducationContents(
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
  category?: string
): Promise<EducationContent[]> {
  try {
    let query = supabase
      .from('education_content')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取投教内容失败:', error);
    return [];
  }
}

/**
 * 获取单个投教内容
 */
export async function getEducationContent(id: string): Promise<EducationContent | null> {
  try {
    const { data, error } = await supabase
      .from('education_content')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('获取投教内容失败:', error);
    return null;
  }
}

/**
 * 创建投教内容
 */
export async function createEducationContent(
  content: Partial<EducationContent>
): Promise<EducationContent | null> {
  try {
    const { data, error } = await supabase
      .from('education_content')
      .insert({
        title: content.title,
        description: content.description,
        content_type: content.content_type || 'video',
        category: content.category || 'general',
        status: content.status || 'DRAFT',
        author: content.author,
        author_title: content.author_title,
        tags: content.tags || [],
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('创建投教内容失败:', error);
    return null;
  }
}

/**
 * 更新投教内容
 */
export async function updateEducationContent(
  id: string,
  updates: Partial<EducationContent>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('education_content')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('更新投教内容失败:', error);
    return false;
  }
}

/**
 * 删除投教内容
 */
export async function deleteEducationContent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('education_content')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('删除投教内容失败:', error);
    return false;
  }
}

/**
 * 发布投教内容
 */
export async function publishEducationContent(id: string): Promise<boolean> {
  return updateEducationContent(id, {
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
  });
}

/**
 * 归档投教内容
 */
export async function archiveEducationContent(id: string): Promise<boolean> {
  return updateEducationContent(id, { status: 'ARCHIVED' });
}

/**
 * 记录学习进度
 */
export async function updateLearningProgress(
  userId: string,
  contentId: string,
  progress: number,
  completed: boolean = false
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_learning_progress')
      .upsert({
        user_id: userId,
        content_id: contentId,
        progress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        last_accessed_at: new Date().toISOString(),
      });

    if (error) throw error;

    // 更新观看次数
    if (progress === 0) {
      await supabase.rpc('increment_view_count', { content_id: contentId });
    }

    return true;
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return false;
  }
}

/**
 * 获取用户学习进度
 */
export async function getUserLearningProgress(
  userId: string,
  contentId: string
): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * 转换为前端显示格式
 */
export function transformToTopic(content: EducationContent): EducationTopic {
  return {
    id: content.id,
    title: content.title,
    category: content.category || 'general',
    type: content.content_type,
    duration: content.duration ? `${Math.floor(content.duration / 60)}分钟` : undefined,
    views: content.view_count,
    likes: content.like_count,
    image: content.cover_image_url || undefined,
    coverImage: content.cover_image_url || undefined,
    description: content.description || undefined,
    content: content.description || undefined,
    videoUrl: content.video_url || undefined,
    documentUrl: content.document_url || undefined,
    author: content.author || undefined,
    authorTitle: content.author_title || undefined,
    tags: content.tags,
    isFeatured: content.is_featured,
    createdAt: content.created_at,
    created_at: content.created_at,
  };
}
