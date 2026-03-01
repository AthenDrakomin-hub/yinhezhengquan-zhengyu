# SQL 文件说明

## 目录结构

```
database/
├── schema.sql              # 完整数据库架构（参考用）
├── *.md                    # 分析报告
└── archive/                # 临时SQL归档（仅本地）

supabase/migrations/        # 数据库迁移（必须提交）
├── 20250327000000_init.sql
├── 20250328000001_add_sms_hook.sql
└── ...
```

## 用途说明

### database/schema.sql
- 完整的数据库架构定义
- 用于参考和文档
- 不用于实际部署

### supabase/migrations/
- 版本化的数据库迁移文件
- 按时间戳顺序执行
- 用于实际部署
- **必须提交到Git**

### database/archive/
- 临时调试SQL
- 历史修复脚本
- **仅本地存储，不提交**

## 部署流程

1. 使用 `supabase/migrations/` 中的迁移文件
2. 按文件名时间戳顺序执行
3. 在 Supabase Dashboard 或 CLI 执行

```bash
# 本地测试
supabase db reset

# 生产部署
# 在 Supabase Dashboard -> SQL Editor 执行
```
