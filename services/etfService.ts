/**
 * ETF 服务
 * 从Supabase数据库获取ETF数据
 */

import { supabase } from '../lib/supabase';

// ETF类型定义
export interface ETF {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  amount: number;
  category: string; // 股票型、债券型、商品型、货币型
  scale: number; // 规模（亿）
  management_fee: number; // 管理费率
  tracking_index: string; // 跟踪指数
  listed_date: string;
  market: 'CN' | 'HK';
  created_at?: string;
  updated_at?: string;
}

// ETF分类
export const ETF_CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'stock', label: '股票型' },
  { key: 'bond', label: '债券型' },
  { key: 'commodity', label: '商品型' },
  { key: 'money', label: '货币型' },
  { key: 'cross', label: '跨境' },
];

/**
 * 获取ETF列表
 */
export const getETFList = async (category?: string): Promise<ETF[]> => {
  try {
    let query = supabase
      .from('etf_products')
      .select('*')
      .order('scale', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取ETF列表失败:', error);
      return getDefaultETFList();
    }

    return (data && data.length > 0) ? data : getDefaultETFList();
  } catch (error) {
    console.error('获取ETF列表异常:', error);
    return getDefaultETFList();
  }
};

/**
 * 获取ETF详情
 */
export const getETFDetail = async (symbol: string): Promise<ETF | null> => {
  try {
    const { data, error } = await supabase
      .from('etf_products')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error) {
      console.error('获取ETF详情失败:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取ETF详情异常:', error);
    return null;
  }
};

/**
 * 获取热门ETF
 */
export const getHotETFs = async (): Promise<ETF[]> => {
  try {
    const { data, error } = await supabase
      .from('etf_products')
      .select('*')
      .order('scale', { ascending: false })
      .limit(5);

    if (error) {
      console.error('获取热门ETF失败:', error);
      return getDefaultETFList().slice(0, 5);
    }

    return (data && data.length > 0) ? data : getDefaultETFList().slice(0, 5);
  } catch (error) {
    console.error('获取热门ETF异常:', error);
    return getDefaultETFList().slice(0, 5);
  }
};

/**
 * 默认ETF数据（当数据库无数据时使用）
 */
const getDefaultETFList = (): ETF[] => [
  {
    id: '1',
    symbol: '510300',
    name: '沪深300ETF',
    price: 4.125,
    change: 0.025,
    change_percent: 0.61,
    volume: 125680000,
    amount: 518000000,
    category: 'stock',
    scale: 485.6,
    management_fee: 0.5,
    tracking_index: '沪深300指数',
    listed_date: '2012-05-28',
    market: 'CN'
  },
  {
    id: '2',
    symbol: '510500',
    name: '中证500ETF',
    price: 6.234,
    change: -0.032,
    change_percent: -0.51,
    volume: 89200000,
    amount: 556000000,
    category: 'stock',
    scale: 328.5,
    management_fee: 0.5,
    tracking_index: '中证500指数',
    listed_date: '2013-03-15',
    market: 'CN'
  },
  {
    id: '3',
    symbol: '159915',
    name: '创业板ETF',
    price: 2.156,
    change: 0.018,
    change_percent: 0.84,
    volume: 156000000,
    amount: 336000000,
    category: 'stock',
    scale: 189.3,
    management_fee: 0.5,
    tracking_index: '创业板指数',
    listed_date: '2011-09-19',
    market: 'CN'
  },
  {
    id: '4',
    symbol: '518880',
    name: '黄金ETF',
    price: 5.678,
    change: 0.034,
    change_percent: 0.60,
    volume: 45200000,
    amount: 257000000,
    category: 'commodity',
    scale: 156.8,
    management_fee: 0.5,
    tracking_index: '黄金现货价格',
    listed_date: '2013-07-29',
    market: 'CN'
  },
  {
    id: '5',
    symbol: '511010',
    name: '国债ETF',
    price: 125.68,
    change: 0.12,
    change_percent: 0.10,
    volume: 15600000,
    amount: 1960000000,
    category: 'bond',
    scale: 125.6,
    management_fee: 0.3,
    tracking_index: '上证5年期国债指数',
    listed_date: '2013-03-25',
    market: 'CN'
  },
  {
    id: '6',
    symbol: '159941',
    name: '纳指ETF',
    price: 1.234,
    change: 0.028,
    change_percent: 2.32,
    volume: 28600000,
    amount: 35300000,
    category: 'cross',
    scale: 45.6,
    management_fee: 0.8,
    tracking_index: '纳斯达克100指数',
    listed_date: '2013-04-25',
    market: 'CN'
  },
  {
    id: '7',
    symbol: '513100',
    name: '恒生ETF',
    price: 1.456,
    change: -0.015,
    change_percent: -1.02,
    volume: 18900000,
    amount: 27500000,
    category: 'cross',
    scale: 68.9,
    management_fee: 0.8,
    tracking_index: '恒生指数',
    listed_date: '2012-08-10',
    market: 'CN'
  },
  {
    id: '8',
    symbol: '511880',
    name: '货币ETF',
    price: 100.0,
    change: 0.001,
    change_percent: 0.00,
    volume: 89500000,
    amount: 8950000000,
    category: 'money',
    scale: 1256.8,
    management_fee: 0.2,
    tracking_index: '货币市场利率',
    listed_date: '2013-07-18',
    market: 'CN'
  }
];
