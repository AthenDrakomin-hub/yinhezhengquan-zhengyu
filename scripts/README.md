# 脚本工具集

本目录包含项目开发和管理所需的脚本工具。

## 可用脚本

### 部署脚本

| 脚本 | 说明 |
|------|------|
| `deploy-functions.js` | 部署 Supabase Edge Functions |
| `deploy-all-functions.sh` | 批量部署所有 Edge Functions |
| `deploy-all-functions.bat` | Windows 批量部署脚本 |

### 数据同步脚本

| 脚本 | 说明 |
|------|------|
| `sync-ipo-data.ts` | 同步 IPO 数据到数据库 |

### 开发脚本

| 脚本 | 说明 |
|------|------|
| `upload-models.js` | 上传 AI 模型文件 |
| `add-balance.mjs` | 为用户添加虚拟资金 |

## 使用方法

### 部署 Edge Functions

```bash
# 部署单个函数
node scripts/deploy-functions.js

# 批量部署（Linux/Mac）
bash scripts/deploy-all-functions.sh

# 批量部署（Windows）
scripts\deploy-all-functions.bat
```

### 同步 IPO 数据

```bash
# 需要先配置环境变量
npx tsx scripts/sync-ipo-data.ts
```

## 注意事项

1. 运行脚本前请确保已配置 `.env` 环境变量
2. 部署脚本需要 Supabase CLI 或项目访问权限
3. 数据同步脚本需要数据库写入权限
