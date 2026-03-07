/**
 * 使用 postgres 客户端执行数据库迁移
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 缺少 DATABASE_URL 环境变量');
  console.error('请在 .env 文件中添加:');
  console.error('DATABASE_URL=postgres://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?sslmode=require');
  process.exit(1);
}

// 创建数据库连接
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
});

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...\n');

  try {
    // 1. 为 profiles 表添加人脸数据字段
    console.log('📋 步骤 1: 为 profiles 表添加人脸数据字段...');
    await sql`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS face_image_key TEXT,
      ADD COLUMN IF NOT EXISTS face_image_url TEXT,
      ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMP WITH TIME ZONE
    `;
    console.log('✅ profiles 表字段添加成功\n');

    // 2. 创建 education_content 表
    console.log('📋 步骤 2: 创建 education_content 表...');
    await sql`
      CREATE TABLE IF NOT EXISTS education_content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        content_type VARCHAR(50) NOT NULL,
        
        cover_image_key TEXT,
        cover_image_url TEXT,
        video_key TEXT,
        video_url TEXT,
        document_key TEXT,
        document_url TEXT,
        document_name TEXT,
        
        category VARCHAR(50) DEFAULT 'general',
        tags TEXT[],
        duration INTEGER,
        author TEXT,
        author_title TEXT,
        
        status VARCHAR(20) DEFAULT 'DRAFT',
        sort_order INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT FALSE,
        
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        
        published_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES profiles(id),
        updated_by UUID REFERENCES profiles(id)
      )
    `;
    console.log('✅ education_content 表创建成功\n');

    // 3. 创建索引
    console.log('📋 步骤 3: 创建索引...');
    await sql`CREATE INDEX IF NOT EXISTS idx_education_content_status ON education_content(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_education_content_category ON education_content(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_education_content_sort_order ON education_content(sort_order)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_education_content_created_at ON education_content(created_at DESC)`;
    console.log('✅ 索引创建成功\n');

    // 4. 创建 user_learning_progress 表
    console.log('📋 步骤 4: 创建 user_learning_progress 表...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_learning_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
        
        progress INTEGER DEFAULT 0,
        last_position INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP WITH TIME ZONE,
        
        liked BOOLEAN DEFAULT FALSE,
        bookmarked BOOLEAN DEFAULT FALSE,
        
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, content_id)
      )
    `;
    console.log('✅ user_learning_progress 表创建成功\n');

    // 5. 创建学习进度索引
    console.log('📋 步骤 5: 创建学习进度索引...');
    await sql`CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user ON user_learning_progress(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_learning_progress_content ON user_learning_progress(content_id)`;
    console.log('✅ 学习进度索引创建成功\n');

    // 6. 启用 RLS
    console.log('📋 步骤 6: 启用 RLS...');
    await sql`ALTER TABLE education_content ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE user_learning_progress ENABLE ROW LEVEL SECURITY`;
    console.log('✅ RLS 已启用\n');

    // 7. 创建 RLS 策略 (先删除已存在的)
    console.log('📋 步骤 7: 创建 RLS 策略...');
    
    try {
      await sql`DROP POLICY IF EXISTS "Anyone can view published education content" ON education_content`;
      await sql`DROP POLICY IF EXISTS "Admins can manage all education content" ON education_content`;
      await sql`DROP POLICY IF EXISTS "Users can view own learning progress" ON user_learning_progress`;
      await sql`DROP POLICY IF EXISTS "Users can insert own learning progress" ON user_learning_progress`;
      await sql`DROP POLICY IF EXISTS "Users can update own learning progress" ON user_learning_progress`;
    } catch (e) {
      // 忽略不存在的策略错误
    }

    await sql`
      CREATE POLICY "Anyone can view published education content"
        ON education_content FOR SELECT
        USING (status = 'PUBLISHED')
    `;

    await sql`
      CREATE POLICY "Admins can manage all education content"
        ON education_content FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.admin_level IN ('admin', 'super_admin')
          )
        )
    `;

    await sql`
      CREATE POLICY "Users can view own learning progress"
        ON user_learning_progress FOR SELECT
        USING (user_id = auth.uid())
    `;

    await sql`
      CREATE POLICY "Users can insert own learning progress"
        ON user_learning_progress FOR INSERT
        WITH CHECK (user_id = auth.uid())
    `;

    await sql`
      CREATE POLICY "Users can update own learning progress"
        ON user_learning_progress FOR UPDATE
        USING (user_id = auth.uid())
    `;

    console.log('✅ RLS 策略创建成功\n');

    // 8. 创建触发器函数
    console.log('📋 步骤 8: 创建触发器...');
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    // 删除旧触发器（如果存在）
    await sql`DROP TRIGGER IF EXISTS update_education_content_updated_at ON education_content`;

    // 创建新触发器
    await sql`
      CREATE TRIGGER update_education_content_updated_at
        BEFORE UPDATE ON education_content
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `;
    console.log('✅ 触发器创建成功\n');

    // 9. 插入示例数据
    console.log('📋 步骤 9: 插入示例投教内容...');
    const existingContent = await sql`SELECT COUNT(*) FROM education_content`;
    if (existingContent[0].count === '0') {
      await sql`
        INSERT INTO education_content (title, description, content_type, category, status, sort_order, is_featured)
        VALUES
          ('股票投资基础知识', '了解股票市场的基本概念、交易规则和投资策略', 'video', 'basics', 'PUBLISHED', 1, true),
          ('风险管理与止损策略', '学习如何控制投资风险，设置合理的止损点', 'video', 'risk', 'PUBLISHED', 2, true),
          ('技术分析入门', '掌握K线图、均线等技术分析工具的使用方法', 'video', 'advanced', 'PUBLISHED', 3, false),
          ('价值投资理念', '学习巴菲特的价值投资方法和选股策略', 'article', 'strategy', 'PUBLISHED', 4, true),
          ('新手投资指南', '为初次接触股市的投资者准备的完整指南', 'document', 'basics', 'PUBLISHED', 5, false)
      `;
      console.log('✅ 示例数据插入成功\n');
    } else {
      console.log('⏭️  已有内容数据，跳过插入\n');
    }

    // 10. 验证结果
    console.log('📋 步骤 10: 验证迁移结果...');
    
    const profilesColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('face_image_key', 'face_image_url', 'face_verified', 'face_verified_at')
    `;
    console.log(`   profiles 表新增字段: ${profilesColumns.length}/4`);

    const eduCount = await sql`SELECT COUNT(*) as count FROM education_content`;
    console.log(`   education_content 表记录数: ${eduCount[0].count}`);

    console.log('\n' + '='.repeat(50));
    console.log('✨ 数据库迁移完成！');
    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
