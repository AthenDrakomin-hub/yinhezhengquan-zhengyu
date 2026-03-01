# 数据源完善方案

## 📊 当前数据源状态

### 已实现的数据源（2个）

#### 1. 新浪财经 IPO 适配器 ✅
**文件**: `services/adapters/sinaIPOAdapter.ts`
- **功能**: 从 Supabase 数据库获取 IPO 数据
- **数据源**: 数据库表 `ipos`
- **缓存**: 5分钟缓存
- **状态**: ✅ 完整实现

#### 2. 前端行情服务 ✅
**文件**: `services/frontendMarketService.ts`
- **功能**: 
  - 新浪财经实时行情（A股、港股）
  - 腾讯财经K线数据
  - 东方财富批量行情
- **特性**:
  - ✅ 多级降级机制
  - ✅ 缓存管理（5分钟）
  - ✅ 限流控制（2次/秒）
  - ✅ 错误处理
  - ✅ 模拟数据兜底
- **状态**: ✅ 完整实现

---

## ⚠️ 缺失的数据源（3个）

### 1. QOS 大宗交易适配器 ❌
**应该位于**: `services/adapters/qosAdapter.ts`
**功能**: 获取大宗交易产品数据（黄金、白银等）
**引用位置**: 
- `frontendMarketService.ts` 第 569 行
- 业务规则文档中提到

**需要实现**:
```typescript
export interface QOSQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  market: string;
  minBlockSize: number;
  blockDiscount: number;
  lastUpdated: string;
}

export async function fetchQOSQuote(symbol: string): Promise<QOSQuote | null>
```

### 2. 涨停板服务 ❌
**应该位于**: `services/limitUpStockService.ts`
**功能**: 获取涨停板数据
**引用位置**: 
- `frontendMarketService.ts` 第 595 行
- 业务规则文档中提到

**需要实现**:
```typescript
export interface LimitUpData {
  symbol: string;
  name: string;
  market: string;
  currentPrice: number;
  preClose: number;
  limitUpPrice: number;
  limitDownPrice: number;
  change: number;
  changePercent: number;
  buyOneVolume: number;
  timestamp: string;
}

export async function getLimitUpData(symbol: string): Promise<LimitUpData>
```

### 3. 大宗交易服务 ⚠️
**文件**: `services/blockTradeService.ts`
**状态**: 文件存在但可能不完整
**需要检查**: 是否实现了完整的大宗交易逻辑

---

## 🎯 完善建议

### 优先级 P0（立即实现）

#### 1. 创建 QOS 适配器
```typescript
// services/adapters/qosAdapter.ts
import { supabase } from '../../lib/supabase';

export async function fetchQOSQuote(symbol: string): Promise<QOSQuote | null> {
  try {
    // 从数据库获取大宗交易产品数据
    const { data, error } = await supabase
      .from('block_trade_products')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error || !data) return null;

    return {
      symbol: data.symbol,
      name: data.name,
      price: Number(data.current_price),
      change: Number(data.change),
      changePercent: Number(data.change_percent),
      market: data.market,
      minBlockSize: data.min_block_size,
      blockDiscount: Number(data.block_discount),
      lastUpdated: data.update_time
    };
  } catch (error) {
    console.error('获取QOS数据失败:', error);
    return null;
  }
}
```

#### 2. 创建涨停板服务
```typescript
// services/limitUpStockService.ts
import { supabase } from '../lib/supabase';

export async function getLimitUpData(symbol: string): Promise<LimitUpData> {
  try {
    // 从数据库获取涨停板数据
    const { data, error } = await supabase
      .from('limit_up_stocks')
      .select('*')
      .eq('symbol', symbol)
      .order('update_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('涨停板数据不存在');
    }

    return {
      symbol: data.symbol,
      name: data.name,
      market: data.market,
      currentPrice: Number(data.current_price),
      preClose: Number(data.pre_close),
      limitUpPrice: Number(data.limit_up_price),
      limitDownPrice: Number(data.limit_down_price),
      change: Number(data.change),
      changePercent: Number(data.change_percent),
      buyOneVolume: Number(data.buy_one_volume),
      timestamp: data.update_time
    };
  } catch (error) {
    console.error('获取涨停板数据失败:', error);
    throw error;
  }
}
```

### 优先级 P1（优化改进）

#### 3. 统一数据源管理
创建统一的数据源配置和管理器：

```typescript
// services/adapters/dataSourceManager.ts
export class DataSourceManager {
  private static sources = new Map<string, DataSource>();
  
  static register(name: string, source: DataSource) {
    this.sources.set(name, source);
  }
  
  static async fetch(name: string, params: any) {
    const source = this.sources.get(name);
    if (!source) throw new Error(`数据源 ${name} 不存在`);
    return source.fetch(params);
  }
  
  static getStatus() {
    const status: Record<string, any> = {};
    this.sources.forEach((source, name) => {
      status[name] = source.getStatus();
    });
    return status;
  }
}
```

#### 4. 添加数据源健康检查
```typescript
// services/adapters/healthCheck.ts
export async function checkDataSourceHealth() {
  const results = {
    sina: await checkSinaHealth(),
    qos: await checkQOSHealth(),
    database: await checkDatabaseHealth()
  };
  return results;
}
```

### 优先级 P2（长期优化）

#### 5. 实现数据源切换策略
- 主数据源失败时自动切换到备用数据源
- 记录数据源可用性统计
- 智能选择最优数据源

#### 6. 添加数据质量监控
- 监控数据延迟
- 检测异常数据
- 数据完整性验证

---

## 📋 实施步骤

### 第一步：创建缺失的适配器（30分钟）
1. 创建 `qosAdapter.ts`
2. 创建 `limitUpStockService.ts`
3. 检查并完善 `blockTradeService.ts`

### 第二步：测试数据源（15分钟）
1. 测试 QOS 适配器
2. 测试涨停板服务
3. 测试大宗交易服务

### 第三步：集成到前端（15分钟）
1. 更新 `frontendMarketService.ts` 的动态导入
2. 测试各种交易类型的数据获取
3. 验证降级机制

### 第四步：文档更新（10分钟）
1. 更新 README.md
2. 添加数据源使用示例
3. 记录已知问题和限制

---

## 🔍 数据源对比

| 数据源 | 用途 | 状态 | 缓存 | 限流 | 降级 |
|--------|------|------|------|------|------|
| 新浪财经 | A股/港股行情 | ✅ | 5分钟 | 2次/秒 | ✅ |
| 腾讯财经 | K线数据 | ✅ | 10分钟 | 2次/秒 | ✅ |
| 东方财富 | 批量行情 | ✅ | 5分钟 | 2次/秒 | ✅ |
| QOS API | 大宗商品 | ❌ | - | - | - |
| 数据库 IPO | 新股申购 | ✅ | 5分钟 | - | ✅ |
| 数据库涨停 | 涨停板 | ❌ | - | - | - |

---

## ⚠️ 注意事项

### QOS API 限制
根据业务规则文档：
- 最多3个产品
- 5次/分钟限流
- Key 有效期至 2026-03-06

### 数据库依赖
- `block_trade_products` 表需要定期更新价格
- `limit_up_stocks` 表需要实时更新
- `ipos` 表需要管理员维护

### 环境变量
确保配置：
```env
VITE_USE_REAL_MARKET_DATA=true
VITE_QOS_KEY=393b524c70e355c79f1a028049c4fb6f
```

---

## 🎉 完善后的效果

完善后，系统将拥有：
- ✅ 6个数据源（3个外部API + 3个数据库）
- ✅ 完整的多级降级机制
- ✅ 统一的缓存和限流
- ✅ 支持所有交易类型
- ✅ 健壮的错误处理

**预计完成时间**: 1-2小时
