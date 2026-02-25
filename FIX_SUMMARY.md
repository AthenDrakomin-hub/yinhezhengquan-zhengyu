# Supabase生产环境错误修复总结

## 问题概述

生产环境中出现两个关键错误：
1. **锁超时错误**：`Acquiring an exclusive Navigator LockManager lock "lock:sb-rfnrosyfeivcbkimjlwo-auth-token" timed out waiting 10000ms`
2. **资产表406错误**：`GET https://rfnrosyfeivcbkimjlwo.supabase.co/rest/v1/assets?select=*&user_id=eq.f60b6c8f-38fb-4617-829b-5773809f70a2 406 (Not Acceptable)`

## 修复方案

### 一、锁超时错误修复

#### 问题原因
- 浏览器多标签页同时访问，Supabase auth锁竞争
- 频繁调用`getSession`和`onAuthStateChange`导致锁竞争
- Supabase客户端锁超时配置过短（默认10秒）

#### 修复措施

1. **增加锁超时时间**（lib/supabase.ts）
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // 增加锁超时时间，避免多标签页竞争
    lockTimeout: 20000, // 20秒
  },
});
```

2. **优化onAuthStateChange逻辑**（App.tsx）
- 避免在`onAuthStateChange`回调中重复调用`authService.getSession()`
- 直接查询profiles表获取用户角色

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
  setSession(session);
  if (session) {
    // 直接获取用户profile，避免重复调用getSession
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .catch(() => ({ data: null }));
    
    setUserRole(profile?.role || 'user');
    syncAccountData(session.user.id);
  } else {
    setUserRole('user');
  }
});
```

### 二、资产表406错误修复

#### 问题原因
1. **assets表可能不存在**或未正确创建
2. **RLS策略缺失**或配置错误
3. **查询方法问题**：使用`.single()`可能抛出异常
4. **用户没有assets记录**：新用户注册后未自动创建assets记录

#### 修复措施

1. **优化assets查询逻辑**（App.tsx）
- 使用`.maybeSingle()`代替`.single()`
- 添加错误处理和降级逻辑

```typescript
// 使用 maybeSingle 而不是 single，因为 assets 可能不存在
const { data: assets, error: assetsError } = await supabase
  .from('assets')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

if (assetsError && assetsError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
  console.error('获取资产数据失败:', assetsError);
}
```

2. **创建assets表修复脚本**（supabase/fix_assets.sql）
- 确保assets表存在
- 创建/更新RLS策略
- 为现有用户创建assets记录
- 创建索引和触发器

```sql
-- 运行此脚本修复assets表
-- 在Supabase SQL编辑器中执行
```

3. **执行修复脚本**
```bash
# 在Supabase控制台执行以下步骤：
# 1. 进入SQL编辑器
# 2. 复制supabase/fix_assets.sql内容
# 3. 执行SQL脚本
# 4. 验证修复结果
```

### 三、综合优化

1. **错误处理增强**
- 所有Supabase查询添加错误处理
- 记录错误日志但不中断用户体验
- 提供合理的默认值

2. **性能优化**
- 减少重复的Supabase API调用
- 缓存用户session和profile数据
- 避免在渲染循环中调用auth方法

3. **数据一致性**
- 确保新用户注册时自动创建assets记录
- 添加数据库触发器确保数据完整性

## 验证步骤

### 1. 本地测试
```bash
# 启动开发服务器
npm run dev

# 测试登录流程
# 1. 打开多个浏览器标签页
# 2. 同时登录不同账户
# 3. 检查控制台是否有锁超时错误
# 4. 检查资产数据是否能正常加载
```

### 2. 生产环境测试
```bash
# 部署修复后的代码
vercel --prod

# 测试步骤
# 1. 使用管理员账号登录
# 2. 检查Network面板是否有406错误
# 3. 验证资产数据加载
# 4. 测试多标签页同时操作
```

### 3. 数据库验证
```sql
-- 验证assets表状态
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM public.assets) as total_assets,
  (SELECT COUNT(*) FROM public.assets WHERE user_id IN (SELECT id FROM auth.users)) as matched_assets;

-- 检查没有assets记录的用户
SELECT au.id, au.email 
FROM auth.users au
LEFT JOIN public.assets a ON au.id = a.user_id
WHERE a.id IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);
```

## 监控建议

### 1. 错误监控
- 集成Sentry或类似错误监控服务
- 监控Supabase API错误率
- 设置锁超时告警阈值

### 2. 性能监控
- 监控页面加载时间
- 跟踪Supabase查询响应时间
- 监控内存使用情况

### 3. 业务监控
- 监控用户登录成功率
- 跟踪资产查询失败率
- 监控交易执行成功率

## 回滚方案

如果修复导致新问题，可按以下步骤回滚：

1. **代码回滚**
```bash
# 回滚到修复前版本
git revert <commit-hash>
```

2. **数据库回滚**
```sql
-- 如果assets表修复脚本有问题
DROP TABLE IF EXISTS public.assets_backup;
-- 从备份恢复
```

3. **配置回滚**
- 移除Supabase客户端的lockTimeout配置
- 恢复原来的auth调用逻辑

## 总结

本次修复解决了以下关键问题：
1. **锁竞争问题**：通过增加超时时间和优化调用逻辑
2. **assets表访问问题**：通过修复表结构、RLS策略和查询逻辑
3. **数据一致性问题**：通过确保用户都有assets记录

修复后，用户登录体验将显著改善，资产数据加载将更加稳定可靠。

## 后续优化建议

1. **升级Supabase客户端**：考虑升级到最新版本（v2.46.2+）
2. **实现连接池**：优化数据库连接管理
3. **添加缓存层**：缓存频繁访问的用户数据
4. **优化RLS策略**：定期审查和优化行级安全策略
5. **自动化测试**：添加端到端的登录和资产查询测试
