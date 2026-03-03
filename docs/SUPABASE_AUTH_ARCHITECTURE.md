# Supabase 认证架构分析与优化方案

## 📋 目录
- [1. 数据库层面结构](#1-数据库层面结构)
- [2. 认证流程与架构](#2-认证流程与架构)
- [3. 项目当前实现](#3-项目当前实现)
- [4. Supabase 原生特性](#4-supabase 原生特性)
- [5. 优化建议](#5-优化建议)

---

## 1. 数据库层面结构

### 1.1 Supabase Auth Schema（官方标准）

当开启 Supabase Auth 功能时，系统会自动创建 `auth` Schema：

#### A. `auth.users` 表（核心）
```sql
-- 用户主表，每行代表一个用户
关键字段:
- id: UUID (用户的唯一标识符，业务表关联的主键)
- email: 用户邮箱
- encrypted_password: 加密后的密码 (bcrypt/argon2)
- raw_user_meta_data: JSONB (用户元数据，如头像 URL、全名等)
- is_sso_user: 是否 SSO 登录用户
- created_at, updated_at: 时间戳
- confirmation_token: 邮箱验证 token
- email_confirmed_at: 邮箱验证时间
```

#### B. `auth.identities` 表（身份关联）
```sql
-- 支持一个用户拥有多种登录方式
关键字段:
- user_id: FK → auth.users.id
- provider: 登录提供商 (email, google, phone 等)
- identity_data: JSONB (该提供商特有的数据，如 Google avatar URL)
```

#### C. `auth.sessions` 表（会话管理）
```sql
-- 存储活跃会话（JWT Refresh Token）
关键字段:
- user_id: FK → auth.users.id
- refresh_token: 刷新令牌
- created_at, updated_at: 判断会话过期
```

#### D. `auth.refresh_tokens` 表
```sql
-- 存储用于换取新 Access Token 的长效 Token
关键字段:
- user_id: FK → auth.users.id
- refresh_token: 刷新令牌
- expires_at: 过期时间
```

### 1.2 项目数据库结构

#### 已实现的表结构

**公共 Schema:**
- ✅ `public.profiles` - 用户资料（扩展 auth.users）
- ✅ `public.assets` - 用户资产
- ✅ `public.positions` - 持仓
- ✅ `public.trades` - 交易订单
- ✅ `public.transactions` - 交易流水
- ✅ `public.fund_flows` - 资金流水

**触发器:**
- ✅ `on_auth_user_created` - 当用户在 `auth.users` 注册时，自动在 `profiles` 和 `assets` 创建记录

**触发器函数:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建 profile
  INSERT INTO public.profiles (id, email, username, role, admin_level, status, risk_level)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', ...), ...);
  
  -- 创建资产记录
  INSERT INTO public.assets (user_id, available_balance, frozen_balance, total_asset)
  VALUES (NEW.id, 1000000.00, 0.00, 1000000.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. 认证流程与架构

### 2.1 Supabase 官方认证流程（基于 JWT）

#### 登录流程
```
1. 前端请求：supabase.auth.signInWithPassword({ email, password })
   ↓
2. GoTrue 服务：验证 auth.users 表中的 encrypted_password
   ↓
3. 生成 Token:
   - Access Token (JWT): 短期有效（默认 1 小时），包含用户 ID 和元数据
   - Refresh Token: 长期有效，存入 auth.sessions/refresh_tokens
   ↓
4. 返回给前端：{ user, session }
```

#### 前端存储
```typescript
// Web 端
- localStorage: 默认存储方式
- HttpOnly Cookie: SSR 模式（需要额外配置）

// Mobile 端
- 安全的设备存储（React Native SecureStore / Flutter SecureStorage）
```

### 2.2 项目当前认证流程

#### 客户端登录（LoginView.tsx）
```typescript
// 简化的三步走
// 步骤 1: 登录
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// 步骤 2: 查询 profiles 表
let { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('status, role, username')
  .eq('id', authData.user.id)
  .single();

// 步骤 3: 如果 profile 不存在，自动创建
if (profileError?.code === 'PGRST116') {
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      email: authData.user.email,
      username: email.split('@')[0],
      risk_level: 'C3-稳健型',
      status: 'ACTIVE',
      role: 'user'
    });
  
  if (insertError) throw new Error('初始化账户失败');
  
  // 重新查询
  profile = (await supabase
    .from('profiles')
    .select('status, role, username')
    .eq('id', authData.user.id)
    .single()).data;
}

// 步骤 4: 检查状态并返回
if (profile?.status === 'PENDING' || profile?.status === 'BANNED') {
  await supabase.auth.signOut();
  throw new Error('账户状态异常');
}

onLoginSuccess(authData.user);
```

#### 管理端登录（AdminLoginView.tsx）
```typescript
// 1. 登录获取 session
const { data, error } = await loginWithPassword(email, password);

// 2. 获取最新 session（确保拿到真实的 access_token）
const { data: latestSessionData } = await supabase.auth.getSession();
const accessToken = latestSessionData?.session?.access_token;

// 3. 临时禁用 Edge Function 验证
console.log('[AdminLogin] 跳过 Edge Function 验证，直接进入管理后台');

// 4. 通知父组件更新状态
onLoginSuccess(data.user);

// 5. 强制原生跳转
window.location.href = '/admin/dashboard';
```

---

## 3. 项目当前实现

### 3.1 核心文件结构

```
components/
├── auth/
│   ├── LoginView.tsx              # 客户端登录（支持手机验证码、邮箱密码、2FA）
│   ├── ForgotPasswordView.tsx     # 忘记密码
│   └── QuickOpenView.tsx          # 快速开户
├── admin/
│   └── AdminLoginView.tsx         # 管理端登录（支持 IP 白名单）
contexts/
└── AuthContext.tsx                # 全局认证上下文
lib/
├── supabase.ts                    # Supabase 客户端配置
└── fetch.ts                       # Edge Function 调用封装
services/
└── authService.ts                 # 认证服务封装
```

### 3.2 支持的登录方式

#### 1. 手机号验证码登录
```typescript
// 发送验证码
await supabase.auth.signInWithOtp({
  phone: `+86${phone}`,
});

// 验证并登录
await supabase.auth.verifyOtp({
  phone: `+86${phone}`,
  token: otp,
  type: 'sms',
});
```

#### 2. 邮箱密码登录
```typescript
await supabase.auth.signInWithPassword({
  email,
  password,
});
```

#### 3. 双因素登录（2FA）
```typescript
// 第一步：验证邮箱密码
await supabase.auth.signInWithPassword({ email, password });

// 第二步：验证 TOTP
await supabase.auth.verifyOtp({
  email,
  token: totpCode,
  type: 'totp',
});
```

#### 4. 忘记密码
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

### 3.3 安全机制

#### RLS（Row Level Security）策略
```sql
-- 示例：只有用户自己能查看自己的订单
SELECT * FROM orders 
WHERE user_id = auth.uid(); -- auth.uid() 从 JWT 中解析
```

#### Profile 表权限控制
```typescript
// 检查用户状态
if (profile?.status === 'PENDING') {
  await supabase.auth.signOut();
  throw new Error('账户正在审核中');
}

if (profile?.status === 'BANNED') {
  await supabase.auth.signOut();
  throw new Error('账户已被禁用');
}
```

#### 管理员验证（可选）
```typescript
// 通过 Edge Function 验证管理员权限 + IP 白名单
const verificationResult = await verifyAdminWithEdgeFunction(accessToken);

if (!verificationResult.ok || !verificationResult.admin) {
  throw new Error('管理员验证失败');
}
```

---

## 4. Supabase 原生特性

### 4.1 用户与业务数据的直接关联 ⭐

**传统模式:**
```
Auth 系统 → user_id → 业务数据库 → 手动关联
```

**Supabase 模式:**
```sql
-- 直接在业务表中引用 auth.users.id
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL,
  created_at TIMESTAMP
);

-- 利用 auth.uid() 函数在数据库层面进行权限验证
CREATE POLICY "用户只能查看自己的订单"
ON orders FOR SELECT
USING (user_id = auth.uid());
```

### 4.2 多身份融合（Account Linking）

如果你先用邮箱注册，后来又用 Google（同一个邮箱）登录：

```typescript
// Supabase 会自动将这两个身份合并到同一个 auth.users 记录中
// 通过 auth.identities 表关联

// 示例：
// 1. 第一次：邮箱密码注册 → auth.users.id = uuid_123
// 2. 第二次：Google 登录（相同邮箱）→ 关联到 uuid_123
//    auth.identities 新增一条记录：
//    { user_id: uuid_123, provider: 'google', identity_data: {...} }
```

### 4.3 PKCE（Proof Key for Code Exchange）流程

移动端或原生 App 登录时的安全增强：

```
1. App 生成随机 code_verifier
   ↓
2. 发起授权请求（带 code_challenge = hash(code_verifier)）
   ↓
3. 回调时获取 code
   ↓
4. App 用 code + code_verifier 换取 Token
```

这防止了恶意应用截获回调 URL 中的 Token。

### 4.4 实时订阅

```typescript
// 监听认证状态变化
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    setUser(session.user);
    await fetchUserProfile(session.user.id);
  } else {
    setUser(null);
    setUserProfile(null);
  }
});
```

---

## 5. 优化建议

### 5.1 架构优化

#### ✅ 已实现
- [x] 简化登录流程（减少不必要的 session 刷新）
- [x] 自动创建 Profile 触发器
- [x] RLS 权限控制
- [x] 多种登录方式支持

#### 🔄 可优化项

##### 1. 统一错误处理
```typescript
// 当前：分散在各个组件中
// 建议：创建统一的错误处理工具

// utils/authErrors.ts
export const handleAuthError = (error: any): string => {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '邮箱或密码错误',
    'Email not confirmed': '邮箱未验证',
    'Phone not confirmed': '手机号未验证',
    'Too many requests': '请求过于频繁，请稍后再试',
  };
  
  return errorMap[error.message] || '登录失败，请稍后重试';
};
```

##### 2. Profile 自动创建优化
```sql
-- 当前：在登录逻辑中检查并创建
-- 建议：完全依赖数据库触发器，移除应用层逻辑

-- 增强触发器函数，处理更多场景
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_username TEXT;
BEGIN
  -- 生成默认用户名
  default_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'User_' || substring(NEW.id::text, 1, 8)
  );
  
  -- 创建 profile
  INSERT INTO public.profiles (id, email, username, role, admin_level, status, risk_level)
  VALUES (
    NEW.id,
    NEW.email,
    default_username,
    'user',
    'user',
    'ACTIVE',
    'C3-稳健型'
  );
  
  -- 创建资产记录
  INSERT INTO public.assets (user_id, available_balance, frozen_balance, total_asset)
  VALUES (NEW.id, 1000000.00, 0.00, 1000000.00);
  
  -- 记录日志
  INSERT INTO public.user_behavior_logs (user_id, action, details)
  VALUES (NEW.id, 'REGISTER', '新用户注册，自动创建 profile 和 assets');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

##### 3. Session 管理优化
```typescript
// 当前：每次登录都检查 session
// 建议：添加 session 缓存机制

// lib/sessionCache.ts
class SessionCache {
  private cache: Map<string, { session: Session, expiry: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 分钟

  async getSession(client: SupabaseClient) {
    const cached = this.cache.get('current');
    if (cached && Date.now() < cached.expiry) {
      return cached.session;
    }

    const { data } = await client.auth.getSession();
    if (data.session) {
      this.cache.set('current', {
        session: data.session,
        expiry: Date.now() + this.TTL
      });
    }
    return data.session;
  }

  invalidate() {
    this.cache.delete('current');
  }
}
```

### 5.2 安全性增强

#### 1. 启用 IP 白名单（管理端）
```typescript
// 恢复 Edge Function 验证
const verificationResult = await verifyAdminWithEdgeFunction(accessToken);

if (!verificationResult.ok) {
  await supabase.auth.signOut();
  throw new Error(`IP 验证失败：${verificationResult.error}`);
}
```

#### 2. 添加登录频率限制
```typescript
// services/rateLimiter.ts
const loginAttempts = new Map<string, { count: number, lastAttempt: number }>();

export const checkLoginRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  
  if (!attempt) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // 5 分钟内最多 5 次尝试
  if (now - attempt.lastAttempt < 5 * 60 * 1000) {
    if (attempt.count >= 5) {
      return false;
    }
    attempt.count++;
  } else {
    attempt.count = 1;
    attempt.lastAttempt = now;
  }
  
  return true;
};
```

#### 3. 设备指纹识别
```typescript
// utils/deviceFingerprint.ts
export const getDeviceFingerprint = (): string => {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  const screenResolution = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // 生成指纹哈希
  const fingerprint = btoa(`${userAgent}${language}${platform}${screenResolution}${timezone}`);
  return fingerprint;
};
```

### 5.3 性能优化

#### 1. Profile 查询缓存
```typescript
// hooks/useUserProfile.ts
export const useUserProfile = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内使用缓存
    enabled: !!userId,
  });
};
```

#### 2. 批量查询优化
```typescript
// 当前：逐个查询用户 profile
// 建议：批量查询

// 批量获取多个用户的 profile
const getUserProfiles = async (userIds: string[]) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
  return data;
};
```

### 5.4 可观测性

#### 1. 添加监控指标
```typescript
// services/authMetrics.ts
export const trackAuthEvent = async (event: string, userId?: string, metadata?: any) => {
  try {
    await supabase
      .from('performance_metrics')
      .insert({
        metric_type: 'AUTH_EVENT',
        metric_name: event,
        value: 1,
        metadata: { user_id: userId, ...metadata },
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    console.error('追踪认证事件失败:', error);
  }
};

// 使用示例
await trackAuthEvent('LOGIN_SUCCESS', user.id);
await trackAuthEvent('LOGIN_FAILED', undefined, { email, reason: error.message });
```

#### 2. 日志记录
```typescript
// services/authLogger.ts
export const logAuthAction = async (action: string, userId: string, details: any) => {
  await supabase
    .from('admin_operation_logs')
    .insert({
      user_id: userId,
      action: action,
      details: details,
      ip_address: await getClientIP(),
      timestamp: new Date().toISOString(),
    });
};
```

---

## 6. 总结

### 当前架构优势 ✅
1. **符合 Supabase 最佳实践**: 使用 `auth.users` + `public.profiles` 扩展模式
2. **自动化程度高**: 触发器自动创建 Profile 和 Assets
3. **安全性良好**: RLS 权限控制、多种登录方式、账户状态检查
4. **代码简洁**: 经过简化后的登录流程清晰易维护

### 潜在改进空间 🔄
1. **错误处理统一化**: 分散的错误处理可以集中管理
2. **性能优化**: 添加缓存机制减少重复查询
3. **安全增强**: IP 白名单、登录频率限制、设备指纹
4. **可观测性**: 添加监控指标和日志记录

### 推荐优先级 📊
```
高优先级:
✅ 统一错误处理（影响用户体验）
✅ Profile 查询缓存（影响性能）

中优先级:
🟡 IP 白名单（管理端安全）
🟡 登录频率限制（防止暴力破解）

低优先级:
⚪ 设备指纹（高级安全特性）
⚪ 详细监控指标（运维需求）
```

---

**文档状态**: ✅ 已完成  
**最后更新**: 2026-03-03  
**维护者**: 银河证券开发团队
