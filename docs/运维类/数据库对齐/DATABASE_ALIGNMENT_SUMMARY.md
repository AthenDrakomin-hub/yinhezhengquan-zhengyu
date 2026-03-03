# 银河证券管理系统 - 数据库对齐工具集

## 🎉 项目完成

已成功创建完整的数据库对齐工具集，用于验证本地项目与远程Supabase数据库的一致性。

**项目 Ref**: `rfnrosyfeivcbkimjlwo`  
**完成日期**: 2026-03-03  
**状态**: ✅ 已交付

---

## 📦 交付内容

### PowerShell 脚本（6 个）

1. **verify-db-connection.ps1** - 数据库连接验证
2. **compare-schema.ps1** - 表结构对比
3. **check-data-consistency.ps1** - 数据一致性检查
4. **check-rls-policies.ps1** - RLS 策略检查
5. **check-extensions-config.ps1** - 扩展和配置检查
6. **generate-db-alignment-report.ps1** - 综合报告生成

### 辅助工具（2 个）

1. **check-db-quick.bat** - 一键快速检查批处理
2. **完整文档集** - 4 份详细使用文档

---

## 🚀 快速开始

### 步骤 1: 安装psql

```powershell
# 通过Scoop安装（推荐）
scoop bucket add extras
scoop install postgresql

# 验证安装
psql --version
```

### 步骤 2: 执行快速检查

```powershell
# 方式 1: 使用批处理（最简单）
.\scripts\check-db-quick.bat

# 方式 2: 使用 PowerShell
.\scripts\generate-db-alignment-report.ps1 -Quick
```

### 步骤 3: 查看报告

完整报告将导出到：
```
database/reports/alignment_report_YYYYMMDD_HHMMSS.txt
```

---

## 📖 详细文档

所有文档位于 `scripts/` 目录：

| 文档 | 说明 |
|-----|------|
| [`README.md`](scripts/README.md) | 工具集总览和使用指南 |
| [`DATABASE_ALIGNMENT_GUIDE.md`](scripts/DATABASE_ALIGNMENT_GUIDE.md) | 详细使用手册 |
| [`PSQL_INSTALL_GUIDE.md`](scripts/PSQL_INSTALL_GUIDE.md) | psql 安装指南 |
| [`DELIVERY_CHECKLIST.md`](scripts/DELIVERY_CHECKLIST.md) | 交付清单 |

---

## 🔍 核心功能

### 1. 连接验证
- ✅ 数据库连通性测试
- ✅ 版本和权限检查
- ✅ SSL 连接验证

### 2. 表结构对齐
- ✅ 12 个核心表检查
- ✅ 字段和索引对比
- ✅ 外键约束验证

### 3. 数据一致性
- ✅ 数据量统计
- ✅ 完整性检查
- ✅ CSV 导出支持

### 4. RLS 策略
- ✅ RLS 启用状态
- ✅ 策略完整性
- ✅ 安全性验证

### 5. 扩展配置
- ✅ 必需扩展检查
- ✅ 函数和触发器
- ✅ 数据库大小统计

### 6. 综合报告
- ✅ 自动化检查流程
- ✅ 问题汇总和建议
- ✅ 可导出报告文件

---

## ⚠️ 重要提示

### 依赖要求

**必须安装**:
- psql (PostgreSQL 客户端) - 版本 12+
- PowerShell 5.1+

**安装命令**:
```powershell
scoop install postgresql
```

### 安全警告

1. **保护 .env 文件** - 包含数据库凭据，不要提交到 Git
2. **谨慎处理导出数据** - 可能包含敏感用户信息
3. **使用适当权限** - 避免滥用超级用户权限

---

## 📊 使用场景

### 日常健康检查
```powershell
.\scripts\generate-db-alignment-report.ps1 -Quick
```

### 部署前后验证
```powershell
# 部署前
.\scripts\generate-db-alignment-report.ps1 -ExportReport

# 部署后
.\scripts\generate-db-alignment-report.ps1 -ExportReport
```

### 排查问题
```powershell
.\scripts\verify-db-connection.ps1
.\scripts\compare-schema.ps1 -Detailed
.\scripts\check-rls-policies.ps1 -FixSuggestions
```

### 审计合规
```powershell
.\scripts\generate-db-alignment-report.ps1 -Verbose -ExportReport
.\scripts\check-rls-policies.ps1 -Detailed
.\scripts\check-extensions-config.ps1 -ListFunctions
```

---

## 🆘 故障排查

### 错误：psql not found

**原因**: psql 未安装或不在 PATH 中

**解决**:
```powershell
# 安装 PostgreSQL
scoop install postgresql

# 或查看安装指南
notepad .\scripts\PSQL_INSTALL_GUIDE.md
```

### 错误：Connection refused

**原因**: 网络连接问题或凭据错误

**解决**:
1. 检查 `.env` 文件中的连接字符串
2. 确认网络连接正常
3. 验证 Supabase 项目状态

### 更多帮助

详见 [`scripts/PSQL_INSTALL_GUIDE.md`](scripts/PSQL_INSTALL_GUIDE.md)

---

## 📈 代码统计

- **PowerShell 脚本**: 6 个，共 1,516 行代码
- **批处理脚本**: 1 个，73 行
- **文档**: 4 个，约 10,000+ 字
- **覆盖模块**: 5 大核心模块

---

## 🎯 核心表清单

工具集重点检查以下 12 个核心表：

1. `profiles` - 用户资料
2. `holdings` - 证券持仓
3. `transactions` - 交易流水
4. `trades` - 交易订单
5. `conditional_orders` - 条件单
6. `asset_snapshots` - 资产快照
7. `ipos` - 新股申购
8. `block_trade_products` - 大宗交易产品
9. `limit_up_stocks` - 涨停股票
10. `fund_flows` - 资金流水
11. `admin_operation_logs` - 操作日志
12. `migrations` - 迁移版本控制

---

## 🔗 相关资源

### 项目内部

- [`scripts/README.md`](scripts/README.md) - 完整使用指南
- `supabase/migrations/README.md` - 迁移文件说明
- `database/schema.sql` - 数据库架构

### 外部资源

- [Supabase Dashboard](https://rfnrosyfeivcbkimjlwo.supabase.co)
- [Supabase 文档](https://supabase.com/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

---

## 📝 下一步行动

1. **安装psql**
   ```powershell
   scoop install postgresql
   ```

2. **验证安装**
   ```powershell
   psql --version
   ```

3. **执行第一次检查**
   ```powershell
   .\scripts\check-db-quick.bat
   ```

4. **查看详细报告**
   ```powershell
   .\scripts\generate-db-alignment-report.ps1 -ExportReport
   ```

---

## ✨ 项目亮点

- ✅ **自动化**: 一键执行完整检查流程
- ✅ **模块化**: 6 个独立脚本，职责清晰
- ✅ **文档完善**: 4 份详细文档，易于上手
- ✅ **用户友好**: 彩色输出，清晰提示
- ✅ **金融级安全**: RLS 重点检查，合规支持

---

## 📞 技术支持

如有问题，请：

1. 查阅 `scripts/` 目录下的文档
2. 查看 Supabase Dashboard
3. 联系银河证券开发团队

---

**最后更新**: 2026-03-03  
**版本**: v1.0  
**维护者**: 银河证券开发团队

---

## 📋 交付确认

- ✅ 所有脚本已创建并测试（语法）
- ✅ 所有文档已完成
- ✅ 使用说明清晰完整
- ✅ 故障排查指南详尽
- ⏳ 等待 psql 安装后即可执行实际检查

**交付状态**: ✅ 完成（待 psql 安装后执行）
