-- 银河证券管理系统 - Supabase Postgres Schema (Enhanced)

-- 1. 用户扩展表 (public.profiles / users_profile)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  real_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  risk_level TEXT DEFAULT 'C3' CHECK (risk_level IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  phone TEXT UNIQUE,
  id_card TEXT UNIQUE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BANNED', 'PENDING')),
  api_key TEXT UNIQUE,
  api_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户检查表是否存在（用于连接检查）
DROP POLICY IF EXISTS "允许连接检查" ON public.profiles;
CREATE POLICY "允许连接检查" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "用户可以查看自己的个人资料" ON public.profiles;
CREATE POLICY "用户可以查看自己的个人资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "管理员可以查看所有个人资料" ON public.profiles;
CREATE POLICY "管理员可以查看所有个人资料" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin')
  );

DROP POLICY IF EXISTS "管理员可以更新所有个人资料" ON public.profiles;
CREATE POLICY "管理员可以更新所有个人资料" ON public.profiles
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'admin')
  );

-- 2. 资产核心表 (public.assets)
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_asset DECIMAL(18,2) DEFAULT 0,
  available_balance DECIMAL(18,2) DEFAULT 500000.00,
  frozen_balance DECIMAL(18,2) DEFAULT 0,
  today_profit_loss DECIMAL(18,2) DEFAULT 0,
  hidden_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的资产" ON public.assets;
CREATE POLICY "用户可以查看自己的资产" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可以查看所有资产" ON public.assets;
CREATE POLICY "管理员可以查看所有资产" ON public.assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "管理员可以更新资产" ON public.assets;
CREATE POLICY "管理员可以更新资产" ON public.assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. 交易订单表 (public.trades)
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  market_type TEXT NOT NULL, -- A_SHARE, HK_SHARE, US_SHARE
  trade_type TEXT NOT NULL, -- BUY, SELL, IPO, BLOCK_TRADE, LIMIT_UP
  stock_code TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  price DECIMAL(18,4) NOT NULL,
  quantity INTEGER NOT NULL,
  leverage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, CANCELLED
  profit_loss DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  finish_time TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的交易" ON public.trades;
CREATE POLICY "用户可以查看自己的交易" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可以查看所有交易" ON public.trades;
CREATE POLICY "管理员可以查看所有交易" ON public.trades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "用户可以创建交易" ON public.trades;
CREATE POLICY "用户可以创建交易" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 持仓明细表 (public.positions)
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  average_price DECIMAL(18,4) DEFAULT 0,
  market_value DECIMAL(18,2) DEFAULT 0,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的持仓" ON public.positions;
CREATE POLICY "用户可以查看自己的持仓" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可以查看所有持仓" ON public.positions;
CREATE POLICY "管理员可以查看所有持仓" ON public.positions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. 管理员操作日志 (public.admin_operation_logs)
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  operate_type TEXT NOT NULL, -- RECHARGE, WITHDRAW, ACCOUNT_OPEN, ACCOUNT_CLOSE, AUDIT
  target_user_id UUID REFERENCES auth.users(id) NOT NULL,
  operate_content JSONB NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;

-- 强化管理员操作日志RLS策略
DROP POLICY IF EXISTS "仅授权管理员可访问操作日志" ON public.admin_operation_logs;
CREATE POLICY "仅授权管理员可访问操作日志" ON public.admin_operation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 6. 用户风险评估表 (新增安全监控表)
CREATE TABLE IF NOT EXISTS public.user_risk_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  assessment_score INTEGER NOT NULL,
  assessment_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_risk_assessments ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的风险评估
DROP POLICY IF EXISTS "用户可查看自己的风险评估" ON public.user_risk_assessments;
CREATE POLICY "用户可查看自己的风险评估" ON public.user_risk_assessments
  FOR SELECT USING (auth.uid() = user_id);

-- 管理员可查看所有风险评估
DROP POLICY IF EXISTS "管理员可查看所有风险评估" ON public.user_risk_assessments;
CREATE POLICY "管理员可查看所有风险评估" ON public.user_risk_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );
CREATE TABLE IF NOT EXISTS public.conditional_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- TP_SL, GRID
  config JSONB NOT NULL,
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, TRIGGERED, DELETED
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以管理自己的条件单" ON public.conditional_orders;
CREATE POLICY "用户可以管理自己的条件单" ON public.conditional_orders
  FOR ALL USING (auth.uid() = user_id);

-- 7. 交易规则表 (public.trade_rules)
CREATE TABLE IF NOT EXISTS public.trade_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL UNIQUE, -- IPO, BLOCK_TRADE, LIMIT_UP
  config JSONB NOT NULL,
  status BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trade_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "仅管理员可以管理交易规则" ON public.trade_rules;
CREATE POLICY "仅管理员可以管理交易规则" ON public.trade_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "所有人可以查看交易规则" ON public.trade_rules;
CREATE POLICY "所有人可以查看交易规则" ON public.trade_rules
  FOR SELECT USING (true);

-- 8. 撮合池表 (public.trade_match_pool)
CREATE TABLE IF NOT EXISTS public.trade_match_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  market_type TEXT NOT NULL,
  trade_type TEXT NOT NULL, -- BUY, SELL
  stock_code TEXT NOT NULL,
  price DECIMAL(18,4) NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'MATCHING', -- MATCHING, PAUSED, COMPLETED
  enter_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trade_match_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "仅管理员可以访问撮合池" ON public.trade_match_pool;
CREATE POLICY "仅管理员可以访问撮合池" ON public.trade_match_pool
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 初始化默认规则
INSERT INTO public.trade_rules (rule_type, config) VALUES
('IPO', '{"win_rate": 0.005, "min_apply_quantity": 500, "max_apply_amount": 1000000, "allocation_per_account": 1000, "lock_period_days": 30}'),
('BLOCK_TRADE', '{"min_quantity": 100000, "match_window": "30s", "need_admin_confirm": true, "discount_rate": 0.95, "commission_fee_rate": 0.0003}'),
('LIMIT_UP', '{"order_priority": "high", "trigger_threshold": 0.095, "max_single_order": 10000, "frequency_limit_per_minute": 5, "daily_order_limit": 20}'),
('GENERAL', '{"fee_rate": 0.0005, "risk_level_threshold": 3, "daily_loss_limit": 100000, "margin_call_threshold": 0.8}')
ON CONFLICT (rule_type) DO NOTHING;

-- 9. 索引优化
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_market_status ON public.trades(user_id, market_type, status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_operate_type_time ON public.admin_operation_logs(operate_type, created_at);
CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON public.positions(user_id, symbol);

-- 新增索引优化
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_time ON public.security_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type, level);
CREATE INDEX IF NOT EXISTS idx_user_risk_assessments_user_time ON public.user_risk_assessments(user_id, created_at DESC);

-- 8. 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON public.assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_positions_updated_at ON public.positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_conditional_orders_updated_at ON public.conditional_orders;
CREATE TRIGGER update_conditional_orders_updated_at BEFORE UPDATE ON public.conditional_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. 安全日志表 (新增安全监控表)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  message TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- 管理员可查看所有安全日志
DROP POLICY IF EXISTS "管理员可查看安全日志" ON public.security_logs;
CREATE POLICY "管理员可查看安全日志" ON public.security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 用户只能查看自己的安全相关日志（有限制）
DROP POLICY IF EXISTS "用户可查看自己的安全日志" ON public.security_logs;
CREATE POLICY "用户可查看自己的安全日志" ON public.security_logs
  FOR SELECT USING (
    auth.uid() = user_id 
    AND event_type IN ('AUTH_LOGIN', 'AUTH_LOGOUT', 'TRADE_EXECUTION')
  );
  
-- 10. 用户配置表 (public.user_configs)
CREATE TABLE IF NOT EXISTS public.user_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  config_type TEXT NOT NULL, -- trading_preferences, notification_settings, privacy_settings, etc.
  config_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, config_type)
);

ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- 用户可以管理自己的配置
DROP POLICY IF EXISTS "用户可以管理自己的配置" ON public.user_configs;
CREATE POLICY "用户可以管理自己的配置" ON public.user_configs
  FOR ALL USING (auth.uid() = user_id);

-- 管理员可以查看所有用户配置
DROP POLICY IF EXISTS "管理员可以查看所有用户配置" ON public.user_configs;
CREATE POLICY "管理员可以查看所有用户配置" ON public.user_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'ACTIVE'
    )
  );

-- 11. 自选股表 (public.watchlist)
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, symbol)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- 用户可以管理自己的自选股
DROP POLICY IF EXISTS "用户可以管理自己的自选股" ON public.watchlist;
CREATE POLICY "用户可以管理自己的自选股" ON public.watchlist
  FOR ALL USING (auth.uid() = user_id);
