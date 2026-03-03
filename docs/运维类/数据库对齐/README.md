# 银河证券管理系统 - 数据库对齐工具集

## 📋 概述

本工具集提供完整的数据库对齐解决方案，用于验证本地项目与远程Supabase数据库的一致性。

**项目 Ref**: `rfnrosyfeivcbkimjlwo`  
**适用系统**: Windows PowerShell  
**依赖工具**: psql (PostgreSQL 客户端)

---

## 🛠️ 工具清单

### 核心工具

| 脚本名称 | 功能 | 使用场景 |
|---------|------|----------|
| `verify-db-connection.ps1` | 验证数据库连接 | 首次连接、检查凭据 |
| `compare-schema.ps1` | 对比表结构 | 检查缺失表/字段 |
| `check-data-consistency.ps1` | 数据一致性检查 | 验证数据完整性 |
| `check-rls-policies.ps1` | RLS 策略检查 | 安全合规检查 |
| `check-extensions-config.ps1` | 扩展和配置检查 | 验证数据库功能 |
| `generate-db-alignment-report.ps1` | 综合报告生成 | 定期健康检查 |

### 辅助工具

| 文件 | 功能 |
|-----|------|
| `check-db-quick.bat` | 快速检查批处理（一键执行） |
| `PSQL_INSTALL_GUIDE.md` | psql 安装指南 |
| `DATABASE_ALIGNMENT_GUIDE.md` | 详细使用手册 |

---

## 🚀 快速开始

### 方式 1: 使用批处理脚本（最简单）

双击运行或在命令行执行：

```bash
.\scripts\check-db-quick.bat
```

这个脚本会：
1. 自动检测 psql 是否已安装
2. 如果未安装，显示安装指南
3. 如果已安装，执行快速数据库检查

### 方式 2: 使用 PowerShell 脚本

```powershell
# 快速检查
.\scripts\generate-db-alignment-report.ps1 -Quick

# 完整检查并导出报告
.\scripts\generate-db-alignment-report.ps1 -ExportReport

# 详细模式
.\scripts\generate-db-alignment-report.ps1 -Verbose
```

---

## 📥 安装依赖

### 通过Scoop安装psql（推荐）

```powershell
# 1. 安装 Scoop（如果还未安装）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 2. 安装 PostgreSQL
scoop bucket add extras
scoop install postgresql

# 3. 验证安装
psql --version
```

### 其他安装方式

详见 [`PSQL_INSTALL_GUIDE.md`](PSQL_INSTALL_GUIDE.md)

---

## 📊 检查模块详解

### 模块 1: 连接验证

**检查内容**:
- ✅ 数据库连通性
- ✅ PostgreSQL 版本
- ✅ 当前用户和权限
- ✅ SSL 连接状态
- ✅ 字符集编码

**输出示例**:
```
============================================================
Module 1: Connection Verification
============================================================
[OK] Database connection successful
   Database: postgres@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

---

### 模块 2: 表结构对齐

**检查内容**:
- ✅ 远程数据库所有表列表
- ✅ 核心表存在性检查
- ✅ 表字段数量统计
- ✅ 索引和外键约束

**核心表清单**:
- `profiles`, `holdings`, `transactions`, `trades`
- `conditional_orders`, `asset_snapshots`
- `ipos`, `block_trade_products`, `limit_up_stocks`, `fund_flows`
- `admin_operation_logs`, `migrations`

**输出示例**:
```
Core Tables Check:
[OK] profiles exists
     Columns: 9
[OK] holdings exists
     Columns: 13
[FAIL] trades missing
```

---

### 模块 3: RLS 策略检查

**检查内容**:
- ✅ 所有表的 RLS 启用状态
- ✅ RLS 策略数量和分布
- ✅ 核心表策略完整性
- ✅ 孤儿 RLS 检测

**安全要求**:
- 包含用户数据的表必须启用 RLS
- 每个启用 RLS 的表必须有对应的策略
- profiles 表必须有 SELECT 和 UPDATE 策略

**输出示例**:
```
RLS Policy Check:
[INFO] Tables with RLS enabled: 15
[INFO] Total RLS policies: 42
[OK] Profiles table has RLS policies
     Users view own profile
     Users update own profile
```

---

### 模块 4: 数据统计

**检查内容**:
- ✅ 所有表的数据量
- ✅ 核心表记录数
- ✅ 管理员账户验证
- ✅ 孤儿记录和重复记录检测

**输出示例**:
```
Data Statistics:
profiles : 125 rows
holdings : 1,523 rows
trades : 8,942 rows

Admin Accounts Check:
[OK] Found 3 admin accounts
```

---

### 模块 5: 扩展和函数

**检查内容**:
- ✅ 必需扩展（uuid-ossp, pgcrypto）
- ✅ 迁移优化系统函数
- ✅ 触发器和视图
- ✅ 序列和配置参数

**输出示例**:
```
Extensions and Functions:
[OK] uuid-ossp installed
[OK] pgcrypto installed
[OK] Migration functions installed (5 functions)
```

---

## 📁 输出文件

### 报告文件位置

```
database/reports/alignment_report_YYYYMMDD_HHMMSS.txt
```

### 数据导出文件（可选）

```
database/exports/
├── profiles.csv
├── holdings.csv
├── transactions.csv
└── ...
```

### 架构导出文件（可选）

```
database/remote_schema_export.sql
```

---

## 🔧 常见使用场景

### 场景 1: 日常健康检查

```powershell
# 每周执行一次快速检查
.\scripts\generate-db-alignment-report.ps1 -Quick
```

### 场景 2: 部署前后验证

```powershell
# 部署前
.\scripts\generate-db-alignment-report.ps1 -ExportReport

# 部署后
.\scripts\generate-db-alignment-report.ps1 -ExportReport

# 对比两份报告确认变更影响
```

### 场景 3: 排查问题

```powershell
# 1. 检查连接
.\scripts\verify-db-connection.ps1

# 2. 详细检查表结构
.\scripts\compare-schema.ps1 -Detailed -ExportRemote

# 3. 检查 RLS 策略
.\scripts\check-rls-policies.ps1 -Detailed -FixSuggestions

# 4. 导出数据备份
.\scripts\check-data-consistency.ps1 -ExportCSV
```

### 场景 4: 审计合规检查

```powershell
# 执行完整检查并保存报告
.\scripts\generate-db-alignment-report.ps1 -ExportReport -Verbose

# 检查所有安全相关配置
.\scripts\check-rls-policies.ps1 -Detailed
.\scripts\check-extensions-config.ps1 -ListFunctions
```

---

## ⚠️ 注意事项

### 安全警告

1. **保护 .env 文件**
   - 不要提交到 Git
   - 包含数据库凭据

2. **谨慎处理导出的数据**
   - 可能包含敏感用户信息
   - 妥善保存 CSV 文件

3. **使用适当的权限**
   - 避免在生产环境使用超级用户
   - 只在必要时使用 service_role 密钥

### 性能建议

1. **避开交易高峰期**
   - 建议在非交易时间执行（9:30-15:00 除外）
   - 大量查询可能影响数据库性能

2. **使用 Quick 模式**
   - 日常检查使用 `-Quick` 参数
   - 减少不必要的详细查询

3. **限制导出范围**
   - 只导出必要的数据
   - 大表导出时添加 LIMIT

---

## 🔍 故障排查

### 错误：psql not found

**原因**: psql 未安装或不在 PATH 中

**解决**:
```powershell
# 检查 psql 是否安装
where psql

# 如果未找到，安装 PostgreSQL
scoop install postgresql
```

### 错误：Connection refused

**原因**: 网络连接问题或凭据错误

**解决**:
1. 检查 `.env` 文件中的连接字符串
2. 确认网络连接正常
3. 验证 Supabase 项目状态

### 错误：Permission denied

**原因**: 权限不足

**解决**:
1. 使用 service_role 密钥连接
2. 或在 Supabase Dashboard 中使用 SQL Editor

---

## 📖 相关文档

- [`DATABASE_ALIGNMENT_GUIDE.md`](DATABASE_ALIGNMENT_GUIDE.md) - 详细使用指南
- [`PSQL_INSTALL_GUIDE.md`](PSQL_INSTALL_GUIDE.md) - psql 安装指南
- `../supabase/migrations/README.md` - 迁移文件说明
- `../database/schema.sql` - 数据库架构总览

---

## 🆘 获取帮助

### Supabase Dashboard

访问：https://rfnrosyfeivcbkimjlwo.supabase.co

- Database -> Tables: 查看表结构
- Database -> SQL Editor: 执行自定义查询
- Settings -> API: 获取连接信息

### 技术支持

- 查看项目文档
- 联系开发团队
- 参考 Supabase 官方文档：https://supabase.com/docs

---

## 📝 更新日志

### v1.0 - 2026-03-03

**新增功能**:
- ✅ 数据库连接验证脚本
- ✅ 表结构对比脚本
- ✅ 数据一致性检查脚本
- ✅ RLS 策略检查脚本
- ✅ 扩展和配置检查脚本
- ✅ 综合报告生成脚本
- ✅ 批处理快速检查工具
- ✅ 完整的安装和使用文档

**已知问题**:
- 需要手动安装psql
- PowerShell 编码问题（部分中文字符可能显示异常）

---

**最后更新**: 2026-03-03  
**维护者**: 银河证券开发团队  
**版本**: v1.0
