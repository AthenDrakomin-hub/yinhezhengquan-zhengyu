-- 创建管理员用户表
-- 用于管理端用户权限管理

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- 启用行级安全
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS策略：只允许管理员访问
CREATE POLICY "管理员查看admin_users" ON public.admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  );

CREATE POLICY "管理员管理admin_users" ON public.admin_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'ACTIVE')
  );

-- 插入初始管理员用户
INSERT INTO public.admin_users (user_id)
VALUES ('f60b6c8f-38fb-4617-829b-5773809f70a2')
ON CONFLICT (user_id) DO NOTHING;