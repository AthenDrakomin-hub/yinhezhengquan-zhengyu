-- ============================================================
-- 热点数据清理定时任务
-- ============================================================
-- 说明：
-- 1. 每天凌晨清理7天前的热点数据
-- 2. 控制数据量在合理范围内
-- 
-- 缓存架构：
-- - 主缓存：Upstash Redis（Edge Functions 使用）
-- - 备用缓存：market_data_cache 表
-- - 热点数据：hot_news, community_posts 等表（7天自动清理）
-- ============================================================

-- ============================================
-- 每天凌晨清理热点数据（保留7天）
-- ============================================
SELECT cron.schedule(
  'cleanup-hotspot-data-daily',
  '0 3 * * *', -- 每天凌晨3点执行
  $$
  -- 清理7天前的热点资讯
  DELETE FROM hot_news WHERE crawl_time < NOW() - INTERVAL '7 days';
  -- 清理7天前的公社热帖
  DELETE FROM community_posts WHERE crawl_time < NOW() - INTERVAL '7 days';
  -- 清理7天前的今日热点
  DELETE FROM today_hotspot WHERE crawl_time < NOW() - INTERVAL '7 days';
  -- 清理7天前的财经日历
  DELETE FROM financial_calendar WHERE crawl_time < NOW() - INTERVAL '7 days';
  -- 清理过期的数据库缓存
  DELETE FROM market_data_cache WHERE expires_at < NOW();
  $$
);

-- ============================================
-- 说明
-- ============================================
-- | 任务名称 | 频率 | 说明 |
-- |----------|------|------|
-- | cleanup-hotspot-data-daily | 每天凌晨3点 | 清理7天前热点数据 |
--
-- 预估存储量：
-- - 热点数据：约 150KB（每天48次采集，去重+7天清理）
-- - Redis 缓存：约 10MB（主要使用 Upstash Redis）
-- - 数据库缓存：约 5MB（备用）
-- - 总计：< 20MB，远低于配额
