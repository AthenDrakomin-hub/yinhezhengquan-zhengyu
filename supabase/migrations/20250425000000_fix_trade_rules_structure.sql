-- ==========================================================
-- 修复 trade_rules 表结构
-- 添加 rule_type 和 config 字段以兼容代码查询
-- ==========================================================

-- 1. 添加 rule_type 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trade_rules' 
    AND column_name = 'rule_type'
  ) THEN
    ALTER TABLE public.trade_rules ADD COLUMN rule_type TEXT;
    
    -- 同步 rule_key 到 rule_type
    UPDATE public.trade_rules SET rule_type = rule_key WHERE rule_type IS NULL;
  END IF;
END $$;

-- 2. 添加 config 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trade_rules' 
    AND column_name = 'config'
  ) THEN
    ALTER TABLE public.trade_rules ADD COLUMN config JSONB;
    
    -- 同步 rule_value 到 config
    UPDATE public.trade_rules SET config = rule_value WHERE config IS NULL;
  END IF;
END $$;

-- 3. 添加 status 字段（如果不存在，用于兼容 Edge Functions）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trade_rules' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.trade_rules ADD COLUMN status BOOLEAN DEFAULT true;
    
    -- 同步 is_active 到 status
    UPDATE public.trade_rules SET status = is_active WHERE status IS NULL;
  END IF;
END $$;

-- 4. 插入默认风控规则（如果不存在）
INSERT INTO public.trade_rules (rule_name, rule_key, rule_type, rule_value, config, description, is_active, status)
SELECT 
  '通用风控规则' as rule_name,
  'GENERAL' as rule_key,
  'GENERAL' as rule_type,
  '{"risk_level_threshold": 3, "daily_loss_limit": 100000}' as rule_value,
  '{"risk_level_threshold": 3, "daily_loss_limit": 100000}' as config,
  '通用交易风控规则配置' as description,
  true as is_active,
  true as status
WHERE NOT EXISTS (
  SELECT 1 FROM public.trade_rules WHERE rule_type = 'GENERAL' OR rule_key = 'GENERAL'
);

-- 5. 插入手续费规则
INSERT INTO public.trade_rules (rule_name, rule_key, rule_type, rule_value, config, description, is_active, status)
SELECT 
  '交易手续费规则' as rule_name,
  '手续费' as rule_key,
  '手续费' as rule_type,
  '{"买入费率": 0.0003, "卖出费率": 0.0003, "印花税": 0.001, "最低收费": 5}' as rule_value,
  '{"买入费率": 0.0003, "卖出费率": 0.0003, "印花税": 0.001, "最低收费": 5}' as config,
  'A股交易手续费配置' as description,
  true as is_active,
  true as status
WHERE NOT EXISTS (
  SELECT 1 FROM public.trade_rules WHERE rule_type = '手续费' OR rule_key = '手续费'
);

-- 6. 插入最小交易单位规则
INSERT INTO public.trade_rules (rule_name, rule_key, rule_type, rule_value, config, description, is_active, status)
SELECT 
  '最小交易单位规则' as rule_name,
  '最小交易单位' as rule_key,
  '最小交易单位' as rule_type,
  '{"A股": 100, "港股": 1}' as rule_value,
  '{"A股": 100, "港股": 1}' as config,
  '最小交易单位配置' as description,
  true as is_active,
  true as status
WHERE NOT EXISTS (
  SELECT 1 FROM public.trade_rules WHERE rule_type = '最小交易单位' OR rule_key = '最小交易单位'
);

-- 7. 更新 RLS 策略，允许认证用户读取 trade_rules
DROP POLICY IF EXISTS "Allow authenticated users to read trade_rules" ON public.trade_rules;

CREATE POLICY "Allow authenticated users to read trade_rules" ON public.trade_rules
  FOR SELECT USING (auth.role() = 'authenticated');

-- 8. 创建触发器，保持字段同步
CREATE OR REPLACE FUNCTION sync_trade_rules_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 同步 rule_key <-> rule_type
  IF NEW.rule_type IS DISTINCT FROM OLD.rule_type AND NEW.rule_type IS NOT NULL THEN
    NEW.rule_key := NEW.rule_type;
  ELSIF NEW.rule_key IS DISTINCT FROM OLD.rule_key AND NEW.rule_key IS NOT NULL THEN
    NEW.rule_type := NEW.rule_key;
  END IF;
  
  -- 同步 rule_value <-> config
  IF NEW.config IS DISTINCT FROM OLD.config AND NEW.config IS NOT NULL THEN
    NEW.rule_value := NEW.config;
  ELSIF NEW.rule_value IS DISTINCT FROM OLD.rule_value AND NEW.rule_value IS NOT NULL THEN
    NEW.config := NEW.rule_value;
  END IF;
  
  -- 同步 is_active <-> status
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IS NOT NULL THEN
    NEW.is_active := NEW.status;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active AND NEW.is_active IS NOT NULL THEN
    NEW.status := NEW.is_active;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_trade_rules_trigger ON public.trade_rules;
CREATE TRIGGER sync_trade_rules_trigger
  BEFORE UPDATE ON public.trade_rules
  FOR EACH ROW
  EXECUTE FUNCTION sync_trade_rules_fields();

-- 9. 添加注释
COMMENT ON TABLE public.trade_rules IS '交易规则配置表';
COMMENT ON COLUMN public.trade_rules.rule_type IS '规则类型（兼容字段，与rule_key同步）';
COMMENT ON COLUMN public.trade_rules.config IS '规则配置JSON（兼容字段，与rule_value同步）';
COMMENT ON COLUMN public.trade_rules.status IS '规则状态（兼容字段，与is_active同步）';
