/**
 * 股票列表数据
 * 用于前端本地搜索
 * 数据来源：A股主要上市公司
 */

export interface StockInfo {
  symbol: string;      // 股票代码
  name: string;        // 股票名称
  market: 'CN' | 'HK'; // 市场
  type: 'stock' | 'etf' | 'index'; // 类型
}

// A股主要股票列表（按市值排序，包含常见股票）
export const STOCK_LIST: StockInfo[] = [
  // 沪市主板 (60开头)
  { symbol: '600519', name: '贵州茅台', market: 'CN', type: 'stock' },
  { symbol: '600036', name: '招商银行', market: 'CN', type: 'stock' },
  { symbol: '601318', name: '中国平安', market: 'CN', type: 'stock' },
  { symbol: '601166', name: '兴业银行', market: 'CN', type: 'stock' },
  { symbol: '601398', name: '工商银行', market: 'CN', type: 'stock' },
  { symbol: '601288', name: '农业银行', market: 'CN', type: 'stock' },
  { symbol: '601988', name: '中国银行', market: 'CN', type: 'stock' },
  { symbol: '601939', name: '建设银行', market: 'CN', type: 'stock' },
  { symbol: '601857', name: '中国石油', market: 'CN', type: 'stock' },
  { symbol: '601888', name: '中国中免', market: 'CN', type: 'stock' },
  { symbol: '600000', name: '浦发银行', market: 'CN', type: 'stock' },
  { symbol: '600030', name: '中信证券', market: 'CN', type: 'stock' },
  { symbol: '600016', name: '民生银行', market: 'CN', type: 'stock' },
  { symbol: '600276', name: '恒瑞医药', market: 'CN', type: 'stock' },
  { symbol: '600309', name: '万华化学', market: 'CN', type: 'stock' },
  { symbol: '600346', name: '恒力石化', market: 'CN', type: 'stock' },
  { symbol: '600438', name: '通威股份', market: 'CN', type: 'stock' },
  { symbol: '600585', name: '海螺水泥', market: 'CN', type: 'stock' },
  { symbol: '600588', name: '用友网络', market: 'CN', type: 'stock' },
  { symbol: '600690', name: '海尔智家', market: 'CN', type: 'stock' },
  { symbol: '600809', name: '山西汾酒', market: 'CN', type: 'stock' },
  { symbol: '600887', name: '伊利股份', market: 'CN', type: 'stock' },
  { symbol: '600893', name: '航发动力', market: 'CN', type: 'stock' },
  { symbol: '600900', name: '长江电力', market: 'CN', type: 'stock' },
  { symbol: '600905', name: '三峡能源', market: 'CN', type: 'stock' },
  { symbol: '601012', name: '隆基绿能', market: 'CN', type: 'stock' },
  { symbol: '601138', name: '工业富联', market: 'CN', type: 'stock' },
  { symbol: '601390', name: '中国中铁', market: 'CN', type: 'stock' },
  { symbol: '601601', name: '中国太保', market: 'CN', type: 'stock' },
  { symbol: '601628', name: '中国人寿', market: 'CN', type: 'stock' },
  { symbol: '601658', name: '邮储银行', market: 'CN', type: 'stock' },
  { symbol: '601668', name: '中国建筑', market: 'CN', type: 'stock' },
  { symbol: '601688', name: '华泰证券', market: 'CN', type: 'stock' },
  { symbol: '601728', name: '中国电信', market: 'CN', type: 'stock' },
  { symbol: '601818', name: '光大银行', market: 'CN', type: 'stock' },
  { symbol: '601857', name: '中国石油', market: 'CN', type: 'stock' },
  { symbol: '601877', name: '正泰电器', market: 'CN', type: 'stock' },
  { symbol: '601888', name: '中国中免', market: 'CN', type: 'stock' },
  { symbol: '601899', name: '紫金矿业', market: 'CN', type: 'stock' },
  { symbol: '601919', name: '中远海控', market: 'CN', type: 'stock' },
  { symbol: '601985', name: '中国核电', market: 'CN', type: 'stock' },
  { symbol: '603259', name: '药明康德', market: 'CN', type: 'stock' },
  { symbol: '603288', name: '海天味业', market: 'CN', type: 'stock' },
  { symbol: '603501', name: '韦尔股份', market: 'CN', type: 'stock' },
  { symbol: '603986', name: '兆易创新', market: 'CN', type: 'stock' },

  // 深市主板 (00开头)
  { symbol: '000001', name: '平安银行', market: 'CN', type: 'stock' },
  { symbol: '000002', name: '万科A', market: 'CN', type: 'stock' },
  { symbol: '000063', name: '中兴通讯', market: 'CN', type: 'stock' },
  { symbol: '000333', name: '美的集团', market: 'CN', type: 'stock' },
  { symbol: '000338', name: '潍柴动力', market: 'CN', type: 'stock' },
  { symbol: '000425', name: '徐工机械', market: 'CN', type: 'stock' },
  { symbol: '000568', name: '泸州老窖', market: 'CN', type: 'stock' },
  { symbol: '000625', name: '长安汽车', market: 'CN', type: 'stock' },
  { symbol: '000651', name: '格力电器', market: 'CN', type: 'stock' },
  { symbol: '000703', name: '中兴通讯', market: 'CN', type: 'stock' },
  { symbol: '000708', name: '中信特钢', market: 'CN', type: 'stock' },
  { symbol: '000725', name: '京东方A', market: 'CN', type: 'stock' },
  { symbol: '000768', name: '中航西飞', market: 'CN', type: 'stock' },
  { symbol: '000776', name: '广发证券', market: 'CN', type: 'stock' },
  { symbol: '000858', name: '五粮液', market: 'CN', type: 'stock' },
  { symbol: '000876', name: '新希望', market: 'CN', type: 'stock' },
  { symbol: '000895', name: '双汇发展', market: 'CN', type: 'stock' },
  { symbol: '000938', name: '紫光股份', market: 'CN', type: 'stock' },
  { symbol: '000963', name: '华东医药', market: 'CN', type: 'stock' },
  { symbol: '000977', name: '浪潮信息', market: 'CN', type: 'stock' },
  { symbol: '001979', name: '招商蛇口', market: 'CN', type: 'stock' },

  // 创业板 (30开头)
  { symbol: '300014', name: '亿纬锂能', market: 'CN', type: 'stock' },
  { symbol: '300015', name: '爱尔眼科', market: 'CN', type: 'stock' },
  { symbol: '300033', name: '同花顺', market: 'CN', type: 'stock' },
  { symbol: '300059', name: '东方财富', market: 'CN', type: 'stock' },
  { symbol: '300124', name: '汇川技术', market: 'CN', type: 'stock' },
  { symbol: '300142', name: '沃森生物', market: 'CN', type: 'stock' },
  { symbol: '300223', name: '北京君正', market: 'CN', type: 'stock' },
  { symbol: '300274', name: '阳光电源', market: 'CN', type: 'stock' },
  { symbol: '300308', name: '中际旭创', market: 'CN', type: 'stock' },
  { symbol: '300327', name: '中颖电子', market: 'CN', type: 'stock' },
  { symbol: '300347', name: '泰格医药', market: 'CN', type: 'stock' },
  { symbol: '300408', name: '三环集团', market: 'CN', type: 'stock' },
  { symbol: '300413', name: '芒果超媒', market: 'CN', type: 'stock' },
  { symbol: '300433', name: '蓝思科技', market: 'CN', type: 'stock' },
  { symbol: '300450', name: '先导智能', market: 'CN', type: 'stock' },
  { symbol: '300454', name: '深信服', market: 'CN', type: 'stock' },
  { symbol: '300460', name: '惠伦晶体', market: 'CN', type: 'stock' },
  { symbol: '300496', name: '中科创达', market: 'CN', type: 'stock' },
  { symbol: '300498', name: '温氏股份', market: 'CN', type: 'stock' },
  { symbol: '300595', name: '欧普康视', market: 'CN', type: 'stock' },
  { symbol: '300628', name: '亿联网络', market: 'CN', type: 'stock' },
  { symbol: '300750', name: '宁德时代', market: 'CN', type: 'stock' },
  { symbol: '300760', name: '迈瑞医疗', market: 'CN', type: 'stock' },
  { symbol: '300782', name: '卓胜微', market: 'CN', type: 'stock' },
  { symbol: '300896', name: '爱美客', market: 'CN', type: 'stock' },

  // 科创板 (688开头)
  { symbol: '688001', name: '华兴源创', market: 'CN', type: 'stock' },
  { symbol: '688012', name: '中微公司', market: 'CN', type: 'stock' },
  { symbol: '688041', name: '海光信息', market: 'CN', type: 'stock' },
  { symbol: '688111', name: '金山办公', market: 'CN', type: 'stock' },
  { symbol: '688126', name: '沪硅产业', market: 'CN', type: 'stock' },
  { symbol: '688169', name: '石头科技', market: 'CN', type: 'stock' },
  { symbol: '688180', name: '君实生物', market: 'CN', type: 'stock' },
  { symbol: '688187', name: '时代电气', market: 'CN', type: 'stock' },
  { symbol: '688223', name: '晶科能源', market: 'CN', type: 'stock' },
  { symbol: '688256', name: '寒武纪', market: 'CN', type: 'stock' },
  { symbol: '688303', name: '大全能源', market: 'CN', type: 'stock' },
  { symbol: '688369', name: '致远互联', market: 'CN', type: 'stock' },
  { symbol: '688396', name: '华润微', market: 'CN', type: 'stock' },
  { symbol: '688567', name: '孚能科技', market: 'CN', type: 'stock' },
  { symbol: '688599', name: '天合光能', market: 'CN', type: 'stock' },
  { symbol: '688981', name: '中芯国际', market: 'CN', type: 'stock' },

  // 港股
  { symbol: '00700', name: '腾讯控股', market: 'HK', type: 'stock' },
  { symbol: '09988', name: '阿里巴巴', market: 'HK', type: 'stock' },
  { symbol: '09999', name: '网易', market: 'HK', type: 'stock' },
  { symbol: '09618', name: '京东集团', market: 'HK', type: 'stock' },
  { symbol: '03690', name: '美团', market: 'HK', type: 'stock' },
  { symbol: '01024', name: '快手', market: 'HK', type: 'stock' },
  { symbol: '09961', name: '比亚迪股份', market: 'HK', type: 'stock' },
  { symbol: '02318', name: '中国平安', market: 'HK', type: 'stock' },
  { symbol: '00941', name: '中国移动', market: 'HK', type: 'stock' },
  { symbol: '03988', name: '中国银行', market: 'HK', type: 'stock' },
  { symbol: '01398', name: '工商银行', market: 'HK', type: 'stock' },
  { symbol: '01288', name: '农业银行', market: 'HK', type: 'stock' },
  { symbol: '00939', name: '建设银行', market: 'HK', type: 'stock' },
  { symbol: '02628', name: '中国人寿', market: 'HK', type: 'stock' },
  { symbol: '00883', name: '中国海洋石油', market: 'HK', type: 'stock' },
  { symbol: '00386', name: '中国石油化工', market: 'HK', type: 'stock' },
  { symbol: '01810', name: '小米集团', market: 'HK', type: 'stock' },
  { symbol: '02015', name: '理想汽车', market: 'HK', type: 'stock' },
  { symbol: '09868', name: '小鹏汽车', market: 'HK', type: 'stock' },
  { symbol: '09626', name: '哔哩哔哩', market: 'HK', type: 'stock' },
];

/**
 * 本地搜索股票
 * @param keyword 搜索关键词（股票代码或名称）
 * @param limit 返回结果数量限制
 * @returns 匹配的股票列表
 */
export function searchStocks(keyword: string, limit: number = 10): StockInfo[] {
  if (!keyword || keyword.trim() === '') {
    return [];
  }

  const searchTerm = keyword.trim().toLowerCase();
  
  return STOCK_LIST
    .filter(stock => {
      // 匹配股票代码
      if (stock.symbol.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // 匹配股票名称
      if (stock.name.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return false;
    })
    .slice(0, limit);
}

/**
 * 根据股票代码获取股票信息
 * @param symbol 股票代码
 * @returns 股票信息或 undefined
 */
export function getStockInfo(symbol: string): StockInfo | undefined {
  return STOCK_LIST.find(stock => stock.symbol === symbol);
}

/**
 * 根据股票名称获取股票信息
 * @param name 股票名称
 * @returns 股票信息或 undefined
 */
export function getStockInfoByName(name: string): StockInfo | undefined {
  return STOCK_LIST.find(stock => stock.name === name);
}

export default {
  STOCK_LIST,
  searchStocks,
  getStockInfo,
  getStockInfoByName,
};
