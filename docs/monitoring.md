# 行情服务监控配置指南

## 概述

本系统提供完整的健康检查和告警机制，确保行情服务稳定可用。

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                   健康检查架构                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  定时触发 (QStash/Cron)                                 │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────────────┐                                    │
│  │  health-check   │ ──检查──▶ Redis                   │
│  │  Edge Function  │ ──检查──▶ 东方财富 API            │
│  │                 │ ──检查──▶ proxy-market            │
│  └────────┬────────┘                                    │
│           │                                             │
│           ▼ 状态异常时                                   │
│  ┌─────────────────┐                                    │
│  │   告警通知      │                                    │
│  │  - Slack       │                                    │
│  │  - Discord     │                                    │
│  │  - 企业微信     │                                    │
│  │  - Email       │                                    │
│  └─────────────────┘                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 一、Edge Function 部署

### 1. 部署 health-check 函数

```bash
cd /path/to/yinhe-zhengyu-trade-system
npx supabase functions deploy health-check --no-verify-jwt
```

### 2. 配置环境变量

在 Supabase Dashboard → Edge Functions → Environment variables 添加：

```
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/xxx/xxx/xxx
# 或
ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/xxx
# 或企业微信
ALERT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

## 二、定时健康检查

### 方案1: 使用 QStash (推荐)

QStash 是 Upstash 提供的消息队列服务，可用于定时触发。

```typescript
// 在项目中创建定时任务
import { Client } from "@upstash/qstash";

const client = new Client({
  token: "your-qstash-token"
});

// 每5分钟检查一次
await client.schedules.create({
  destination: "https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/health-check",
  cron: "*/5 * * * *",
});
```

### 方案2: 使用 Supabase pg_cron

在 Supabase SQL Editor 中执行：

```sql
-- 启用 pg_cron 扩展
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 创建定时任务（每5分钟执行健康检查）
SELECT cron.schedule(
  'health-check-schedule',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/health-check',
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  $$
);
```

### 方案3: 外部 Cron 服务

使用 GitHub Actions / AWS EventBridge / 云函数定时触发。

## 三、前端集成

### 1. 基础使用

```typescript
import { healthMonitor, checkHealth } from '@/services/healthMonitor';

// 单次检查
const status = await checkHealth();
console.log('服务状态:', status.status);

// 启动定时检查（每60秒）
healthMonitor.startPeriodicCheck(60000);

// 停止检查
healthMonitor.stopPeriodicCheck();
```

### 2. 配置告警回调

```typescript
import { healthMonitor } from '@/services/healthMonitor';

healthMonitor.configure({
  webhookUrl: 'https://your-webhook-url',
  onUnhealthy: (status) => {
    // 显示严重错误提示
    showErrorToast('行情服务异常，请稍后重试');
    // 可以切换到备用数据源
    enableFallbackMode();
  },
  onDegraded: (status) => {
    showWarningToast('行情服务响应较慢');
  },
  onRecovered: (status) => {
    showSuccessToast('行情服务已恢复');
    disableFallbackMode();
  }
});

// 启动监控
healthMonitor.startPeriodicCheck(30000); // 每30秒检查
```

### 3. 在 React 应用中集成

```tsx
// App.tsx 或布局组件
import { healthMonitor } from '@/services/healthMonitor';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // 启动健康监控
    healthMonitor.configure({
      onUnhealthy: () => {
        // 显示全局错误提示
      }
    });
    healthMonitor.startPeriodicCheck(60000);
    
    return () => {
      healthMonitor.stopPeriodicCheck();
    };
  }, []);
  
  return <YourApp />;
}
```

## 四、Sentry 集成（可选）

### 1. 安装 Sentry

```bash
npm install @sentry/react @sentry/tracing
```

### 2. 配置 Sentry

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx',
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export default Sentry;
```

### 3. 在 Edge Function 中集成

```typescript
// 在 proxy-market/index.ts 中添加
import * as Sentry from "https://deno.land/x/sentry@7.80.0/index.ts"

Sentry.init({
  dsn: Deno.env.get('SENTRY_DSN'),
  environment: Deno.env.get('SUPABASE_URL')?.includes('prod') ? 'production' : 'development'
})

// 在 catch 块中捕获异常
} catch (error) {
  Sentry.captureException(error)
  // ...
}
```

## 五、监控指标

健康检查返回的指标：

| 指标 | 说明 | 阈值 |
|------|------|------|
| `status` | 整体状态 | healthy/degraded/unhealthy |
| `checks.redis.latency` | Redis 响应时间 | < 100ms 正常 |
| `checks.eastmoney.latency` | 东方财富 API 响应时间 | < 500ms 正常 |
| `checks.edgeFunction.latency` | Edge Function 响应时间 | < 200ms 正常 |

## 六、告警示例

### Slack 告警

```json
{
  "text": "🚨 行情服务健康检查告警",
  "attachments": [{
    "color": "danger",
    "fields": [
      {"title": "Redis", "value": "✅ OK (15ms)", "short": true},
      {"title": "Eastmoney", "value": "❌ Timeout", "short": true},
      {"title": "EdgeFunction", "value": "✅ OK (45ms)", "short": true}
    ]
  }]
}
```

### 企业微信告警

```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "## 🚨 行情服务健康检查告警\n> 状态: **unhealthy**\n> 时间: 2024-03-12T10:00:00Z\n\n> Redis: ✅ OK (15ms)\n> Eastmoney: ❌ Timeout\n> EdgeFunction: ✅ OK (45ms)"
  }
}
```

## 七、故障恢复流程

1. **检测异常**: health-check 检测到服务异常
2. **发送告警**: 通过 Webhook 通知运维人员
3. **自动降级**: 前端切换到缓存数据或备用数据源
4. **问题排查**: 查看 Supabase Edge Function 日志
5. **恢复服务**: 修复问题后，健康检查自动标记为 healthy
6. **通知恢复**: 发送恢复通知，前端切回正常模式
