# 数据库架构说明

## 当前架构

项目使用版本化迁移管理数据库架构，完整架构由以下迁移文件组成：

```
supabase/migrations/
├── 20250327000000_init.sql                      # 初始化表结构
├── 20250328000001_add_sms_hook.sql              # 短信钩子
├── 20250330000003_add_chat_tables.sql           # 聊天系统
├── 20250331000004_add_metadata_to_trades.sql    # 交易元数据
├── 20250402000000_correct_ipos_table.sql        # IPO表修正
├── 20250403000000_create_block_trade_products.sql # 大宗交易
├── 20250403000001_create_limit_up_stocks.sql    # 涨停板
├── 20250404000002_create_fund_flows.sql         # 资金流水
├── 20250405000000_optimize_trades_table.sql     # 交易表优化
├── 20250405000001_optimize_positions_table.sql  # 持仓表优化
├── 20260301000000_fix_rls_policies.sql          # RLS策略修复
├── 20260301000001_add_settlement_system.sql     # 清算系统
├── 20260301000002_verify_fixes.sql              # 验证修复
├── 20260301000006_fix_trade_core.sql            # 交易核心修复
├── 20260301000007_fix_admin_backend.sql         # 管理后台修复
└── 20260301000008_p2_optimization_features.sql  # P2优化功能
```

## 核心表结构

### 用户相关
- `profiles` - 用户资料
- `assets` - 用户资产
- `positions` - 持仓
- `holdings` - 证券持仓

### 交易相关
- `trades` - 交易订单
- `transactions` - 交易流水
- `fund_flows` - 资金流水
- `trade_executions` - 成交记录

### 内容相关
- `reports` - 研报
- `education_topics` - 投教内容
- `calendar_events` - 日历事件
- `banners` - 横幅公告
- `ipos` - 新股信息

### 管理相关
- `admin_operation_logs` - 管理员操作日志
- `trade_rules` - 交易规则
- `trade_rules_history` - 规则历史

### 优化功能
- `market_data_cache` - 行情缓存
- `batch_trade_orders` - 批量订单
- `user_recommendations` - 智能推荐
- `performance_metrics` - 性能监控
- `user_behavior_logs` - 行为日志

## 查看完整架构

```bash
# 在Supabase Dashboard
Database -> Schema Visualizer

# 或导出当前架构
supabase db dump -f current_schema.sql
```

## 注意事项

- 不要直接修改此文件
- 所有架构变更通过迁移文件
- 迁移文件按时间戳顺序执行
