# Supabase 迁移文件说明

## 📋 核心迁移文件（按顺序执行）

### 1. 基础表结构
**文件**: `20250327000000_init.sql`  
**说明**: 初始化核心表（profiles, holdings, transactions, conditional_orders, asset_snapshots）  
**状态**: ✅ 已执行

### 2. 短信钩子
**文件**: `20250328000001_add_sms_hook.sql`  
**说明**: 添加短信发送功能  
**状态**: ✅ 已执行

### 3. 聊天系统
**文件**: `20250330000003_add_chat_tables.sql`  
**说明**: 添加聊天和工单系统表  
**状态**: ✅ 已执行

### 4. 交易元数据
**文件**: `20250331000004_add_metadata_to_trades.sql`  
**说明**: 为trades表添加metadata字段  
**状态**: ✅ 已执行

### 5. IPO表（新股申购）
**文件**: `20250402000000_correct_ipos_table.sql`  
**说明**: 创建正确的IPO表结构  
**状态**: ⚠️ 待执行

### 6. 大宗交易产品表
**文件**: `20250403000000_create_block_trade_products.sql`  
**说明**: 创建大宗交易产品表  
**状态**: ⚠️ 待执行

### 7. 涨停股票表
**文件**: `20250403000001_create_limit_up_stocks.sql`  
**说明**: 创建涨停股票表  
**状态**: ⚠️ 待执行（建议使用合并迁移文件）

### 8. 资金流水表
**文件**: `20250404000002_create_fund_flows.sql`  
**说明**: 创建资金流水表  
**状态**: ⚠️ 待执行（建议使用合并迁移文件）

### 9. 迁移优化系统
**文件**: `20260302000002_migration_optimization.sql`  
**说明**: 迁移版本控制、智能检查、事务支持  
**状态**: 🆕 新增

### 10. 合并市场数据表
**文件**: `20260302000003_merged_market_data_tables.sql`  
**说明**: 合并IPO、大宗交易、涨停股票、资金流表  
**状态**: 🆕 新增（推荐使用）

---

## 🚀 执行顺序（优化版）

### 方案A：使用优化系统（推荐）
```sql
-- 1. 初始化迁移优化系统
\i 20260302000002_migration_optimization.sql

-- 2. 执行合并的市场数据迁移
\i 20260302000003_merged_market_data_tables.sql

-- 3. 查看迁移状态
SELECT * FROM public.migration_status;
```

### 方案B：传统执行顺序
```sql
-- 1. IPO表（如果还未执行）
\i 20250402000000_correct_ipos_table.sql

-- 2. 大宗交易产品表
\i 20250403000000_create_block_trade_products.sql

-- 3. 涨停股票表
\i 20250403000001_create_limit_up_stocks.sql

-- 4. 资金流水表
\i 20250404000002_create_fund_flows.sql
```

---

## 🎯 迁移优化特性

### 1. 智能迁移检查
- **表/字段存在检查**: 使用 `IF NOT EXISTS` 和 `DROP IF EXISTS`
- **索引存在检查**: 使用 `CREATE INDEX IF NOT EXISTS`
- **策略存在检查**: 使用 `DROP POLICY IF EXISTS`
- **扩展检查**: 使用 `CREATE EXTENSION IF NOT EXISTS`

### 2. 合并相关迁移
- **市场数据表合并**: IPO、大宗交易、涨停股票、资金流表合并为一个文件
- **减少迁移次数**: 从4次减少到1次
- **统一事务管理**: 确保所有操作在同一个事务中

### 3. 迁移版本控制
- **migrations表**: 记录所有已应用的迁移
- **状态跟踪**: SUCCESS、FAILED、PENDING状态
- **执行时间记录**: 记录每个迁移的执行时间
- **错误信息记录**: 记录失败迁移的错误信息

### 4. 事务原子性
- **BEGIN/COMMIT包装**: 所有迁移文件都使用事务包装
- **原子性保证**: 迁移要么完全成功，要么完全回滚
- **错误处理**: 事务内的错误会自动回滚所有更改

### 5. 辅助函数
- **智能检查函数**: `table_exists()`, `column_exists()`, `index_exists()`, `policy_exists()`
- **安全创建函数**: `create_table_safe()`, `add_column_safe()`
- **迁移应用函数**: `apply_migration()`, `record_migration()`

---

## 📝 注意事项

1. **执行前备份**：建议先备份数据库
2. **顺序执行**：必须按照文件名顺序执行
3. **检查结果**：执行后检查表是否创建成功
4. **RLS策略**：确保profiles表存在且有role字段
5. **事务安全**：所有迁移现在都使用事务，确保原子性
6. **版本控制**：使用迁移优化系统可以跟踪迁移状态

---

## 🗑️ 已清理的文件

以下临时文件已删除：
- admin_diagnosis.sql
- apply_ipos_rls.sql
- apply_profiles_rls_policy.sql
- check_admin_users_detailed.sql
- check_ipos_rls_policy.sql
- correct_admin_rls_fix.sql
- create_admin_user.sql
- fix_admin_rls.sql
- fix_empty_profiles.sql
- verify_admin_user.sql

这些是临时诊断和修复脚本，不需要保留。

---

## 🔄 迁移文件更新

以下迁移文件已更新，添加了事务支持：
- `20250327000000_init.sql` - 添加BEGIN/COMMIT事务包装
- `20260301000000_fix_rls_policies.sql` - 添加BEGIN/COMMIT事务包装

---

## 📊 迁移状态查询

使用优化系统后，可以查询迁移状态：
```sql
-- 查看所有迁移状态
SELECT * FROM public.migration_status;

-- 查看失败的迁移
SELECT * FROM public.migration_status WHERE status = 'FAILED';

-- 查看迁移执行时间
SELECT migration_name, execution_time_ms, applied_at 
FROM public.migration_status 
ORDER BY execution_time_ms DESC;
```

---

**最后更新**: 2026-03-02
**优化版本**: v1.0
