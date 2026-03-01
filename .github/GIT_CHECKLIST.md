# Git 提交检查清单

## ✅ 必须提交

### 核心代码
- components/, services/, lib/, utils/, hooks/
- types.ts, constants.tsx

### 配置文件
- package.json, tsconfig.json, vite.config.ts, vercel.json
- .env.example (示例文件)

### 数据库
- supabase/migrations/, supabase/functions/
- database/schema.sql

### 文档
- README.md, docs/合规类/, docs/运维类/, docs/产品类/

### 静态资源
- public/, index.html

## ❌ 绝对不能提交

### 敏感信息
- .env, .env.local, .env.*.local

### 构建产物
- node_modules/, dist/, .vercel/

### 系统文件
- .DS_Store, Thumbs.db

### 本地文件
- docs/archive/, *.log

## 提交前检查

```bash
git status
git diff --cached
git add .
git commit -m "feat: 描述"
```
