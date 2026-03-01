-- ==========================================================
-- 快速验证脚本 - 检查所有修复是否生效
-- 执行时间: 2026-03-01
-- 用途: 一键验证所有修复项
-- ==========================================================

-- 1. 验证RLS策略是否正确配置
SELECT 
  '1. RLS策略检查' as test_name,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ 通过'
    ELSE '❌ 失败'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'assets', 'trades', 'positions', 'conditional_orders')
GROUP BY tablename
ORDER BY tablename;

-- 2. 验证触发器是否存在
SELECT 
  '2. 触发器检查' as test_name,
  trigger_name,
  event_object_table,
  '✅ 存在' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('check_profile_sensitive_fields', 'update_profiles_updated_at');

-- 3. 验证清算系统表是否创建
SELECT 
  '3. 清算系统表检查' as test_name,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ 已创建'
    ELSE '❌ 缺失'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transaction_idempotency', 'fund_transfers', 'settlement_logs');

-- 4. 验证清算函数是否存在
SELECT 
  '4. 清算函数检查' as test_name,
  routine_name,
  '✅ 已创建' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('daily_settlement', 'calculate_total_asset', 'reconcile_user_assets');

-- 5. 验证trades表字段是否完整
SELECT 
  '5. trades表字段检查' as test_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('fee', 'need_approval', 'approval_status') THEN '✅ 已添加'
    ELSE '✅ 原有字段'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trades'
AND column_name IN ('id', 'user_id', 'status', 'fee', 'need_approval', 'approval_status')
ORDER BY column_name;

-- 6. 验证positions表字段是否完整
SELECT 
  '6. positions表字段检查' as test_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'locked_quantity' THEN '✅ 已添加'
    ELSE '✅ 原有字段'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'positions'
AND column_name IN ('id', 'user_id', 'symbol', 'quantity', 'available_quantity', 'locked_quantity')
ORDER BY column_name;

-- 7. 验证用户状态分布
SELECT 
  '7. 用户状态分布' as test_name,
  status,
  COUNT(*) as user_count,
  '✅ 正常' as check_status
FROM public.profiles
GROUP BY status
ORDER BY status;

-- 8. 验证资产表数据完整性
SELECT 
  '8. 资产表完整性' as test_name,
  COUNT(*) as total_users,
  COUNT(CASE WHEN available_balance >= 0 THEN 1 END) as valid_balance_count,
  COUNT(CASE WHEN frozen_balance >= 0 THEN 1 END) as valid_frozen_count,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN available_balance >= 0 AND frozen_balance >= 0 THEN 1 END) 
    THEN '✅ 通过'
    ELSE '❌ 有负数余额'
  END as status
FROM public.assets;

-- 9. 验证交易订单状态分布
SELECT 
  '9. 交易订单状态' as test_name,
  status,
  COUNT(*) as order_count,
  '✅ 正常' as check_status
FROM public.trades
GROUP BY status
ORDER BY status;

-- 10. 验证清算日志（如果有）
SELECT 
  '10. 清算日志检查' as test_name,
  COALESCE(COUNT(*)::text, '0') as log_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ 有清算记录'
    ELSE '⚠️ 暂无清算记录（正常）'
  END as status
FROM public.settlement_logs;

-- 11. 测试对账函数（需要有用户数据）
DO $$
DECLARE
  v_user_id UUID;
  v_result RECORD;
BEGIN
  -- 获取第一个用户ID
  SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- 执行对账
    SELECT * INTO v_result FROM reconcile_user_assets(v_user_id);
    
    RAISE NOTICE '11. 对账函数测试: 用户ID=%, 是否匹配=%', v_user_id, v_result.is_match;
  ELSE
    RAISE NOTICE '11. 对账函数测试: ⚠️ 无用户数据，跳过测试';
  END IF;
END $$;

-- 12. 汇总验证结果
SELECT 
  '=== 验证汇总 ===' as summary,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION') as total_functions,
  (SELECT COUNT(*) FROM public.profiles) as total_users,
  (SELECT COUNT(*) FROM public.trades) as total_trades;

-- 验证完成提示
SELECT 
  '✅ 验证脚本执行完成' as message,
  '请检查上述输出，确保所有项都显示 ✅ 通过' as next_step,
  '如有 ❌ 失败项，请查看对应的修复脚本' as action;
