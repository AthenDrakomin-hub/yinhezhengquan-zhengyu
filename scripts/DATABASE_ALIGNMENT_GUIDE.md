# 银河证券管理系统 - 数据库对齐工具使用指南

## 📋 概述

本套工具用于验证和对齐本地项目与远程Supabase数据库的一致性，确保数据库结构、数据、权限配置符合项目设计要求。

## 🛠️ 工具清单

### 1. verify-db-connection.ps1
**功能**: 验证数据库连接和基本配置  
**使用场景**: 
- 首次连接远程数据库
- 检查连接字符串是否有效
- 验证数据库版本和用户权限

```powershell
# 基本使用
.\scripts\verify-db-connection.ps1
```

**输出内容**:
- ✅ 数据库连接状态
- ✅ PostgreSQL 版本信息
- ✅ 当前用户和权限
- ✅ SSL 连接状态
- ✅ 字符集编码

---

### 2. compare-schema.ps1
**功能**: 对比本地迁移文件与远程数据库的表结构  
**使用场景**:
- 检查表是否缺失
- 对比字段定义
- 查看索引和约束

```powershell
# 基本使用
.\scripts\compare-schema.ps1

# 导出远程架构到文件
.\scripts\compare-schema.ps1 -ExportRemote

# 显示详细的表结构信息
.\scripts\compare-schema.ps1 -Detailed
```

**输出内容**:
- ✅ 远程数据库所有表列表
- ✅ 核心表存在性检查
- ✅ 表字段数量统计
- ✅ 索引和外键约束信息

---

### 3. check-data-consistency.ps1
**功能**: 检查数据量和关键数据记录  
**使用场景**:
- 统计数据量
- 检查管理员账户
- 验证数据完整性
- 导出数据备份

```powershell
# 基本使用
.\scripts\check-data-consistency.ps1

# 导出数据到 CSV 文件
.\scripts\check-data-consistency.ps1 -ExportCSV

# 检查所有表（不仅限于核心表）
.\scripts\check-data-consistency.ps1 -CheckAll
```

**输出内容**:
- ✅ 所有表的数据量统计
- ✅ 核心表数据统计
- ✅ 管理员账户列表
- ✅ 最新交易记录
- ✅ 孤儿记录和重复记录检查
- ✅ CSV 导出（可选）

---

### 4. check-rls-policies.ps1
**功能**: 检查行级安全策略 (RLS) 配置  
**使用场景**:
- 验证 RLS 是否启用
- 检查策略完整性
- 发现安全风险

```powershell
# 基本使用
.\scripts\check-rls-policies.ps1

# 显示详细的策略定义
.\scripts\check-rls-policies.ps1 -Detailed

# 提供修复建议
.\scripts\check-rls-policies.ps1 -FixSuggestions
```

**输出内容**:
- ✅ 所有表的 RLS 启用状态
- ✅ RLS 策略详情
- ✅ 核心表策略完整性检查
- ✅ 孤儿 RLS 检测（启用了 RLS 但没有策略）
- ✅ 修复建议（可选）

---

### 5. check-extensions-config.ps1
**功能**: 检查数据库扩展、函数、触发器配置  
**使用场景**:
- 验证必需扩展是否安装
- 检查自定义函数
- 查看触发器和视图

```powershell
# 基本使用
.\scripts\check-extensions-config.ps1

# 显示详细信息
.\scripts\check-extensions-config.ps1 -Detailed

# 列出所有自定义函数
.\scripts\check-extensions-config.ps1 -ListFunctions
```

**输出内容**:
- ✅ 已安装的数据库扩展
- ✅ Supabase 常用扩展检查
- ✅ 迁移优化系统函数验证
- ✅ 触发器和视图列表
- ✅ 序列和配置参数
- ✅ 数据库大小统计

---

### 6. generate-db-alignment-report.ps1
**功能**: 执行完整对齐检查并生成综合报告  
**使用场景**:
- 定期健康检查
- 部署前验证
- 审计合规检查

```powershell
# 基本使用
.\scripts\generate-db-alignment-report.ps1

# 快速检查（只检查关键项）
.\scripts\generate-db-alignment-report.ps1 -Quick

# 导出报告到文件
.\scripts\generate-db-alignment-report.ps1 -ExportReport

# 详细输出模式
.\scripts\generate-db-alignment-report.ps1 -Verbose
```

**输出内容**:
- ✅ 连接验证结果
- ✅ 表结构对齐情况
- ✅ RLS 策略检查
- ✅ 数据统计
- ✅ 扩展和函数验证
- ✅ 问题汇总和建议
- ✅ 可导出为文本文件

---

## 🚀 快速开始

### 推荐执行顺序

```powershell
# 1. 验证连接
.\scripts\verify-db-connection.ps1

# 2. 生成综合报告
.\scripts\generate-db-alignment-report.ps1

# 3. 根据报告结果，执行详细检查
.\scripts\compare-schema.ps1 -Detailed
.\scripts\check-rls-policies.ps1 -FixSuggestions
.\scripts\check-data-consistency.ps1 -ExportCSV

# 4. 检查扩展配置
.\scripts\check-extensions-config.ps1 -ListFunctions
```

---

## 📊 核心表清单

以下表是银河证券管理系统的核心表，对齐工具会重点检查：

### 用户相关
- `profiles` - 用户资料
- `holdings` - 证券持仓
- `transactions` - 交易流水
- `asset_snapshots` - 资产快照

### 交易相关
- `trades` - 交易订单
- `conditional_orders` - 条件单
- `positions` - 持仓（优化版）

### 市场数据
- `ipos` - 新股申购
- `block_trade_products` - 大宗交易产品
- `limit_up_stocks` - 涨停股票
- `fund_flows` - 资金流水

### 管理相关
- `admin_operation_logs` - 操作日志
- `migrations` - 迁移版本控制

---

## 🔧 常见问题处理

### 问题 1: 连接失败
**错误**: `psql : psql: error: connection refused`

**解决方案**:
1. 检查 `.env` 文件中的 `DATABASE_URL_NON_POOLING` 是否正确
2. 确认网络连接正常
3. 验证 Supabase 项目状态

### 问题 2: 权限不足
**错误**: `ERROR: permission denied for table xxx`

**解决方案**:
1. 使用 service_role 密钥或 postgres 用户连接
2. 检查 RLS 策略是否过于严格
3. 考虑使用超级用户权限执行检查

### 问题 3: 表不存在
**错误**: `relation "xxx" does not exist`

**解决方案**:
1. 查看 `compare-schema.ps1` 的输出，确认缺失的表
2. 执行对应的迁移文件创建表
3. 参考 `supabase/migrations/README.md` 了解迁移顺序

### 问题 4: SSL 连接问题
**错误**: `SSL connection required but not configured`

**解决方案**:
脚本已自动处理 SSL 配置，如果仍有问题，检查连接字符串中的 `sslmode` 参数

---

## 📁 输出文件位置

某些脚本会生成输出文件：

- **架构导出**: `database/remote_schema_export.sql`
- **数据导出**: `database/exports/*.csv`
- **对齐报告**: `database/reports/alignment_report_YYYYMMDD_HHMMSS.txt`

---

## ⚠️ 注意事项

### 安全警告
1. **不要提交 .env 文件到 Git** - 包含敏感凭据
2. **谨慎处理导出的数据** - 可能包含用户敏感信息
3. **使用适当的权限级别** - 避免使用不必要的超级用户权限

### 性能建议
1. **避开交易高峰期** - 建议在非交易时间执行大量查询
2. **使用 -Quick 参数** - 快速检查减少数据库负载
3. **限制导出范围** - 只导出必要的数据

### 最佳实践
1. **定期执行健康检查** - 建议每周至少一次
2. **部署前后都进行检查** - 确保变更没有破坏数据库
3. **保存历史报告** - 用于趋势分析和问题追踪

---

## 📖 相关文档

- `supabase/migrations/README.md` - 迁移文件说明
- `database/schema.sql` - 数据库架构总览
- `.env.example` - 环境变量配置示例

---

## 🆘 获取帮助

如果遇到脚本无法解决的问题：

1. 查看详细错误信息
2. 检查 PowerShell 版本（建议 7.0+）
3. 确认 psql 版本（建议 12+）
4. 参考 Supabase 官方文档

---

**最后更新**: 2026-03-03  
**维护者**: 银河证券开发团队
