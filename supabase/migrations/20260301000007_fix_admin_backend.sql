-- ==========================================================
-- 管理后台核心功能修复脚本
-- 执行时间: 2026-03-01
-- 优先级: P0 (合规要求)
-- 功能: 审计日志、订单干预、资金操作、数据导出
-- ==========================================================

-- 1. 确保admin_operation_logs表存在
CREATE TABLE IF NOT EXISTS public.admin_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  operate_type TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  operate_content JSONB NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_operation_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_type ON public.admin_operation_logs(operate_type);

-- 2. 创建订单干预函数
CREATE OR REPLACE FUNCTION public.admin_intervene_trade(
  p_trade_id UUID,
  p_admin_id UUID,
  p_action TEXT,
  p_remark TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_trade RECORD;
BEGIN
  -- 验证管理员权限
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_admin_id AND role = 'admin' AND status = 'ACTIVE'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '无管理员权限');
  END IF;

  -- 查询订单
  SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '订单不存在');
  END IF;

  -- 执行干预操作
  CASE p_action
    WHEN 'APPROVE' THEN
      UPDATE public.trades SET
        approval_status = 'APPROVED',
        approved_by = p_admin_id,
        approval_time = NOW(),
        approval_remark = p_remark
      WHERE id = p_trade_id;

    WHEN 'REJECT' THEN
      UPDATE public.trades SET
        status = 'FAILED',
        approval_status = 'REJECTED',
        approved_by = p_admin_id,
        approval_time = NOW(),
        approval_remark = p_remark
      WHERE id = p_trade_id;
      
      -- 退款
      UPDATE public.assets SET
        available_balance = available_balance + (v_trade.quantity * v_trade.price + COALESCE(v_trade.fee, 0)),
        frozen_balance = frozen_balance - (v_trade.quantity * v_trade.price + COALESCE(v_trade.fee, 0))
      WHERE user_id = v_trade.user_id;

    WHEN 'CANCEL' THEN
      PERFORM cancel_trade_order(p_trade_id, v_trade.user_id, '管理员强制撤单: ' || p_remark);

    ELSE
      RETURN jsonb_build_object('success', false, 'error', '无效的操作类型');
  END CASE;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建用户资金操作函数
CREATE OR REPLACE FUNCTION public.admin_user_fund_operation(
  p_user_id UUID,
  p_admin_id UUID,
  p_operation_type TEXT,
  p_amount NUMERIC,
  p_remark TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- 验证管理员权限
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_admin_id AND role = 'admin' AND status = 'ACTIVE'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '无管理员权限');
  END IF;

  -- 执行资金操作
  CASE p_operation_type
    WHEN 'DEPOSIT' THEN
      UPDATE public.assets SET
        available_balance = available_balance + p_amount,
        updated_at = NOW()
      WHERE user_id = p_user_id
      RETURNING available_balance INTO v_new_balance;

    WHEN 'WITHDRAW' THEN
      UPDATE public.assets SET
        available_balance = available_balance - p_amount,
        updated_at = NOW()
      WHERE user_id = p_user_id AND available_balance >= p_amount
      RETURNING available_balance INTO v_new_balance;
      
      IF v_new_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '余额不足');
      END IF;

    WHEN 'FREEZE' THEN
      UPDATE public.assets SET
        available_balance = available_balance - p_amount,
        frozen_balance = frozen_balance + p_amount,
        updated_at = NOW()
      WHERE user_id = p_user_id AND available_balance >= p_amount
      RETURNING available_balance INTO v_new_balance;
      
      IF v_new_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '可用余额不足');
      END IF;

    WHEN 'UNFREEZE' THEN
      UPDATE public.assets SET
        available_balance = available_balance + p_amount,
        frozen_balance = frozen_balance - p_amount,
        updated_at = NOW()
      WHERE user_id = p_user_id AND frozen_balance >= p_amount
      RETURNING available_balance INTO v_new_balance;
      
      IF v_new_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', '冻结余额不足');
      END IF;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', '无效的操作类型');
  END CASE;

  -- 记录资金流水
  INSERT INTO public.fund_flows (user_id, flow_type, amount, balance_after, remark)
  VALUES (p_user_id, 'ADMIN_' || p_operation_type, p_amount, v_new_balance, p_remark);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 创建规则更新函数（带版本控制）
CREATE TABLE IF NOT EXISTS public.trade_rules_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.trade_rules(id),
  rule_type TEXT NOT NULL,
  config JSONB NOT NULL,
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  version INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rules_history_rule ON public.trade_rules_history(rule_id, version DESC);

CREATE OR REPLACE FUNCTION public.admin_update_trade_rules(
  p_rule_type TEXT,
  p_config JSONB,
  p_admin_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_rule_id UUID;
  v_version INT;
BEGIN
  -- 验证管理员权限
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_admin_id AND role = 'admin' AND status = 'ACTIVE'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', '无管理员权限');
  END IF;

  -- 更新规则
  UPDATE public.trade_rules SET
    config = p_config,
    updated_by = p_admin_id,
    updated_at = NOW()
  WHERE rule_type = p_rule_type
  RETURNING id INTO v_rule_id;

  -- 获取版本号
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.trade_rules_history WHERE rule_id = v_rule_id;

  -- 保存历史版本
  INSERT INTO public.trade_rules_history (rule_id, rule_type, config, updated_by, version)
  VALUES (v_rule_id, p_rule_type, p_config, p_admin_id, v_version);

  RETURN jsonb_build_object('success', true, 'version', v_version);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS策略
ALTER TABLE public.admin_operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_rules_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理员查看操作日志" ON public.admin_operation_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  );

CREATE POLICY "管理员查看规则历史" ON public.trade_rules_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  );

-- 6. 验证安装
SELECT 
  'Admin修复完成' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('admin_operation_logs', 'trade_rules_history')) as tables_created,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name IN ('admin_intervene_trade', 'admin_user_fund_operation', 'admin_update_trade_rules')) as functions_created;
