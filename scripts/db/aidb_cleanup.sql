-- ==========================================================
-- aidb 数据库清理脚本
-- 用途：清理与项目无关的数据表
-- 注意：执行前请先备份！
-- ==========================================================

-- ==========================================================
-- 第一步：查询并识别无关表
-- ==========================================================

-- 查看所有表
SELECT
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ==========================================================
-- 第二步：删除无关表（请确认后再执行）
-- ==========================================================

-- 以下是需要删除的表（根据项目情况确认）：
-- 1. backup_auth_users 表（备份表，可以删除）
-- DROP TABLE IF EXISTS public.backup_auth_users CASCADE;

-- 2. backup_auth_users_20250308 表（备份表，可以删除）
-- DROP TABLE IF EXISTS public.backup_auth_users_20250308 CASCADE;

-- 3. 其他 backup_* 表
-- DROP TABLE IF EXISTS public.backup_* CASCADE;

-- ==========================================================
-- 保留的表（这些是项目核心表，不要删除）
-- ==========================================================

-- 用户相关表
-- profiles - 用户资料
-- admin_users - 管理员用户
-- assets - 用户资产

-- 交易相关表
-- trades - 交易订单
-- transactions - 交易流水
-- holdings - 持仓
-- positions - 持仓（新版本）
-- fund_flows - 资金流水
-- fund_transfers - 资金转账

-- 市场数据表
-- ipos - 新股
-- block_trade_products - 大宗交易产品
-- limit_up_stocks - 涨停股票
-- account_applications - 账户申请

-- 订单和策略表
-- conditional_orders - 条件单
-- batch_trade_orders - 批量交易订单

-- 管理相关表
-- admin_operation_logs - 管理员操作日志
-- trade_rules - 交易规则
-- force_sell_records - 强制平仓记录

-- 内容管理表
-- reports - 研报
-- education_content - 投教内容
-- education_topics - 投教主题
-- banners - 横幅公告
-- calendar_events - 日历事件

-- 客服和消息表
-- support_tickets - 客服工单
-- messages - 消息
-- user_notifications - 用户通知

-- 其他表
-- asset_snapshots - 资产快照
-- face_verification_logs - 人脸验证日志
-- market_data_cache - 市场数据缓存
-- user_recommendations - 用户推荐
-- ipo_subscriptions - 新股申购记录

-- ==========================================================
-- 第三步：清理建议
-- ==========================================================

-- 建议删除的表（只删除 backup_* 开头的表）：
-- 请取消注释以下行来执行删除

-- DROP TABLE IF EXISTS public.backup_auth_users CASCADE;
-- DROP TABLE IF EXISTS public.backup_auth_users_20250308 CASCADE;

-- 如果有其他 backup_* 表，请按相同模式删除

-- ==========================================================
-- 第四步：验证清理结果
-- ==========================================================

-- 再次查询，确认清理后的表
SELECT
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ==========================================================
-- 注意事项
-- ==========================================================

-- 1. 执行前请务必备份数据库
-- 2. 只删除 backup_* 开头的表
-- 3. 不要删除任何业务核心表
-- 4. 建议先在测试环境验证
-- 5. 确认无误后再在生产环境执行
