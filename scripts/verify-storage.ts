/**
 * 验证 Supabase 存储功能
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 创建匿名客户端（模拟前端用户）
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

// 创建服务端客户端
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function verifyStorage() {
  console.log('🔍 开始验证 Supabase 存储功能...\n');

  const results = {
    buckets: false,
    educationContent: false,
    rls: false,
    uploadTest: false,
  };

  // 1. 验证存储桶
  console.log('📋 步骤 1: 验证存储桶是否存在...');
  const { data: buckets, error: bucketsError } = await serviceClient.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ 获取存储桶失败:', bucketsError.message);
  } else {
    const requiredBuckets = ['faces', 'education', 'avatars', 'documents'];
    const existingBuckets = buckets?.map(b => b.name) || [];
    const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));

    if (missingBuckets.length === 0) {
      console.log('✅ 所有存储桶都已创建:');
      existingBuckets.forEach(b => {
        const bucket = buckets?.find(bucket => bucket.name === b);
        console.log(`   - ${b} (${bucket?.public ? '公开' : '私有'})`);
      });
      results.buckets = true;
    } else {
      console.log('❌ 缺少存储桶:', missingBuckets.join(', '));
    }
  }

  // 2. 验证投教内容表
  console.log('\n📋 步骤 2: 验证 education_content 表...');
  const { data: educationContent, error: eduError } = await anonClient
    .from('education_content')
    .select('id, title, content_type, category, status')
    .eq('status', 'PUBLISHED');

  if (eduError) {
    console.error('❌ 查询投教内容失败:', eduError.message);
  } else {
    console.log(`✅ 投教内容表正常，已发布内容: ${educationContent?.length || 0} 条`);
    educationContent?.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.title} (${item.content_type} / ${item.category})`);
    });
    results.educationContent = true;
  }

  // 3. 验证 RLS 策略
  console.log('\n📋 步骤 3: 验证 RLS 策略...');
  const { data: allContent, error: allError } = await anonClient
    .from('education_content')
    .select('id, status');

  if (allError) {
    console.error('❌ RLS 策略验证失败:', allError.message);
  } else {
    const hasUnpublished = allContent?.some(c => c.status !== 'PUBLISHED');
    if (!hasUnpublished) {
      console.log('✅ RLS 策略正常：匿名用户只能看到已发布内容');
      results.rls = true;
    } else {
      console.log('⚠️  RLS 策略可能有问题：匿名用户能看到未发布内容');
    }
  }

  // 4. 测试文件上传（使用 avatars 存储桶，它是公开的）
  console.log('\n📋 步骤 4: 测试文件上传...');
  // 创建一个小的测试图片（PNG 格式）
  const testImageContent = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  const testPath = `test-${Date.now()}.png`;

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from('avatars')
    .upload(testPath, testImageContent, {
      contentType: 'image/png',
    });

  if (uploadError) {
    console.log('❌ 文件上传失败:', uploadError.message);
  } else {
    console.log('✅ 文件上传成功:', uploadData?.path);

    // 测试获取公共 URL
    const { data: urlData } = serviceClient.storage
      .from('avatars')
      .getPublicUrl(testPath);

    console.log('   公共 URL:', urlData?.publicUrl);

    // 清理测试文件
    await serviceClient.storage.from('avatars').remove([testPath]);
    console.log('   测试文件已清理');
    results.uploadTest = true;
  }

  // 5. 汇总结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 验证结果汇总:');
  console.log(`   存储桶状态: ${results.buckets ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   投教内容表: ${results.educationContent ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   RLS 策略: ${results.rls ? '✅ 正常' : '⚠️ 需检查'}`);
  console.log(`   文件上传: ${results.uploadTest ? '✅ 正常' : '❌ 异常'}`);
  console.log('='.repeat(50));

  const allPassed = Object.values(results).every(v => v);
  if (allPassed) {
    console.log('\n✨ 所有验证通过！存储功能已就绪。');
  } else {
    console.log('\n⚠️  部分验证未通过，请检查上述错误信息。');
  }

  return allPassed;
}

verifyStorage()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('验证失败:', err);
    process.exit(1);
  });
