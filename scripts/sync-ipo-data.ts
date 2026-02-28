/**
 * IPO数据同步脚本
 * 用于将新浪财经的IPO数据同步到Supabase数据库
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少Supabase环境变量配置');
  process.exit(1);
}

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SinaIPOData {
  symbol: string;
  subscription_code: string;
  name: string;
  price: number;
  market: string;
  status: string;
  listing_date?: string;
  issue_volume?: number;
  online_issue_volume?: number;
  pe_ratio?: number;
  issue_date?: string;
  online_issue_date?: string;
  lottery_date?: string;
  refund_date?: string;
  listing_date_plan?: string;
  issue_method?: string;
  underwriter?: string;
  min_subscription_unit?: number;
  max_subscription_quantity?: number;
  lockup_period?: number;
}

async function fetchSinaIPOData(): Promise<SinaIPOData[]> {
  try {
    console.log('正在从新浪财经获取IPO数据...');
    
    // 注意：这只是一个示例，实际实现需要处理反爬虫机制
    // 这里我们返回一些模拟数据作为示例
    return [
      {
        symbol: "001234",
        subscription_code: "001234",
        name: "测试新股",
        price: 15.50,
        market: "SZ",
        status: "UPCOMING",
        listing_date: "2025-04-15",
        issue_volume: 50000000, // 5亿股
        online_issue_volume: 45000000, // 4.5亿股
        pe_ratio: 22.50,
        issue_date: "2025-04-10",
        online_issue_date: "2025-04-10",
        lottery_date: "2025-04-11",
        refund_date: "2025-04-12",
        listing_date_plan: "2025-04-15",
        issue_method: "网上定价发行",
        underwriter: "某证券公司",
        min_subscription_unit: 500,
        max_subscription_quantity: 50000,
        lockup_period: 0
      },
      {
        symbol: "688123",
        subscription_code: "788123",
        name: "科创板测试股",
        price: 28.60,
        market: "SH",
        status: "UPCOMING",
        listing_date: "2025-04-20",
        issue_volume: 30000000, // 3亿股
        online_issue_volume: 27000000, // 2.7亿股
        pe_ratio: 35.20,
        issue_date: "2025-04-15",
        online_issue_date: "2025-04-15",
        lottery_date: "2025-04-16",
        refund_date: "2025-04-17",
        listing_date_plan: "2025-04-20",
        issue_method: "战略配售",
        underwriter: "另一证券公司",
        min_subscription_unit: 500,
        max_subscription_quantity: 100000,
        lockup_period: 12
      }
    ];
  } catch (error) {
    console.error('获取新浪财经IPO数据失败:', error);
    return [];
  }
}

async function syncIPOData() {
  try {
    console.log('开始同步IPO数据到数据库...');
    
    // 获取新浪财经数据
    const sinaData = await fetchSinaIPOData();
    
    if (sinaData.length === 0) {
      console.log('没有获取到新的IPO数据');
      return;
    }
    
    console.log(`获取到 ${sinaData.length} 条IPO数据`);
    
    // 清空现有数据
    const { error: deleteError } = await supabase
      .from('ipos')
      .delete()
      .match({});
    
    if (deleteError) {
      console.error('删除现有IPO数据失败:', deleteError);
      return;
    }
    
    console.log('已清空现有IPO数据');
    
    // 插入新数据
    const { data, error } = await supabase
      .from('ipos')
      .insert(sinaData)
      .select();
    
    if (error) {
      console.error('插入IPO数据失败:', error);
      return;
    }
    
    console.log(`成功同步 ${data?.length || 0} 条IPO数据到数据库`);
  } catch (error) {
    console.error('同步IPO数据时发生错误:', error);
  }
}

// 运行同步
if (require.main === module) {
  syncIPOData()
    .then(() => {
      console.log('IPO数据同步完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('IPO数据同步失败:', error);
      process.exit(1);
    });
}

export { syncIPOData };