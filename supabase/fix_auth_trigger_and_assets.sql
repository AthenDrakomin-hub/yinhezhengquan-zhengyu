-- 修复认证触发器和资产初始化问题
-- 执行时间: 2026-03-01
-- 业务规则: 新用户初始资金为0，管理员不需要资产账户

-- 1. 创建自动初始化资产的触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 插入用户档案
  INSERT INTO public.profiles (id, username, role, status, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user',
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 初始化资产账户（初始余额为0）
  INSERT INTO public.assets (id, user_id, total_asset, available_balance, frozen_balance, today_profit_loss, hidden_mode, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    NEW.id,
    0,
    0,
    0,
    0,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. 清理现有用户资产（保持为0，符合业务规则）
-- 无需操作，零余额是正确状态

-- 4. 删除管理员的资产记录（管理员不需要资产账户）
DELETE FROM public.assets
WHERE user_id IN (SELECT id FROM public.profiles WHERE role = 'admin');

-- 验证结果
SELECT 
  'trigger_fixed' as check_type,
  COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'
UNION ALL
SELECT 
  'users_with_assets',
  COUNT(DISTINCT a.user_id)
FROM public.assets a
INNER JOIN public.profiles p ON a.user_id = p.id
WHERE p.status = 'ACTIVE'
UNION ALL
SELECT 
  'zero_balance_users',
  COUNT(*)
FROM public.assets a
INNER JOIN public.profiles p ON a.user_id = p.id
WHERE p.role = 'user' AND a.available_balance = 0;
