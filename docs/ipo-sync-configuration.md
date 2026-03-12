# IPO 定时同步配置指南

## 问题说明

1. **Edge Function 返回 401**：Supabase Edge Functions 默认需要 JWT 验证
2. **定时任务未配置**：pg_cron 需要在 Supabase Dashboard 中正确配置
3. **视图访问权限**：需要确保视图和函数的访问权限正确

## 解决方案

### 一、关闭 Edge Function JWT 验证

#### 方法 1：通过 Supabase Dashboard（推荐）

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目 → **Edge Functions**
3. 对每个函数点击 **...** → **Settings**
4. 关闭 **Verify JWT** 选项
5. 点击 **Save**

需要关闭 JWT 验证的函数：
- `sync-ipo`
- `sync-stock-data`
- `fetch-galaxy-news`
- `fetch-stock-f10`
- `get-limit-up`
- `get-market-data`
- `phone-location`
- `db-migrate`
- `admin-operations`
- `admin-verify`
- `approve-trade-order`
- `cancel-trade-order`
- `create-trade-order`
- `match-trade-order`

#### 方法 2：通过 Supabase CLI 部署时配置

```bash
# 部署时指定 --no-verify-jwt
supabase functions deploy sync-ipo --no-verify-jwt
```

#### 方法 3：更新 config.toml 后部署

已在 `supabase/config.toml` 中配置：
```toml
[functions]
sync-ipo = { verify_jwt = false }
# ... 其他函数
```

然后运行：
```bash
supabase functions deploy sync-ipo
```

### 二、配置 pg_cron 定时任务

#### 方法 1：通过 Supabase Dashboard

1. 登录 Supabase Dashboard
2. 进入 **Database** → **Cron Jobs**
3. 点击 **Create a new cron job**
4. 配置：
   - **Name**: `ipo-daily-sync`
   - **Schedule**: `0 0 * * *`（每天 UTC 00:00 = 北京时间 08:00）
   - **Command**: 
   ```sql
   SELECT net.http_post(
       url := 'https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo',
       headers := '{"Content-Type": "application/json", "x-api-key": "yinhe-ipo-sync-2024", "x-trigger-source": "scheduled"}'::jsonb,
       body := '{}'::jsonb
   );
   ```

#### 方法 2：通过 SQL（需要 pg_net 扩展）

```sql
-- 确保 pg_net 扩展已启用
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 创建定时任务
SELECT cron.schedule(
    'ipo-daily-sync',
    '0 0 * * *',
    $$
    SELECT net.http_post(
        url := 'https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo',
        headers := '{"Content-Type": "application/json", "x-api-key": "yinhe-ipo-sync-2024"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
```

### 三、外部定时服务（推荐）

如果 Supabase 内部定时任务配置困难，可以使用外部服务：

#### 方案 1：Vercel Cron Jobs

创建 `api/cron/sync-ipo.ts`：
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 验证 Vercel Cron Secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const response = await fetch(
      'https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'yinhe-ipo-sync-2024'
        }
      }
    );
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Sync failed' });
  }
}
```

#### 方案 2：GitHub Actions

创建 `.github/workflows/sync-ipo.yml`：
```yaml
name: Sync IPO Data
on:
  schedule:
    - cron: '0 0 * * *'  # 每天 UTC 00:00
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger IPO Sync
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "x-api-key: yinhe-ipo-sync-2024" \
            "https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo"
```

## 数据库对象状态

已创建的对象：

| 对象类型 | 名称 | 状态 |
|---------|------|------|
| 表 | `ipo_sync_history` | ✅ 已创建 |
| 视图 | `v_ipo_sync_status` | ✅ 已创建 |
| 函数 | `trigger_ipo_sync()` | ✅ 已创建 |

## 查询命令

```sql
-- 查看同步历史
SELECT * FROM v_ipo_sync_status;

-- 查看 IPO 数据
SELECT COUNT(*) FROM ipos;

-- 手动触发同步
SELECT trigger_ipo_sync();

-- 查看定时任务
SELECT * FROM cron.job WHERE jobname = 'ipo-daily-sync';
```

## 手动调用 Edge Function

```bash
# 使用 API Key 调用
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: yinhe-ipo-sync-2024" \
  "https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo"

# 使用 JWT 调用（需要用户登录）
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo"
```

## 下一步操作

1. **立即操作**：在 Supabase Dashboard 中关闭 `sync-ipo` 函数的 JWT 验证
2. **配置定时**：选择上述方案之一配置定时同步
3. **验证同步**：手动调用 Edge Function 确认数据同步正常
