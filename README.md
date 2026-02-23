# 中国银河证券——证裕交易单元 (Nexus)

中国银河证券·证裕交易单元是一个基于 **React 19 + Vite 6** 构建的工业级虚拟证券管理 SPA (Single Page Application)。本项目专为“证裕 Nexus 2026 计划”设计，通过标准 React 入口结构提供极速、稳定且合规的资产管理体验。

## 🚀 技术栈
- **前端核心**: React 19 + TypeScript (ESM) + Vite 6
- **工程结构**: 标准 SPA 架构 (`index.html` + `index.tsx`)
- **样式方案**: Tailwind CSS (金融级铝感工业风设计)
- **后端服务**: Supabase (Auth 认证、PostgreSQL 存储、Realtime 实时订阅)
- **数据来源**: 新浪财经/东方财富公开 API (用于快讯、F10 资料、实时行情)
- **部署平台**: Vercel (静态托管) + Supabase Edge Functions (作为 API 代理)

## 📂 项目结构
```text
├── index.html                 # 唯一的 HTML 入口
├── index.tsx                  # React 应用挂载入口
├── App.tsx                    # 核心业务路由、全局布局与逻辑入口
├── app/                       # 页面级业务组件与路由模块
├── components/                # 业务 UI 组件库 (按模块拆分)
├── services/                  # 数据服务层 (对接 Supabase 与外部财经 API)
├── lib/                       # 工具配置层 (Supabase 客户端、通用工具函数)
├── database/                  # 数据库 Schema 定义 (PostgreSQL 表结构)
├── supabase/                  # Supabase 项目配置 (Edge Functions、迁移脚本)
├── types.ts                   # 全局 TypeScript 类型定义
├── constants.tsx              # 静态常量与业务模拟配置
└── README.md                  # 项目说明文档
```

## 🛠️ 后端管理与通信方案

### 1. 真实数据联通 (Supabase + API)
项目通过 `services/marketService.ts` 抓取真实的市场信息，**不使用 AI 生成数据**：
- **实时快讯**: 对接新浪财经 7x24 小时公开快讯接口，通过前端清洗与情感打分（基于关键词）。
- **F10 分析**: 整合东方财富网公开的个股详情，展示真实的财务报表与股东构成。
- **账户持久化**: 所有的虚拟资产余额、持仓记录均通过 Supabase 实时存储在 PostgreSQL 中。

### 2. 免费轻量化上线方案
- **API 代理**: 针对跨域限制的财经接口，在 `supabase/functions/` 中部署轻量级的 Edge Functions 进行转发。
- **自动激活**: 利用 PostgreSQL 触发器，在用户注册后自动在 `profiles` 表中生成对应的虚拟资金账户。
- **实时推送**: 利用 Supabase Realtime 功能，无需前端轮询即可同步最新的资产变动。

## ☁️ 部署指南

### 第一步：Supabase 环境准备
1. 在 [Supabase](https://supabase.com/) 创建项目。
2. 在 SQL Editor 中执行 `database/schema.sql` 建立表结构。
3. 获取项目的 `URL` 和 `Anon Key`。

### 第二步：Vercel 部署
1. 将项目推送至 GitHub 仓库。
2. 在 Vercel 中导入项目，`Framework Preset` 选择 `Vite`。
3. 在 Vercel 项目的「Environment Variables」中配置核心环境变量（**必须以 VITE_ 开头**）：
   - `VITE_SUPABASE_URL`: 您的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: 您的 Supabase 匿名访问 Key
4. 点击部署，等待构建完成即可访问。

## ⚠️ 合规与免责声明
本项目仅为**虚拟证券交易模拟系统**，所有交易标的、行情数据、资产流水均为模拟环境，不涉及真实资金交易、不构成任何投资建议。
系统仅用于技术学习与证券业务流程演示，不具备真实证券交易的资质与能力，请勿用于任何商业金融场景。