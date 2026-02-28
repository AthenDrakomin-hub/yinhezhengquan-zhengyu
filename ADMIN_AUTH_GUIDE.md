# 管理员身份验证完整指南

## 当前管理员验证机制

### 1. 前端验证逻辑 (App.tsx)
```javascript
// 在 ProtectedRoute 组件中
if (isAdmin && role !== 'admin') {
  return <Navigate to="/dashboard" replace />;
}
```

### 2. 后端数据库验证
- 用户角色存储在 `public.profiles.role` 字段中
- 有效值：'user' 或 'admin'
- 用户状态存储在 `public.profiles.status` 字段中
- 有效值：'ACTIVE', 'BANNED', 'PENDING'

### 3. RLS策略验证
- 当前存在问题：RLS策略使用 `auth.jwt() ->> 'role'` 而不是查询profiles表
- 应该修改为查询当前用户在profiles表中的role字段

## 验证步骤

### 步骤1：检查数据库中的用户信息
运行 `verify_admin_user.sql` 中的查询：

```sql
-- 查看所有管理员用户
SELECT 
    p.id,
    p.username,
    p.real_name,
    p.role,
    p.status,
    p.created_at
FROM public.profiles p
WHERE p.role = 'admin'
ORDER BY p.created_at DESC;
```

### 步骤2：修复RLS策略（如果需要）
如果发现RLS策略配置有问题，请运行 `correct_admin_rls_fix.sql`

### 步骤3：验证当前登录用户权限
```sql
-- 检查当前认证用户的管理员权限
SELECT 
    auth.uid() as current_user_id,
    EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'admin' 
        AND p.status = 'ACTIVE'
    ) as is_admin_user,
    (SELECT role FROM public.profiles WHERE id = auth.uid()) as user_role,
    (SELECT status FROM public.profiles WHERE id = auth.uid()) as user_status;
```

## 常见问题排查

### 问题1：用户有admin角色但无法访问管理界面
**可能原因**：
- RLS策略配置错误
- 用户status不是'ACTIVE'
- 前端session中的role信息未正确同步

**解决方案**：
1. 运行验证查询确认数据库中用户角色正确
2. 检查用户status是否为'ACTIVE'
3. 重新登录以刷新session信息

### 问题2：RLS策略阻止管理员访问
**解决方案**：
运行 `correct_admin_rls_fix.sql` 修复RLS策略

### 问题3：测试管理员按钮无法正常工作
**解决方案**：
检查前端控制台是否有错误信息，确认Supabase连接正常

## 创建新管理员用户的正确方法

### 方法1：通过SQL直接创建
```sql
-- 更新现有用户为管理员
UPDATE public.profiles 
SET role = 'admin'
WHERE id = 'your-user-id';

-- 或创建新管理员用户
INSERT INTO public.profiles (id, username, role, status)
VALUES ('new-user-id', '管理员名称', 'admin', 'ACTIVE');
```

### 方法2：通过管理界面创建
如果已有管理员账户，可以通过用户管理界面创建新管理员。

## 验证清单

- [ ] 数据库中存在role='admin'的用户记录
- [ ] 用户status='ACTIVE'
- [ ] RLS策略正确配置（使用profiles表查询而非JWT）
- [ ] 前端能够正确识别管理员角色
- [ ] 管理员可以访问/admin/*路由
- [ ] 非管理员用户被正确重定向