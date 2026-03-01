-- ========================================================
-- positions表优化字段（T+1限制）
-- ========================================================

-- 1. T+1交易限制字段
ALTER TABLE public.positions 
  ADD COLUMN IF NOT EXISTS locked_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lock_until DATE;

-- 2. 更新现有持仓
UPDATE public.positions SET locked_quantity = 0 WHERE locked_quantity IS NULL;

-- 3. 自动解锁函数
CREATE OR REPLACE FUNCTION unlock_t1_positions()
RETURNS void AS $$
BEGIN
  UPDATE public.positions
  SET locked_quantity = 0,
      lock_until = NULL
  WHERE lock_until IS NOT NULL 
    AND lock_until < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建定时任务（需要pg_cron扩展，如果没有则手动执行）
-- SELECT cron.schedule('unlock-t1-positions', '0 0 * * *', 'SELECT unlock_t1_positions()');
