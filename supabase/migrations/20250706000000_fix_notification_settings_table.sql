-- 修复 notification_settings 表
-- 创建完整的通知设置表结构

-- 创建 notification_settings 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    -- 交易提醒
    trade_alerts_enabled BOOLEAN DEFAULT true,
    trade_alerts_push BOOLEAN DEFAULT true,
    trade_alerts_email BOOLEAN DEFAULT false,
    trade_alerts_sms BOOLEAN DEFAULT false,
    -- 价格提醒
    price_alerts_enabled BOOLEAN DEFAULT true,
    price_alerts_push BOOLEAN DEFAULT true,
    price_alerts_email BOOLEAN DEFAULT false,
    -- 系统消息
    system_news_enabled BOOLEAN DEFAULT false,
    system_news_push BOOLEAN DEFAULT false,
    system_news_email BOOLEAN DEFAULT true,
    -- 风险预警
    risk_warning_enabled BOOLEAN DEFAULT true,
    risk_warning_push BOOLEAN DEFAULT true,
    risk_warning_email BOOLEAN DEFAULT true,
    -- 审批通知
    approval_enabled BOOLEAN DEFAULT true,
    approval_push BOOLEAN DEFAULT true,
    approval_email BOOLEAN DEFAULT false,
    -- 强卖通知
    force_sell_enabled BOOLEAN DEFAULT true,
    force_sell_push BOOLEAN DEFAULT true,
    force_sell_email BOOLEAN DEFAULT true,
    force_sell_sms BOOLEAN DEFAULT true,
    -- 免打扰
    quiet_hours_start TEXT DEFAULT NULL,
    quiet_hours_end TEXT DEFAULT NULL,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON public.notification_settings(user_id);

-- 启用 RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Users manage own notification_settings" ON public.notification_settings;
CREATE POLICY "Users manage own notification_settings" ON public.notification_settings 
    FOR ALL USING (auth.uid() = user_id);

-- 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';
