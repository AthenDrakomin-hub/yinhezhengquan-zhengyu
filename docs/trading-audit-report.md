# 交易核心功能审计报告

**审计日期**: 2025-01-XX  
**审计范围**: 买入/卖出价格验证、持仓成本盈亏计算、撤单功能  
**审计结果**: 发现 3 个 P1 问题、2 个 P2 问题

---

## 一、价格有效性验证审计

### 1.1 验证逻辑位置
- **文件**: `services/tradeService.ts`
- **行号**: 200+

### 1.2 当前实现
```typescript
// 普通买卖：验证价格合理性
const realData = await getRealtimeStock(symbol, marketType === 'HK_SHARE' ? 'HK' : 'CN');
if (realData?.price && Math.abs(realData.price - price) / realData.price > 0.05) {
  logger.warn('价格偏离过大，请刷新行情后再试');
}
```

### 1.3 发现问题

| 问题编号 | 严重程度 | 问题描述 |
|---------|---------|---------|
| P1-PRICE-001 | **高** | 价格偏离阈值（5%）只记录警告，**不阻止交易**，用户可能以不合理价格成交 |
| P2-PRICE-002 | 中 | 阈值硬编码在代码中，不支持动态配置 |
| P2-PRICE-003 | 中 | 无价格偏离日志记录，难以追溯异常交易 |

### 1.4 风险影响
- 用户以明显高于市场价的价格买入股票
- 用户以明显低于市场价的价格卖出股票
- 价格操纵风险

### 1.5 修复建议
```typescript
// 建议实现：价格偏离检查并阻止交易
const priceDeviationThreshold = 0.05; // 可从配置中读取
const deviation = Math.abs(realData.price - price) / realData.price;

if (deviation > priceDeviationThreshold) {
  // 记录日志
  logger.warn('价格偏离过大', { 
    symbol, 
    marketPrice: realData.price, 
    orderPrice: price, 
    deviation: (deviation * 100).toFixed(2) + '%' 
  });
  
  // 阻止交易
  return { 
    success: false, 
    error: `价格偏离过大（${(deviation * 100).toFixed(2)}%），当前市场价 ¥${realData.price}，请刷新行情后重试`,
    code: 'PRICE_DEVIATION'
  };
}
```

---

## 二、持仓成本与盈亏计算审计

### 2.1 数据来源
- **持仓表**: `positions` (average_price, quantity, current_price)
- **实时价格**: `marketApi.getBatchStocks()`

### 2.2 计算逻辑
```typescript
// 位置: components/client/trading/HoldingsView.tsx
const cost = avgPrice * quantity;           // 总成本
const marketValue = currentPrice * quantity; // 市值
const profit = marketValue - cost;           // 盈亏
const profitRate = (profit / cost) * 100;    // 盈亏比例
```

### 2.3 发现问题

| 问题编号 | 严重程度 | 问题描述 |
|---------|---------|---------|
| P2-POS-001 | 中 | 实时价格获取失败时，使用 `p.current_price || p.average_price` 作为兜底，可能导致盈亏显示不准确 |
| P2-POS-002 | 中 | 无价格过期提示，用户无法判断价格是否实时 |

### 2.4 修复建议
1. 实时价格获取失败时，显示"价格加载失败"而非兜底值
2. 添加价格更新时间显示，明确告知用户价格时效性
3. 考虑添加价格缓存机制，避免频繁请求

### 2.5 成本更新逻辑审计

**买入时成本更新**（撮合引擎）:
```typescript
// 位置: supabase/functions/match-trade-order-v2/index.ts
const newQty = existingPos.quantity + matchQty;
const newAvgPrice = (existingPos.average_price * existingPos.quantity + matchAmount) / newQty;
```

**结论**: 成本计算逻辑正确，采用标准加权平均法。

---

## 三、撤单功能审计

### 3.1 撤单流程
1. 验证用户身份
2. 检查订单状态（`MATCHING` 或 `PARTIAL`）
3. 从撮合池删除订单
4. 退还冻结资金（买入）或恢复可用持仓（卖出）
5. 更新订单状态为 `CANCELLED`

### 3.2 发现问题

| 问题编号 | 严重程度 | 问题描述 |
|---------|---------|---------|
| **P1-CANCEL-001** | **高** | **订单状态值不一致**：前端查询 `PENDING`，后端检查 `MATCHING`，可能导致撤单失败 |
| P1-CANCEL-002 | 高 | 缺少数据库事务，多个更新操作可能部分成功导致数据不一致 |
| P2-CANCEL-003 | 中 | 部分成交订单撤单时，未检查 `remaining_quantity` 字段是否存在 |

### 3.3 状态不一致详情

**前端代码** (`CancelOrdersView.tsx`):
```typescript
// 查询 PENDING 和 PARTIAL 状态的订单
.in('status', ['PENDING', 'PARTIAL'])
```

**后端代码** (`cancel-trade-order/index.ts`):
```typescript
// 只允许 MATCHING 和 PARTIAL 状态撤单
if (!['MATCHING', 'PARTIAL'].includes(trade.status)) {
  return error(`订单状态为 ${trade.status}，不可撤销`);
}
```

**问题影响**: 
- 如果订单状态为 `PENDING`（审批中），前端会显示在撤单列表
- 但后端会拒绝撤单，返回"订单状态为 PENDING，不可撤销"
- 用户看到订单但无法撤单

### 3.4 修复建议

**方案一：统一状态定义**
```typescript
// 建议统一订单状态枚举
enum TradeStatus {
  PENDING = 'PENDING',      // 待审批
  MATCHING = 'MATCHING',    // 撮合中
  PARTIAL = 'PARTIAL',      // 部分成交
  SUCCESS = 'SUCCESS',      // 完全成交
  CANCELLED = 'CANCELLED',  // 已撤单
  REJECTED = 'REJECTED'     // 审批拒绝
}

// 前端查询可撤单订单
.in('status', ['MATCHING', 'PARTIAL'])
```

**方案二：后端支持 PENDING 状态撤单**
```typescript
// 审批中的订单也应允许撤单
if (!['MATCHING', 'PARTIAL', 'PENDING'].includes(trade.status)) {
  return error(`订单状态为 ${trade.status}，不可撤销`);
}
```

---

## 四、问题汇总

| 编号 | 问题 | 严重程度 | 状态 |
|-----|------|---------|------|
| P1-PRICE-001 | 价格偏离不阻止交易 | 高 | 待修复 |
| P1-CANCEL-001 | 订单状态值不一致 | 高 | 待修复 |
| P1-CANCEL-002 | 撤单缺少事务保障 | 高 | 待修复 |
| P2-PRICE-002 | 价格阈值硬编码 | 中 | 待修复 |
| P2-PRICE-003 | 无价格偏离日志 | 中 | 待修复 |
| P2-POS-001 | 价格失败使用兜底值 | 中 | 待修复 |
| P2-POS-002 | 无价格时效提示 | 中 | 待修复 |
| P2-CANCEL-003 | 未检查 remaining_quantity | 中 | 待修复 |

---

## 五、修复优先级建议

### 第一优先级（P1 - 必须修复）
1. **P1-CANCEL-001**: 统一订单状态定义，确保前后端一致
2. **P1-CANCEL-002**: 为撤单操作添加数据库事务
3. **P1-PRICE-001**: 价格偏离超阈值时阻止交易

### 第二优先级（P2 - 建议修复）
1. P2-PRICE-002: 将价格阈值改为配置项
2. P2-PRICE-003: 添加价格偏离日志记录
3. P2-POS-001/002: 优化实时价格显示逻辑

---

## 六、代码修复建议

### 6.1 统一订单状态定义

建议创建共享的状态枚举文件：

```typescript
// lib/constants/trade-status.ts
export enum TradeStatus {
  PENDING = 'PENDING',      // 待审批
  APPROVED = 'APPROVED',    // 审批通过
  MATCHING = 'MATCHING',    // 撮合中
  PARTIAL = 'PARTIAL',      // 部分成交
  SUCCESS = 'SUCCESS',      // 完全成交
  CANCELLED = 'CANCELLED',  // 已撤单
  REJECTED = 'REJECTED'     // 审批拒绝
}

// 可撤单状态
export const CANCELABLE_STATUSES = [TradeStatus.MATCHING, TradeStatus.PARTIAL, TradeStatus.PENDING];
```

### 6.2 添加事务保障

```typescript
// 建议使用 Supabase RPC 函数包装撤单逻辑
// supabase/migrations/xxx_add_cancel_trade_rpc.sql
CREATE OR REPLACE FUNCTION cancel_trade_order(
  p_trade_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_trade RECORD;
  v_refund_amount DECIMAL;
  v_refund_quantity INTEGER;
BEGIN
  -- 1. 锁定并获取订单
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id FOR UPDATE;
  
  -- 2. 验证状态
  IF v_trade.status NOT IN ('MATCHING', 'PARTIAL', 'PENDING') THEN
    RAISE EXCEPTION '订单状态为 %，不可撤销', v_trade.status;
  END IF;
  
  -- 3. 执行退款逻辑...
  
  -- 4. 更新订单状态
  UPDATE trades SET status = 'CANCELLED' WHERE id = p_trade_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

**审计完成**
