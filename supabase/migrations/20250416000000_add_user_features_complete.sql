-- =====================================================
-- 用户功能完善迁移脚本
-- 包含：条件单、通知系统、资产快照、投教内容
-- =====================================================

-- 1. 条件单表 (conditional_orders)
CREATE TABLE IF NOT EXISTS conditional_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 标的信息
    symbol VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100),
    market_type VARCHAR(10) DEFAULT 'A_SHARE',
    
    -- 条件单类型
    order_type VARCHAR(20) NOT NULL, -- 'TP_SL' (止盈止损), 'GRID' (网格), 'PRICE_ALERT' (价格预警)
    
    -- 止盈止损配置
    stop_loss_price DECIMAL(18, 4),
    take_profit_price DECIMAL(18, 4),
    
    -- 网格交易配置
    grid_upper_price DECIMAL(18, 4),
    grid_lower_price DECIMAL(18, 4),
    grid_count INTEGER DEFAULT 10,
    grid_quantity INTEGER,
    
    -- 价格预警配置
    trigger_price DECIMAL(18, 4),
    trigger_condition VARCHAR(10), -- 'ABOVE', 'BELOW'
    
    -- 交易参数
    quantity INTEGER,
    leverage DECIMAL(10, 2) DEFAULT 1,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'TRIGGERED', 'CANCELLED', 'EXPIRED'
    triggered_at TIMESTAMP WITH TIME ZONE,
    triggered_price DECIMAL(18, 4),
    
    -- 执行结果
    executed_order_id UUID,
    executed_price DECIMAL(18, 4),
    executed_quantity INTEGER,
    
    -- 有效期
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_order_type CHECK (order_type IN ('TP_SL', 'GRID', 'PRICE_ALERT')),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'TRIGGERED', 'CANCELLED', 'EXPIRED'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conditional_orders_user_id ON conditional_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_status ON conditional_orders(status);
CREATE INDEX IF NOT EXISTS idx_conditional_orders_symbol ON conditional_orders(symbol);

-- 2. 用户通知表 (user_notifications)
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 通知类型
    notification_type VARCHAR(30) NOT NULL, -- 'SYSTEM', 'TRADE', 'FORCE_SELL', 'APPROVAL', 'RISK_WARNING', 'ACCOUNT', 'ANNOUNCEMENT'
    
    -- 通知内容
    title VARCHAR(200) NOT NULL,
    content TEXT,
    
    -- 关联信息
    related_type VARCHAR(50), -- 'trade', 'order', 'position', 'ticket'
    related_id UUID,
    
    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- 优先级
    priority VARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    
    -- 有效期
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_notification_type CHECK (notification_type IN ('SYSTEM', 'TRADE', 'FORCE_SELL', 'APPROVAL', 'RISK_WARNING', 'ACCOUNT', 'ANNOUNCEMENT')),
    CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- 3. 通知设置表 (notification_settings)
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- 交易通知
    trade_alerts_enabled BOOLEAN DEFAULT TRUE,
    trade_alerts_push BOOLEAN DEFAULT TRUE,
    trade_alerts_email BOOLEAN DEFAULT FALSE,
    trade_alerts_sms BOOLEAN DEFAULT FALSE,
    
    -- 价格预警
    price_alerts_enabled BOOLEAN DEFAULT TRUE,
    price_alerts_push BOOLEAN DEFAULT TRUE,
    price_alerts_email BOOLEAN DEFAULT FALSE,
    
    -- 系统公告
    system_news_enabled BOOLEAN DEFAULT FALSE,
    system_news_push BOOLEAN DEFAULT FALSE,
    system_news_email BOOLEAN DEFAULT TRUE,
    
    -- 风险通知
    risk_warning_enabled BOOLEAN DEFAULT TRUE,
    risk_warning_push BOOLEAN DEFAULT TRUE,
    risk_warning_email BOOLEAN DEFAULT TRUE,
    
    -- 审批通知
    approval_enabled BOOLEAN DEFAULT TRUE,
    approval_push BOOLEAN DEFAULT TRUE,
    approval_email BOOLEAN DEFAULT FALSE,
    
    -- 强制平仓通知
    force_sell_enabled BOOLEAN DEFAULT TRUE,
    force_sell_push BOOLEAN DEFAULT TRUE,
    force_sell_email BOOLEAN DEFAULT TRUE,
    force_sell_sms BOOLEAN DEFAULT TRUE,
    
    -- 免打扰时段
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- 4. 资产快照表 (asset_snapshots)
CREATE TABLE IF NOT EXISTS asset_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 快照日期
    snapshot_date DATE NOT NULL,
    
    -- 资产汇总
    total_equity DECIMAL(18, 4) NOT NULL, -- 总权益
    available_balance DECIMAL(18, 4), -- 可用资金
    frozen_balance DECIMAL(18, 4), -- 冻结资金
    market_value DECIMAL(18, 4), -- 持仓市值
    
    -- 收益
    daily_profit DECIMAL(18, 4), -- 日收益
    daily_profit_rate DECIMAL(10, 6), -- 日收益率
    total_profit DECIMAL(18, 4), -- 累计收益
    total_profit_rate DECIMAL(10, 6), -- 累计收益率
    
    -- 持仓详情 (JSON)
    holdings_snapshot JSONB, -- 持仓快照
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束：每个用户每天只有一条记录
    CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_user_id ON asset_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_date ON asset_snapshots(snapshot_date DESC);

-- 5. 投教文章表 (如果不存在)
CREATE TABLE IF NOT EXISTS education_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 基本信息
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'BASICS', 'STRATEGY', 'RISK', 'ANALYSIS', 'TOOL'
    difficulty VARCHAR(20) DEFAULT 'BEGINNER', -- 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
    
    -- 内容
    summary TEXT,
    content TEXT,
    cover_image VARCHAR(500),
    video_url VARCHAR(500),
    document_url VARCHAR(500),
    
    -- 作者
    author VARCHAR(100),
    author_title VARCHAR(200),
    
    -- 统计
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    
    -- 排序和标签
    sort_order INTEGER DEFAULT 0,
    tags TEXT[],
    
    -- 时间戳
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_education_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_education_topics_category ON education_topics(category);
CREATE INDEX IF NOT EXISTS idx_education_topics_status ON education_topics(status);
CREATE INDEX IF NOT EXISTS idx_education_topics_is_published ON education_topics(is_published);

-- 6. 用户投教进度表 (education_progress)
CREATE TABLE IF NOT EXISTS education_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES education_topics(id) ON DELETE CASCADE,
    
    -- 进度
    progress INTEGER DEFAULT 0, -- 0-100
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 点赞
    is_liked BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束：每个用户对每篇文章只有一条记录
    CONSTRAINT unique_user_topic_progress UNIQUE (user_id, topic_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_education_progress_user_id ON education_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_education_progress_topic_id ON education_progress(topic_id);

-- 7. RLS 策略

-- 条件单 RLS
ALTER TABLE conditional_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conditional orders"
    ON conditional_orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conditional orders"
    ON conditional_orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conditional orders"
    ON conditional_orders FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conditional orders"
    ON conditional_orders FOR DELETE
    USING (auth.uid() = user_id);

-- 用户通知 RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON user_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON user_notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON user_notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 通知设置 RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings"
    ON notification_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
    ON notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
    ON notification_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 资产快照 RLS
ALTER TABLE asset_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own asset snapshots"
    ON asset_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own asset snapshots"
    ON asset_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 投教进度 RLS
ALTER TABLE education_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own education progress"
    ON education_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own education progress"
    ON education_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own education progress"
    ON education_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. 插入默认投教内容
INSERT INTO education_topics (title, category, difficulty, summary, content, author, status, is_published, sort_order)
VALUES
    ('股票基础知识：什么是股票？', 'BASICS', 'BEGINNER', 
     '了解股票的基本概念，包括股票的定义、特征和基本交易规则。',
     '股票是股份公司发行的所有权凭证，是股份公司为筹集资金而发行给各个股东作为持股凭证并借以取得股息和红利的一种有价证券。',
     '银河证券投教团队', 'PUBLISHED', true, 1),
     
    ('如何看懂K线图？', 'ANALYSIS', 'BEGINNER',
     'K线图是股票技术分析的基础，本课程将教你如何读懂K线图。',
     'K线图又称蜡烛图，起源于日本，是记录价格走势的重要工具。一根K线包含四个价格：开盘价、收盘价、最高价、最低价。',
     '银河证券投教团队', 'PUBLISHED', true, 2),
     
    ('风险控制：止损的重要性', 'RISK', 'INTERMEDIATE',
     '学会止损是投资成功的关键，本课程讲解止损的方法和重要性。',
     '止损是指在投资亏损达到预定数额时，及时斩仓出局，以避免形成更大的亏损。止损是风险管理的核心工具之一。',
     '银河证券投教团队', 'PUBLISHED', true, 3),
     
    ('价值投资入门', 'STRATEGY', 'INTERMEDIATE',
     '价值投资是一种重要的投资策略，本课程介绍价值投资的基本理念。',
     '价值投资是指以低于内在价值的价格购买股票，并长期持有，等待价格回归价值的投资策略。',
     '银河证券投教团队', 'PUBLISHED', true, 4),
     
    ('交易软件使用指南', 'TOOL', 'BEGINNER',
     '熟悉银河正裕交易系统的各项功能，提高交易效率。',
     '本课程将详细介绍交易软件的各项功能，包括行情查看、委托下单、条件单设置、资产分析等。',
     '银河证券投教团队', 'PUBLISHED', true, 5)
ON CONFLICT DO NOTHING;

-- 9. 创建资产快照记录函数
CREATE OR REPLACE FUNCTION record_daily_asset_snapshot(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_balance DECIMAL(18, 4);
    v_frozen DECIMAL(18, 4);
    v_market_value DECIMAL(18, 4);
    v_total_equity DECIMAL(18, 4);
    v_holdings JSONB;
    v_prev_equity DECIMAL(18, 4);
    v_daily_profit DECIMAL(18, 4);
BEGIN
    -- 获取用户资产
    SELECT COALESCE(available_balance, 0), COALESCE(frozen_balance, 0)
    INTO v_balance, v_frozen
    FROM assets
    WHERE user_id = p_user_id;
    
    -- 获取持仓市值
    SELECT COALESCE(SUM(quantity * current_price), 0)
    INTO v_market_value
    FROM positions
    WHERE user_id = p_user_id;
    
    v_total_equity := COALESCE(v_balance, 0) + COALESCE(v_frozen, 0) + v_market_value;
    
    -- 获取持仓快照
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'symbol', symbol,
            'name', stock_name,
            'quantity', quantity,
            'available_quantity', available_quantity,
            'average_price', average_price,
            'current_price', current_price,
            'market_value', quantity * current_price
        )
    ), '[]'::jsonb)
    INTO v_holdings
    FROM positions
    WHERE user_id = p_user_id;
    
    -- 获取前一天的权益
    SELECT total_equity INTO v_prev_equity
    FROM asset_snapshots
    WHERE user_id = p_user_id
    ORDER BY snapshot_date DESC
    LIMIT 1;
    
    -- 计算日收益
    IF v_prev_equity IS NOT NULL AND v_prev_equity > 0 THEN
        v_daily_profit := v_total_equity - v_prev_equity;
    ELSE
        v_daily_profit := 0;
    END IF;
    
    -- 插入快照
    INSERT INTO asset_snapshots (
        user_id,
        snapshot_date,
        total_equity,
        available_balance,
        frozen_balance,
        market_value,
        daily_profit,
        daily_profit_rate,
        holdings_snapshot
    ) VALUES (
        p_user_id,
        CURRENT_DATE,
        v_total_equity,
        v_balance,
        v_frozen,
        v_market_value,
        v_daily_profit,
        CASE WHEN v_prev_equity > 0 THEN v_daily_profit / v_prev_equity ELSE 0 END,
        v_holdings
    )
    ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
        total_equity = EXCLUDED.total_equity,
        available_balance = EXCLUDED.available_balance,
        frozen_balance = EXCLUDED.frozen_balance,
        market_value = EXCLUDED.market_value,
        daily_profit = EXCLUDED.daily_profit,
        holdings_snapshot = EXCLUDED.holdings_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建通知发送函数
CREATE OR REPLACE FUNCTION send_user_notification(
    p_user_id UUID,
    p_type VARCHAR(30),
    p_title VARCHAR(200),
    p_content TEXT,
    p_priority VARCHAR(10) DEFAULT 'NORMAL',
    p_related_type VARCHAR(50) DEFAULT NULL,
    p_related_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id,
        notification_type,
        title,
        content,
        priority,
        related_type,
        related_id
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_content,
        p_priority,
        p_related_type,
        p_related_id
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE conditional_orders IS '条件单表 - 存储用户设置的止盈止损、网格交易等条件单';
COMMENT ON TABLE user_notifications IS '用户通知表 - 存储用户的各类通知消息';
COMMENT ON TABLE notification_settings IS '通知设置表 - 存储用户的通知偏好设置';
COMMENT ON TABLE asset_snapshots IS '资产快照表 - 存储用户资产的每日快照，用于历史分析';
COMMENT ON TABLE education_topics IS '投教文章表 - 存储投教内容';
COMMENT ON TABLE education_progress IS '投教进度表 - 记录用户的学习进度';
