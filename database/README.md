# 数据库同步指南

## 当前数据库状态

根据检查结果，数据库存在以下问题：

### ✅ 已存在的表
- profiles, assets, positions, trades, fund_flows
- admin_operation_logs, trade_rules, settlement_logs
- support_tickets, messages, trade_match_pool
- ipos, limit_up_stocks, block_trade_products
- banners, reports, education_topics, calendar_events

### ⚠️ 需要修复的问题
1. **user_notifications** - RLS 策略问题 (PGRST205)
2. **force_sell_records** - RLS 策略问题 (PGRST205)
3. **profiles 表** - 缺少 `balance`, `total_equity`, `display_name`, `avatar_url` 字段
4. **positions 表** - 缺少 `risk_level`, `is_forced_sell` 等字段

### 🔄 冗余表（待确认）
- `holdings` 与 `positions` 功能重复
- `transactions` 与 `trades` 功能重复

---

## 执行步骤

### 方法一：Supabase Dashboard（推荐）

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目：`rfnrosyfeivcbkimjlwo`
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New Query**
5. 复制 `database/sync-database.sql` 文件内容并粘贴
6. 点击 **Run** 执行

### 方法二：Supabase CLI

```bash
# 安装 Supabase CLI（如果未安装）
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref rfnrosyfeivcbkimjlwo

# 执行迁移
supabase db push
```

---

## SQL 脚本说明

### 第二部分：profiles 表字段补充
添加：`display_name`, `avatar_url`, `balance`, `total_equity`

### 第三部分：positions 表字段补充
添加：`stock_code`, `stock_name`, `risk_level`, `is_forced_sell`, `forced_sell_at`, `forced_sell_reason`

### 第四部分：trades 表字段补充
添加：`filled_at`, `finish_time`
扩展交易类型：增加 `IPO`, `FORCE_SELL`

### 第五部分：fund_flows 表字段补充
扩展流水类型：增加 `FORCE_SELL`

### 第六部分：user_notifications RLS 修复
重新创建 RLS 策略，解决 PGRST205 错误

### 第七部分：force_sell_records RLS 修复
重新创建 RLS 策略，解决 PGRST205 错误

---

## 验证

执行完成后，运行以下命令验证：

```bash
npx tsx scripts/check-database.ts
```

---

## 注意事项

1. **备份数据**：执行前建议备份数据库
2. **顺序执行**：按脚本中的顺序执行各部分
3. **检查冗余表**：确认 `holdings` 和 `transactions` 是否有数据后再决定是否删除
