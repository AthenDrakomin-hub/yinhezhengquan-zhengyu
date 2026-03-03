# 项目路由结构优化方案

## 当前问题分析

1. 登录逻辑分散：客户端和管理端各有自己的登录逻辑
2. 权限控制不统一：各处有自己的权限检查逻辑
3. 路由结构复杂：嵌套路由和权限检查混合在一起
4. 未使用的高级功能组件没有合适的入口

## 优化目标

1. 统一登录流程
2. 标准化权限控制
3. 清晰的路由层级
4. 易于扩展和维护

## 优化后的路由结构

### 主路由 App.tsx
```
/
├── /auth/*          # 认证相关路由（登录、注册、找回密码等）
├── /client/*        # 客户端路由
├── /admin/*         # 管理端路由
└── /public/*        # 公共路由（落地页、下载页等）
```

### 认证路由 /auth/*
```
/auth/
├── /login           # 统一登录入口
├── /register        # 注册
├── /forgot-password # 忘记密码
└── /quick-open      # 快速开户
```

### 客户端路由 /client/*
```
/client/
├── /dashboard       # 仪表盘
├── /market          # 行情
├── /trade           # 交易
├── /portfolio       # 投资组合
├── /analysis        # 资产分析
├── /orders          # 订单管理
├── /profile         # 个人资料
├── /settings        # 设置
├── /compliance      # 合规中心
├── /chat            # 客服
├── /ipo             # 新股申购
├── /block-trade     # 大宗交易
├── /conditional-orders # 条件单
└── /reports         # 研报
```

### 管理端路由 /admin/*
```
/admin/
├── /dashboard       # 管理仪表盘
├── /users           # 用户管理
├── /trades          # 交易管理
├── /rules           # 规则管理
├── /match           # 撮合干预
├── /reports         # 报表
├── /education       # 教育内容
├── /calendar        # 日历事件
├── /ipos            # 新股管理
├── /banners         # 横幅管理
├── /tickets         # 工单管理
├── /audit-logs      # 审计日志
└── /data-export     # 数据导出
```

## 统一权限控制组件

创建统一的权限控制组件，取代现有的分散逻辑：

### AuthProvider
- 统一的认证状态管理
- 自动会话检查和刷新
- 用户信息缓存

### ProtectedRoute
- 统一的权限检查逻辑
- 支持多种权限级别（user, admin, super_admin）
- 自动重定向到合适的登录页面

### RoleGuard
- 基于角色的功能访问控制
- 支持细粒度权限配置
- 统一的权限拒绝界面

## 优化后的组件组织结构

```
components/
├── auth/            # 认证相关组件
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   └── QuickOpenForm.tsx
├── client/          # 客户端功能组件
│   ├── dashboard/
│   ├── market/
│   ├── trade/
│   ├── portfolio/
│   ├── analysis/    # 包含 AssetAnalysisView
│   ├── orders/
│   ├── compliance/  # 包含 ComplianceCenter, ComplianceShieldView
│   ├── chat/        # 包含 ChatView
│   ├── ipo/         # 包含 BatchIPOPanel
│   ├── block-trade/ # 包含 BlockTradeView
│   └── conditional-orders/ # 包含 ConditionalOrderPanel
├── admin/           # 管理端功能组件
├── shared/          # 共享组件
│   ├── layout/
│   ├── ui/
│   ├── charts/
│   └── forms/
├── common/          # 通用组件
└── public/          # 公共页面组件
    ├── LandingPage.tsx
    ├── AboutPage.tsx  # 包含 AboutInvestZYView
    └── DownloadPage.tsx # 包含 AppDownloadView
```

## 实施步骤

1. 创建新的路由结构
2. 实现统一的 AuthProvider
3. 更新所有现有组件以使用新的路由结构
4. 逐步迁移未使用的高级功能组件
5. 测试所有路由和权限控制