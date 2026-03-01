-- 检查管理员账号的认证状态

-- 1. 查看 auth.users 完整信息
SELECT 
    id,
    email,
    encrypted_password IS NOT NULL as has_password,
    email_confirmed_at IS NOT NULL as email_confirmed,
    phone_confirmed_at IS NOT NULL as phone_confirmed,
    created_at,
    last_sign_in_at,
    confirmation_sent_at,
    banned_until,
    deleted_at
FROM auth.users
WHERE id IN (
    '8984f08b-5366-446c-bc02-445b69eeda13',
    'f60b6c8f-38fb-4617-829b-5773809f70a2'
);

-- 2. 如果邮箱未确认，手动确认
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id IN (
    '8984f08b-5366-446c-bc02-445b69eeda13',
    'f60b6c8f-38fb-4617-829b-5773809f70a2'
)
AND email_confirmed_at IS NULL;

-- 3. 验证更新结果
SELECT 
    id,
    email,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users
WHERE id IN (
    '8984f08b-5366-446c-bc02-445b69eeda13',
    'f60b6c8f-38fb-4617-829b-5773809f70a2'
);
