-- ========================================================
-- 第三阶段：用户体系与运营功能迁移
-- 包含：VIP会员、积分签到、运营活动、风控规则
-- ========================================================

BEGIN;

-- ==========================================================
-- 1. VIP等级配置表 (vip_levels)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.vip_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INT NOT NULL UNIQUE,                       -- 等级 (1-10)
    name VARCHAR(50) NOT NULL,                       -- 等级名称 (普通会员、白银VIP、黄金VIP、钻石VIP等)
    
    -- 升级条件
    required_points INT DEFAULT 0,                   -- 所需积分
    required_trades INT DEFAULT 0,                   -- 所需交易次数
    required_assets DECIMAL(20, 2) DEFAULT 0,        -- 所需资产规模
    
    -- 权益配置
    fee_discount DECIMAL(5, 4) DEFAULT 1.0,          -- 交易手续费折扣 (0.8 = 8折)
    condition_order_limit INT DEFAULT 3,             -- 条件单数量限制
    ipo_priority INT DEFAULT 0,                      -- 新股申购优先级
    level2_quote BOOLEAN DEFAULT FALSE,              -- Level-2行情
    exclusive_service BOOLEAN DEFAULT FALSE,         -- 专属客服
    withdrawal_limit DECIMAL(20, 2) DEFAULT 100000,  -- 单日提现限额
    
    -- 图标和颜色
    icon_url TEXT,
    badge_color VARCHAR(20) DEFAULT '#666666',       -- 徽章颜色
    
    -- 状态
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化VIP等级
INSERT INTO public.vip_levels (level, name, required_points, required_trades, required_assets, fee_discount, condition_order_limit, ipo_priority, level2_quote, exclusive_service, withdrawal_limit, badge_color)
VALUES 
    (1, '普通会员', 0, 0, 0, 1.0, 3, 0, FALSE, FALSE, 100000, '#666666'),
    (2, '白银VIP', 1000, 10, 50000, 0.95, 5, 1, FALSE, FALSE, 200000, '#C0C0C0'),
    (3, '黄金VIP', 5000, 50, 200000, 0.90, 10, 2, TRUE, FALSE, 500000, '#FFD700'),
    (4, '铂金VIP', 20000, 200, 1000000, 0.85, 20, 3, TRUE, TRUE, 1000000, '#E5E4E2'),
    (5, '钻石VIP', 100000, 500, 5000000, 0.80, 50, 5, TRUE, TRUE, 5000000, '#B9F2FF')
ON CONFLICT (level) DO NOTHING;

COMMENT ON TABLE public.vip_levels IS 'VIP等级配置表';

-- ==========================================================
-- 2. 用户VIP信息表 (user_vip)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_vip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- 当前等级
    current_level INT DEFAULT 1 REFERENCES public.vip_levels(level),
    current_points INT DEFAULT 0,                    -- 当前积分
    total_points INT DEFAULT 0,                      -- 累计积分
    total_trades INT DEFAULT 0,                      -- 累计交易次数
    total_assets DECIMAL(20, 2) DEFAULT 0,           -- 资产规模
    
    -- 会员期限（如有）
    vip_expire_at TIMESTAMPTZ,                       -- VIP到期时间
    
    -- 权益使用
    monthly_condition_orders_used INT DEFAULT 0,     -- 本月已用条件单
    last_reset_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),  -- 上次重置月份
    
    -- 升级进度
    next_level INT,                                  -- 下一等级
    progress_percent DECIMAL(5, 2),                  -- 升级进度百分比
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vip_user ON public.user_vip(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vip_level ON public.user_vip(current_level);

COMMENT ON TABLE public.user_vip IS '用户VIP信息表';

-- ==========================================================
-- 3. 用户积分流水表 (point_records)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.point_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 积分变动
    points INT NOT NULL,                             -- 变动积分（正数为获得，负数为消耗）
    balance_before INT DEFAULT 0,                    -- 变动前余额
    balance_after INT DEFAULT 0,                     -- 变动后余额
    
    -- 来源类型
    source_type VARCHAR(30) NOT NULL,                -- SIGN_IN/TRADE/ACTIVITY/REDEEM/EXPIRE/GIFT
    source_id UUID,                                  -- 关联ID
    
    -- 描述
    description VARCHAR(200),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_records_user ON public.point_records(user_id);
CREATE INDEX IF NOT EXISTS idx_point_records_type ON public.point_records(source_type);
CREATE INDEX IF NOT EXISTS idx_point_records_created ON public.point_records(created_at DESC);

COMMENT ON TABLE public.point_records IS '用户积分流水表';

-- ==========================================================
-- 4. 签到配置表 (checkin_config)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.checkin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 连续签到奖励
    consecutive_days INT NOT NULL,                   -- 连续天数
    bonus_points INT NOT NULL,                       -- 奖励积分
    bonus_multiplier DECIMAL(5, 2) DEFAULT 1.0,      -- 积分倍数
    
    -- 额外奖励
    extra_reward TEXT,                               -- 额外奖励描述
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化签到配置
INSERT INTO public.checkin_config (consecutive_days, bonus_points, bonus_multiplier, extra_reward)
VALUES 
    (1, 10, 1.0, NULL),
    (2, 15, 1.0, NULL),
    (3, 20, 1.0, NULL),
    (4, 25, 1.0, NULL),
    (5, 30, 1.0, NULL),
    (6, 40, 1.0, NULL),
    (7, 60, 2.0, '连续签到7天额外奖励50积分'),
    (14, 100, 2.0, '连续签到14天额外奖励100积分'),
    (30, 300, 3.0, '连续签到30天额外奖励500积分')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.checkin_config IS '签到配置表';

-- ==========================================================
-- 5. 用户签到记录表 (user_checkins)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 签到日期
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- 连续签到
    consecutive_days INT DEFAULT 1,                  -- 当前连续签到天数
    total_days INT DEFAULT 1,                        -- 累计签到天数
    
    -- 奖励
    points_earned INT DEFAULT 0,                     -- 获得积分
    bonus_multiplier DECIMAL(5, 2) DEFAULT 1.0,      -- 奖励倍数
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_user_checkins_user ON public.user_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checkins_date ON public.user_checkins(checkin_date DESC);

COMMENT ON TABLE public.user_checkins IS '用户签到记录表';

-- ==========================================================
-- 6. 积分商品表 (point_goods)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.point_goods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- 兑换信息
    points_required INT NOT NULL,                    -- 所需积分
    stock INT DEFAULT -1,                            -- 库存 (-1表示无限)
    max_per_user INT DEFAULT -1,                     -- 每人限兑 (-1表示无限)
    
    -- 商品类型
    goods_type VARCHAR(30) DEFAULT 'virtual',        -- virtual/physical/coupon
    goods_value DECIMAL(20, 2),                      -- 商品价值（优惠券面额等）
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out')),
    
    -- 有效期
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_goods_status ON public.point_goods(status);

COMMENT ON TABLE public.point_goods IS '积分商品表';

-- ==========================================================
-- 7. 积分兑换记录表 (point_redemptions)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.point_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goods_id UUID REFERENCES public.point_goods(id),
    
    -- 兑换信息
    goods_name VARCHAR(100),
    points_spent INT NOT NULL,
    quantity INT DEFAULT 1,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    -- 物流信息（实物商品）
    shipping_address TEXT,
    shipping_phone VARCHAR(20),
    tracking_number VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_redemptions_user ON public.point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_redemptions_status ON public.point_redemptions(status);

COMMENT ON TABLE public.point_redemptions IS '积分兑换记录表';

-- ==========================================================
-- 8. 运营活动表 (campaigns)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- 活动类型
    campaign_type VARCHAR(30) NOT NULL,              -- SIGN_BONUS/TRADE_REWARD/IPO_ACTIVITY/REFERRAL/LIMITED_TIME
    
    -- 时间
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- 规则配置
    rules JSONB DEFAULT '{}',                        -- 活动规则配置
    
    -- 奖励配置
    reward_type VARCHAR(30) DEFAULT 'points',        -- points/cash/coupon/gift
    reward_value DECIMAL(20, 2),
    reward_config JSONB DEFAULT '{}',
    
    -- 参与限制
    max_participants INT DEFAULT -1,                 -- 最大参与人数 (-1表示无限)
    max_per_user INT DEFAULT 1,                      -- 每人参与次数
    vip_only BOOLEAN DEFAULT FALSE,                  -- 仅VIP可参与
    min_vip_level INT DEFAULT 1,                     -- 最低VIP等级
    
    -- 统计
    participant_count INT DEFAULT 0,
    reward_given_count INT DEFAULT 0,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'ended')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON public.campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_time ON public.campaigns(start_time, end_time);

COMMENT ON TABLE public.campaigns IS '运营活动表';

-- ==========================================================
-- 9. 活动参与记录表 (campaign_participations)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.campaign_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 参与信息
    participation_data JSONB DEFAULT '{}',           -- 参与数据（如分享链接等）
    
    -- 奖励
    reward_received BOOLEAN DEFAULT FALSE,
    reward_type VARCHAR(30),
    reward_value DECIMAL(20, 2),
    reward_given_at TIMESTAMPTZ,
    
    -- 时间
    participated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_participations_campaign ON public.campaign_participations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_participations_user ON public.campaign_participations(user_id);

COMMENT ON TABLE public.campaigns IS '活动参与记录表';

-- ==========================================================
-- 10. 风控规则表 (risk_rules)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- 规则类型
    rule_type VARCHAR(30) NOT NULL,                  -- TRADE_LIMIT/PRICE_DEVIATION/POSITION_CONCENTRATION/DAILY_LOSS/SUSPICIOUS
    
    -- 规则配置
    rule_config JSONB NOT NULL DEFAULT '{}',         -- 规则参数
    
    -- 触发动作
    action_type VARCHAR(30) NOT NULL,                -- WARN/BLOCK/REVIEW/FREEZE
    action_config JSONB DEFAULT '{}',                -- 动作参数
    
    -- 适用范围
    scope VARCHAR(30) DEFAULT 'all',                 -- all/vip/non_vip
    
    -- 优先级
    priority INT DEFAULT 100,                        -- 数字越小优先级越高
    
    -- 状态
    is_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_rules_type ON public.risk_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_risk_rules_enabled ON public.risk_rules(is_enabled);

COMMENT ON TABLE public.risk_rules IS '风控规则表';

-- ==========================================================
-- 11. 风控记录表 (risk_events)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.risk_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rule_id UUID REFERENCES public.risk_rules(id),
    
    -- 事件信息
    event_type VARCHAR(30) NOT NULL,
    event_data JSONB DEFAULT '{}',
    
    -- 风险等级
    risk_level VARCHAR(20) DEFAULT 'medium',         -- low/medium/high/critical
    
    -- 处理
    action_taken VARCHAR(30),                        -- 触发的动作
    handled_by UUID REFERENCES auth.users(id),
    handled_at TIMESTAMPTZ,
    handle_note TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_events_user ON public.risk_events(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_rule ON public.risk_events(rule_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_level ON public.risk_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_events_created ON public.risk_events(created_at DESC);

COMMENT ON TABLE public.risk_events IS '风控记录表';

-- ==========================================================
-- 12. RLS 策略
-- ==========================================================

-- VIP等级：公开读取
ALTER TABLE public.vip_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vip_levels" ON public.vip_levels FOR SELECT USING (true);
CREATE POLICY "Admin manage vip_levels" ON public.vip_levels FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 用户VIP：用户自己查看
ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own vip" ON public.user_vip FOR SELECT USING (auth.uid() = user_id);

-- 积分流水：用户自己查看
ALTER TABLE public.point_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own points" ON public.point_records FOR SELECT USING (auth.uid() = user_id);

-- 签到配置：公开读取
ALTER TABLE public.checkin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read checkin_config" ON public.checkin_config FOR SELECT USING (true);

-- 用户签到：用户自己管理
ALTER TABLE public.user_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkins" ON public.user_checkins FOR ALL USING (auth.uid() = user_id);

-- 积分商品：公开读取
ALTER TABLE public.point_goods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read point_goods" ON public.point_goods FOR SELECT USING (status = 'active');
CREATE POLICY "Admin manage point_goods" ON public.point_goods FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 积分兑换：用户自己管理
ALTER TABLE public.point_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own redemptions" ON public.point_redemptions FOR ALL USING (auth.uid() = user_id);

-- 运营活动：公开读取active的活动
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active campaigns" ON public.campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Admin manage campaigns" ON public.campaigns FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 活动参与：用户自己管理
ALTER TABLE public.campaign_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own participations" ON public.campaign_participations FOR ALL USING (auth.uid() = user_id);

-- 风控规则：仅管理员
ALTER TABLE public.risk_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage risk_rules" ON public.risk_rules FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- 风控记录：仅管理员
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage risk_events" ON public.risk_events FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND admin_level IN ('admin', 'super_admin')));

-- ==========================================================
-- 13. 触发器：自动更新 updated_at
-- ==========================================================

DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['vip_levels', 'user_vip', 'point_goods', 'campaigns', 'risk_rules'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- ==========================================================
-- 14. 函数：签到并获取积分
-- ==========================================================

CREATE OR REPLACE FUNCTION checkin_and_get_points(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - 1;
    v_consecutive INT := 1;
    v_total_days INT := 1;
    v_points INT := 0;
    v_multiplier DECIMAL(5, 2) := 1.0;
    v_config RECORD;
    v_already_checked BOOLEAN;
BEGIN
    -- 检查今日是否已签到
    SELECT EXISTS (
        SELECT 1 FROM user_checkins WHERE user_id = p_user_id AND checkin_date = v_today
    ) INTO v_already_checked;
    
    IF v_already_checked THEN
        RETURN json_build_object('success', FALSE, 'message', '今日已签到');
    END IF;
    
    -- 获取昨日签到记录
    SELECT consecutive_days, total_days INTO v_consecutive, v_total_days
    FROM user_checkins
    WHERE user_id = p_user_id AND checkin_date = v_yesterday;
    
    IF v_consecutive IS NULL THEN
        v_consecutive := 1;
    ELSE
        v_consecutive := v_consecutive + 1;
    END IF;
    
    v_total_days := v_total_days + 1;
    
    -- 获取签到配置
    SELECT * INTO v_config
    FROM checkin_config
    WHERE consecutive_days = v_consecutive AND is_active = TRUE
    ORDER BY consecutive_days DESC
    LIMIT 1;
    
    IF v_config IS NOT NULL THEN
        v_points := v_config.bonus_points;
        v_multiplier := v_config.bonus_multiplier;
    ELSE
        -- 默认积分
        v_points := 10 + (v_consecutive - 1) * 2;
        v_points := LEAST(v_points, 50);  -- 上限50
    END IF;
    
    -- 插入签到记录
    INSERT INTO user_checkins (user_id, checkin_date, consecutive_days, total_days, points_earned, bonus_multiplier)
    VALUES (p_user_id, v_today, v_consecutive, v_total_days, v_points, v_multiplier);
    
    -- 更新用户积分
    INSERT INTO user_vip (user_id, current_points, total_points)
    VALUES (p_user_id, v_points, v_points)
    ON CONFLICT (user_id) DO UPDATE SET
        current_points = user_vip.current_points + v_points,
        total_points = user_vip.total_points + v_points,
        updated_at = NOW();
    
    -- 记录积分流水
    INSERT INTO point_records (user_id, points, source_type, description)
    VALUES (p_user_id, v_points, 'SIGN_IN', CONCAT('签到奖励: 连续', v_consecutive, '天'));
    
    RETURN json_build_object(
        'success', TRUE,
        'message', '签到成功',
        'points_earned', v_points,
        'consecutive_days', v_consecutive,
        'total_days', v_total_days,
        'multiplier', v_multiplier
    );
END;
$$;

COMMENT ON FUNCTION checkin_and_get_points IS '签到并获取积分';

-- ==========================================================
-- 15. 函数：计算VIP等级
-- ==========================================================

CREATE OR REPLACE FUNCTION calculate_vip_level(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_points INT;
    v_trades INT;
    v_assets DECIMAL(20, 2);
    v_level INT := 1;
BEGIN
    -- 获取用户数据
    SELECT current_points, total_trades, total_assets INTO v_points, v_trades, v_assets
    FROM user_vip WHERE user_id = p_user_id;
    
    IF v_points IS NULL THEN RETURN 1; END IF;
    
    -- 根据条件计算等级（取最高满足条件的等级）
    SELECT level INTO v_level
    FROM vip_levels
    WHERE is_active = TRUE
      AND (required_points <= v_points OR required_trades <= v_trades OR required_assets <= v_assets)
    ORDER BY level DESC
    LIMIT 1;
    
    RETURN COALESCE(v_level, 1);
END;
$$;

COMMENT ON FUNCTION calculate_vip_level IS '计算用户VIP等级';

COMMIT;
