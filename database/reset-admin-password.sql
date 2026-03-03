-- ========================================
-- 重置超级管理员密码
-- ========================================

-- 方法1：通过 Supabase Dashboard 重置
-- 1. 登录 Supabase Dashboard
-- 2. 进入 Authentication -> Users
-- 3. 找到 athendrakomin@proton.me
-- 4. 点击 "..." -> "Reset Password"
-- 5. 用户会收到重置密码邮件

-- 方法2：直接在 Dashboard 设置新密码
-- 1. 登录 Supabase Dashboard
-- 2. 进入 Authentication -> Users
-- 3. 找到 athendrakomin@proton.me
-- 4. 点击用户进入详情页
-- 5. 点击 "Reset Password" 或 "Send Magic Link"

-- 方法3：临时使用其他管理员账号
-- 使用 admin@zhengyu.com 登录（如果记得密码）

-- 方法4：查询用户ID，然后在 Dashboard 中操作
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'athendrakomin@proton.me';

-- 注意：无法通过 SQL 直接修改密码，必须使用 Supabase Dashboard 或 Admin API
