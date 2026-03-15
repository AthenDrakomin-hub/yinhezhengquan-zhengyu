-- ==========================================================
-- 修复用户关联数据一致性
-- 创建时间: 2026-03-15
-- 功能: 确保用户创建时自动创建 assets, user_settings, notification_settings
-- ==========================================================

-- 1. 为现有用户补齐 assets 记录
INSERT INTO assets (user_id, total_asset, available_cash, frozen_cash, market_value, total_profit, today_profit, today_profit_percent, currency)
SELECT p.id, COALESCE(p.balance, 0), COALESCE(p.balance, 0), 0, 0, 0, 0, 0, 'CNY'
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.user_id = p.id);

-- 2. 为现有用户补齐 user_settings 记录
INSERT INTO user_settings (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM user_settings us WHERE us.user_id = profiles.id);

-- 3. 为现有用户补齐 notification_settings 记录
INSERT INTO notification_settings (user_id)
SELECT id FROM profiles
WHERE NOT EXISTS (SELECT 1 FROM notification_settings ns WHERE ns.user_id = profiles.id);

-- 4. 创建触发器函数：新建用户时自动创建关联记录
CREATE OR REPLACE FUNCTION public.handle_new_user_assets()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建 assets
  INSERT INTO public.assets (user_id, total_asset, available_cash, frozen_cash, market_value, total_profit, today_profit, today_profit_percent, currency)
  VALUES (NEW.id, COALESCE(NEW.balance, 0), COALESCE(NEW.balance, 0), 0, 0, 0, 0, 0, 'CNY')
  ON CONFLICT (user_id) DO NOTHING;

  -- 创建 user_settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  -- 创建 notification_settings
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建触发器
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_assets();

-- 6. 添加注释
COMMENT ON FUNCTION public.handle_new_user_assets() IS '用户创建时自动创建 assets, user_settings, notification_settings 记录';
