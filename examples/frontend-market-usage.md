# 银河证券证裕交易单元 - 纯前端原生行情数据源使用指南

## 概述

本方案实现了完全前端的行情数据源对接，无需后端/Edge Functions/服务器接口封装。直接对接免费、无CORS限制、无需API Key的公开行情接口，覆盖A股、港股实时行情、批量查询、日K线数据。

## 核心特性

- ✅ **纯前端实现**：无需后端支持，完全在浏览器中运行
- ✅ **免费公开接口**：使用新浪财经、腾讯财经、东方财富等公开API
- ✅ **无CORS限制**：所有接口均可直接跨域访问
- ✅ **无需注册/API Key**：开箱即用
- ✅ **覆盖A股、港股**：支持沪深京A股和香港市场
- ✅ **智能缓存**：本地缓存机制，减少网络请求
- ✅ **请求限流**：自动控制请求频率，避免被限制
- ✅ **异常兜底**：API失败时自动切换模拟数据
- ✅ **数据格式化**：统一转换为交易系统标准格式

## 安装与导入

```typescript
// 导入核心服务
import frontendMarketService from './services/frontendMarketService';

// 或导入适配器（兼容现有代码）
import { marketServiceAdapter } from './services/frontendMarketService';
```

## 基础用法

### 1. 获取单只股票实时行情

```typescript
import frontendMarketService from './services/frontendMarketService';

// 获取A股实时行情
async function getAStockRealtime() {
  try {
    const stock = await frontendMarketService.getRealtimeStock('600519', 'CN');
    console.log('贵州茅台实时行情:', {
      代码: stock.symbol,
      名称: stock.name,
      价格: stock.price,
      涨跌: stock.change,
      涨跌幅: stock.changePercent + '%',
      市场: stock.market
    });
    return stock;
  } catch (error) {
    console.error('获取行情失败:', error);
  }
}

// 获取港股实时行情
async function getHKStockRealtime() {
  const stock = await frontendMarketService.getRealtimeStock('00700', 'HK');
  console.log('腾讯控股实时行情:', stock);
}
```

### 2. 批量获取股票行情

```typescript
import frontendMarketService from './services/frontendMarketService';

// 批量获取A股行情
async function getBatchAStocks() {
  const symbols = ['600519', '000858', '601318', '000001', '300750'];
  const stocks = await frontendMarketService.getBatchStocks(symbols, 'CN');
  
  console.log('A股批量行情:');
  stocks.forEach(stock => {
    console.log(`${stock.name}(${stock.symbol}): ${stock.price} ${stock.change > 0 ? '+' : ''}${stock.changePercent}%`);
  });
  
  return stocks;
}

// 批量获取港股行情
async function getBatchHKStocks() {
  const symbols = ['00700', '09988', '03690', '01810', '01024'];
  const stocks = await frontendMarketService.getBatchStocks(symbols, 'HK');
  return stocks;
}
```

### 3. 获取日K线数据

```typescript
import frontendMarketService from './services/frontendMarketService';

// 获取股票日K线数据
async function getStockKline() {
  // 获取贵州茅台最近30天的日K线数据（收盘价）
  const klineData = await frontendMarketService.getDailyKline('600519', 'CN', 30);
  
  console.log('贵州茅台日K线数据（最近30天收盘价）:', klineData);
  
  // 计算统计信息
  const maxPrice = Math.max(...klineData);
  const minPrice = Math.min(...klineData);
  const currentPrice = klineData[klineData.length - 1];
  
  console.log(`最高价: ${maxPrice}, 最低价: ${minPrice}, 当前价: ${currentPrice}`);
  
  return klineData;
}
```

### 4. 使用兼容适配器（迁移现有代码）

```typescript
import { marketServiceAdapter } from './services/frontendMarketService';

// 兼容现有代码的getMarketData接口
async function legacyCodeExample() {
  // 现有代码可能这样调用：
  const marketData = await marketServiceAdapter.getMarketData('CN', ['600519', '000858']);
  
  // 返回格式与原有tradeService.getMarketData兼容
  console.log('兼容接口返回:', marketData);
  
  return marketData;
}
```

## 高级功能

### 1. 缓存管理

```typescript
import frontendMarketService from './services/frontendMarketService';

// 清理所有行情缓存
function clearMarketCache() {
  frontendMarketService.clearCache();
  console.log('行情缓存已清理');
}

// 手动设置缓存（高级用法）
import { MarketCache } from './services/frontendMarketService';

// 自定义缓存
MarketCache.set('custom_key', { data: 'value' }, 60 * 1000); // 缓存1分钟
const cached = MarketCache.get('custom_key');
```

### 2. 服务状态监控

```typescript
import frontendMarketService from './services/frontendMarketService';

// 获取服务运行状态
function checkServiceStatus() {
  const status = frontendMarketService.getServiceStatus();
  
  console.log('行情服务状态:', {
    缓存条目数: status.cacheSize,
    数据源错误计数: status.errorCounts,
    可用数据源: status.dataSources.filter(ds => ds.enabled).map(ds => ds.name)
  });
  
  return status;
}

// 定期检查服务状态
setInterval(checkServiceStatus, 60000); // 每分钟检查一次
```

### 3. 错误处理与兜底

```typescript
import frontendMarketService from './services/frontendMarketService';

// 自动错误处理示例
async function getStockWithFallback(symbol: string, market: 'CN' | 'HK') {
  try {
    const stock = await frontendMarketService.getRealtimeStock(symbol, market);
    
    // 检查是否为模拟数据（兜底数据）
    const isFallbackData = stock.name.includes('模拟数据');
    if (isFallbackData) {
      console.warn(`注意：${symbol} 使用的是模拟数据，真实API可能不可用`);
    }
    
    return {
      ...stock,
      isFallbackData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`获取 ${symbol} 行情失败:`, error);
    throw error;
  }
}
```

## React组件示例

```tsx
import React, { useState, useEffect } from 'react';
import frontendMarketService from '../services/frontendMarketService';
import { Stock } from '../types';

interface StockQuoteProps {
  symbol: string;
  market: 'CN' | 'HK';
}

const StockQuote: React.FC<StockQuoteProps> = ({ symbol, market }) => {
  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchStock = async () => {
      try {
        setLoading(true);
        const data = await frontendMarketService.getRealtimeStock(symbol, market);
        
        if (mounted) {
          setStock(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError('获取行情失败');
          console.error(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStock();
    
    // 每10秒刷新一次
    const interval = setInterval(fetchStock, 10000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol, market]);

  if (loading) return <div className="stock-quote loading">加载中...</div>;
  if (error) return <div className="stock-quote error">{error}</div>;
  if (!stock) return <div className="stock-quote">无数据</div>;

  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;

  return (
    <div className={`stock-quote ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
      <div className="stock-header">
        <span className="stock-name">{stock.name}</span>
        <span className="stock-symbol">{stock.symbol}</span>
      </div>
      <div className="stock-price">
        <span className="price">{stock.price.toFixed(2)}</span>
        <span className={`change ${isPositive ? 'positive' : isNegative ? 'negative' : ''}`}>
          {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
        </span>
      </div>
      <div className="stock-market">{stock.market === 'CN' ? 'A股' : '港股'}</div>
    </div>
  );
};

export default StockQuote;
```

## 数据源配置

### 默认数据源优先级

1. **新浪财经实时行情** (优先级1)
   - 实时行情数据
   - 无CORS限制
   - 覆盖A股、港股

2. **腾讯财经K线数据** (优先级2)
   - 日K线数据
   - 走势图生成

3. **东方财富批量行情** (优先级3)
   - 批量查询接口
   - 多股票同时获取

### 自定义配置

```typescript
// 如果需要自定义数据源配置，可以修改frontendMarketService.ts中的DATA_SOURCES常量
const CUSTOM_DATA_SOURCES = {
  ...DATA_SOURCES,
  // 禁用某个数据源
  TENCENT_KLINE: {
    ...DATA_SOURCES.TENCENT_KLINE,
    enabled: false
  },
  // 添加自定义数据源
  CUSTOM_SOURCE: {
    name: '自定义数据源',
    priority: 4,
    enabled: true,
    getRealtimeUrl: (symbol: string, market: 'CN' | 'HK') => {
      return `https://api.example.com/quote/${market}/${symbol}`;
    },
    parseRealtimeData: (data: any) => {
      // 自定义解析逻辑
      return {
        price: data.currentPrice,
        change: data.change,
        changePercent: data.changePercent
      };
    }
  }
};
```

## 性能优化建议

### 1. 合理使用缓存

```typescript
// 对于不频繁变动的数据，可以延长缓存时间
const CACHE_CONFIG = {
  实时行情: 5 * 60 * 1000, // 5分钟
  K线数据: 10 * 60 * 1000, // 10分钟
  批量数据: 2 * 60 * 1000  // 2分钟
};
```

### 2. 批量请求优化

```typescript
// 避免频繁的单只股票查询，尽量使用批量接口
async function optimizeBatchRequests() {
  // 不好：多次单独请求
  // const stock1 = await getRealtimeStock('600519', 'CN');
  // const stock2 = await getRealtimeStock('000858', 'CN');
  
  // 好：一次批量请求
  const stocks = await frontendMarketService.getBatchStocks(['600519', '000858'], 'CN');
}
```

### 3. 错误重试策略

```typescript
// 自定义错误重试逻辑
async function getStockWithRetry(symbol: string, market: 'CN' | 'HK', maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await frontendMarketService.getRealtimeStock(symbol, market);
    } catch (error) {
      lastError = error;
      console.warn(`第 ${i + 1} 次尝试失败:`, error);
      
      if (i < maxRetries - 1) {
        // 指数退避重试
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}
```

## 常见问题

### Q1: 数据源不可用怎么办？
A: 系统会自动切换到下一个可用的数据源。如果所有数据源都不可用，会返回符合交易规则的模拟数据，确保前端交易流程不受影响。

### Q2: 如何知道当前使用的是真实数据还是模拟数据？
A: 模拟数据的股票名称会包含"模拟数据"字样，可以通过检查`stock.name`来判断。

### Q3: 请求频率有限制吗？
A: 是的，系统内置了限流控制，每秒最多2个请求。超过限制的请求会自动排队等待。

### Q4: 如何清理缓存？
A: 调用`frontendMarketService.clearCache()`方法，或手动清理localStorage中`galaxy_market_`前缀的条目。

### Q5: 支持哪些市场？
A: 目前支持A股(CN)和港股(HK)市场。A股代码区分上海(sh)和深圳(sz)，港股代码前缀为hk。

## 迁移指南

### 从旧版本迁移

如果你之前使用的是`tradeService.getMarketData()`，可以按以下步骤迁移：

1. **导入适配器**
   ```typescript
   // 旧代码
   import { tradeService } from './services/tradeService';
   
   // 新代码
   import { marketServiceAdapter } from './services/frontendMarketService';
   ```

2. **替换调用**
   ```typescript
   // 旧代码
   const data = await tradeService.getMarketData('CN', ['600519']);
   
   // 新代码（保持相同接口）
   const data = await marketServiceAdapter.getMarketData('CN', ['600519']);
   ```

3. **逐步迁移到新接口**
   ```typescript
   // 最终推荐使用新接口
   import frontendMarketService from './services/frontendMarketService';
   
   const stock = await frontendMarketService.getRealtimeStock('600519', 'CN');
   ```

## 技术支持

如有问题或建议，请联系银河证券证裕交易单元技术团队。

---
*最后更新: 2026-02-23*
*版本: 1.0.0*