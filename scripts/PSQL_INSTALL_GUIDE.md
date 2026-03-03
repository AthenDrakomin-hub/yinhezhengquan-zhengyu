# 银河证券管理系统 - psql 安装和数据库对齐工具使用指南

## ⚠️ 重要提示

当前系统未检测到 `psql` 命令，需要先安装 PostgreSQL 客户端工具。

---

## 📥 方案一：通过Scoop安装psql（推荐）

### 1. 检查 Scoop 是否已安装

```powershell
scoop --version
```

如果看到版本号，说明 Scoop 已安装。

### 2. 安装 PostgreSQL 客户端

```powershell
# 添加 extras bucket
scoop bucket add extras

# 安装 PostgreSQL（包含 psql）
scoop install postgresql
```

### 3. 验证安装

```powershell
psql --version
```

应该显示类似：`psql (PostgreSQL) 18.x.x`

### 4. 如果 Scoop安装失败

可能是网络问题，尝试使用国内镜像或手动下载安装包。

---

## 📥 方案二：从 PostgreSQL 官网下载

### 1. 下载 PostgreSQL

访问：https://www.postgresql.org/download/windows/

下载并安装最新版本的 PostgreSQL。

### 2. 添加到 PATH

安装完成后，将 PostgreSQL 的 bin 目录添加到系统 PATH：

```
C:\Program Files\PostgreSQL\18\bin
```

### 3. 验证安装

打开新的 PowerShell 窗口：

```powershell
psql --version
```

---

## 📥 方案三：使用 Supabase CLI（替代方案）

如果不想安装完整的 PostgreSQL，可以使用 Supabase CLI：

### 1. 安装 Supabase CLI

```powershell
# 通过Scoop安装
scoop install supabase

# 或通过 npm 安装
npm install -g supabase
```

### 2. 登录 Supabase

```powershell
supabase login
```

### 3. 链接项目

```powershell
supabase link --project-ref rfnrosyfeivcbkimjlwo
```

### 4. 执行 SQL 查询

```powershell
supabase db execute --file script.sql
```

---

## 🔧 使用数据库对齐工具

安装psql 后，可以按以下顺序执行检查：

### 快速检查（推荐首次使用）

```powershell
# 在项目根目录执行
.\scripts\generate-db-alignment-report.ps1 -Quick
```

### 完整检查

```powershell
.\scripts\generate-db-alignment-report.ps1 -ExportReport
```

这将在 `database/reports/` 目录下生成详细报告。

### 单独检查模块

```powershell
# 1. 验证连接
.\scripts\verify-db-connection.ps1

# 2. 对比表结构
.\scripts\compare-schema.ps1 -Detailed

# 3. 检查数据一致性
.\scripts\check-data-consistency.ps1

# 4. 检查 RLS 策略
.\scripts\check-rls-policies.ps1 -FixSuggestions

# 5. 检查扩展配置
.\scripts\check-extensions-config.ps1 -ListFunctions
```

---

## 🎯 直接通过 SQL 查询执行检查

如果无法安装psql，可以直接在 Supabase Dashboard 中执行 SQL 查询进行检查。

### 1. 连接验证

```sql
-- 检查数据库版本
SELECT version();

-- 检查当前用户和数据库
SELECT current_database() AS database, current_user() AS user_name;
```

### 2. 表结构检查

```sql
-- 列出所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 检查核心表是否存在
WITH core_tables AS (
  SELECT unnest(ARRAY[
    'profiles', 'holdings', 'transactions', 'trades', 'conditional_orders',
    'asset_snapshots', 'ipos', 'block_trade_products', 'limit_up_stocks',
    'fund_flows', 'admin_operation_logs', 'migrations'
  ]) AS table_name
)
SELECT 
  ct.table_name,
  CASE WHEN ist.table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM core_tables ct
LEFT JOIN information_schema.tables ist 
  ON ct.table_name = ist.table_name AND ist.table_schema = 'public';
```

### 3. 数据统计

```sql
-- 统计所有表的行数
SELECT 
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 检查管理员账户
SELECT id, email, username, role, status, created_at
FROM profiles
WHERE role LIKE '%admin%'
ORDER BY created_at DESC;
```

### 4. RLS 策略检查

```sql
-- 检查 RLS 启用状态
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 查看所有 RLS 策略
SELECT 
  tablename,
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 5. 扩展检查

```sql
-- 查看已安装的扩展
SELECT 
  extname AS extension_name,
  extversion AS version,
  nspname AS schema_name
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
ORDER BY extname;

-- 检查必需扩展
SELECT 
  extname,
  CASE WHEN extname IN ('uuid-ossp', 'pgcrypto') THEN 'REQUIRED' ELSE 'OPTIONAL' END AS priority
FROM pg_extension
WHERE extnamespace = 'public'::regnamespace;
```

---

## 📊 检查清单

完成所有检查后，应该确认以下项目：

### ✅ 连接和基础配置
- [ ] 数据库连接成功
- [ ] PostgreSQL 版本 >= 15
- [ ] SSL 连接已启用
- [ ] 字符集为 UTF8

### ✅ 表结构
- [ ] 所有核心表存在
- [ ] 表字段数量符合预期
- [ ] 索引已创建
- [ ] 外键约束正确

### ✅ 数据安全
- [ ] 所有敏感表启用了 RLS
- [ ] RLS 策略完整且有效
- [ ] 没有孤儿 RLS 配置

### ✅ 数据完整性
- [ ] 关键表有数据记录
- [ ] 管理员账户存在
- [ ] 没有孤儿记录
- [ ] 没有重复数据

### ✅ 扩展和函数
- [ ] uuid-ossp 已安装
- [ ] pgcrypto 已安装
- [ ] 迁移系统函数可用
- [ ] 触发器正常工作

---

## 🔧 常见问题解决

### 问题 1: Scoop安装失败

**症状**: `scoop : 无法将"scoop"项识别为...`

**解决**:
```powershell
# 先安装 Scoop
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

### 问题 2: psql 不在 PATH 中

**症状**: `psql : 无法将"psql"项识别为...`

**解决**:
```powershell
# 找到 psql 安装位置
Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue

# 临时添加到 PATH
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# 永久添加需要修改系统环境变量
```

### 问题 3: 连接超时

**症状**: 连接数据库时超时

**解决**:
- 检查网络连接
- 确认防火墙允许出站连接到 Supabase
- 尝试使用直连模式而非连接池模式

### 问题 4: 权限不足

**症状**: `permission denied for table xxx`

**解决**:
- 使用 service_role 密钥连接
- 或在 Supabase Dashboard 中使用 SQL Editor 执行查询

---

## 📝 下一步

安装psql 后，执行以下步骤：

1. **验证安装**
   ```powershell
   psql --version
   ```

2. **运行快速检查**
   ```powershell
   .\scripts\generate-db-alignment-report.ps1 -Quick
   ```

3. **查看详细报告**
   ```powershell
   .\scripts\generate-db-alignment-report.ps1 -ExportReport
   ```

4. **根据报告修复问题**
   - 如果有缺失的表，执行对应的迁移文件
   - 如果 RLS 策略不完整，运行 RLS 修复脚本
   - 重新运行检查验证修复结果

---

## 📖 相关文档

- `DATABASE_ALIGNMENT_GUIDE.md` - 详细工具使用指南
- `../supabase/migrations/README.md` - 迁移文件说明
- `../database/schema.sql` - 数据库架构总览

---

**最后更新**: 2026-03-03  
**维护者**: 银河证券开发团队
