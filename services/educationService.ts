/**
 * 投教服务 - 教育内容管理
 */
import { supabase } from '@/lib/supabase';
import type { EducationTopic } from '@/lib/types';

// 投教分类
export const EDUCATION_CATEGORIES = [
  { value: 'BASICS', label: '基础知识', icon: '📚' },
  { value: 'STRATEGY', label: '投资策略', icon: '🎯' },
  { value: 'RISK', label: '风险控制', icon: '🛡️' },
  { value: 'TOOLS', label: '交易工具', icon: '🔧' },
  { value: 'MARKET', label: '市场分析', icon: '📊' },
  { value: 'PSYCHOLOGY', label: '投资心理', icon: '🧠' },
] as const;

// 难度等级
export const DIFFICULTY_LEVELS = [
  { value: 'BEGINNER', label: '入门级' },
  { value: 'INTERMEDIATE', label: '进阶级' },
  { value: 'ADVANCED', label: '高级' },
] as const;

// 数据库投教文章类型
interface DbEducationTopic {
  id: string;
  title: string;
  content: string;
  category: string | null;
  difficulty: string | null;
  author: string | null;
  views: number | null;
  likes: number | null;
  status: string | null;
  image: string | null;
  duration: string | null;
  order: number | null;
  is_published: boolean | null;
  created_at: string;
}

// 转换数据库格式到前端格式
const transformTopic = (db: DbEducationTopic): EducationTopic => ({
  id: db.id,
  title: db.title,
  category: db.category || 'BASICS',
  image: db.image || '',
  duration: db.duration || '',
  content: db.content,
  order: db.order ?? 0,
  is_published: db.is_published ?? false,
  // 额外字段 - 将 null 转换为 undefined
  difficulty: db.difficulty ?? undefined,
  author: db.author ?? undefined,
  views: db.views ?? undefined,
  likes: db.likes ?? undefined,
  status: db.status ?? undefined,
  created_at: db.created_at ?? undefined,
});

/**
 * 获取所有已发布的投教文章（客户端使用）
 */
export async function getPublishedEducationTopics(): Promise<EducationTopic[]> {
  const { data, error } = await supabase
    .from('education_topics')
    .select('*')
    .eq('is_published', true)
    .order('order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取投教内容失败:', error);
    return [];
  }

  return (data || []).map(transformTopic);
}

/**
 * 获取所有投教文章（管理端使用）
 */
export async function getAllEducationTopics(): Promise<EducationTopic[]> {
  const { data, error } = await supabase
    .from('education_topics')
    .select('*')
    .order('order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取投教内容失败:', error);
    return [];
  }

  return (data || []).map(transformTopic);
}

/**
 * 获取单个投教文章详情
 */
export async function getEducationTopicById(id: string): Promise<EducationTopic | null> {
  const { data, error } = await supabase
    .from('education_topics')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('获取投教内容详情失败:', error);
    return null;
  }

  return data ? transformTopic(data as DbEducationTopic) : null;
}

/**
 * 创建投教文章
 */
export async function createEducationTopic(topic: {
  title: string;
  content: string;
  category?: string;
  difficulty?: string;
  author?: string;
  image?: string;
  duration?: string;
  is_published?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('education_topics')
    .insert({
      title: topic.title,
      content: topic.content,
      category: topic.category || 'BASICS',
      difficulty: topic.difficulty || 'BEGINNER',
      author: topic.author || '银河证券',
      image: topic.image || '',
      duration: topic.duration || '',
      is_published: topic.is_published ?? false,
      status: 'PUBLISHED',
      views: 0,
      likes: 0,
      order: 0,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * 更新投教文章
 */
export async function updateEducationTopic(
  id: string,
  topic: Partial<{
    title: string;
    content: string;
    category: string;
    difficulty: string;
    author: string;
    image: string;
    duration: string;
    is_published: boolean;
    order: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('education_topics')
    .update(topic)
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 删除投教文章
 */
export async function deleteEducationTopic(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('education_topics')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 发布/取消发布投教文章
 */
export async function toggleEducationPublish(
  id: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateEducationTopic(id, { is_published: isPublished });
}

/**
 * 增加阅读量
 */
export async function incrementEducationViews(id: string): Promise<void> {
  const { data } = await supabase
    .from('education_topics')
    .select('views')
    .eq('id', id)
    .single();

  if (data) {
    await supabase
      .from('education_topics')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', id);
  }
}

/**
 * 点赞
 */
export async function likeEducationTopic(id: string): Promise<{ success: boolean; likes?: number }> {
  const { data } = await supabase
    .from('education_topics')
    .select('likes')
    .eq('id', id)
    .single();

  if (data) {
    const newLikes = (data.likes || 0) + 1;
    await supabase
      .from('education_topics')
      .update({ likes: newLikes })
      .eq('id', id);
    return { success: true, likes: newLikes };
  }

  return { success: false };
}

/**
 * 按分类获取投教文章
 */
export async function getEducationTopicsByCategory(category: string): Promise<EducationTopic[]> {
  const { data, error } = await supabase
    .from('education_topics')
    .select('*')
    .eq('is_published', true)
    .eq('category', category)
    .order('order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取分类投教内容失败:', error);
    return [];
  }

  return (data || []).map(transformTopic);
}

/**
 * 搜索投教文章
 */
export async function searchEducationTopics(keyword: string): Promise<EducationTopic[]> {
  const { data, error } = await supabase
    .from('education_topics')
    .select('*')
    .eq('is_published', true)
    .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
    .order('order', { ascending: true })
    .limit(20);

  if (error) {
    console.error('搜索投教内容失败:', error);
    return [];
  }

  return (data || []).map(transformTopic);
}
