/**
 * 数据库初始化脚本
 * 确保数据库表结构正确
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少Supabase环境变量配置');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    console.log('正在检查 ipos 表是否存在...');
    
    // 首先尝试查询表以检查是否存在
    const { error: checkError } = await supabase
      .from('ipos')
      .select('id')
      .limit(1);

    if (checkError) {
      if (checkError.message.includes('does not exist')) {
        console.log('ipos 表不存在，需要先通过迁移创建');
      } else {
        console.log('检查 ipos 表时出现其他错误:', checkError.message);
      }
    } else {
      console.log('ipos 表已存在');
    }

    console.log('注意：要添加扩展字段，请运行 Supabase 迁移命令:');
    console.log('supabase db push');
    console.log('或手动在数据库中执行以下 SQL 命令:');
    console.log(`
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS subscription_code TEXT;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS issue_volume BIGINT;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS online_issue_volume BIGINT;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS pe_ratio NUMERIC(8,2);
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS issue_date DATE;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS online_issue_date DATE;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS lottery_date DATE;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS refund_date DATE;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS listing_date_plan DATE;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS issue_method TEXT;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS underwriter TEXT;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS min_subscription_unit INTEGER DEFAULT 500;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS max_subscription_quantity BIGINT;
      ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS lockup_period INTEGER;
    `);

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('初始化数据库时发生错误:', error);
  }
}

async function checkIPOTable() {
  try {
    // 测试查询 ipos 表
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .limit(1);

    if (error) {
      console.error('查询 ipos 表失败:', error);
      return false;
    }

    console.log('ipos 表可正常访问，返回数据示例:', data?.[0] || '无数据');
    return true;
  } catch (error) {
    console.error('检查 ipos 表时发生错误:', error);
    return false;
  }
}

// 运行初始化
if (require.main === module) {
  initDatabase()
    .then(async () => {
      console.log('开始检查 ipos 表...');
      const isAccessible = await checkIPOTable();
      if (isAccessible) {
        console.log('数据库初始化和检查完成，ipos 表可正常访问');
      } else {
        console.log('数据库初始化完成，但 ipos 表访问存在问题');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('数据库初始化失败:', error);
      process.exit(1);
    });
}

export { initDatabase, checkIPOTable };