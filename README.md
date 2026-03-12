# 银河证券正裕交易系统

> 工业级虚拟证券交易平台 | 基于 Supabase + Vercel + React + TypeScript

## ⚠️ 重要声明

本系统为虚拟交易系统，不涉及真实资金，仅用于模拟交易和功能展示。

## 📋 项目概述

正裕交易系统是一个完整的虚拟证券交易平台，支持行情同步、交易下单、撮合成交、清算对账等全流程功能。

### 核心功能

- 🔐 用户认证（登录/注册/权限管理）
- 📊 实时行情数据（新浪财经、东方财富公开 API）
- 💰 交易下单（股票、大宗商品、IPO 申购）
- 🎯 涨停板监控（实时监控）
- 📈 市场分析（K线图、技术指标）
- 📋 IPO 管理（新股申购、中签查询）
- 🛡️ 风控合规（交易规则、限制管理）
- 👨‍💼 管理后台（用户管理、数据统计）

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 19.2 + 5.8 |
| 构建工具 | Vite | 6.4 |
| 包管理器 | npm | Latest |
| 后端服务 | Supabase Edge Functions | Latest |
| 数据库 | Supabase PostgreSQL | Latest |
| 认证服务 | Supabase Auth | Latest |
| 部署平台 | Vercel（前端） + Supabase（后端） | Latest |
| UI 框架 | Tailwind CSS | 4.2 |
| 图表库 | Recharts | 2.12 |
| 路由 | React Router | 7.1 |
| 状态管理 | React Query | 5.90 |

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd yinhezhengquan-zhengyu

# 安装依赖（使用 npm）
npm install
```

### 2. 环境变量配置

**创建 `.env` 文件（本地开发）：**

```env
# Supabase 核心配置（必需）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1

# 行情数据配置
VITE_USE_REAL_MARKET_DATA=true

# Supabase Edge Functions 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 安全配置
ADMIN_IP_WHITELIST="103.136.110.139"
```

> ⚠️ **Vercel 部署注意**：Vercel 不会读取 `.env` 文件，需要在 Vercel Dashboard → Settings → Environment Variables 中手动配置所有 `VITE_*` 变量。

### 3. 本地开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5000
```

### 4. 构建部署

```bash
# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📦 项目结构

```
.
├── components/          # React 组件
│   ├── admin/          # 管理后台组件
│   ├── client/         # 客户端功能组件
│   ├── auth/           # 认证组件
│   ├── landing/        # 首页组件
│   └── core/           # 核心组件（Layout、路由等）
├── lib/                # 工具库
│   ├── supabase.ts     # Supabase 客户端
│   ├── imageConfig.ts  # 图片资源配置（集中管理）
│   ├── imageUtils.ts   # 图片工具函数
│   └── constants.tsx   # 常量定义
├── routes/             # 路由配置
├── contexts/           # React Context
│   └── ThemeContext.tsx # 主题上下文
├── services/           # 业务服务层
├── supabase/           # Supabase 配置
│   ├── functions/      # Edge Functions
│   └── migrations/     # 数据库迁移
├── scripts/            # 脚本工具
├── public/             # 静态资源
│   └── images/         # 本地图片资源
└── index.tsx           # 应用入口
```

## 🔧 部署指南

### Vercel 前端部署

1. 在 Vercel 创建新项目
2. 配置环境变量（见下表）
3. 部署

### Vercel 环境变量（必需）

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `VITE_SUPABASE_FUNCTION_URL` | Edge Functions URL |
| `VITE_USE_REAL_MARKET_DATA` | 启用真实行情数据（true/false） |

### Supabase Edge Functions 部署

```bash
# 安装 Supabase CLI
npm install -g supabase

# 链接项目
supabase link --project-ref your-project-ref

# 部署所有 Edge Functions
supabase functions deploy
```

### Supabase Edge Functions 环境变量（必需）

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 |

## 🖼️ 图片资源配置

所有图片 URL 已迁移到 `lib/imageConfig.ts` 集中管理：

- **Logo**: `imageConfig.logo.fullUrl`
- **Banner**: `imageConfig.banners`
- **服务图标**: `imageConfig.serviceIcons`
- **培训背景**: `imageConfig.training`

图片资源优先从 Supabase Storage 加载，开发环境回退到 `/images` 本地路径。

## 📊 Edge Functions 列表

| 函数名 | 功能 |
|--------|------|
| `get-market-data` | 获取实时行情数据 |
| `sync-ipo` | 同步新股发行数据 |
| `get-limit-up` | 获取涨停股票数据 |
| `fetch-stock-f10` | 获取股票基本面数据 |
| `create-trade-order` | 创建交易订单 |
| `cancel-trade-order` | 取消交易订单 |
| `match-trade-order` | 匹配交易订单 |
| `admin-verify` | 验证管理员权限 |
| `run-sql` | 执行 SQL 语句 |

## 👥 管理员用户设置

### 默认用户账号

系统预置了三个测试账号，请在 Supabase SQL Editor 中执行 `scripts/setup_admin_users.sql` 脚本来设置权限。

| 角色 | 邮箱 | 初始密码 | 初始资金 |
|------|------|----------|----------|
| 超级管理员 | admin@yinhe.com | Admin123456 | 1,000,000 元 |
| 管理员 | manager@yinhe.com | Manager123456 | 500,000 元 |
| 普通用户 | user@yinhe.com | User123456 | 100,000 元 |

### 权限说明

- **超级管理员** (`admin_level = 'super_admin'`):
  - 可访问所有管理功能
  - 可访问客户端进行交易
  - 可管理其他管理员账号

- **管理员** (`admin_level = 'admin'`):
  - 可访问大部分管理功能
  - 可访问客户端进行交易
  - 不可管理超级管理员账号

- **普通用户** (`admin_level = NULL`):
  - 仅可访问客户端
  - 只能进行交易操作
  - 无管理权限

## 🎨 主题系统

系统支持主题切换功能，当前默认为浅色主题：

- **品牌蓝**: `#2563EB`
- **中国红**: `#DC2626`
- **绿色**: `#059669`

所有颜色通过 CSS 变量控制，位于 `index.css` 中定义。

## 🔒 安全说明

- 使用 Row Level Security (RLS) 保护数据库
- Edge Functions 使用 Service Role Key 进行服务端操作
- 前端仅使用 Anon Key 进行客户端操作
- 支持 IP 白名单限制

## 📝 开发规范

### 代码规范
- 使用 ESLint + Prettier
- TypeScript 严格模式
- 组件化开发

### Git 提交规范
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构
- `docs`: 文档
- `chore`: 构建/工具
- `style`: 样式调整

## 🐛 常见问题

### 1. Supabase 连接失败
检查 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确配置。

### 2. Edge Functions 调用失败
- 确认 Edge Functions 已部署
- 检查 `VITE_SUPABASE_FUNCTION_URL` 是否正确
- 查看函数日志排查问题

### 3. 图片加载失败
- 检查 `VITE_SUPABASE_URL` 环境变量是否配置
- 确认 Supabase Storage 中存在对应图片
- 开发环境会回退到本地 `/images` 路径

### 4. Vercel 部署后环境变量无效
- 确保 Vercel Dashboard 中已配置所有 `VITE_*` 变量
- 重新部署以使环境变量生效

## 📄 License

MIT

## 👥 联系方式

- 项目地址：[GitHub](https://github.com/your-repo)
- 问题反馈：[Issues](https://github.com/your-repo/issues)
