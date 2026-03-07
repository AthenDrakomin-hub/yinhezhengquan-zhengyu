-- 存储桶表结构迁移
-- 为人脸数据和投教内容添加存储字段

-- ==================== 1. 用户表添加人脸数据字段 ====================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS face_image_key TEXT,
ADD COLUMN IF NOT EXISTS face_image_url TEXT,
ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE;

-- 添加注释
COMMENT ON COLUMN profiles.face_image_key IS '用户人脸图片存储key';
COMMENT ON COLUMN profiles.face_image_url IS '用户人脸图片访问URL（签名）';
COMMENT ON COLUMN profiles.face_verified IS '人脸是否已验证';
COMMENT ON COLUMN profiles.face_verified_at IS '人脸验证时间';

-- ==================== 2. 投教内容表添加存储字段 ====================
-- 如果education_content表不存在则创建
CREATE TABLE IF NOT EXISTS education_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  content_type VARCHAR(50) NOT NULL, -- 'video', 'article', 'document'
  
  -- 存储相关字段
  cover_image_key TEXT,
  cover_image_url TEXT,
  video_key TEXT,
  video_url TEXT,
  document_key TEXT,
  document_url TEXT,
  document_name TEXT,
  
  -- 内容信息
  category VARCHAR(50) DEFAULT 'general', -- 'basics', 'advanced', 'risk', 'strategy'
  tags TEXT[],
  duration INTEGER, -- 视频时长（秒）
  author TEXT,
  author_title TEXT,
  
  -- 状态和排序
  status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- 统计
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  
  -- 时间戳
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_education_content_status ON education_content(status);
CREATE INDEX IF NOT EXISTS idx_education_content_category ON education_content(category);
CREATE INDEX IF NOT EXISTS idx_education_content_sort_order ON education_content(sort_order);
CREATE INDEX IF NOT EXISTS idx_education_content_created_at ON education_content(created_at DESC);

-- 添加注释
COMMENT ON TABLE education_content IS '投教内容表';
COMMENT ON COLUMN education_content.cover_image_key IS '封面图片存储key';
COMMENT ON COLUMN education_content.video_key IS '视频文件存储key';
COMMENT ON COLUMN education_content.document_key IS '文档文件存储key';

-- ==================== 3. 用户学习记录表 ====================
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
  
  -- 进度信息
  progress INTEGER DEFAULT 0, -- 进度百分比 0-100
  last_position INTEGER DEFAULT 0, -- 上次观看位置（秒）
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- 互动
  liked BOOLEAN DEFAULT FALSE,
  bookmarked BOOLEAN DEFAULT FALSE,
  
  -- 时间戳
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, content_id)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user ON user_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_content ON user_learning_progress(content_id);

-- ==================== 4. RLS 策略 ====================

-- education_content 表 RLS
ALTER TABLE education_content ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看已发布的内容
CREATE POLICY "Anyone can view published education content"
  ON education_content FOR SELECT
  USING (status = 'PUBLISHED');

-- 管理员可以管理所有内容
CREATE POLICY "Admins can manage all education content"
  ON education_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_level IN ('admin', 'super_admin')
    )
  );

-- user_learning_progress 表 RLS
ALTER TABLE user_learning_progress ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的学习进度
CREATE POLICY "Users can view own learning progress"
  ON user_learning_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own learning progress"
  ON user_learning_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own learning progress"
  ON user_learning_progress FOR UPDATE
  USING (user_id = auth.uid());

-- ==================== 5. 触发器 ====================

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_education_content_updated_at
  BEFORE UPDATE ON education_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==================== 6. 初始化投教内容示例 ====================

INSERT INTO education_content (title, description, content_type, category, status, sort_order, is_featured)
VALUES
  ('股票投资基础知识', '了解股票市场的基本概念、交易规则和投资策略', 'video', 'basics', 'PUBLISHED', 1, true),
  ('风险管理与止损策略', '学习如何控制投资风险，设置合理的止损点', 'video', 'risk', 'PUBLISHED', 2, true),
  ('技术分析入门', '掌握K线图、均线等技术分析工具的使用方法', 'video', 'advanced', 'PUBLISHED', 3, false),
  ('价值投资理念', '学习巴菲特的价值投资方法和选股策略', 'article', 'strategy', 'PUBLISHED', 4, true),
  ('新手投资指南', '为初次接触股市的投资者准备的完整指南', 'document', 'basics', 'PUBLISHED', 5, false)
ON CONFLICT DO NOTHING;
