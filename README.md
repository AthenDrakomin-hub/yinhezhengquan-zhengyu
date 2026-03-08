# 银河证券正裕交易系统

> 工业级虚拟证券交易平台 | 基于 Supabase + Vercel + React + TypeScript

## 🚨 当前状态

⚠️ **系统存在登录问题，需要手动修复**

- 问题描述：profiles 表 RLS 无限递归导致用户无法登录
- 快速修复：👉 **[点击这里查看 3 步快速修复指南](./FIX_RLS_QUICK_START.md)**
- 详细方案：[完整问题诊断与解决方案](./ISSUES_AND_SOLUTIONS.md)
- 📊 **数据库诊断报告**：[查看完整数据库状态](./DATABASE_DIAGNOSIS_REPORT.md)

## 🗄️ 数据库操作

- 📋 **数据重置**：[清空数据并注入种子数据](./DATABASE_RESET_GUIDE.md)
- 📊 **数据库状态**：[查看完整状态报告](./DATABASE_STATUS_FULL_REPORT.md)

---

## ⚠️ 重要声明

本系统为虚拟交易系统，不涉及真实资金，仅用于模拟交易和功能展示。

## 📋 项目概述

正裕交易系统是一个完整的虚拟证券交易平台，支持行情同步、交易下单、撮合成交、清算对账等全流程功能。

### 核心功能

- 🔐 用户认证（登录/注册/权限管理）
- 📊 实时行情数据（新浪财经、东方财富、QVeris API）
- 💰 交易下单（股票、大宗商品、IPO 申购）
- 🎯 涨停板监控（QVeris API 实时监控）
- 📈 市场分析（K线图、技术指标）
- 📋 IPO 管理（新股申购、中签查询）
- 🛡️ 风控合规（交易规则、限制管理）
- 👨‍💼 管理后台（用户管理、数据统计）

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + TypeScript | 19 + 5.7 |
| 构建工具 | Vite | 6.2 |
| 后端服务 | Supabase Edge Functions | Latest |
| 数据库 | Supabase PostgreSQL | Latest |
| 认证服务 | Supabase Auth | Latest |
| 部署平台 | Vercel（前端） + Supabase（后端） | Latest |
| UI 框架 | Tailwind CSS | 4.2 |
| 图表库 | Recharts | 2.12 |

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd yinhezhengquan-zhengyu

# 安装依赖
pnpm install
```

### 2. 环境变量配置

**创建 `.env` 文件：**

```env
# Supabase 核心配置（必需）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://your-project.supabase.co/functions/v1

# Supabase Edge Functions 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
IPO_SYNC_API_KEY=your-ipo-sync-api-key-here
QVERIS_API_KEY=your-qveris-api-key-here

# 安全配置
ADMIN_IP_WHITELIST="103.136.110.139"
```

### 3. 本地开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 4. 构建部署

```bash
# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 📦 项目结构

```
.
├── components/          # React 组件
│   ├── admin/          # 管理后台组件
│   ├── client/         # 客户端功能组件
│   ├── auth/           # 认证组件
│   └── shared/         # 共享组件
├── lib/                # 工具库
│   ├── supabase.ts     # Supabase 客户端
│   └── constants.tsx   # 常量定义
├── routes/             # 路由配置
├── contexts/           # React Context
├── supabase/           # Supabase 配置
│   ├── functions/      # Edge Functions
│   └── migrations/     # 数据库迁移
├── scripts/            # 脚本工具
└── index.tsx           # 应用入口
```

## 🔧 部署指南

### Supabase Edge Functions 部署

```bash
# 安装 Supabase CLI
npm install -g supabase

# 链接项目
supabase link --project-ref your-project-ref

# 部署所有 Edge Functions
supabase functions deploy

# 验证部署状态
supabase functions list
```

### 验证 Edge Functions 部署

部署完成后，访问以下 URL 验证函数是否正常运行：

```
https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/get-market-data
https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/sync-ipo
https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/get-limit-up
https://rfnrosyfeivcbkimjlwo.supabase.co/functions/v1/admin-verify
```

**注意事项**:
- `get-market-data`、`sync-ipo`、`get-limit-up` 等函数需要提供 API Key
- `admin-verify` 需要提供有效的访问令牌
- 部署失败时，请检查 Supabase Dashboard 的函数日志

### Vercel 前端部署

1. 在 Vercel 创建新项目
2. 配置环境变量（见上文）
3. 部署

### Vercel 环境变量（必需）

| 变量名 | 说明 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `VITE_SUPABASE_FUNCTION_URL` | Edge Functions URL |

### Supabase Edge Functions 环境变量（必需）

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 |
| `QVERIS_API_KEY` | QVeris API 密钥（涨停打板功能） |
| `IPO_SYNC_API_KEY` | IPO 同步 API 密钥 |

## 📊 Edge Functions 列表

| 函数名 | 功能 |
|--------|------|
| `get-market-data` | 获取实时行情数据 |
| `sync-ipo` | 同步新股发行数据 |
| `get-limit-up` | 获取涨停股票数据（QVeris API） |
| `fetch-stock-f10` | 获取股票基本面数据 |
| `create-trade-order` | 创建交易订单 |
| `cancel-trade-order` | 取消交易订单 |
| `match-trade-order` | 匹配交易订单 |
| `admin-verify` | 验证管理员权限 |
| `admin-operations` | 管理员操作 |

## 👥 管理员用户设置

### 默认用户账号

系统预置了三个测试账号，请在 Supabase SQL Editor 中执行 `scripts/setup_admin_users.sql` 脚本来设置权限。

#### 1. 系统管理员
- **邮箱**: `admin@yinhe.com`
- **密码**: `Admin123456`（首次登录时设置）
- **权限**: 超级管理员
- **访问范围**: 客户端 + 管理端（所有功能）
- **初始资金**: 1,000,000 元
- **用途**: 系统管理、用户管理、数据统计等

#### 2. 管理员
- **邮箱**: `manager@yinhe.com`
- **密码**: `Manager123456`（首次登录时设置）
- **权限**: 管理员
- **访问范围**: 客户端 + 管理端（部分功能）
- **初始资金**: 500,000 元
- **用途**: 用户管理、订单管理、规则配置等

#### 3. 普通用户
- **邮箱**: `user@yinhe.com`
- **密码**: `User123456`（首次登录时设置）
- **权限**: 普通用户
- **访问范围**: 仅客户端
- **初始资金**: 100,000 元
- **用途**: 模拟交易、行情查看、订单管理等

### 设置步骤

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 执行 `scripts/setup_admin_users.sql` 脚本
4. 验证用户创建结果

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

### 登录流程

1. 访问系统登录页: `https://invest-zy.vercel.app/auth/login`
2. 输入邮箱和密码
3. 系统会自动跳转到客户端首页 (`/client/trade`)
4. 管理员可以手动访问管理端: `https://invest-zy.vercel.app/admin/dashboard`

### 管理员同时登录说明

根据系统设计，管理员账号（超级管理员和管理员）拥有资金账户，可以同时登录客户端和管理端：
- **客户端登录**: 用于模拟交易、查看行情、管理订单等
- **管理端登录**: 用于用户管理、数据统计、系统配置等

## 🎯 核心功能说明

### 1. 用户认证
- 支持邮箱密码登录
- 支持角色权限管理（普通用户、管理员、超级管理员）
- 使用 Supabase Auth 进行认证

### 2. 实时行情
- 数据来源：新浪财经、东方财富、QVeris API
- 支持股票、大宗商品（黄金、白银）
- 支持实时价格更新

### 3. 交易功能
- 支持股票买卖
- 支持大宗交易
- 支持IPO新股申购
- 订单撮合和清算

### 4. 涨停板监控
- 使用 QVeris API 获取实时行情
- 自动判断涨停板股票
- 支持自定义股票列表

### 5. 管理后台
- 用户管理
- 数据统计
- 订单管理
- 系统配置

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
- feat: 新功能
- fix: 修复 bug
- refactor: 重构
- docs: 文档
- chore: 构建/工具

## 🐛 常见问题

### 1. Supabase 连接失败
检查 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否正确配置。

### 2. Edge Functions 调用失败
- 确认 Edge Functions 已部署
- 检查 `VITE_SUPABASE_FUNCTION_URL` 是否正确
- 查看函数日志排查问题

### 3. QVeris API 调用失败
- 确认 `QVERIS_API_KEY` 已在 Supabase Edge Functions 中配置
- 检查 API 密钥是否有效

## 📄 License

MIT

## 👥 联系方式

- 项目地址：[GitHub](https://github.com/your-repo)
- 问题反馈：[Issues](https://github.com/your-repo/issues)
