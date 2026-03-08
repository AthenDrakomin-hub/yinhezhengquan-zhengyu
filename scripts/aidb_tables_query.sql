-- ==========================================================
-- aidb 数据库表清单查询
-- 执行此脚本查看 public schema 的所有表
-- ==========================================================

-- 1. 查询所有表及其大小
SELECT
    schemaname,
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    CASE
        WHEN schemaname = 'public' THEN '业务表'
        WHEN schemaname = 'auth' THEN 'Auth系统表'
        WHEN schemaname = 'storage' THEN 'Storage系统表'
        WHEN schemaname = 'realtime' THEN 'Realtime系统表'
        ELSE '其他'
    END as table_type
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY
    CASE
        WHEN schemaname = 'public' THEN 1
        WHEN schemaname IN ('auth', 'storage', 'realtime') THEN 2
        ELSE 3
    END,
    schemaname,
    tablename;

-- 2. 查询 public schema 的所有表
SELECT
    tablename,
    tableowner,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. 查询记录数量
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
