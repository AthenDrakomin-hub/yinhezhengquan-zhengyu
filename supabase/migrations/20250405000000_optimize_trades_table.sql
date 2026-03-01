-- ========================================================
-- trades表优化字段（手续费、部分成交、审核）
-- ========================================================

-- 1. 手续费字段
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS fee DECIMAL(18,2) DEFAULT 0;

-- 2. 部分成交字段
ALTER TABLE public.trades 
  ADD COLUMN IF NOT EXISTS executed_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_quantity INTEGER DEFAULT 0;

-- 3. 审核字段
ALTER TABLE public.trades 
  ADD COLUMN IF NOT EXISTS need_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approval_remark TEXT;

-- 4. 更新现有数据
UPDATE public.trades 
SET executed_quantity = quantity, 
    remaining_quantity = 0 
WHERE status = 'SUCCESS' AND executed_quantity = 0;

UPDATE public.trades 
SET executed_quantity = 0, 
    remaining_quantity = quantity 
WHERE status IN ('MATCHING', 'PENDING') AND remaining_quantity = 0;

-- 5. 更新状态约束
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_status_check 
  CHECK (status IN ('PENDING', 'MATCHING', 'PARTIAL', 'SUCCESS', 'FAILED', 'CANCELLED'));

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_trades_approval ON public.trades(need_approval, approval_status) WHERE need_approval = true;
