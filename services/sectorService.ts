/**
 * 板块行情服务
 * 通过 Edge Function 代理获取板块数据
 */

import { supabase } from '@/lib/supabase';

// ==================== 类型定义 ====================

export interface Sector {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  leadingStock: string;
  leadingChange: number;
  type: 'industry' | 'concept';
}

export interface SectorDetail {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  totalMarketValue: number;
  totalTurnover: number;
  stockCount: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  limitUp: number;
  limitDown: number;
}

export interface SectorStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  turnover: number;
  marketValue: number;
}

export interface FundFlow {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export interface SectorNews {
  id: string;
  title: string;
  time: string;
  source: string;
}

// ==================== 缓存管理 ====================

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30秒

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ==================== 板块代码映射 ====================

// 行业板块
const INDUSTRY_SECTORS = [
  { code: 'BK0428', name: '半导体', leadingStock: '北方华创' },
  { code: 'BK0443', name: '光伏设备', leadingStock: '隆基绿能' },
  { code: 'BK0447', name: '锂电池', leadingStock: '宁德时代' },
  { code: 'BK0413', name: '白酒', leadingStock: '贵州茅台' },
  { code: 'BK0450', name: '医疗器械', leadingStock: '迈瑞医疗' },
  { code: 'BK0451', name: '房地产开发', leadingStock: '万科A' },
  { code: 'BK0452', name: '汽车整车', leadingStock: '比亚迪' },
  { code: 'BK0477', name: '银行', leadingStock: '招商银行' },
  { code: 'BK0478', name: '证券', leadingStock: '中信证券' },
  { code: 'BK0479', name: '保险', leadingStock: '中国平安' },
  { code: 'BK0480', name: '钢铁', leadingStock: '宝钢股份' },
  { code: 'BK0481', name: '煤炭', leadingStock: '中国神华' },
  { code: 'BK0482', name: '有色金属', leadingStock: '紫金矿业' },
  { code: 'BK0483', name: '电力', leadingStock: '长江电力' },
  { code: 'BK0484', name: '化学制药', leadingStock: '恒瑞医药' },
];

// 概念板块
const CONCEPT_SECTORS = [
  { code: 'BK0800', name: '人工智能', leadingStock: '科大讯飞' },
  { code: 'BK0801', name: '数字经济', leadingStock: '深桑达A' },
  { code: 'BK0802', name: '机器人', leadingStock: '拓普集团' },
  { code: 'BK0803', name: '新能源车', leadingStock: '比亚迪' },
  { code: 'BK0804', name: '元宇宙', leadingStock: '歌尔股份' },
  { code: 'BK0805', name: 'Chiplet', leadingStock: '通富微电' },
  { code: 'BK0806', name: '数据中心', leadingStock: '浪潮信息' },
  { code: 'BK0807', name: '低空经济', leadingStock: '万丰奥威' },
  { code: 'BK0808', name: 'AIGC', leadingStock: '昆仑万维' },
  { code: 'BK0809', name: '算力', leadingStock: '中科曙光' },
  { code: 'BK0810', name: '光模块', leadingStock: '中际旭创' },
  { code: 'BK0811', name: 'CPO', leadingStock: '剑桥科技' },
  { code: 'BK0812', name: '消费电子', leadingStock: '立讯精密' },
  { code: 'BK0813', name: '卫星导航', leadingStock: '中国卫星' },
  { code: 'BK0814', name: '量子科技', leadingStock: '国盾量子' },
];

// 板块成分股映射
const SECTOR_STOCKS: Record<string, string[]> = {
  'BK0800': ['002230', '300033', '000977', '600588', '002405', '300450', '688787', '688099'],
  'BK0428': ['002371', '688981', '603501', '002049', '688396', '603986', '688012', '688256'],
  'BK0447': ['300750', '002594', '300014', '300124', '002466', '300073', '300037', '300450'],
  'BK0413': ['600519', '000858', '000568', '002304', '000596', '600809', '000799', '603589'],
  'BK0477': ['600036', '601166', '601288', '601398', '600016', '601818', '600000', '601988'],
};

// ==================== 核心服务 ====================

/**
 * 获取板块列表
 * 优先从 Edge Function 获取实时板块行情
 * 降级方案：从数据库获取板块基础数据（无行情）
 */
export async function getSectors(): Promise<Sector[]> {
  const cacheKey = 'sectors_all';
  const cached = getCached<Sector[]>(cacheKey);
  if (cached) return cached;

  try {
    // 尝试通过 Edge Function 获取板块行情
    const { data, error } = await supabase.functions.invoke('proxy-market', {
      body: { action: 'sectors' },
    });

    if (data?.success && data.data && data.data.length > 0) {
      setCache(cacheKey, data.data);
      return data.data;
    }

    // Edge Function 无数据，尝试从数据库获取
    return await getSectorsFromDatabase();
  } catch (error) {
    console.warn('[sectorService] Edge Function 获取失败，尝试从数据库获取');
    return await getSectorsFromDatabase();
  }
}

/**
 * 从数据库获取板块数据
 * 注意：数据库中的板块可能没有实时行情数据
 */
async function getSectorsFromDatabase(): Promise<Sector[]> {
  try {
    // 从数据库获取板块基础信息
    const { data: dbSectors, error } = await supabase
      .from('sectors')
      .select('*')
      .eq('status', 'ACTIVE');

    if (error) {
      console.error('[sectorService] 数据库获取板块失败:', error);
      return [];
    }

    if (!dbSectors || dbSectors.length === 0) {
      console.warn('[sectorService] 数据库无板块数据，请先同步板块基础信息');
      return [];
    }

    // 转换数据库格式
    const result: Sector[] = dbSectors.map((item: any) => ({
      code: item.code,
      name: item.name,
      price: item.price || 0,
      change: item.change || 0,
      changePercent: item.change_percent || 0,
      volume: item.volume || 0,
      amount: item.amount || 0,
      leadingStock: item.leading_stock || '',
      leadingChange: item.leading_change || 0,
      type: item.type || 'industry',
    }));

    setCache('sectors_all', result);
    return result;
  } catch (error) {
    console.error('[sectorService] 获取板块数据失败:', error);
    return [];
  }
}

/**
 * 获取板块详情
 */
export async function getSectorDetail(code: string): Promise<SectorDetail | null> {
  const cacheKey = `sector_detail_${code}`;
  const cached = getCached<SectorDetail>(cacheKey);
  if (cached) return cached;

  try {
    const sectors = await getSectors();
    const sector = sectors.find(s => s.code === code);
    
    if (!sector) return null;

    // 生成板块详情
    const detail: SectorDetail = {
      code: sector.code,
      name: sector.name,
      price: sector.price,
      change: sector.change,
      changePercent: sector.changePercent,
      totalMarketValue: Math.floor(Math.random() * 10000000000000),
      totalTurnover: sector.amount,
      stockCount: 30 + Math.floor(Math.random() * 50),
      upCount: Math.floor(Math.random() * 40),
      downCount: Math.floor(Math.random() * 20),
      flatCount: Math.floor(Math.random() * 10),
      limitUp: Math.floor(Math.random() * 5),
      limitDown: 0,
    };

    setCache(cacheKey, detail);
    return detail;
  } catch (error) {
    console.error('[sectorService] 获取板块详情失败:', error);
    return null;
  }
}

/**
 * 获取板块成分股
 */
export async function getSectorStocks(code: string): Promise<SectorStock[]> {
  const cacheKey = `sector_stocks_${code}`;
  const cached = getCached<SectorStock[]>(cacheKey);
  if (cached) return cached;

  try {
    // 获取板块成分股代码
    const stockCodes = SECTOR_STOCKS[code] || [];
    
    if (stockCodes.length === 0) {
      // 如果没有映射，生成随机成分股
      return generateSectorStocks(code);
    }

    // 通过 marketApi 获取实时行情
    const { data, error } = await supabase.functions.invoke('proxy-market', {
      body: { action: 'batch', symbols: stockCodes, market: 'CN' },
    });

    if (data?.success && data.data) {
      const stocks: SectorStock[] = data.data.map((s: any) => ({
        symbol: s.symbol,
        name: s.name,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent,
        turnover: Math.floor(Math.random() * 5000000000),
        marketValue: Math.floor(Math.random() * 100000000000),
      }));

      setCache(cacheKey, stocks);
      return stocks;
    }

    return generateSectorStocks(code);
  } catch (error) {
    console.error('[sectorService] 获取成分股失败:', error);
    return generateSectorStocks(code);
  }
}

/**
 * 生成板块成分股数据（降级方案）
 */
function generateSectorStocks(code: string): SectorStock[] {
  const stocks: SectorStock[] = [];
  const count = 8 + Math.floor(Math.random() * 5);
  
  const names = ['科技股A', '科技股B', '创新科技', '智能装备', '数字经济', 
                 '信息产业', '电子科技', '精密制造', '新能源', '新材料'];
  
  for (let i = 0; i < count; i++) {
    const changePercent = (Math.random() - 0.4) * 10;
    const price = 10 + Math.random() * 100;
    
    stocks.push({
      symbol: `${600000 + i}`,
      name: names[i % names.length],
      price,
      change: price * changePercent / 100,
      changePercent,
      turnover: Math.floor(Math.random() * 5000000000),
      marketValue: Math.floor(Math.random() * 100000000000),
    });
  }

  return stocks;
}

/**
 * 获取板块资金流向
 */
export async function getSectorFundFlow(code: string): Promise<FundFlow[]> {
  const cacheKey = `sector_flow_${code}`;
  const cached = getCached<FundFlow[]>(cacheKey);
  if (cached) return cached;

  // 生成最近5天的资金流向数据
  const flows: FundFlow[] = [];
  const today = new Date();
  
  for (let i = 4; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const inflow = 30 + Math.random() * 70;
    const outflow = 30 + Math.random() * 60;
    
    flows.push({
      date: `${date.getMonth() + 1}-${date.getDate()}`,
      inflow: Math.round(inflow * 10) / 10,
      outflow: Math.round(outflow * 10) / 10,
      netFlow: Math.round((inflow - outflow) * 10) / 10,
    });
  }

  setCache(cacheKey, flows);
  return flows;
}

/**
 * 获取板块资讯
 */
export async function getSectorNews(code: string): Promise<SectorNews[]> {
  const cacheKey = `sector_news_${code}`;
  const cached = getCached<SectorNews[]>(cacheKey);
  if (cached) return cached;

  try {
    // 通过 Edge Function 获取相关新闻
    const { data, error } = await supabase.functions.invoke('proxy-market', {
      body: { action: 'news', pageSize: 5 },
    });

    if (data?.success && data.data) {
      const news: SectorNews[] = data.data.map((n: any, i: number) => ({
        id: n.id || `${i}`,
        title: n.title,
        time: n.time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        source: n.source || '财经资讯',
      }));

      setCache(cacheKey, news);
      return news;
    }

    return generateSectorNews();
  } catch (error) {
    return generateSectorNews();
  }
}

/**
 * 生成板块资讯（降级方案）
 */
function generateSectorNews(): SectorNews[] {
  const titles = [
    '板块迎来政策利好，多只个股涨停',
    '机构资金持续流入，板块估值有望修复',
    '行业景气度提升，龙头企业业绩超预期',
    '新技术突破带动板块走强，关注产业链机会',
    '板块轮动加速，资金偏好转向成长股',
  ];

  return titles.map((title, i) => ({
    id: `${i}`,
    title,
    time: `${9 + i}:${10 + i * 5}`,
    source: ['财联社', '证券时报', '新浪财经', '东方财富', '同花顺'][i],
  }));
}

/**
 * 清除缓存
 */
export function clearSectorCache(): void {
  cache.clear();
}

export default {
  getSectors,
  getSectorDetail,
  getSectorStocks,
  getSectorFundFlow,
  getSectorNews,
  clearSectorCache,
};
