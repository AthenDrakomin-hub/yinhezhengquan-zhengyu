# 文档目录

本目录包含项目相关的各类文档，按业务类型分类管理。

## 目录结构

```
docs/
├── 合规类/              # 合规与安全文档
│   ├── compliance-guide.md    # 合规指南
│   ├── emergency-handbook.md  # 应急手册
│   └── audit-standard.md      # 审计标准
│
├── 运维类/              # 运维与部署文档
│   ├── deploy-guide.md        # 部署指南
│   ├── backup-restore.md      # 备份恢复
│   └── monitor-guide.md       # 监控告警
│
├── 产品类/              # 产品与用户文档
│   ├── operation-manual.md    # 运营手册
│   └── user-guide.md          # 用户手册
│
├── 开发类/              # 开发文档
│   ├── DEV_LOG.md             # 开发日志
│   ├── api-doc.md             # API 文档
│   └── test-report.md         # 测试报告
│
├── AUTH_QUICK_REFERENCE.md    # 认证快速参考
├── SUPABASE_AUTH_ARCHITECTURE.md  # Supabase 认证架构
└── README.md                  # 本文档
```

## 文档说明

### 合规类（必须保留）

证券行业监管要求的合规文档，包含数据安全、审计标准、应急预案等。

| 文档 | 说明 | 更新频率 |
|------|------|----------|
| compliance-guide.md | 数据加密、权限控制、合规要求 | 每季度 |
| emergency-handbook.md | 故障处理、数据恢复流程 | 每半年 |
| audit-standard.md | 日志格式、留存要求、审计流程 | 每年 |

### 运维类（必须保留）

系统日常运维所需文档，包含部署、备份、监控等操作指南。

| 文档 | 说明 | 更新频率 |
|------|------|----------|
| deploy-guide.md | Vercel/Supabase 部署流程 | 版本更新时 |
| backup-restore.md | 数据备份与恢复操作 | 每季度 |
| monitor-guide.md | 监控配置与告警规则 | 每月 |

### 产品类（必须保留）

面向运营人员和用户的业务文档。

| 文档 | 说明 | 更新频率 |
|------|------|----------|
| operation-manual.md | 管理后台操作指南 | 功能变更时 |
| user-guide.md | 用户使用手册 | 功能变更时 |

### 开发类（迭代更新）

开发过程中的技术文档。

| 文档 | 说明 |
|------|------|
| DEV_LOG.md | 开发过程记录 |
| api-doc.md | API 接口文档 |
| test-report.md | 测试报告 |

## 相关文档

- [数据库文档](../database/README.md) - 数据库架构和操作指南
- [脚本工具](../scripts/README.md) - 开发和部署脚本说明

---

**维护团队**: 技术开发部  
**最后更新**: 2024-03-07
