# 优化后路由结构使用说明

## 概述

项目已从原来的混乱路由结构迁移到了统一、清晰的路由架构。新的结构解决了登录逻辑分散、权限控制不一致等问题，并激活了之前未使用的高级功能组件。

## 新路由结构

### 顶层路由结构
```
/
├── /public/*     # 公共页面（无需登录）
├── /auth/*       # 认证页面（登录、注册等）
├── /client/*     # 客户端功能（需用户登录）
└── /admin/*      # 管理端功能（需管理员登录）
```

### 公共路由 (/public/*)
- `/public/landing` - 应用落地页
- `/public/about` - 关于页面
- `/public/download` - 下载页面

### 认证路由 (/auth/*)
- `/auth/login` - 统一登录页面
- `/auth/forgot-password` - 忘记密码
- `/auth/quick-open` - 快速开户

### 客户端路由 (/client/*)
- `/client/dashboard` - 仪表盘
- `/client/market` - 行情
- `/client/trade` - 交易
- `/client/profile` - 个人资料
- `/client/settings` - 设置

#### 高级功能（新增）
- `/client/analysis` - 资产分析报告
- `/client/compliance` - 合规中心
- `/client/compliance/shield` - 合规盾牌
- `/client/chat` - 客服聊天
- `/client/ipo` - 新股申购
- `/client/batch-ipo` - 批量新股申购
- `/client/block-trade` - 大宗交易
- `/client/conditional-orders` - 条件单
- `/client/reports` - 研报
- `/client/calendar` - 投资日历
- `/client/transactions` - 交易历史
- `/client/funds` - 资金流水
- `/client/trading-preferences` - 交易偏好
- `/client/settings/personalized` - 个性化设置

### 管理端路由 (/admin/*)
- `/admin/dashboard` - 管理仪表盘
- `/admin/users` - 用户管理
- `/admin/trades` - 交易管理
- `/admin/rules` - 规则管理
- `/admin/match` - 撮合干预
- `/admin/reports` - 报表
- `/admin/education` - 教育内容
- `/admin/calendar` - 日历事件
- `/admin/ipos` - 新股管理
- `/admin/banners` - 横幅管理
- `/admin/tickets` - 工单管理
- `/admin/audit-logs` - 审计日志
- `/admin/data-export` - 数据导出

## 如何使用新结构

### 1. 启动应用
应用默认会重定向到 `/public/landing` 页面

### 2. 用户登录流程
- 未登录用户访问受保护路由 → 自动重定向到 `/auth/login`
- 登录成功 → 根据用户角色重定向到相应主页
- 普通用户 → `/client/dashboard`
- 管理员 → `/admin/dashboard`

### 3. 导航
- 客户端使用 `Layout` 组件进行导航
- 管理端使用 `AdminLayout` 组件进行导航
- 所有导航都基于新的路由结构

### 4. 权限控制
- `ProtectedRoute` 组件统一处理权限检查
- `requireLogin=true` - 需要登录
- `requireAdmin=true` - 需要管理员权限

## 激活的高级功能

之前未使用的组件现在已完全集成：

### 交易增强功能
- **条件单** (`/client/conditional-orders`): 支持止盈止损和网格交易
- **大宗交易** (`/client/block-trade`): 专业大宗交易通道
- **批量IPO** (`/client/batch-ipo`): 一键申购多只新股
- **涨停打板** (可通过交易面板访问)

### 分析与报告功能
- **资产分析** (`/client/analysis`): 详细的资产分布和收益分析
- **研报中心** (`/client/reports`): 研究报告查看
- **投资日历** (`/client/calendar`): 重要财经事件日历

### 合规与风控
- **合规中心** (`/client/compliance`): 投资者信息和工单处理
- **合规盾牌** (`/client/compliance/shield`): 实时风控监控

### 客户服务
- **在线客服** (`/client/chat`): 实时客服聊天
- **快速开户** (`/auth/quick-open`): 快速开户流程

## 开发者指南

### 添加新路由
1. 在对应的路由文件中添加新路由 (`routes/ClientRoutes.tsx`, `routes/AdminRoutes.tsx` 等)
2. 使用 `lazy` 导入新组件以实现代码分割
3. 如需要权限控制，使用 `ProtectedRoute` 组件

### 组件开发
- 新的客户端功能组件应放在 `components/client/` 目录下
- 新的管理端功能组件应放在 `components/admin/` 目录下
- 共享组件放在 `components/shared/` 目录下

### 状态管理
- 认证状态通过 `useAuth` Hook 统一管理
- 用户信息在 `AuthContext` 中维护
- 避免在各个组件中重复实现认证逻辑

## 迁移注意事项

如果您想切换到新结构：
1. 备份当前的 `App.tsx`
2. 在 `index.tsx` 中将导入从 `App` 改为 `OptimizedApp`
3. 测试所有主要功能路径
4. 验证权限控制正常工作

## 常见问题

Q: 为什么有些组件无法懒加载？
A: 对于使用 `export const ComponentName` 而非 `export default` 的组件，
   我们创建了包装组件（如 `WrappedBatchIPOPanel.tsx`）来解决此问题。

Q: 登录问题是否已解决？
A: 是的，新的 `AuthContext` 统一管理认证状态，解决了之前登录逻辑分散的问题。

Q: 未使用的高级功能如何访问？
A: 它们现在已整合到客户端路由中，可以通过新路径访问。