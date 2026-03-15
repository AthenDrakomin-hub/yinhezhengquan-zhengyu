# PostgREST 部署指南

## 方式一：Docker 部署

```bash
# 1. 创建配置文件
cat > postgrest.conf << 'EOF'
db-uri = "postgres://postgres:password@db:5432/postgres"
db-schema = "public"
db-anon-role = "anon"
db-pool = 10
db-pool-timeout = 10
server-host = "*4"
server-port = 3000
openapi-mode = "follow-privileges"
openapi-url = "/"

# Schema Cache 配置
db-prepared-statements = true
db-tx-end = "commit-allow-rollback"
EOF

# 2. Docker 运行
docker run -d \
  --name postgrest \
  -p 3000:3000 \
  -v $(pwd)/postgrest.conf:/etc/postgrest.conf \
  postgrest/postgrest

# 3. 刷新 Schema Cache（发送 SIGHUP 信号）
docker kill -s SIGHUP postgrest
```

## 方式二：二进制部署

```bash
# 下载
wget https://github.com/PostgREST/postgrest/releases/download/v12.0.0/postgrest-v12.0.0-linux-static-x64.tar.xz
tar xf postgrest-v12.0.0-linux-static-x64.tar.xz
mv postgrest /usr/local/bin/

# 运行
postgrest postgrest.conf &

# 刷新 Schema Cache
kill -SIGHUP $(pgrep postgrest)
```

## 方式三：Supabase Cloud

Supabase 托管的 PostgREST，刷新方法：

### 方法1：Dashboard
1. 打开 https://supabase.com/dashboard
2. 进入项目 → Settings → API
3. 点击 "Reload Schema"

### 方法2：通过 SQL 通知（可能不生效）
```sql
NOTIFY pgrst, 'reload schema';
```

### 方法3：联系 Supabase 支持
如果 Schema Cache 一直不更新，可能是：
- PostgREST 容器状态异常
- 需要重启 API 服务
- 提交工单：https://supabase.com/dashboard/support

## Schema Cache 不更新的常见原因

1. **DDL 变更未通知** - 需要手动触发刷新
2. **PostgREST 版本问题** - 某些版本有 cache bug
3. **数据库连接问题** - PostgREST 无法读取新 schema
4. **Supabase Cloud 特殊限制** - 云环境可能有额外保护

## 临时解决方案

如果 Schema Cache 无法刷新，可以：

1. **使用 RPC 函数**（但函数也需要在 cache 中）
2. **使用 Edge Function** 直接连接数据库
3. **使用 user_metadata** 存储需要的数据
4. **使用 service_role key** 绕过 RLS（仅后端）
