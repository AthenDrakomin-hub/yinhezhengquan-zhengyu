# Supabase SMS Hook 配置与使用指南

## 概述

本指南介绍如何配置和使用 Supabase SMS Hook 实现手机验证码发送功能。系统包含开发环境日志记录和生产环境短信网关对接能力。

## 文件结构

```
supabase/
├── migrations/
│   ├── 20250327000000_init.sql      # 初始数据库结构
│   └── 20250328000001_add_sms_hook.sql  # SMS Hook 函数和表
```

## 安装与配置

### 1. 运行数据库迁移

在 Supabase Dashboard 的 SQL 编辑器中运行以下迁移文件：

```sql
-- 运行 SMS Hook 迁移
-- 文件位置: supabase/migrations/20250328000001_add_sms_hook.sql
```

### 2. 验证函数创建

运行以下 SQL 验证函数是否创建成功：

```sql
-- 检查函数是否存在
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'send_sms';

-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sms_config', 'sms_logs');
```

### 3. 配置 Supabase Auth

在 Supabase Dashboard 中配置手机登录：

1. 进入 **Authentication** → **Providers**
2. 启用 **Phone** 提供商
3. 配置短信模板（可选）
4. 设置验证码有效期（建议 5-10 分钟）

## 使用说明

### 开发环境（默认）

在开发环境中，SMS Hook 会将验证码信息记录到 Supabase 日志中：

```sql
-- 查看日志
SELECT * 
FROM auth.sms_messages 
ORDER BY created_at DESC 
LIMIT 10;
```

日志输出示例：
```
📱 [SMS Hook] 短信验证码请求
   手机号: +8613800138000
   验证码: 123456
   时间戳: 2024-03-28 10:30:00
```

### 生产环境配置

#### 方法一：使用数据库设置

```sql
-- 配置生产环境短信网关
INSERT INTO public.sms_config (provider, api_url, api_key, api_secret, template_id, enabled)
VALUES (
    'production',
    'https://api.sms-gateway.com/v1/send',
    'your-api-key-here',
    'your-api-secret-here',
    'verification_template_001',
    TRUE
);
```

#### 方法二：使用 PostgreSQL 设置

```sql
-- 设置生产环境参数
ALTER DATABASE postgres 
SET app.sms_provider = 'production';

ALTER DATABASE postgres 
SET app.sms_api_url = 'https://api.sms-gateway.com/v1/send';

ALTER DATABASE postgres 
SET app.sms_api_key = 'your-api-key-here';
```

## 前端集成示例

### 1. 手机验证码发送组件

创建 `PhoneVerification.tsx` 组件：

```tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface PhoneVerificationProps {
  onVerified: (phone: string) => void;
}

const PhoneVerification: React.FC<PhoneVerificationProps> = ({ onVerified }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (!phone) {
      setError('请输入手机号');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 格式化为国际号码格式
      const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          shouldCreateUser: true, // 如果用户不存在则创建
        }
      });

      if (error) throw error;
      
      setStep('verify');
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+86${phone}`;
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms'
      });

      if (error) throw error;
      
      onVerified(phone);
    } catch (err: any) {
      setError(err.message || '验证码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
        手机号验证
      </h2>
      
      {step === 'phone' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              手机号
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <button
            onClick={handleSendOtp}
            disabled={loading || !phone}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '发送中...' : '发送验证码'}
          </button>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            开发环境：验证码将在 Supabase 日志中显示
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              验证码
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入6位验证码"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? '验证中...' : '验证'}
          </button>
          
          <button
            onClick={() => setStep('phone')}
            className="w-full py-2 px-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            重新发送验证码
          </button>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;
```

### 2. 集成到现有登录流程

修改 `LoginView.tsx` 添加手机登录选项：

```tsx
// 在 LoginView.tsx 中添加
import PhoneVerification from './PhoneVerification';

// 在组件中添加状态
const [showPhoneLogin, setShowPhoneLogin] = useState(false);

// 在渲染中添加
{showPhoneLogin ? (
  <PhoneVerification 
    onVerified={(phone) => {
      // 处理验证成功的逻辑
      console.log('手机号验证成功:', phone);
      setShowPhoneLogin(false);
    }}
  />
) : (
  // 原有的邮箱登录表单
  <button
    onClick={() => setShowPhoneLogin(true)}
    className="text-blue-600 hover:text-blue-800"
  >
    使用手机号登录/注册
  </button>
)}
```

## 生产环境短信网关集成

### 支持的短信服务商

#### 1. 阿里云短信
```sql
-- 配置阿里云短信
UPDATE public.sms_config 
SET 
  provider = 'aliyun',
  api_url = 'https://dysmsapi.aliyuncs.com',
  api_key = 'your-access-key-id',
  api_secret = 'your-access-key-secret',
  template_id = 'SMS_123456789'
WHERE id = 'your-config-id';
```

#### 2. 腾讯云短信
```sql
-- 配置腾讯云短信
UPDATE public.sms_config 
SET 
  provider = 'tencent',
  api_url = 'https://sms.tencentcloudapi.com',
  api_key = 'your-secret-id',
  api_secret = 'your-secret-key',
  template_id = '1234567'
WHERE id = 'your-config-id';
```

#### 3. Twilio（国际）
```sql
-- 配置 Twilio
UPDATE public.sms_config 
SET 
  provider = 'twilio',
  api_url = 'https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json',
  api_key = 'your-account-sid',
  api_secret = 'your-auth-token',
  template_id = 'verification'
WHERE id = 'your-config-id';
```

### 启用 HTTP 扩展

如果需要调用外部 API，需要启用 PostgreSQL 的 HTTP 扩展：

```sql
-- 启用 HTTP 扩展
CREATE EXTENSION IF NOT EXISTS http;

-- 验证扩展是否启用
SELECT * FROM pg_extension WHERE extname = 'http';
```

## 监控与调试

### 1. 查看短信日志

```sql
-- 查看所有短信发送记录
SELECT * FROM public.sms_logs ORDER BY created_at DESC;

-- 查看失败记录
SELECT * FROM public.sms_logs WHERE status = 'failed';

-- 按手机号查询
SELECT * FROM public.sms_logs WHERE phone_number LIKE '%13800138000%';
```

### 2. 查看 Supabase 日志

在 Supabase Dashboard 中：
1. 进入 **Database** → **Logs**
2. 过滤 `send_sms` 函数调用
3. 查看详细的调试信息

### 3. 性能监控

```sql
-- 统计短信发送量
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sms,
  SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM public.sms_logs
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 安全注意事项

### 1. 权限控制
- SMS Hook 函数仅授权给 `supabase_auth_admin`
- 配置表和日志表使用 RLS 策略，仅管理员可访问
- 生产环境 API 密钥存储在数据库设置中，不暴露给前端

### 2. 频率限制
建议在应用层或网关层实现频率限制：
- 同一手机号每天最多发送 10 次验证码
- 同一 IP 地址每小时最多发送 50 次验证码

### 3. 验证码安全
- 验证码有效期建议设置为 5-10 分钟
- 验证码使用后立即失效
- 禁止使用简单验证码（如 123456、000000）

## 故障排除

### 常见问题

#### 1. 函数未执行
- 检查函数权限：`GRANT EXECUTE ON FUNCTION public.send_sms TO supabase_auth_admin;`
- 验证 Supabase Auth 是否配置了手机登录
- 检查 Supabase 日志是否有错误信息

#### 2. 生产环境短信未发送
- 验证 `app.sms_provider` 设置是否为 'production'
- 检查 API URL 和密钥配置
- 确认 HTTP 扩展已启用（如果需要）
- 查看 `sms_logs` 表中的错误信息

#### 3. 前端验证码发送失败
- 检查手机号格式（需要国际格式，如 +8613800138000）
- 验证 Supabase 项目是否启用了手机登录
- 检查网络连接和 CORS 配置

### 调试步骤

1. **检查函数是否存在**：
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'send_sms';
   ```

2. **测试函数调用**：
   ```sql
   SELECT public.send_sms('{
     "user": {"phone": "+8613800138000"},
     "sms": {"otp": "123456"}
   }'::jsonb);
   ```

3. **查看最新日志**：
   ```sql
   SELECT * FROM public.sms_logs ORDER BY created_at DESC LIMIT 5;
   ```

## 更新与维护

### 1. 更新函数
```sql
-- 更新 SMS Hook 函数
CREATE OR REPLACE FUNCTION public.send_sms(event JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- 新的函数实现
$$;
```

### 2. 备份配置
```sql
-- 备份短信配置
SELECT * FROM public.sms_config 
INTO OUTFILE '/tmp/sms_config_backup.csv'
FORMAT CSV;
```

### 3. 清理旧日志
```sql
-- 清理30天前的日志
DELETE FROM public.sms_logs 
WHERE created_at < NOW() - INTERVAL '30 days';
```

## 支持与联系

如有问题，请参考：
- [Supabase 官方文档 - 手机登录](https://supabase.com/docs/guides/auth/phone-login)
- [Supabase 社区论坛](https://github.com/supabase/supabase/discussions)
- 项目维护者：银河证券技术团队

---

**版本**: 1.0.0  
**最后更新**: 2024-03-28  
**维护者**: 证裕交易单元技术团队