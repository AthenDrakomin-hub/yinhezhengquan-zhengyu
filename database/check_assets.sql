-- 检查管理员账号的资金和持仓数据

-- 1. 查看 assets 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'assets';

-- 2. 查询管理员的资金记录
SELECT * FROM public.assets
WHERE user_id IN (
    '8984f08b-5366-446c-bc02-445b69eeda13',
    'f60b6c8f-38fb-4617-829b-5773809f70a2'
);

-- 3. 如果没有资金记录，创建初始资金
INSERT INTO public.assets (user_id, balance, frozen_balance, total_assets)
VALUES 
    ('8984f08b-5366-446c-bc02-445b69eeda13', 10000000.00, 0, 10000000.00),
    ('f60b6c8f-38fb-4617-829b-5773809f70a2', 10000000.00, 0, 10000000.00)
ON CONFLICT (user_id) DO NOTHING;

-- 4. 验证创建结果
SELECT * FROM public.assets
WHERE user_id IN (
    '8984f08b-5366-446c-bc02-445b69eeda13',
    'f60b6c8f-38fb-4617-829b-5773809f70a2'
);
