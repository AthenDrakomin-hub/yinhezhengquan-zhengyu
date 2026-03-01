# 数据库表清理分析报告

## 📊 现有表分类（共26个表）

### ✅ 核心业务表（必须保留 - 9个）
1. **profiles** - 用户档案（核心）
2. **assets** - 用户资产（核心）
3. **trades** - 交易订单（核心）
4. **positions** - 持仓明细（核心）
5. **admin_operation_logs** - 管理员操作日志（合规必需）
6. **conditional_orders** - 条件单（智能交易）
7. **trade_rules** - 交易规则配置（风控核心）
8. **trade_match_pool** - 撮合池（交易核心）
9. **fund_flows** - 资金流水（审计必需）

### ⚠️ 功能表（建议保留 - 6个）
10. **ipos** - IPO新股申购
11. **block_trade_products** - 大宗交易产品
12. **limit_up_stocks** - 涨停板数据
13. **new_share_configs** - 新股配置
14. **support_tickets** - 工单系统
15. **messages** - 消息记录

### ❌ 重复/冗余表（建议删除 - 5个）
16. **threads** - 线程表（与 support_tickets 重复）
17. **thread_members** - 线程成员（与 support_tickets 重复）
18. **thread_messages** - 线程消息（与 messages 重复）
19. **sms_config** - 短信配置（应该用环境变量）
20. **sms_logs** - 短信日志（可选功能，占用空间）

### 🔧 系统表（保留 - 1个）
21. **sync_metadata** - 同步元数据

---

## 🎯 清理建议

### 方案一：保守清理（删除3个明显重复的表）
```sql
-- 删除线程相关表（已被 support_tickets + messages 替代）
DROP TABLE IF EXISTS public.thread_messages CASCADE;
DROP TABLE IF EXISTS public.thread_members CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
```

**影响**：无，这些表未被使用

### 方案二：激进清理（删除5个表）
```sql
-- 删除线程相关表
DROP TABLE IF EXISTS public.thread_messages CASCADE;
DROP TABLE IF EXISTS public.thread_members CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;

-- 删除短信相关表（改用环境变量配置）
DROP TABLE IF EXISTS public.sms_config CASCADE;
DROP TABLE IF EXISTS public.sms_logs CASCADE;
```

**影响**：需要将短信配置迁移到环境变量

---

## 📋 推荐的最终表结构（16个核心表）

### 用户相关（2个）
- profiles
- assets

### 交易相关（5个）
- trades
- positions
- conditional_orders
- trade_match_pool
- fund_flows

### 市场数据（3个）
- ipos
- block_trade_products
- limit_up_stocks

### 配置与规则（2个）
- trade_rules
- new_share_configs

### 管理与支持（3个）
- admin_operation_logs
- support_tickets
- messages

### 系统（1个）
- sync_metadata

---

## 🚀 执行步骤

### 第一步：备份数据
```sql
-- 检查表是否有数据
SELECT 'threads' as table_name, COUNT(*) as count FROM public.threads
UNION ALL SELECT 'thread_members', COUNT(*) FROM public.thread_members
UNION ALL SELECT 'thread_messages', COUNT(*) FROM public.thread_messages
UNION ALL SELECT 'sms_config', COUNT(*) FROM public.sms_config
UNION ALL SELECT 'sms_logs', COUNT(*) FROM public.sms_logs;
```

### 第二步：执行清理（保守方案）
```sql
-- 只删除明确未使用的线程表
DROP TABLE IF EXISTS public.thread_messages CASCADE;
DROP TABLE IF EXISTS public.thread_members CASCADE;
DROP TABLE IF EXISTS public.threads CASCADE;
```

### 第三步：验证系统功能
- 测试工单系统是否正常
- 测试消息功能是否正常
- 检查是否有报错

---

## 💡 额外优化建议

### 1. 合并相似表
考虑将 `ipos` 和 `new_share_configs` 合并为一个表，因为功能重叠

### 2. 添加缺失的表
- `face_verification_logs` - 人脸验证日志（合规需要）
- `account_applications` - 开户申请（业务需要）

### 3. 字段优化
- `fund_flows` 表字段不一致，需要确认是"用户资金流水"还是"市场资金流向"
- 建议统一为"用户资金流水"，市场数据不需要存储

---

## ⚠️ 风险提示

1. **删除前务必备份**
2. **先在测试环境执行**
3. **检查代码中是否有引用**
4. **通知团队成员**

---

## 📝 代码检查清单

删除表前，需要检查以下文件是否有引用：

```bash
# 搜索 threads 相关引用
grep -r "threads" services/
grep -r "thread_messages" services/
grep -r "thread_members" services/

# 搜索 sms 相关引用
grep -r "sms_config" services/
grep -r "sms_logs" services/
```
