/**
 * 修复 RLS 策略的无限递归问题
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const databaseUrl = process.env.DATABASE_URL!;

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
});

async function fixRLSPolicies() {
  console.log('🔧 修复 RLS 策略...\n');

  try {
    // 问题：education_content 的 RLS 策略引用了 profiles 表
    // 而 profiles 表的 RLS 策略又可能引用其他表，导致无限递归

    // 解决方案：使用 SECURITY DEFINER 函数来绕过 RLS 检查

    // 1. 创建安全函数来检查管理员权限
    console.log('📋 步骤 1: 创建安全函数检查管理员权限...');
    await sql`
      CREATE OR REPLACE FUNCTION is_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.admin_level IN ('admin', 'super_admin')
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE
    `;
    console.log('✅ 安全函数创建成功\n');

    // 2. 删除旧的管理员策略
    console.log('📋 步骤 2: 删除旧的管理员策略...');
    await sql`
      DROP POLICY IF EXISTS "Admins can manage all education content" ON education_content
    `;
    console.log('✅ 旧策略已删除\n');

    // 3. 创建新的管理员策略（使用安全函数）
    console.log('📋 步骤 3: 创建新的管理员策略...');
    await sql`
      CREATE POLICY "Admins can manage all education content"
        ON education_content FOR ALL
        USING (is_admin())
    `;
    console.log('✅ 新策略创建成功\n');

    // 4. 验证修复结果
    console.log('📋 步骤 4: 验证修复结果...');
    
    // 检查策略
    const policies = await sql`
      SELECT policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename = 'education_content'
    `;
    
    console.log('当前 education_content 表的 RLS 策略:');
    policies.forEach(p => {
      console.log(`   - ${p.policyname} (${p.cmd})`);
    });

    console.log('\n✨ RLS 策略修复完成！');

  } catch (error: any) {
    console.error('❌ 修复失败:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

fixRLSPolicies()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
