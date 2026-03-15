# 撮合引擎快速部署指南

## 🚀 快速开始

本指南将帮助你在 **10 分钟内** 完成撮合引擎的部署。

---

## 📋 部署清单

### 第一步：启用数据库扩展（2分钟）

在 **Supabase Dashboard → SQL Editor** 中执行：

```sql
-- 启用 pg_cron 扩展（定时任务）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 启用 pg_net 扩展（HTTP 请求）
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 验证扩展已启用
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

✅ **预期结果**：返回两行记录

---

### 第二步：执行数据库迁移（3分钟）

在 **SQL Editor** 中**依次**执行以下迁移文件：

#### 2.1 撮合引擎定时任务配置

复制并执行 `supabase/migrations/20250801000000_match_orders_cron.sql` 文件内容。

或者直接执行简化版：

```sql
-- 创建撮合统计视图
CREATE OR REPLACE VIEW match_statistics AS
SELECT
  DATE(started_at) as match_date,
  COUNT(*) as total_batches,
  SUM(total_orders) as total_orders,
  SUM(matched_count) as total_matched,
  SUM(failed_count) as total_failed,
  AVG(duration_ms) as avg_duration_ms
FROM match_logs
WHERE status = 'COMPLETED'
GROUP BY DATE(started_at)
ORDER BY match_date DESC;

-- 创建撮合日志表（如果不存在）
CREATE TABLE IF NOT EXISTS match_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  total_orders INTEGER DEFAULT 0,
  matched_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT
);

-- 创建应用配置表
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2 Realtime 配置

复制并执行 `supabase/migrations/20250802000000_enable_realtime.sql` 文件内容。

或者直接执行简化版：

```sql
-- 为 trades 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trades;

-- 为 trade_executions 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE trade_executions;

-- 创建通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为通知表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
```

✅ **验证**：执行 `SELECT * FROM match_logs LIMIT 1;` 不报错即成功

---

### 第三步：配置环境变量（2分钟）

在 **Supabase Dashboard → Settings → Edge Functions** 中添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PROJECT_URL` | `https://你的项目ID.supabase.co` | Supabase 项目 URL |
| `SERVICE_ROLE_KEY` | `你的服务角色密钥` | 从 Settings → API 获取 |

或在数据库中设置：

```sql
-- 插入配置（替换 YOUR_XXX 为实际值）
INSERT INTO app_config (key, value, description)
VALUES 
  ('project_url', 'https://YOUR_PROJECT_ID.supabase.co', 'Supabase 项目 URL'),
  ('service_role_key', 'YOUR_SERVICE_ROLE_KEY', 'Supabase 服务角色密钥')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

⚠️ **注意**：`SERVICE_ROLE_KEY` 是敏感信息，请妥善保管！

---

### 第四步：部署 Edge Function（2分钟）

#### 方法1：使用 Supabase CLI（推荐）

```bash
# 安装 Supabase CLI（如果未安装）
npm install -g supabase

# 登录
supabase login

# 关联项目
supabase link --project-ref 你的项目ID

# 部署函数
supabase functions deploy match-orders

# 验证部署
supabase functions list
```

#### 方法2：使用 Dashboard 手动部署

1. 打开 **Supabase Dashboard → Edge Functions**
2. 点击 **Create a new function**
3. 输入函数名：`match-orders`
4. 复制 `supabase/functions/match-orders/index.ts` 文件内容
5. 点击 **Deploy**

✅ **验证**：

```bash
curl -X POST \
  https://你的项目ID.supabase.co/functions/v1/match-orders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

### 第五步：配置定时任务（1分钟）

在 **SQL Editor** 中执行：

```sql
-- 每分钟触发撮合（仅在交易时间）
SELECT cron.schedule(
  'match-orders-trading-time',
  '* * * * *',
  $$
  SELECT
    CASE WHEN EXTRACT(DOW FROM CURRENT_DATE) NOT IN (0, 6) THEN
      net.http_post(
        url := current_setting('app.settings.project_url', true) || '/functions/v1/match-orders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      )
    ELSE NULL
    END;
  $$
);

-- 验证定时任务
SELECT jobid, name, schedule FROM cron.job WHERE name LIKE '%match%';
```

✅ **预期结果**：返回定时任务记录

---

## ✅ 验证部署

### 1. 检查扩展

```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

### 2. 检查表

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('match_logs', 'notifications');
```

### 3. 检查 Realtime

```sql
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 4. 手动触发测试

```sql
-- 手动触发撮合
SELECT net.http_post(
  url := 'https://你的项目ID.supabase.co/functions/v1/match-orders',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
  ),
  body := '{}'::jsonb
);

-- 查看结果
SELECT * FROM match_logs ORDER BY started_at DESC LIMIT 1;
```

---

## 🔍 监控与调试

### 查看定时任务状态

```sql
-- 查看所有定时任务
SELECT jobid, name, schedule, active FROM cron.job;

-- 查看任务执行历史
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE name LIKE '%match%')
ORDER BY start_time DESC 
LIMIT 20;
```

### 查看撮合日志

```sql
-- 最近撮合记录
SELECT 
  batch_id,
  status,
  total_orders,
  matched_count,
  failed_count,
  started_at,
  duration_ms
FROM match_logs
ORDER BY started_at DESC
LIMIT 10;

-- 今日统计
SELECT * FROM match_statistics LIMIT 1;
```

### 查看 Edge Function 日志

在 **Dashboard → Edge Functions → match-orders → Logs** 中查看实时日志。

---

## ❌ 常见问题

### 1. 定时任务未执行

**原因**：
- pg_cron 扩展未启用
- 环境变量未配置
- 非交易时间

**解决**：
```sql
-- 检查扩展
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 检查配置
SELECT * FROM app_config;

-- 手动触发测试
SELECT net.http_post(...);
```

### 2. Edge Function 调用失败

**原因**：
- 函数未部署
- 环境变量缺失
- 权限不足

**解决**：
```bash
# 重新部署
supabase functions deploy match-orders

# 检查环境变量
supabase secrets list
```

### 3. Realtime 未推送

**原因**：
- 表未添加到发布
- RLS 策略不正确

**解决**：
```sql
-- 添加表到发布
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_executions;

-- 检查 RLS
SELECT * FROM pg_policies WHERE tablename = 'trades';
```

---

## 📊 下一步

1. **测试撮合流程**：创建订单 → 触发撮合 → 查看结果
2. **集成前端**：在交易页面使用 `useOrderSubscription` Hook
3. **监控面板**：使用 `MatchOrdersMonitor` 组件实时监控
4. **管理页面**：使用 `MatchOrdersAdmin` 组件管理撮合引擎

---

**🎉 恭喜！** 撮合引擎已成功部署！

如有问题，请查看完整文档：`docs/MATCH_ORDERS_DEPLOYMENT.md`
