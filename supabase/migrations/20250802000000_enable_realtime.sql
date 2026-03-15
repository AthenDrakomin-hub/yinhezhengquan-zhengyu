-- ============================================================
-- Realtime 配置迁移
-- ============================================================
-- 功能：为订单、成交记录、通知表启用 Realtime 实时推送
-- ============================================================

BEGIN;

-- ============================================
-- 1. 启用 Realtime 发布
-- ============================================

-- 为 trades 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trades;

-- 为 trade_executions 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trade_executions;

-- 为 notifications 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 为 match_logs 表启用 Realtime（可选：用于监控撮合状态）
ALTER PUBLICATION supabase_realtime ADD TABLE match_logs;

-- ============================================
-- 2. 确保 RLS 策略正确
-- ============================================

-- trades 表的 RLS 策略（如果不存在）
DO $$
BEGIN
  -- 检查是否已存在策略
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trades' 
    AND policyname = 'Users can view their own trades'
  ) THEN
    CREATE POLICY "Users can view their own trades" 
      ON trades FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- trade_executions 表的 RLS 策略
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'trade_executions' 
    AND policyname = 'Users can view own executions'
  ) THEN
    CREATE POLICY "Users can view own executions" 
      ON trade_executions FOR SELECT 
      USING (auth.uid() = buy_user_id OR auth.uid() = sell_user_id);
  END IF;
END $$;

-- notifications 表的 RLS 策略
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" 
      ON notifications FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 3. 创建通知表（如果不存在）
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 通知类型
  type VARCHAR(50) NOT NULL,        -- TRADE_SUCCESS, TRADE_MATCHED, SYSTEM, etc.
  
  -- 通知内容
  title VARCHAR(200) NOT NULL,
  content TEXT,
  
  -- 状态
  is_read BOOLEAN DEFAULT FALSE,
  
  -- 附加数据
  data JSONB DEFAULT '{}',
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- 过期时间（可选）
  expires_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 启用 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access notifications" 
  ON notifications FOR ALL 
  USING (auth.role() = 'service_role');

COMMENT ON TABLE notifications IS '通知表 - 存储用户通知消息';

-- ============================================
-- 4. 创建通知统计视图
-- ============================================

CREATE OR REPLACE VIEW notification_stats AS
SELECT
  user_id,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
  MAX(created_at) as latest_notification
FROM notifications
GROUP BY user_id;

COMMENT ON VIEW notification_stats IS '通知统计视图';

-- ============================================
-- 5. 创建清理过期通知的定时任务
-- ============================================

SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 3 * * *', -- 每天凌晨3点执行
  $$
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  $$
);

-- ============================================
-- 6. 创建示例触发器：订单状态变化时插入通知
-- ============================================

CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在状态变化时插入通知
  IF NEW.status <> OLD.status THEN
    INSERT INTO notifications (user_id, type, title, content, data)
    VALUES (
      NEW.user_id,
      'ORDER_STATUS_CHANGE',
      '订单状态更新',
      format('您的订单 %s(%s) 状态已更新为 %s', NEW.stock_name, NEW.stock_code, NEW.status),
      jsonb_build_object(
        'trade_id', NEW.id,
        'stock_code', NEW.stock_code,
        'stock_name', NEW.stock_name,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 创建触发器（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trades_status_notify'
  ) THEN
    CREATE TRIGGER trades_status_notify
      AFTER UPDATE ON trades
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION notify_order_status_change();
  END IF;
END $$;

-- ============================================
-- 7. 验证 Realtime 配置
-- ============================================

-- 查看已发布到 Realtime 的表
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 查看 RLS 策略
-- SELECT * FROM pg_policies WHERE tablename IN ('trades', 'trade_executions', 'notifications');

-- 测试通知插入
-- INSERT INTO notifications (user_id, type, title, content)
-- VALUES (auth.uid(), 'SYSTEM', '系统通知', 'Realtime 功能已启用');

COMMIT;

-- ============================================
-- 8. 使用说明
-- ============================================
-- 
-- 前端订阅示例：
-- 
-- import { createClient } from '@supabase/supabase-js'
-- 
-- const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
-- 
-- // 订阅订单变化
-- const channel = supabase.channel('orders')
--   .on('postgres_changes', {
--     event: 'UPDATE',
--     schema: 'public',
--     table: 'trades',
--     filter: `user_id=eq.${userId}`
--   }, (payload) => {
--     console.log('订单变化:', payload)
--   })
--   .subscribe()
-- 
-- // 订阅成交记录
-- const channel2 = supabase.channel('executions')
--   .on('postgres_changes', {
--     event: 'INSERT',
--     schema: 'public',
--     table: 'trade_executions'
--   }, (payload) => {
--     console.log('新成交:', payload)
--   })
--   .subscribe()
-- 
-- // 订阅通知
-- const channel3 = supabase.channel('notifications')
--   .on('postgres_changes', {
--     event: 'INSERT',
--     schema: 'public',
--     table: 'notifications',
--     filter: `user_id=eq.${userId}`
--   }, (payload) => {
--     console.log('新通知:', payload)
--   })
--   .subscribe()
-- 
-- // 取消订阅
-- channel.unsubscribe()
