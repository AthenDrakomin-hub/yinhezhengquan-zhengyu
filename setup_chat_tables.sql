-- 聊天系统数据库表结构
-- 请在Supabase SQL编辑器中运行此脚本

-- 1. 创建客服工单表 (如果不存在)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
    last_update DATE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count_user INTEGER DEFAULT 0,
    unread_count_admin INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 添加缺失的字段 (如果表已存在但缺少字段)
DO $$ 
BEGIN
    -- 添加 last_message_at 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'support_tickets' 
                   AND column_name = 'last_message_at') THEN
        ALTER TABLE public.support_tickets ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- 添加 unread_count_user 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'support_tickets' 
                   AND column_name = 'unread_count_user') THEN
        ALTER TABLE public.support_tickets ADD COLUMN unread_count_user INTEGER DEFAULT 0;
    END IF;
    
    -- 添加 unread_count_admin 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'support_tickets' 
                   AND column_name = 'unread_count_admin') THEN
        ALTER TABLE public.support_tickets ADD COLUMN unread_count_admin INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. 创建消息表
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

-- 4. 启用行级安全
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. 创建安全策略
-- 客服工单表策略
DROP POLICY IF EXISTS "用户可读自己的工单" ON public.support_tickets;
CREATE POLICY "用户可读自己的工单" ON public.support_tickets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "管理员可读所有工单" ON public.support_tickets;
CREATE POLICY "管理员可读所有工单" ON public.support_tickets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "仅管理员可管理工单" ON public.support_tickets;
CREATE POLICY "仅管理员可管理工单" ON public.support_tickets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 消息表策略
DROP POLICY IF EXISTS "用户可读自己工单的消息" ON public.messages;
CREATE POLICY "用户可读自己工单的消息" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "管理员可读所有消息" ON public.messages;
CREATE POLICY "管理员可读所有消息" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "用户可发送消息到自己的工单" ON public.messages;
CREATE POLICY "用户可发送消息到自己的工单" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        ) AND sender_type = 'user'
    );

DROP POLICY IF EXISTS "管理员可发送消息到任何工单" ON public.messages;
CREATE POLICY "管理员可发送消息到任何工单" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        AND sender_type = 'admin'
    );

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type_is_read ON public.messages(sender_type, is_read);

-- 7. 创建 updated_at 触发器函数 (如果不存在)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. 为表创建 updated_at 触发器
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at 
    BEFORE UPDATE ON public.support_tickets 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON public.messages 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 9. 插入测试数据
INSERT INTO public.support_tickets (id, subject, status, last_update, user_id, last_message_at, unread_count_user, unread_count_admin)
VALUES 
    ('T-9921', '两融账户展期申请审核', 'IN_PROGRESS', '2025-03-26', 
     (SELECT id FROM auth.users LIMIT 1), '2025-03-26T10:10:00Z', 0, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (ticket_id, sender_id, sender_type, content, is_read, created_at)
VALUES 
    ('T-9921', (SELECT id FROM auth.users LIMIT 1), 'user', '您好，我想咨询一下两融账户展期的问题。', true, '2025-03-26T10:00:00Z'),
    ('T-9921', 'admin-id-001', 'admin', '您好，我是客服专员。请提供您的账户信息和具体需求。', true, '2025-03-26T10:05:00Z'),
    ('T-9921', (SELECT id FROM auth.users LIMIT 1), 'user', '我的账户是ZY-USER-001，需要将两融账户展期3个月。', false, '2025-03-26T10:10:00Z')
ON CONFLICT DO NOTHING;

-- 10. 验证表创建成功
SELECT 'support_tickets表创建成功，记录数：' || COUNT(*) FROM public.support_tickets;
SELECT 'messages表创建成功，记录数：' || COUNT(*) FROM public.messages;