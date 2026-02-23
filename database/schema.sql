-- ============================================
-- 银河证券证裕交易单元 - 完整数据库脚本
-- 版本: 1.0.0
-- 创建时间: 2026-02-23
-- 描述: 证券交易管理系统完整数据库结构
-- 执行要求: 使用Supabase postgres角色执行
-- ============================================

-- 注意: 请按顺序执行以下SQL语句
-- 1. 所有表结构
-- 2. RLS行级安全策略
-- 3. 索引优化
-- 4. 触发器
-- 5. 初始化数据

-- ============================================
-- 1. 用户扩展表 (public.profiles)
-- 关联Supabase auth.users，存储实名、角色、风险等级、API密钥
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'vip', 'admin')),
  risk_level TEXT DEFAULT 'C3' CHECK (risk_level IN ('C1', 'C2', 'C3', 'C4', 'C5')),
  phone TEXT UNIQUE,
  id_card TEXT UNIQUE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BANNED', 'PENDING')),
  -- 注意: 生产环境建议使用加密存储，虚拟系统暂用明文
  api_key TEXT UNIQUE,
  api_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.profiles IS '用户扩展信息表，关联Supabase auth.users';
COMMENT ON COLUMN public.profiles.api_key IS 'API密钥（生产环境建议加密存储）';
COMMENT ON COLUMN public.profiles.api_secret IS 'API密钥（生产环境建议加密存储）';

-- ============================================
-- 2. 资产核心表 (public.assets)
-- 存储总资产、可用余额、冻结资金，支持管理员上下分
-- ============================================
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

COMMENT ON TABLE public.assets IS '用户资产核心表';
COMMENT ON COLUMN public.assets.available_balance IS '可用余额（支持管理员上下分）';

-- ============================================
-- 3. 交易订单表 (public.trades)
-- 记录A股/港股/衍生品等全市场交易流水
-- ============================================
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  market_type TEXT NOT NULL CHECK (market_type IN ('A_SHARE', 'HK_SHARE', 'US_SHARE', 'DERIVATIVES', 'BLOCK_TRADE', 'IPO', 'LIMIT_UP')),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL', 'IPO', 'BLOCK_TRADE', 'LIMIT_UP')),
  stock_code TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  price DECIMAL(18,4) NOT NULL,
  quantity INTEGER NOT NULL,
  leverage INTEGER DEFAULT 1,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  profit_loss DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  finish_time TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.trades IS '交易订单流水表，支持全市场交易类型';

-- ============================================
-- 4. 持仓明细表 (public.positions)
-- 实时维护用户持仓，自动计算均价/市值
-- ============================================
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

COMMENT ON TABLE public.positions IS '用户持仓明细表，自动计算持仓市值';

-- ============================================
-- 5. 管理员操作日志 (public.admin_operation_logs)
-- 记录所有管控操作，支持审计
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  operate_type TEXT NOT NULL CHECK (operate_type IN (
    'RECHARGE', 'WITHDRAW', 'ACCOUNT_OPEN', 'ACCOUNT_CLOSE', 'AUDIT',
    'TRADE_RULE_UPDATE', 'API_KEY_VALIDATE', 'TRADE_MATCH_MANUAL',
    'TRADE_MATCH_PAUSE', 'TRADE_MATCH_RESUME', 'TRADE_MATCH_FORCE',
    'TRADE_MATCH_DELETE', 'IPO_WIN_ADJUST', 'DERIVATIVES_LIQUIDATION',
    'MATCH_SWITCH_TOGGLE', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
    'PASSWORD_RESET'
  )),
  target_user_id UUID REFERENCES auth.users(id) NOT NULL,
  operate_content JSONB NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.admin_operation_logs IS '管理员操作审计日志表';

-- ============================================
-- 6. 智能条件单 (public.conditional_orders)
-- 支持止盈止损、网格交易
-- ============================================
CREATE TABLE IF NOT EXISTS public.conditional_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('TP_SL', 'GRID')),
  config JSONB NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'TRIGGERED', 'DELETED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.conditional_orders IS '智能条件单表，支持止盈止损和网格交易';

-- ============================================
-- 7. 交易规则表 (public.trade_rules)
-- 存储IPO/大宗/衍生品/涨停打板的管控规则
-- ============================================
CREATE TABLE IF NOT EXISTS public.trade_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL UNIQUE CHECK (rule_type IN ('IPO', 'BLOCK_TRADE', 'DERIVATIVES', 'LIMIT_UP')),
  config JSONB NOT NULL,
  status BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.trade_rules IS '交易规则管控表，管理员可配置各交易模式规则';

-- ============================================
-- 8. 撮合池表 (public.trade_match_pool)
-- 存储待撮合订单，支持管理员干预
-- ============================================
CREATE TABLE IF NOT EXISTS public.trade_match_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES public.trades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  market_type VARCHAR(20) NOT NULL CHECK (market_type IN ('A_SHARE', 'HK_SHARE', 'US_SHARE', 'DERIVATIVES', 'BLOCK_TRADE', 'IPO', 'LIMIT_UP')),
  trade_type VARCHAR(20) NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  stock_code VARCHAR(20) NOT NULL,
  price DECIMAL(18,4) NOT NULL,
  quantity INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'MATCHING' CHECK (status IN ('MATCHING', 'PAUSED', 'COMPLETED')),
  enter_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.trade_match_pool IS '交易撮合池表，支持管理员干预撮合流程';

-- ============================================
-- 9. RLS行级安全策略
-- 严格区分普通用户/管理员权限
-- ============================================

-- profiles表RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的个人资料" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "管理员可以查看所有个人资料" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "管理员可以更新所有个人资料" ON public.profiles
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- assets表RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的资产" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有资产" ON public.assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "管理员可以更新资产" ON public.assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- trades表RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的交易记录" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有交易记录" ON public.trades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- positions表RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己的持仓" ON public.positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "管理员可以查看所有持仓" ON public.positions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- admin_operation_logs表RLS
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "仅管理员可以访问操作日志" ON public.admin_operation_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- conditional_orders表RLS
ALTER TABLE public.conditional_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以管理自己的条件单" ON public.conditional_orders
  FOR ALL USING (auth.uid() = user_id);

-- trade_rules表RLS
ALTER TABLE public.trade_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "仅管理员可以管理交易规则" ON public.trade_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "所有人可以查看交易规则" ON public.trade_rules
  FOR SELECT USING (true);

-- trade_match_pool表RLS
ALTER TABLE public.trade_match_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "仅管理员可以访问撮合池" ON public.trade_match_pool
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 10. 索引优化
-- 为高频查询字段创建索引
-- ============================================

-- 资产表索引
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

-- 交易表索引
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_market_status ON public.trades(market_type, status);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at DESC);

-- 持仓表索引
CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON public.positions(user_id, symbol);

-- 管理员操作日志索引
CREATE INDEX IF NOT EXISTS idx_admin_logs_operate_type ON public.admin_operation_logs(operate_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_operation_logs(admin_id);

-- 条件单索引
CREATE INDEX IF NOT EXISTS idx_conditional_orders_user_status ON public.conditional_orders(user_id, status);

-- 撮合池索引
CREATE INDEX IF NOT EXISTS idx_match_pool_market_status ON public.trade_match_pool(market_type, status);
CREATE INDEX IF NOT EXISTS idx_match_pool_enter_time ON public.trade_match_pool(enter_time DESC);

-- ============================================
-- 11. 触发器
-- 自动更新updated_at、自动计算总资产/持仓市值
-- ============================================

-- 通用updated_at触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表创建updated_at触发器
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_conditional_orders_updated_at BEFORE UPDATE ON public.conditional_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trade_rules_updated_at BEFORE UPDATE ON public.trade_rules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trade_match_pool_updated_at BEFORE UPDATE ON public.trade_match_pool FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 自动计算总资产触发器
CREATE OR REPLACE FUNCTION update_total_asset()
RETURNS TRIGGER AS $$
BEGIN
    -- 当可用余额或冻结资金变化时，自动更新总资产
    NEW.total_asset = NEW.available_balance + NEW.frozen_balance;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_total_asset BEFORE INSERT OR UPDATE ON public.assets FOR EACH ROW EXECUTE PROCEDURE update_total_asset();

-- 自动计算持仓市值触发器
CREATE OR REPLACE FUNCTION update_position_market_value()
RETURNS TRIGGER AS $$
BEGIN
    -- 当数量或均价变化时，自动更新持仓市值
    NEW.market_value = NEW.quantity * NEW.average_price;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_positions_market_value BEFORE INSERT OR UPDATE ON public.positions FOR EACH ROW EXECUTE PROCEDURE update_position_market_value();

-- ============================================
-- 12. 初始化内容
-- 默认交易规则、超级管理员账号
-- ============================================

-- 注意: 以下初始化数据需要在创建超级管理员用户后执行
-- 建议先通过Supabase Auth创建管理员用户，然后更新以下SQL中的管理员ID

-- 方法1: 先创建系统用户（如果不存在），然后使用其ID
-- 注意: 以下代码需要在Supabase SQL编辑器中执行，使用service_role密钥

/*
-- 步骤1: 创建系统用户（如果不存在）
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  -- 尝试获取系统用户ID
  SELECT id INTO system_user_id FROM auth.users WHERE email = 'system@yinhezhengquan.com';
  
  -- 如果不存在，创建系统用户
  IF system_user_id IS NULL THEN
    -- 使用Supabase Auth创建用户（需要service_role权限）
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'system@yinhezhengquan.com',
      crypt('System@123456', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      '',
      '',
      '',
      ''
    ) RETURNING id INTO system_user_id;
    
    -- 创建用户资料
    INSERT INTO public.profiles (id, username, role, risk_level, phone, status) 
    VALUES (system_user_id, '系统用户', 'admin', 'C5', '13900000000', 'ACTIVE');
  END IF;
  
  -- 步骤2: 使用系统用户ID初始化交易规则
  INSERT INTO public.trade_rules (rule_type, config, updated_by) VALUES
  ('IPO', '{"win_rate": 0.005, "min_apply_quantity": 500, "max_apply_amount": 1000000}', system_user_id),
  ('BLOCK_TRADE', '{"min_quantity": 100000, "match_window": "30s", "need_admin_confirm": true}', system_user_id),
  ('DERIVATIVES', '{"min_leverage": 5, "max_leverage": 50, "margin_ratio": 0.02, "liquidation_threshold": 0.8}', system_user_id),
  ('LIMIT_UP', '{"order_priority": "high", "trigger_threshold": 0.095, "max_single_order": 10000}', system_user_id)
  ON CONFLICT (rule_type) DO UPDATE SET 
    config = EXCLUDED.config,
    updated_by = EXCLUDED.updated_by,
    updated_at = timezone('utc'::text, now());
END $$;
*/

-- 方法2: 简化版本 - 先创建管理员用户后再执行（推荐）
-- 请先通过Supabase Auth创建管理员用户，然后替换下面的'管理员实际ID'

-- 初始化默认交易规则（使用实际管理员ID，需要先创建管理员用户）
-- 注意: 执行前请先创建管理员用户并获取其ID，替换下面的'管理员实际ID'
/*
INSERT INTO public.trade_rules (rule_type, config, updated_by) VALUES
('IPO', '{"win_rate": 0.005, "min_apply_quantity": 500, "max_apply_amount": 1000000}', '管理员实际ID'),
('BLOCK_TRADE', '{"min_quantity": 100000, "match_window": "30s", "need_admin_confirm": true}', '管理员实际ID'),
('DERIVATIVES', '{"min_leverage": 5, "max_leverage": 50, "margin_ratio": 0.02, "liquidation_threshold": 0.8}', '管理员实际ID'),
('LIMIT_UP', '{"order_priority": "high", "trigger_threshold": 0.095, "max_single_order": 10000}', '管理员实际ID')
ON CONFLICT (rule_type) DO UPDATE SET 
  config = EXCLUDED.config,
  updated_by = EXCLUDED.updated_by,
  updated_at = timezone('utc'::text, now());
*/

-- ============================================
-- 13. 超级管理员账号创建说明
-- ============================================
/*
超级管理员账号创建步骤:

1. 通过Supabase Auth界面或API创建用户:
   - 邮箱: admin@yinhezhengquan.com
   - 密码: Admin@123456 (临时密码，首次登录后请修改)
   - 确认邮箱: 是

2. 获取创建的用户ID，替换以下SQL中的'管理员实际ID'

3. 执行以下SQL创建管理员资料:
   
   INSERT INTO public.profiles (id, username, role, risk_level, phone, status) 
   VALUES (
     '管理员实际ID', 
     '超级管理员', 
     'admin', 
     'C5', 
     '13800000000', 
     'ACTIVE'
   );

4. 执行以下SQL创建管理员资产:
   
   INSERT INTO public.assets (user_id, available_balance, total_asset) 
   VALUES ('管理员实际ID', 1000000.00, 1000000.00);

注意: 生产环境请使用更复杂的密码，并启用多因素认证。
*/

-- ============================================
-- 执行完成说明
-- ============================================
/*
数据库脚本执行完成！

下一步操作:
1. 验证所有表是否创建成功
2. 验证RLS策略是否生效
3. 创建超级管理员账号（按照上述说明）
4. 测试各功能模块的数据访问权限
5. 运行应用程序进行集成测试

如有问题，请检查:
- 执行权限是否正确（需使用postgres角色）
- 表名和列名是否正确
- 外键约束是否满足
- RLS策略是否符合预期
*/
