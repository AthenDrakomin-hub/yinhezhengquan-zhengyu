-- ==========================================================
-- 中国银河证券——证裕交易单元 Nexus 聊天系统表结构
-- 版本: v2.12.0
-- 功能: 支持实时聊天、工单管理、消息存储
-- ==========================================================

-- 1. 修改客服工单表 (support_tickets) - 添加聊天所需字段
ALTER TABLE IF EXISTS public.support_tickets 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS unread_count_user INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_count_admin INTEGER DEFAULT 0;

-- 2. 创建消息表 (messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 启用 RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. 创建消息表策略
-- 用户可读自己工单的消息
DROP POLICY IF EXISTS "用户可读自己工单的消息" ON public.messages;
CREATE POLICY "用户可读自己工单的消息" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

-- 管理员可读所有消息
DROP POLICY IF EXISTS "管理员可读所有消息" ON public.messages;
CREATE POLICY "管理员可读所有消息" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 用户可发送消息到自己的工单
DROP POLICY IF EXISTS "用户可发送消息到自己的工单" ON public.messages;
CREATE POLICY "用户可发送消息到自己的工单" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        ) AND sender_type = 'user'
    );

-- 管理员可发送消息到任何工单
DROP POLICY IF EXISTS "管理员可发送消息到任何工单" ON public.messages;
CREATE POLICY "管理员可发送消息到任何工单" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        AND sender_type = 'admin'
    );

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_is_read ON public.messages(sender_type, is_read);

-- 6. 创建 updated_at 触发器
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. 创建函数：更新工单最后消息时间和未读计数
CREATE OR REPLACE FUNCTION update_ticket_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新工单的最后消息时间
    UPDATE public.support_tickets 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.ticket_id;
    
    -- 更新未读计数
    IF NEW.sender_type = 'user' THEN
        -- 用户发送消息，增加管理员的未读计数
        UPDATE public.support_tickets 
        SET unread_count_admin = COALESCE(unread_count_admin, 0) + 1
        WHERE id = NEW.ticket_id;
    ELSE
        -- 管理员发送消息，增加用户的未读计数
        UPDATE public.support_tickets 
        SET unread_count_user = COALESCE(unread_count_user, 0) + 1
        WHERE id = NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 创建触发器：插入消息时自动更新工单
DROP TRIGGER IF EXISTS trigger_update_ticket_on_message ON public.messages;
CREATE TRIGGER trigger_update_ticket_on_message 
AFTER INSERT ON public.messages 
FOR EACH ROW EXECUTE PROCEDURE update_ticket_on_message();

-- 9. 创建函数：标记消息为已读时更新未读计数
CREATE OR REPLACE FUNCTION update_unread_count_on_mark_read()
RETURNS TRIGGER AS $$
DECLARE
    target_sender_type TEXT;
BEGIN
    -- 确定要减少的未读计数
    IF NEW.sender_type = 'user' THEN
        target_sender_type := 'admin';
    ELSE
        target_sender_type := 'user';
    END IF;
    
    -- 更新工单的未读计数
    IF target_sender_type = 'admin' THEN
        UPDATE public.support_tickets 
        SET unread_count_admin = GREATEST(COALESCE(unread_count_admin, 0) - 1, 0)
        WHERE id = NEW.ticket_id;
    ELSE
        UPDATE public.support_tickets 
        SET unread_count_user = GREATEST(COALESCE(unread_count_user, 0) - 1, 0)
        WHERE id = NEW.ticket_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. 创建触发器：标记消息为已读时更新未读计数
DROP TRIGGER IF EXISTS trigger_update_unread_count_on_mark_read ON public.messages;
CREATE TRIGGER trigger_update_unread_count_on_mark_read 
AFTER UPDATE OF is_read ON public.messages 
FOR EACH ROW 
WHEN (OLD.is_read = false AND NEW.is_read = true)
EXECUTE PROCEDURE update_unread_count_on_mark_read();

-- 11. 插入测试数据（如果表为空）
INSERT INTO public.support_tickets (id, subject, status, last_update, user_id, last_message_at, unread_count_user, unread_count_admin)
SELECT 
    'T-9921',
    '两融账户展期申请审核',
    'IN_PROGRESS',
    '2025-03-26',
    (SELECT id FROM auth.users LIMIT 1),
    '2025-03-26T10:10:00Z',
    0,
    1
WHERE NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE id = 'T-9921');

INSERT INTO public.messages (ticket_id, sender_id, sender_type, content, is_read, created_at)
SELECT 
    'T-9921',
    (SELECT id FROM auth.users LIMIT 1),
    'user',
    '您好，我想咨询一下两融账户展期的问题。',
    true,
    '2025-03-26T10:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM public.messages WHERE ticket_id = 'T-9921' AND content = '您好，我想咨询一下两融账户展期的问题。');

INSERT INTO public.messages (ticket_id, sender_id, sender_type, content, is_read, created_at)
SELECT 
    'T-9921',
    'admin-id-001',
    'admin',
    '您好，我是客服专员。请提供您的账户信息和具体需求。',
    true,
    '2025-03-26T10:05:00Z'
WHERE NOT EXISTS (SELECT 1 FROM public.messages WHERE ticket_id = 'T-9921' AND content = '您好，我是客服专员。请提供您的账户信息和具体需求。');

INSERT INTO public.messages (ticket_id, sender_id, sender_type, content, is_read, created_at)
SELECT 
    'T-9921',
    (SELECT id FROM auth.users LIMIT 1),
    'user',
    '我的账户是ZY-USER-001，需要将两融账户展期3个月。',
    false,
    '2025-03-26T10:10:00Z'
WHERE NOT EXISTS (SELECT 1 FROM public.messages WHERE ticket_id = 'T-9921' AND content = '我的账户是ZY-USER-001，需要将两融账户展期3个月。');