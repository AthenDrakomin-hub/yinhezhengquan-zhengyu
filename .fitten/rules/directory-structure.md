# 目录结构规范

## 项目整体结构

```
yinhezhengquan-zhengyu/
├── .fitten/                    # AI开发助手规则文件
│   └── rules/                 # 规则文件目录
├── components/                # React组件库
├── routes/                   # 路由配置
├── services/                 # 业务服务层
├── contexts/                 # React上下文
├── hooks/                    # 自定义Hooks
├── lib/                      # 工具库和常量
├── utils/                    # 工具函数
├── database/                 # 数据库架构和脚本
├── supabase/                 # Supabase配置
├── docs/                     # 项目文档
├── scripts/                  # 构建和部署脚本
├── public/                   # 静态资源
└── config/                   # 配置文件
```

## 详细目录规范

### 1. 组件目录 (components/)

组件目录按照功能模块和用户角色进行组织：

```
components/
├── admin/                    # 管理后台组件
│   ├── AdminDashboard.tsx
│   ├── AdminUserManagement.tsx
│   ├── AdminTradeManagement.tsx
│   ├── AdminRuleManagement.tsx
│   ├── AdminMatchIntervention.tsx
│   ├── AdminReports.tsx
│   ├── AdminEducation.tsx
│   ├── AdminCalendar.tsx
│   ├── AdminIPOs.tsx
│   ├── AdminBanners.tsx
│   ├── AdminTickets.tsx
│   ├── AdminTicketDetail.tsx
│   ├── AdminAuditLogs.tsx
│   ├── AdminDataExport.tsx
│   ├── AdminLayout.tsx
│   └── AdminLoginView.tsx
├── auth/                     # 认证相关组件
│   ├── LoginView.tsx
│   ├── ForgotPasswordView.tsx
│   └── QuickOpenView.tsx
├── client/                   # 客户端功能组件
│   ├── ChatView.tsx
│   ├── analysis/            # 分析功能
│   │   ├── AssetAnalysisView.tsx
│   │   └── FundFlowsView.tsx
│   ├── calendar/            # 日历功能
│   │   └── InvestmentCalendarView.tsx
│   ├── compliance/          # 合规功能
│   │   ├── ComplianceCenter.tsx
│   │   └── ComplianceShieldView.tsx
│   ├── orders/              # 订单功能
│   │   └── TransactionHistory.tsx
│   ├── profile/             # 个人资料
│   │   ├── ProfileDetailView.tsx
│   │   └── ProfileOverview.tsx
│   ├── reports/             # 报告功能
│   │   └── ResearchReportsView.tsx
│   ├── settings/            # 设置功能
│   │   ├── PersonalizedSettingsView.tsx
│   │   └── TradingPreferencesView.tsx
│   └── trading/             # 交易功能
│       ├── BatchIPOPanel.tsx
│       ├── BlockTradeView.tsx
│       ├── ConditionalOrderPanel.tsx
│       └── IPOView.tsx
├── common/                   # 公共组件
│   ├── ErrorBoundary.tsx
│   ├── FeedbackComponents.tsx
│   └── Skeleton.tsx
├── core/                     # 核心组件
│   ├── LandingView.tsx
│   └── Layout.tsx
├── shared/                   # 共享组件
│   ├── InteractiveChart.tsx
│   ├── MobileMenu.tsx
│   ├── NetworkStatusBar.tsx
│   ├── ProtectedRoute.tsx
│   ├── StockIcon.tsx
│   ├── SupabaseConnectionCheck.tsx
│   └── WrappedBatchIPOPanel.tsx
└── views/                    # 页面视图组件
    ├── Dashboard.tsx
    ├── HotStocksPanel.tsx
    ├── MarketView.tsx
    ├── ProfileView.tsx
    ├── SettingsView.tsx
    ├── SmartRecommendations.tsx
    └── TradePanel.tsx
```

### 2. 路由目录 (routes/)

```
routes/
├── AdminRoutes.tsx          # 管理端路由配置
├── AuthRoutes.tsx           # 认证路由配置
├── ClientRoutes.tsx         # 客户端路由配置
├── PublicRoutes.tsx         # 公共路由配置
└── OptimizedApp.tsx         # 主路由配置（已弃用）
```

### 3. 服务目录 (services/)

业务服务层按照功能模块组织：

```
services/
├── adminService.ts          # 管理端服务
├── authService.ts           # 认证服务
├── blockTradeService.ts     # 大宗交易服务
├── cachedMarketService.ts   # 缓存市场服务
├── cancelService.ts         # 取消交易服务
├── chatService.ts           # 聊天服务
├── contentService.ts        # 内容服务
├── ipoService.ts            # IPO服务
├── limitUpService.ts        # 涨停板服务
├── limitUpStockService.ts   # 涨停股票服务
├── marketService.ts         # 市场数据服务
├── offlineQueueService.ts   # 离线队列服务
├── optimizationService.ts   # 优化服务
├── sessionMonitor.ts        # 会话监控
├── tradeService.ts          # 交易服务
├── userService.ts           # 用户服务
├── adapters/                # 数据源适配器
│   └── qosAdapter.ts        # QOS数据适配器
├── DATA_SOURCE_COMPLETE.md  # 数据源文档
└── DATA_SOURCE_PLAN.md      # 数据源计划
```

### 4. 上下文目录 (contexts/)

```
contexts/
├── AdminContext.tsx         # 管理端上下文
└── AuthContext.tsx          # 认证上下文
```

### 5. 工具目录 (utils/)

```
utils/
├── debounce.ts              # 防抖函数
├── errorHandler.tsx         # 错误处理
├── errorMessages.ts         # 错误消息
├── face.ts                  # 人脸识别工具
├── ocr.ts                   # OCR识别工具
├── performance.ts           # 性能工具
├── performanceMonitor.ts    # 性能监控
├── securityMonitor.ts       # 安全监控
└── security/                # 安全工具
    └── clean-storage.ts     # 存储清理
```

### 6. 数据库目录 (database/)

```
database/
├── schema.sql               # 数据库架构说明
├── add-profiles-fields.sql  # 添加用户字段
├── check_accounts.sql       # 检查账户
├── check_assets.sql         # 检查资产
├── check_auth.sql           # 检查认证
├── check-auth-profile-link.sql # 检查认证-资料链接
├── cleanup_policies.sql     # 清理策略
├── cleanup-analysis.md      # 清理分析
├── create_admin.sql         # 创建管理员
├── create-auto-profile-trigger.sql # 创建自动资料触发器
├── FINAL-REPORT.md          # 最终报告
├── fix_admin_role.sql       # 修复管理员角色
├── fix_all_permissions.sql  # 修复所有权限
├── fix_login_issue.sql      # 修复登录问题
├── fix_rls.sql              # 修复RLS策略
├── fix-profiles-schema.sql  # 修复资料架构
├── one-click-fix-all.sql    # 一键修复所有
├── optimization-report.md   # 优化报告
├── README.md                # 数据库文档
├── reset-admin-password.sql # 重置管理员密码
├── set-admin-levels.sql     # 设置管理员级别
├── upgrade-multi-level-admin.sql # 升级多级管理员
└── archive/                 # 归档文件
```

### 7. Supabase目录 (supabase/)

```
supabase/
├── config.toml              # Supabase配置
├── fix_auth_trigger_and_assets.sql # 修复认证触发器和资产
├── public_schema_columns_20260301_141230.csv # 公共架构列
├── seed.sql                 # 种子数据
├── functions/               # Edge Functions
│   ├── admin-operations/    # 管理操作
│   ├── admin-verify/        # 管理员验证
│   ├── approve-trade-order/ # 批准交易订单
│   ├── cancel-trade-order/  # 取消交易订单
│   ├── create-trade-order/  # 创建交易订单
│   ├── fetch-galaxy-news/   # 获取银河新闻
│   ├── fetch-stock-f10/     # 获取股票F10
│   ├── get-market-data/     # 获取市场数据
│   ├── match-trade-order/   # 匹配交易订单
│   └── nexus-sync/          # Nexus同步
└── migrations/              # 数据库迁移
    ├── 20250327000000_init.sql
    ├── 20250328000001_add_sms_hook.sql
    ├── 20250330000003_add_chat_tables.sql
    ├── 20250331000004_add_metadata_to_trades.sql
    ├── 20250402000000_correct_ipos_table.sql
    ├── 20250403000000_create_block_trade_products.sql
    ├── 20250403000001_create_limit_up_stocks.sql
    ├── 20250404000002_create_fund_flows.sql
    ├── 20250405000000_optimize_trades_table.sql
    ├── 20250405000001_optimize_positions_table.sql
    ├── 20260301000000_fix_rls_policies.sql
    ├── 20260301000001_add_settlement_system.sql
    ├── 20260301000002_verify_fixes.sql
    ├── 20260301000006_fix_trade_core.sql
    ├── 20260301000007_fix_admin_backend.sql
    ├── 20260301000008_p2_optimization_features.sql
    └── README.md
```

### 8. 文档目录 (docs/)

```
docs/
├── final-component-usage.md         # 最终组件使用
├── migration-guide.md               # 迁移指南
├── optimized-routing-usage.md       # 优化路由使用
├── README.md                        # 文档说明
├── routing-structure-overview.md    # 路由结构概述
├── 产品类/                          # 产品文档
│   ├── operation-manual.md          # 运营手册
│   └── user-guide.md                # 用户指南
├── 合规类/                          # 合规文档
│   ├── audit-standard.md            # 审计标准
│   ├── compliance-guide.md          # 合规指南
│   └── emergency-handbook.md        # 应急手册
├── 开发类/                          # 开发文档
│   ├── api-doc.md                   # API文档
│   └── test-report.md               # 测试报告
├── 运维类/                          # 运维文档
│   ├── backup-restore.md            # 备份恢复
│   ├── deploy-guide.md              # 部署指南
│   └── monitor-guide.md             # 监控指南
└── archive/                         # 归档文档
```

## 目录命名规范

### 1. 目录命名原则
- 使用英文单词，避免拼音
- 使用单数形式（如`component`而不是`components`，但项目中使用复数形式）
- 保持名称简洁明了
- 功能相关的目录放在一起

### 2. 文件命名规范
- React组件使用PascalCase：`ComponentName.tsx`
- 工具函数使用camelCase：`utilityFunction.ts`
- 服务文件使用camelCase：`serviceName.ts`
- 配置文件使用kebab-case：`config-name.ts`
- 文档文件使用kebab-case：`document-name.md`

### 3. 目录层级规范
- 最多3层嵌套，避免过深
- 功能相似的组件放在同一目录
- 大型功能模块可以创建子目录
- 共享组件放在`shared`目录

## 组件组织原则

### 1. 按功能模块组织
- `admin/` - 管理后台相关组件
- `client/` - 客户端功能组件
- `auth/` - 认证相关组件
- `common/` - 公共基础组件

### 2. 按技术职责组织
- `views/` - 页面级组件
- `shared/` - 共享功能组件
- `core/` - 核心布局组件

### 3. 按业务领域组织
- `trading/` - 交易相关组件
- `analysis/` - 分析相关组件
- `compliance/` - 合规相关组件
- `profile/` - 个人资料组件

## 新组件创建指南

### 1. 确定组件类型
- **页面组件**：放在`views/`或对应功能目录
- **功能组件**：放在`client/`或`admin/`对应子目录
- **共享组件**：放在`shared/`目录
- **基础组件**：放在`common/`目录

### 2. 创建组件步骤
1. 确定组件所属目录
2. 使用正确的命名规范
3. 创建组件文件
4. 导出组件
5. 在路由或父组件中引入

### 3. 组件导入规范
```typescript
// 正确：使用相对路径导入
import ComponentName from '../relative/path/ComponentName';

// 错误：使用绝对路径（除非配置了alias）
import ComponentName from '@/components/path/ComponentName';
```

## 目录结构调整流程

### 1. 小范围调整
- 单个目录内的文件移动
- 重命名文件或目录
- 更新相关导入语句

### 2. 大范围重构
1. 创建新目录结构
2. 逐步迁移文件
3. 更新所有导入
4. 测试功能完整性
5. 清理旧目录

### 3. 注意事项
- 保持向后兼容性
- 更新路由配置
- 更新构建配置
- 更新文档说明

## 最佳实践

### 1. 保持目录整洁
- 定期清理未使用的文件
- 归档历史版本文件
- 删除重复代码

### 2. 遵循一致性
- 所有团队成员使用相同的目录结构
- 新功能按照现有模式组织
- 文档与代码结构保持一致

### 3. 优化导入路径
- 避免过深的相对路径
- 考虑使用alias简化导入
- 保持导入语句清晰可读

### 4. 文档化目录结构
- 维护README文件说明目录结构
- 为新成员提供目录导航指南
- 记录重要的目录变更历史