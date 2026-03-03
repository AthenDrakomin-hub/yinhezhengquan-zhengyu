# 路由配置规范

## 路由架构概述

银河证券管理系统采用分层路由架构，分为四个主要路由模块：

### 1. 路由层级结构
```
/
├── /public/*      # 公共路由（无需登录）
├── /auth/*        # 认证路由（未登录用户）
├── /client/*      # 客户端路由（已登录用户）
└── /admin/*       # 管理端路由（管理员用户）
```

### 2. 路由保护机制
- **PublicRoutes**：无需任何认证，所有用户可访问
- **AuthRoutes**：未登录用户访问，用于登录/注册流程
- **ClientRoutes**：需要用户登录，使用`ProtectedRoute`组件保护
- **AdminRoutes**：需要管理员权限，使用`ProtectedRoute`组件保护

## 路由配置规范

### 1. 路由文件组织
```
routes/
├── PublicRoutes.tsx    # 公共路由配置
├── AuthRoutes.tsx      # 认证路由配置
├── ClientRoutes.tsx    # 客户端路由配置
├── AdminRoutes.tsx     # 管理端路由配置
└── OptimizedApp.tsx    # 主路由配置（已弃用，使用根目录的OptimizedApp.tsx）
```

### 2. 路由配置原则

#### 2.1 懒加载配置
所有路由组件必须使用React.lazy进行懒加载：
```typescript
const ComponentName = lazy(() => import('../path/to/Component'));
```

#### 2.2 Suspense包装
所有懒加载路由必须使用Suspense包装：
```typescript
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    {/* 路由配置 */}
  </Routes>
</Suspense>
```

#### 2.3 错误边界
所有路由模块必须使用ErrorBoundary包装：
```typescript
<ErrorBoundary>
  {/* 路由内容 */}
</ErrorBoundary>
```

## 各路由模块详细配置

### 1. 公共路由 (PublicRoutes)
**路径前缀**：`/public/*`
**访问权限**：无需登录
**主要页面**：
- `/public/landing` - 落地页
- `/public/about` - 关于页面
- `/public/features` - 功能介绍

### 2. 认证路由 (AuthRoutes)
**路径前缀**：`/auth/*`
**访问权限**：未登录用户
**主要页面**：
- `/auth/login` - 用户登录
- `/auth/register` - 用户注册
- `/auth/forgot-password` - 忘记密码
- `/auth/quick-open` - 快速开户

### 3. 客户端路由 (ClientRoutes)
**路径前缀**：`/client/*`
**访问权限**：已登录用户
**路由保护**：`<ProtectedRoute requireLogin={true} requireAdmin={false}>`

#### 3.1 主要功能路由
```
/client/dashboard              # 仪表板
/client/market                 # 市场行情
/client/trade                  # 交易面板
/client/profile                # 个人资料
/client/settings               # 系统设置
```

#### 3.2 高级功能路由
```
/client/analysis               # 资产分析
/client/compliance             # 合规中心
/client/compliance/shield      # 合规盾
/client/chat                   # 在线客服
/client/ipo                    # 新股申购
/client/batch-ipo              # 批量打新
/client/block-trade            # 大宗交易
/client/conditional-orders     # 条件单
/client/reports                # 研究报告
/client/calendar               # 投资日历
```

#### 3.3 个人资料子路由
```
/client/profile/detail         # 资料详情
/client/profile/overview       # 资料概览
/client/transactions           # 交易历史
/client/funds                  # 资金流水
```

#### 3.4 设置子路由
```
/client/settings/personalized  # 个性化设置
/client/trading-preferences    # 交易偏好
```

### 4. 管理端路由 (AdminRoutes)
**路径前缀**：`/admin/*`
**访问权限**：管理员用户
**路由保护**：`<ProtectedRoute requireLogin={true} requireAdmin={true}>`
**登录页面**：`/admin/login`（无需保护）

#### 4.1 管理功能路由
```
/admin/dashboard               # 管理仪表板
/admin/users                   # 用户管理
/admin/trades                  # 交易管理
/admin/rules                   # 规则管理
/admin/match                   # 撮合干预
/admin/reports                 # 报表管理
/admin/education               # 投教管理
/admin/calendar                # 日历管理
/admin/ipos                    # IPO管理
/admin/banners                 # 横幅管理
/admin/tickets                 # 工单管理
/admin/tickets/:ticketId       # 工单详情
/admin/audit-logs              # 审计日志
/admin/data-export             # 数据导出
```

## 路由配置最佳实践

### 1. 路径命名规范
- 使用kebab-case（短横线分隔）
- 使用英文单词，避免拼音
- 保持路径简洁明了
- 嵌套路由使用明确的父子关系

### 2. 路由参数规范
- 路径参数使用`:paramName`格式
- 查询参数通过useSearchParams管理
- 敏感参数避免在URL中暴露

### 3. 导航跳转规范
- 使用`useNavigate`进行编程式导航
- 使用`<Link>`组件进行声明式导航
- 重要操作后使用`replace`避免历史记录污染

### 4. 权限检查规范
- 路由级别权限在`ProtectedRoute`中检查
- 组件级别权限在组件内部检查
- 管理员权限检查`userProfile?.role === 'admin'`

### 5. 错误处理规范
- 404页面重定向到默认路由
- 权限不足重定向到登录页
- 网络错误显示友好提示

## 路由配置示例

### 基本路由配置
```typescript
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="market" element={<MarketView />} />
    <Route path="*" element={<Navigate to="dashboard" replace />} />
  </Route>
</Routes>
```

### 带参数的路由
```typescript
<Route path="tickets/:ticketId" element={<TicketDetail />} />
```

### 嵌套路由配置
```typescript
<Route path="profile" element={<ProfileLayout />}>
  <Route index element={<ProfileOverview />} />
  <Route path="detail" element={<ProfileDetail />} />
  <Route path="settings" element={<ProfileSettings />} />
</Route>
```

## 注意事项

1. **路由顺序**：具体路由在前，通用路由在后
2. **默认重定向**：根路径和404都重定向到默认页面
3. **权限验证**：管理端路由需要双重验证（登录+管理员）
4. **性能优化**：所有组件必须懒加载
5. **错误处理**：所有路由模块必须包含错误边界