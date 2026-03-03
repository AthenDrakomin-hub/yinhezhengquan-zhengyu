-- ========================================
-- 自动创建 Profile 触发器
-- 当用户在 auth.users 注册时，自动在 profiles 表创建记录
-- ========================================

-- 1. 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    role,
    admin_level,
    status,
    risk_level
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substring(NEW.id::text, 1, 8)),
    'user',
    'user',
    'ACTIVE',
    'C3-稳健型'
  );
  
  -- 同时创建资产记录
  INSERT INTO public.assets (
    user_id,
    available_balance,
    frozen_balance,
    total_asset
  ) VALUES (
    NEW.id,
    1000000.00,
    0.00,
    1000000.00
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. 验证触发器已创建
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. 测试说明
-- 现在当用户通过以下方式注册时，会自动创建 profile：
-- - 前端注册功能
-- - Supabase Dashboard 创建用户
-- - Auth API 注册

COMMENT ON FUNCTION public.handle_new_user() IS '自动为新注册用户创建 profile 和 assets 记录';
