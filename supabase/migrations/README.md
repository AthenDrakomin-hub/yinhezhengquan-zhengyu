# Supabase 迁移文件

本目录包含数据库迁移文件，按时间戳顺序执行。

## 迁移文件列表

| 序号 | 文件名 | 说明 |
|------|--------|------|
| 1 | `20250327000000_init.sql` | 核心表结构初始化 |
| 2 | `20250328000001_add_sms_hook.sql` | 短信发送钩子函数 |
| 3 | `20250330000003_add_chat_tables.sql` | 客服聊天系统表 |
| 4 | `20250331000004_add_metadata_to_trades.sql` | 交易元数据字段 |
| 5 | `20250402000000_market_data_tables.sql` | 市场数据表（IPO、大宗交易、涨停股票、资金流水） |
| 6 | `20250403000000_system_optimization.sql` | 系统优化（触发器、清算、规则表等） |

## 执行方式

### 方式一：使用 Supabase CLI

```bash
# 连接远程数据库并执行迁移
supabase db push

# 或本地开发环境
supabase db reset
```

### 方式二：使用 SQL Editor

在 Supabase Dashboard -> SQL Editor 中按顺序执行每个迁移文件。

### 方式三：使用 psql

```bash
psql $DATABASE_URL -f supabase/migrations/20250327000000_init.sql
psql $DATABASE_URL -f supabase/migrations/20250328000001_add_sms_hook.sql
# ... 按顺序执行
```

## 迁移详情

### 1. init.sql - 核心表结构

创建以下核心表：
- `profiles` - 用户资料
- `holdings` - 证券持仓
- `transactions` - 交易流水
- `conditional_orders` - 条件单
- `asset_snapshots` - 资产快照

### 2. add_sms_hook.sql - 短信钩子

创建 `send_sms()` 函数，用于短信发送钩子。

### 3. add_chat_tables.sql - 聊天系统

创建以下表：
- `messages` - 消息记录
- 修改 `support_tickets` 添加聊天字段

### 4. add_metadata_to_trades.sql - 交易元数据

为 `trades` 表添加 `metadata` JSONB 字段。

### 5. market_data_tables.sql - 市场数据

创建以下表：
- `ipos` - IPO 新股申购
- `block_trade_products` - 大宗交易产品
- `limit_up_stocks` - 涨停股票
- `fund_flows` - 资金流水

### 6. system_optimization.sql - 系统优化

包含：
- 用户注册自动触发器
- 交易订单优化字段
- 持仓表优化字段
- 清算日志表
- 管理员操作日志表
- 交易规则表
- RLS 策略补充

## 注意事项

1. **执行顺序**：必须按文件名时间戳顺序执行
2. **幂等性**：所有迁移使用 `IF NOT EXISTS` / `IF EXISTS` 确保可重复执行
3. **事务**：每个迁移文件使用 `BEGIN`/`COMMIT` 包装
4. **备份**：生产环境执行前请先备份数据

## 完整 Schema

如需一次性创建所有表结构，可使用 `database/schema.sql`。

---

**版本**: v1.0  
**更新时间**: 2024-03-07
