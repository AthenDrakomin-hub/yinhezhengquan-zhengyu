# Scripts 脚本目录

本目录包含开发、部署和维护相关的脚本工具。

## 目录结构

```
scripts/
├── db/           # 数据库相关脚本
│   ├── setup_admin_users.sql    # 设置管理员用户
│   ├── setup_storage.sql        # 设置存储桶
│   ├── create_policies.sql      # 创建 RLS 策略
│   └── ...
├── deploy/       # 部署相关脚本
│   ├── deploy-all-functions.sh  # 部署所有 Edge Functions
│   ├── deploy-all-functions.bat # Windows 版本
│   └── ...
├── migrations/   # 数据库迁移文件
│   └── 008_storage_migration.sql
└── tools/        # 工具脚本
    ├── add-balance.mjs      # 为用户添加余额
    ├── find-user.mjs        # 查找用户
    └── ...
```

## 使用说明

### 数据库脚本
在 Supabase SQL Editor 中执行，或使用 Supabase CLI：
```bash
supabase db execute -f scripts/db/setup_admin_users.sql
```

### 部署脚本
```bash
# 部署所有 Edge Functions
bash scripts/deploy/deploy-all-functions.sh
```

### 工具脚本
```bash
# 添加余额
node scripts/tools/add-balance.mjs

# 查找用户
node scripts/tools/find-user.mjs
```

## 注意事项

- `.mjs` 文件需要 Node.js 环境运行
- `.ts` 文件需要使用 `tsx` 或编译后运行
- 部分脚本需要配置环境变量（见 `.env.example`）
