# 撮合引擎部署文档

## 概述

本文档描述了银河证券交易系统撮合引擎的部署和使用方法。

## 架构设计

### 核心组件

1. **撮合引擎 Edge Function** (`match-orders`)
   - 价格优先、时间优先撮合算法
   - 支持部分成交
   - 自动计算手续费
   - 更新持仓和资金

2. **定时任务** (pg_cron)
   - 每分钟自动触发撮合
   - 仅在交易时间执行
   - 自动清理过期数据

3. **实时推送** (Supabase Realtime)
   - 订单状态变化推送
   - 成交记录推送
   - 系统通知推送

## 部署步骤

### 1. 启用数据库扩展

在 Supabase SQL Editor 中执行：

```sql
-- 启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 启用 pg_net 扩展
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. 执行数据库迁移

按顺序执行以下迁移文件：

```bash
# 1. Realtime 配置
supabase migration up --file supabase/migrations/20250802000000_enable_realtime.sql

# 2. 撮合引擎定时任务
supabase migration up --file supabase/migrations/20250801000000_match_orders_cron.sql
```

### 3. 配置环境变量

在 Supabase Dashboard → Settings → Edge Functions 中设置：

```
PROJECT_URL=https://你的项目ID.supabase.co
SERVICE_ROLE_KEY=你的服务角色密钥
```

或在数据库中配置：

```sql
UPDATE app_config 
SET value = 'https://你的项目ID.supabase.co' 
WHERE key = 'project_url';

UPDATE app_config 
SET value = '你的服务角色密钥' 
WHERE key = 'service_role_key';
```

### 4. 部署 Edge Function

```bash
# 部署撮合引擎函数
supabase functions deploy match-orders

# 验证部署
curl -X POST \
  https://你的项目ID.supabase.co/functions/v1/match-orders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5. 验证定时任务

```sql
-- 查看所有定时任务
SELECT jobid, name, schedule, active 
FROM cron.job 
WHERE name LIKE '%match%';

-- 查看任务执行历史
SELECT * 
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE name LIKE '%match%') 
ORDER BY start_time DESC 
LIMIT 20;
```

### 6. 测试撮合流程

```bash
# 运行测试脚本
bash scripts/test-match-orders.sh
```

## 使用方法

### 前端订阅订单状态

```typescript
import { useOrderSubscription } from '@/hooks/useOrderSubscription'

function OrderMonitor() {
  const { status, isConnected } = useOrderSubscription({
    enableOrders: true,
    enableExecutions: true,
    enableNotifications: true,
    onOrderChange: (event) => {
      console.log('订单变化:', event)
    },
    onExecution: (event) => {
      console.log('成交记录:', event)
    }
  })

  return <div>状态: {status}</div>
}
```

### 手动触发撮合

```sql
-- 方式1：调用函数
SELECT trigger_match_orders();

-- 方式2：HTTP 请求
curl -X POST \
  https://你的项目ID.supabase.co/functions/v1/match-orders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 查询撮合统计

```sql
-- 查看撮合统计
SELECT * FROM match_statistics LIMIT 7;

-- 查看实时撮合状态
SELECT * FROM match_status_realtime;

-- 查看撮合日志
SELECT * FROM match_logs 
ORDER BY started_at DESC 
LIMIT 10;
```

## 监控和维护

### 监控指标

```sql
-- 今日撮合统计
SELECT
  COUNT(*) as batch_count,
  SUM(total_orders) as total_orders,
  SUM(matched_count) as matched_count,
  SUM(failed_count) as failed_count,
  AVG(duration_ms) as avg_duration
FROM match_logs
WHERE DATE(started_at) = CURRENT_DATE;
```

### 性能优化

1. **索引优化**
```sql
-- 确保关键索引存在
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status) 
WHERE status IN ('MATCHING', 'PARTIAL');

CREATE INDEX IF NOT EXISTS idx_match_pool_status ON trade_match_pool(status);
```

2. **清理过期数据**
```sql
-- 清理30天前的撮合日志
DELETE FROM match_logs 
WHERE started_at < NOW() - INTERVAL '30 days';

-- 清理已完成超过7天的撮合池记录
DELETE FROM trade_match_pool 
WHERE status = 'COMPLETED' 
  AND updated_at < NOW() - INTERVAL '7 days';
```

### 故障排查

1. **撮合引擎未启动**
```sql
-- 检查定时任务状态
SELECT name, active FROM cron.job WHERE name = 'match-orders-trading-time';

-- 手动触发测试
SELECT trigger_match_orders();
```

2. **订单未撮合**
```sql
-- 检查撮合池状态
SELECT * FROM trade_match_pool WHERE status = 'MATCHING';

-- 检查订单状态
SELECT id, status, price, quantity, executed_quantity 
FROM trades 
WHERE status IN ('MATCHING', 'PARTIAL');
```

3. **Realtime 未推送**
```sql
-- 检查 Realtime 发布
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 重新添加表到发布
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
```

## 相关文件

### Edge Function
- `supabase/functions/match-orders/index.ts` - 撮合引擎核心逻辑

### 数据库迁移
- `supabase/migrations/20250801000000_match_orders_cron.sql` - 定时任务配置
- `supabase/migrations/20250802000000_enable_realtime.sql` - Realtime 配置

### 前端代码
- `hooks/useOrderSubscription.ts` - 订单订阅 Hook
- `components/client/orders/OrderSubscriptionDemo.tsx` - 示例组件

### 测试脚本
- `scripts/test-match-orders.sh` - 撮合引擎测试脚本

## 注意事项

1. **交易时间**：撮合引擎仅在交易时间（工作日 9:30-11:30, 13:00-15:00）运行
2. **配额限制**：定时任务会消耗 Edge Function 调用配额
3. **通知权限**：用户需要授权浏览器通知权限
4. **并发控制**：避免同时运行多个撮合实例

## 下一步优化

1. 实现涨停板排队逻辑
2. 添加大宗交易撮合优化
3. 实现订单簿可视化
4. 添加撮合性能监控面板
5. 实现分布式撮合引擎

---

**最后更新：** 2026-03-14  
**维护者：** 交易系统开发团队
