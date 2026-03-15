-- ============================================================
-- 创建热点数据表
-- ============================================================
-- 说明：
-- 1. 用于存储 crawler 爬取的热点数据
-- 2. 支持去重（通过 title/event 字段）
-- 3. 7天自动清理（通过 crawler 函数）
-- ============================================================

-- ============================================
-- 1. 热点资讯表
-- ============================================
CREATE TABLE IF NOT EXISTS hot_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER NOT NULL,
  title TEXT NOT NULL UNIQUE,
  link TEXT,
  publish_time TEXT,
  heat TEXT,
  source TEXT NOT NULL, -- 'ths' 或 'jiuyan'
  crawl_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hot_news_crawl_time ON hot_news(crawl_time DESC);
CREATE INDEX IF NOT EXISTS idx_hot_news_source ON hot_news(source);
CREATE INDEX IF NOT EXISTS idx_hot_news_rank ON hot_news(rank);

COMMENT ON TABLE hot_news IS '热点资讯表，存储同花顺和韭研公社的热点';
COMMENT ON COLUMN hot_news.source IS '数据源：ths(同花顺) 或 jiuyan(韭研公社)';

-- ============================================
-- 2. 公社热帖表
-- ============================================
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER NOT NULL,
  title TEXT NOT NULL UNIQUE,
  link TEXT,
  publish_time TEXT,
  heat TEXT,
  crawl_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_crawl_time ON community_posts(crawl_time DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_rank ON community_posts(rank);

COMMENT ON TABLE community_posts IS '公社热帖表，存储韭研公社热门帖子';

-- ============================================
-- 3. 今日热点表
-- ============================================
CREATE TABLE IF NOT EXISTS today_hotspot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  title TEXT NOT NULL UNIQUE,
  keywords TEXT,
  heat TEXT,
  crawl_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_today_hotspot_crawl_time ON today_hotspot(crawl_time DESC);
CREATE INDEX IF NOT EXISTS idx_today_hotspot_date ON today_hotspot(date);

COMMENT ON TABLE today_hotspot IS '今日热点表，存储每日热门关键词';

-- ============================================
-- 4. 财经日历表
-- ============================================
CREATE TABLE IF NOT EXISTS financial_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  event TEXT NOT NULL UNIQUE,
  crawl_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_calendar_crawl_time ON financial_calendar(crawl_time DESC);
CREATE INDEX IF NOT EXISTS idx_financial_calendar_date ON financial_calendar(date);

COMMENT ON TABLE financial_calendar IS '财经日历表，存储重要财经事件';

-- ============================================
-- 5. RLS 策略（允许匿名读取和写入）
-- ============================================
ALTER TABLE hot_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE today_hotspot ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_calendar ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户读取
CREATE POLICY "Allow anonymous read" ON hot_news FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON community_posts FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON today_hotspot FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON financial_calendar FOR SELECT USING (true);

-- 允许所有写入（包括 crawler）
CREATE POLICY "Allow all write" ON hot_news FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all write" ON hot_news FOR DELETE USING (true);
CREATE POLICY "Allow all write" ON community_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all write" ON community_posts FOR DELETE USING (true);
CREATE POLICY "Allow all write" ON today_hotspot FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all write" ON today_hotspot FOR DELETE USING (true);
CREATE POLICY "Allow all write" ON financial_calendar FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all write" ON financial_calendar FOR DELETE USING (true);
