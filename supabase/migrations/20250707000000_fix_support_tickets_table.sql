-- 修复 support_tickets 表
-- 添加在线客服/工单系统所需的字段

-- 添加聊天相关字段
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS unread_count_user INTEGER DEFAULT 0;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS unread_count_admin INTEGER DEFAULT 0;

-- 添加工单详细字段
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'NORMAL';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_id TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS queue_status TEXT DEFAULT 'WAITING';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_admin_id TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 通知 PostgREST 重新加载 schema
NOTIFY pgrst, 'reload schema';
