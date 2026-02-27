# 银河证券管理系统 - 证裕交易单元

中国银河证券·证裕交易单元是一个基于 React 19 + Vite 6 构建的工业级虚拟证券管理 SPA（单页应用），专为"证裕 Nexus 2026 计划"设计。项目通过标准 React 入口结构提供极速、稳定且合规的资产管理体验，是一个完整的虚拟证券交易模拟系统，不涉及真实资金交易。

## ✨ 核心功能特性

### 🏦 虚拟证券交易系统
- **完整交易流程**：支持买入/卖出操作，包含价格校验、订单提交、撮合处理
- **资产管理**：用户虚拟资产账户管理，包含总资产、可用余额、冻结余额等
- **持仓管理**：实时持仓查看，支持多市场（A股、港股）持仓展示
- **交易记录**：完整的交易历史记录，包含状态跟踪（成功/撮合中/处理中）

### 📊 实时市场数据与资讯
- **行情数据**：对接新浪财经/东方财富公开API，获取实时股票行情
- **新闻快讯**：7x24小时实时财经新闻，支持情感分析（正面/负面/中性）
- **F10资料**：个股详情展示，包含财务报表、股东构成等基本信息

### 🤖 智能交易辅助功能
- **条件单系统**：支持止盈止损（TP/SL）、网格交易等智能条件单
- **交易规则引擎**：可配置的交易规则（IPO、大宗交易、衍生品、涨跌停限制）
- **风险控制**：实时合规提示、流动性风险预警

### 👥 用户管理与权限控制
- **多角色系统**：普通用户与管理员角色分离
- **完整认证流程**：基于Supabase Auth的用户注册/登录/会话管理
- **管理员后台**：用户管理、交易管理、规则配置、撮合干预等
- **实时聊天系统**：用户与管理员实时沟通，工单管理

### 📚 投资教育与合规
- **投教中心**：投资知识学习模块
- **合规盾牌**：合规风险提示与教育
- **研究报告**：专业研报展示（银河观点）
- **投资日历**：重要事件提醒

## 🛠️ 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **构建工具**: Vite 6（ESM模块系统）
- **样式**: Tailwind CSS 4.2（金融级铝感工业风设计）
- **状态管理**: React Hooks + Context API
- **路由**: React Router 7.1.5
- **图表**: Recharts 2.12.7（数据可视化）
- **动画**: Framer Motion 12.34.3
- **表单**: React Hook Form + Zod验证
- **图标**: Lucide React

### 后端与数据层
- **BaaS平台**: Supabase（PostgreSQL数据库 + Auth认证 + Realtime订阅）
- **API代理**: Supabase Edge Functions（解决财经API跨域限制）
- **数据源**: 新浪财经/东方财富公开API
- **AI能力**: face-api.js（人脸识别）、tesseract.js（OCR）

### 部署
- **前端部署**: Vercel（静态托管，自动CI/CD）
- **后端部署**: Supabase（全托管PostgreSQL + Edge Functions）

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- Supabase 账户（用于后端服务）

### 安装与运行
```bash
# 克隆项目
git clone <repository-url>
cd yinhezhengquan-zhengyu

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的 Supabase 配置

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 环境变量配置
在 `.env` 文件中配置以下变量：
```env
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 数据库连接（可选）
VITE_POSTGRES_URL=your_postgres_connection_string
```

### 数据库初始化
1. 在 Supabase Dashboard 中创建新项目
2. 运行数据库迁移：
```bash
# 应用现有迁移文件
cd supabase
supabase db reset
```
或手动在 Supabase SQL Editor 中运行 `supabase/migrations/` 目录下的 SQL 文件。

## 📁 项目结构

```
yinhezhengquan-zhengyu/
├── 📄 根目录核心文件
│   ├── .env.example                # 环境变量示例（含Supabase、行情接口、风控密钥）
│   ├── .gitignore                  # Git忽略规则（敏感配置、node_modules、构建产物）
│   ├── App.tsx                     # React根组件（路由入口、全局状态注入）
│   ├── constants.tsx               # 全局常量（行情接口地址、风控阈值、角色枚举）
│   ├── DEV_LOG.md                  # 开发日志（迭代记录、问题修复、需求变更）
│   ├── fetch-ipo-metadata.json     # IPO元数据缓存（新浪/交易所数据源映射）
│   ├── FIX_SUMMARY.md              # 问题修复汇总（BUG编号、原因、解决方案）
│   ├── index.css                   # 全局样式（重置样式、主题变量、通用布局）
│   ├── index.html                  # HTML入口（Vite模板、根节点、CDN引入）
│   ├── index.tsx                   # 应用入口（ReactDOM渲染、全局ErrorBoundary）
│   ├── metadata.json               # 系统元数据（版本号、构建时间、功能开关）
│   ├── middleware.ts               # Vercel/Node中间件（权限校验、接口代理、跨域处理）
│   ├── package-lock.json           # 依赖锁文件（确保环境一致性）
│   ├── package.json                # 项目配置（依赖、脚本、ESLint/TS配置）
│   ├── PROJECT_HANDOVER_REPORT.md  # 项目交接报告（架构说明、部署流程、维护要点）
│   ├── README.md                   # 项目总览（功能说明、启动方式、目录结构）
│   ├── README_MIDDLEWARE.md        # 中间件文档（路由规则、鉴权逻辑、异常处理）
│   ├── SMS_HOOK_SETUP_GUIDE.md     # 短信钩子配置指南（风控告警、交易验证码）
│   ├── tsconfig.json               # TypeScript配置（类型检查、路径别名、编译目标）
│   ├── types.ts                    # 全局类型定义（交易订单、用户信息、行情数据）
│   ├── vercel.json                 # Vercel部署配置（路由重写、环境变量、构建命令）
│   └── vite.config.ts              # Vite构建配置（插件、代理、环境变量、打包优化）
│
├── 📁 components/ (React组件层)
│   ├── 🌐 业务核心组件
│   │   ├── AboutInvestZYView.tsx   # 郑裕投资介绍页
│   │   ├── AssetAnalysisView.tsx   # 资产分析视图（持仓、收益、风险评级）
│   │   ├── BannerDetailView.tsx    # 公告横幅详情（系统通知、行情预警）
│   │   ├── BlockTradeView.tsx      # 大宗交易视图（机构交易、撮合记录）
│   │   ├── ChatView.tsx            # 智能客服/投顾聊天界面
│   │   ├── ComplianceCenter.tsx    # 合规中心（风控规则、违规记录、预警）
│   │   ├── ComplianceShieldView.tsx # 合规防护视图（交易权限、操作审计）
│   │   ├── ConditionalOrderPanel.tsx # 条件单面板（止盈止损、价格触发）
│   │   ├── Dashboard.tsx           # 核心仪表盘（总览、待办、行情快照）
│   │   ├── EducationBaseView.tsx   # 投资者教育基础页（知识科普、风险提示）
│   │   ├── EducationCenter.tsx     # 教育中心（课程、考试、合规培训）
│   │   ├── InteractiveChart.tsx    # 交互式行情图表（K线、指标、交易标记）
│   │   ├── InvestmentCalendarView.tsx # 投资日历（新股、财报、政策事件）
│   │   ├── IPOView.tsx             # IPO申购视图（新股列表、申购入口、中签查询）
│   │   ├── LandingView.tsx         # 系统登录后首页（快捷入口、行情概览）
│   │   ├── Layout.tsx              # 全局布局（侧边栏、头部、权限路由）
│   │   ├── LimitUpPanel.tsx        # 涨停板面板（涨停个股、封单、异动分析）
│   │   ├── LoginView.tsx           # 登录视图（账号密码、短信验证、人脸核验）
│   │   ├── MarketView.tsx          # 行情中心（沪深、港股、美股、基金）
│   │   ├── PersonalizedSettingsView.tsx # 个性化设置（行情提醒、界面布局）
│   │   ├── ProfileDetailView.tsx   # 用户档案详情（基本信息、风险测评）
│   │   ├── ProfileOverview.tsx     # 档案总览（资产、交易、合规状态）
│   │   ├── ProfileView.tsx         # 用户档案主视图
│   │   ├── QuickOpenView.tsx       # 快速开户视图（实名认证、风险告知）
│   │   ├── ResearchReportsView.tsx # 研报中心（机构研报、评级、盈利预测）
│   │   ├── SecurityCenterView.tsx  # 安全中心（密码、密保、登录设备）
│   │   ├── ServiceCenter.tsx       # 服务中心（工单、帮助、反馈）
│   │   ├── SettingsOverview.tsx    # 设置总览（账户、交易、通知）
│   │   ├── SettingsView.tsx        # 系统设置主视图
│   │   ├── StockDetailView.tsx     # 个股详情（行情、财务、资讯、交易）
│   │   ├── StockIcon.tsx           # 股票图标组件（涨跌幅、市场标识）
│   │   ├── SupabaseConnectionCheck.tsx # Supabase连接状态检测
│   │   ├── TradePanel.tsx          # 交易面板（买入、卖出、撤单、委托）
│   │   ├── TradingPreferencesView.tsx # 交易偏好设置（佣金、下单方式）
│   │   └── TransactionHistory.tsx  # 交易历史（委托、成交、流水）
│   │
│   ├── 🛠️ admin/ (管理后台组件)
│   │   ├── AdminBanners.tsx        # 公告横幅管理（新增、编辑、上下线）
│   │   ├── AdminCalendar.tsx       # 投资日历管理（事件录入、审核）
│   │   ├── AdminDashboard.tsx      # 管理员仪表盘（系统数据、风控告警）
│   │   ├── AdminDerivatives.tsx    # 衍生品管理（期权、期货合约配置）
│   │   ├── AdminEducation.tsx      # 投资者教育内容管理
│   │   ├── AdminIntegrationPanel.tsx # 第三方集成面板（行情接口、支付、短信）
│   │   ├── AdminIPOs.tsx           # IPO数据管理（新股录入、申购规则）
│   │   ├── AdminLayout.tsx         # 管理后台布局（权限菜单、操作日志）
│   │   ├── AdminMatchIntervention.tsx # 交易撮合干预（异常订单处理）
│   │   ├── AdminReports.tsx        # 报表管理（交易、合规、用户数据）
│   │   ├── AdminRuleManagement.tsx # 风控规则管理（阈值、触发条件）
│   │   ├── AdminTicketDetail.tsx   # 工单详情（处理、回复、结案）
│   │   ├── AdminTickets.tsx        # 工单管理（列表、筛选、分配）
│   │   └── AdminTradeManagement.tsx # 交易管理（订单审核、冻结、解冻）
│   │
│   └── 🧩 common/ (公共组件)
│       └── ErrorBoundary.tsx       # 全局错误边界（组件崩溃兜底、上报）
│
├── 📁 database/ (数据库架构)
│   └── schema.sql                  # 完整数据库架构（表结构、索引、约束、权限）
│
├── 📁 docs/ (项目文档)
│   ├── admin-manual.md             # 管理员操作手册
│   ├── deployment-checklist.md     # 部署检查清单（环境、依赖、权限、合规）
│   ├── development-guide.md        # 开发指南（编码规范、接口文档、联调流程）
│   └── test-report.md              # 测试报告（功能、性能、安全、合规测试）
│
├── 📁 examples/ (示例/参考)
│   └── frontend-market-usage.md    # 前端行情接口使用示例
│
├── 📁 lib/ (核心库/工具封装)
│   └── supabase.ts                 # Supabase客户端封装（认证、数据库、存储、函数）
│
├── 📁 public/ (静态资源)
│   ├── favicon.ico                 # 系统图标
│   ├── og-preview.png              # 社交分享预览图
│   │
│   └── models/ (AI模型文件)        # 本地AI模型（人脸识别、OCR）
│       ├── face_landmark_68_model-shard1
│       ├── face_landmark_68_model-weights_manifest.json
│       ├── face_recognition_model-shard1
│       ├── face_recognition_model-shard2
│       ├── face_recognition_model-weights_manifest.json
│       ├── ssd_mobilenetv1_model-shard1
│       ├── ssd_mobilenetv1_model-shard2
│       ├── ssd_mobilenetv1_model-weights_manifest.json
│       ├── tiny_face_detector_model-shard1
│       └── tiny_face_detector_model-weights_manifest.json
│
├── 📁 services/ (业务服务层)
│   ├── 🔧 核心服务
│   │   ├── authService.ts          # 认证服务（登录、登出、token刷新、人脸验证）
│   │   ├── chatService.ts          # 聊天服务（消息发送、历史、智能回复）
│   │   ├── contentService.ts       # 内容服务（公告、研报、教育内容）
│   │   ├── frontendMarketService.ts # 前端行情服务（数据拉取、缓存、格式化）
│   │   ├── integrationService.ts   # 集成服务（第三方接口适配、数据同步）
│   │   ├── limitUpService.ts       # 涨停板服务（数据计算、异动监控）
│   │   ├── marketService.ts        # 行情核心服务（多市场数据聚合）
│   │   ├── tradeService.ts         # 交易服务（订单提交、撤单、撮合查询）
│   │   └── userService.ts          # 用户服务（信息、资产、权限、风控）
│   │
│   └── 📡 adapters/ (数据源适配器)
│       ├── qosAdapter.ts           # QOS行情接口适配器
│       └── sinaIPOAdapter.ts       # 新浪IPO数据适配器
│
├── 📁 supabase/ (Supabase后端配置)
│   ├── 📜 数据库脚本
│   ├── add_chat_system.sql         # 聊天系统表结构新增脚本
│   ├── config.toml                 # Supabase实例配置
│   ├── fix_assets.sql              # 资产数据修复脚本
│   ├── seed.sql                    # 测试/初始化数据脚本
│   │
│   ├── ⚡ functions/ (Edge Functions) # 服务端无服务器函数
│   │   ├── admin-intervene-trade/  # 管理员交易干预
│   │   │   └── index.ts
│   │   ├── admin-manage-api-key/   # API密钥管理
│   │   │   └── index.ts
│   │   ├── admin-update-trade-rules/ # 风控规则更新
│   │   │   └── index.ts
│   │   ├── admin-user-fund-operation/ # 用户资金操作（充值、提现、冻结）
│   │   │   └── index.ts
│   │   ├── create-trade-order/     # 创建交易订单（风控校验、订单生成）
│   │   │   └── index.ts
│   │   ├── fetch-ipo-data/         # 拉取IPO基础数据
│   │   ├── fetch-sina-ipo/         # 拉取新浪IPO数据
│   │   ├── get-market-data/        # 获取行情数据（聚合多数据源）
│   │   │   └── index.ts
│   │   ├── match-trade-order/      # 交易订单撮合（模拟/实盘）
│   │   │   └── index.ts
│   │   ├── nexus-sync/             # 跨系统数据同步
│   │   │   └── index.ts
│   │   └── validate-trade-rule/    # 交易规则校验（合规、风控）
│   │       └── index.ts
│   │
│   └── 🚀 migrations/ (数据库迁移) # 版本化表结构变更
│       ├── 20250327000000_init.sql # 初始化表结构（用户、订单、行情）
│       ├── 20250328000001_add_sms_hook.sql # 新增短信钩子表
│       ├── 20250329000002_add_content_tables.sql # 新增内容管理表
│       ├── 20250330000003_add_chat_tables.sql # 新增聊天系统表
│       └── 20250331000004_add_metadata_to_trades.sql # 交易表新增元数据字段
│
└── 📁 utils/ (通用工具函数)
    ├── face.ts                     # 人脸识别工具（活体检测、身份核验）
    ├── ocr.ts                      # OCR工具（身份证、银行卡识别）
    └── performance.ts              # 性能监控工具（加载、接口耗时、上报）
```

## 📚 文档导航

项目文档位于 `docs/` 目录：

- **[admin-manual.md](docs/admin-manual.md)** - 管理员操作手册
- **[deployment-checklist.md](docs/deployment-checklist.md)** - 部署检查清单
- **[development-guide.md](docs/development-guide.md)** - 开发指南
- **[test-report.md](docs/test-report.md)** - 测试报告

其他重要文档：
- **[SMS_HOOK_SETUP_GUIDE.md](SMS_HOOK_SETUP_GUIDE.md)** - 短信钩子设置指南
- **[README_MIDDLEWARE.md](README_MIDDLEWARE.md)** - 中间件说明
- **[FIX_SUMMARY.md](FIX_SUMMARY.md)** - 修复总结

## 🚢 部署指南

### 前端部署（Vercel）
1. 将代码推送到 GitHub/GitLab
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署完成

### 后端部署（Supabase）
1. 在 Supabase Dashboard 中创建项目
2. 运行数据库迁移
3. 部署 Edge Functions
4. 配置环境变量

### 数据库迁移
```bash
# 本地开发
cd supabase
supabase db reset

# 生产环境
# 在 Supabase SQL Editor 中运行迁移文件
```

## 🔧 开发指南

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 组件按功能模块组织
- 服务层抽象业务逻辑

### 添加新功能
1. 在 `components/` 中创建组件
2. 在 `services/` 中创建服务
3. 在 `types.ts` 中添加类型定义
4. 在 `supabase/migrations/` 中添加数据库迁移
5. 更新路由配置（`App.tsx`）

### 实时聊天系统
项目已集成完整的实时聊天系统：
- **用户端**: `components/ChatView.tsx`
- **管理端**: `components/admin/AdminTickets.tsx`, `components/admin/AdminTicketDetail.tsx`
- **服务层**: `services/chatService.ts`
- **数据库**: 运行 `setup_chat_tables.sql` 创建表结构

## 📄 许可证

本项目为银河证券内部项目，版权所有 © 中国银河证券股份有限公司。

## 📞 支持与反馈

如有问题或建议，请联系：
- **技术支持**: webmaster@chinastock.com.cn
- **客服热线**: 95551 或 4008-888-888
- **项目维护**: 银河证券技术部

---

**最后更新**: 2026年2月25日  
**版本**: v2.12.0  
**状态**: 开发中（功能完整，待优化）