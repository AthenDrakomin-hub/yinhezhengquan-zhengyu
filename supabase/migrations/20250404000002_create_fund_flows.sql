-- 资金流水表
CREATE TABLE IF NOT EXISTS public.fund_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('DEPOSIT', 'WITHDRAW', 'TRADE_BUY', 'TRADE_SELL', 'FEE', 'FREEZE', 'UNFREEZE', 'REFUND')),
  amount DECIMAL(18,2) NOT NULL,
  balance_after DECIMAL(18,2) NOT NULL,
  related_trade_id UUID REFERENCES public.trades(id),
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_flows_user_time ON public.fund_flows(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fund_flows_type ON public.fund_flows(flow_type);

ALTER TABLE public.fund_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可查看自己的流水" ON public.fund_flows;
CREATE POLICY "用户可查看自己的流水" ON public.fund_flows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可查看所有流水" ON public.fund_flows;
CREATE POLICY "管理员可查看所有流水" ON public.fund_flows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 自动记录流水的触发器函数
CREATE OR REPLACE FUNCTION record_fund_flow()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 可用余额变化
    IF NEW.available_balance != OLD.available_balance THEN
      INSERT INTO public.fund_flows (user_id, flow_type, amount, balance_after, remark)
      VALUES (
        NEW.user_id,
        CASE 
          WHEN NEW.available_balance > OLD.available_balance THEN 'UNFREEZE'
          ELSE 'FREEZE'
        END,
        ABS(NEW.available_balance - OLD.available_balance),
        NEW.available_balance,
        'Auto recorded by trigger'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assets_fund_flow_trigger ON public.assets;
CREATE TRIGGER assets_fund_flow_trigger
  AFTER UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION record_fund_flow();
