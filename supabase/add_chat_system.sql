-- ==========================================================
-- 中国银河证券——证裕交易单元 实时客服聊天系统
-- 扩展现有support_tickets表，新增messages表
-- ==========================================================

-- 第一阶段：数据库扩展

-- 1. 创建 messages 表，存储每条消息
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 为 messages 表创建索引
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read) WHERE is_read = false;

-- 3. 为 support_tickets 表增加字段
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS unread_count_user INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_count_admin INT DEFAULT 0;

-- 4. 启用 messages 表的 RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. 创建 messages 表的 RLS 策略

-- 策略1: 用户可以读取自己工单的消息
DROP POLICY IF EXISTS "用户可读自己工单的消息" ON public.messages;
CREATE POLICY "用户可读自己工单的消息" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = messages.ticket_id 
      AND st.user_id = auth.uid()
    )
  );

-- 策略2: 管理员可以读取所有消息
DROP POLICY IF EXISTS "管理员可读所有消息" ON public.messages;
CREATE POLICY "管理员可读所有消息" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 策略3: 用户可以插入自己工单的消息
DROP POLICY IF EXISTS "用户可插入自己工单的消息" ON public.messages;
CREATE POLICY "用户可插入自己工单的消息" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_id 
      AND st.user_id = auth.uid()
      AND sender_type = 'user'
      AND sender_id = auth.uid()
    )
  );

-- 策略4: 管理员可以插入任何工单的消息
DROP POLICY IF EXISTS "管理员可插入消息" ON public.messages;
CREATE POLICY "管理员可插入消息" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    AND sender_type = 'admin'
  );

-- 策略5: 用户可以更新自己发送的未读消息为已读
DROP POLICY IF EXISTS "用户可更新自己的消息状态" ON public.messages;
CREATE POLICY "用户可更新自己的消息状态" ON public.messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    AND sender_type = 'user'
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'user'
  );

-- 策略6: 管理员可以更新任何消息状态
DROP POLICY IF EXISTS "管理员可更新消息状态" ON public.messages;
CREATE POLICY "管理员可更新消息状态" ON public.messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. 创建触发器函数，更新工单的 last_message_at
CREATE OR REPLACE FUNCTION public.update_ticket_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  -- 更新未读计数
  IF NEW.sender_type = 'user' THEN
    -- 用户发送消息，管理员未读计数增加
    UPDATE public.support_tickets
    SET unread_count_admin = unread_count_admin + 1
    WHERE id = NEW.ticket_id;
  ELSIF NEW.sender_type = 'admin' THEN
    -- 管理员发送消息，用户未读计数增加
    UPDATE public.support_tickets
    SET unread_count_user = unread_count_user + 1
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器
DROP TRIGGER IF EXISTS trigger_update_ticket_on_message ON public.messages;
CREATE TRIGGER trigger_update_ticket_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_last_message();

-- 8. 创建触发器函数，标记消息为已读时更新未读计数
CREATE OR REPLACE FUNCTION public.update_ticket_unread_on_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    IF OLD.sender_type = 'user' THEN
      -- 用户消息被标记为已读，减少管理员未读计数
      UPDATE public.support_tickets
      SET unread_count_admin = GREATEST(unread_count_admin - 1, 0)
      WHERE id = OLD.ticket_id;
    ELSIF OLD.sender_type = 'admin' THEN
      -- 管理员消息被标记为已读，减少用户未读计数
      UPDATE public.support_tickets
      SET unread_count_user = GREATEST(unread_count_user - 1, 0)
      WHERE id = OLD.ticket_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建消息已读触发器
DROP TRIGGER IF EXISTS trigger_update_unread_on_message_read ON public.messages;
CREATE TRIGGER trigger_update_unread_on_message_read
  AFTER UPDATE OF is_read ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_read IS DISTINCT FROM OLD.is_read)
  EXECUTE FUNCTION public.update_ticket_unread_on_read();

-- 10. 创建 updated_at 触发器
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON public.messages 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. 为现有工单初始化 last_message_at
UPDATE public.support_tickets 
SET last_message_at = created_at 
WHERE last_message_at IS NULL;

-- 12. 为现有工单初始化未读计数（基于现有消息）
WITH message_counts AS (
  SELECT 
    ticket_id,
    COUNT(*) FILTER (WHERE sender_type = 'user' AND NOT is_read) as user_unread,
    COUNT(*) FILTER (WHERE sender_type = 'admin' AND NOT is_read) as admin_unread
  FROM public.messages
  GROUP BY ticket_id
)
UPDATE public.support_tickets st
SET 
  unread_count_user = COALESCE(mc.user_unread, 0),
  unread_count_admin = COALESCE(mc.admin_unread, 0)
FROM message_counts mc
WHERE st.id = mc.ticket_id;

-- 13. 验证表结构
DO $$
BEGIN
  RAISE NOTICE '数据库扩展完成：';
  RAISE NOTICE '- 创建了 messages 表';
  RAISE NOTICE '- 扩展了 support_tickets 表（last_message_at, unread_count_user, unread_count_admin）';
  RAISE NOTICE '- 配置了 RLS 策略';
  RAISE NOTICE '- 创建了触发器';
END $$;
