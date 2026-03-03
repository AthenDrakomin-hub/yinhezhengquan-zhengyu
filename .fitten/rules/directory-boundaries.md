# 目录结构界限规则

## 核心原则

### 1. views/ 目录定位
**只存放"路由直接指向的容器组件"**，即：
- 在路由配置中直接引用的页面级组件
- 作为路由入口点的顶级容器
- 负责页面整体布局和子路由嵌套

### 2. client/ 目录定位
**存放功能相关的子页面和业务组件**，即：
- 通过父容器组件内部导航访问的子页面
- 特定业务功能的实现组件
- 可复用的功能模块

## 具体界限规范

### views/ 目录规范

#### 允许存放：
- ✅ 路由配置中直接引用的组件
- ✅ 页面级容器组件
- ✅ 负责整体布局的组件
- ✅ 包含子路由嵌套的组件

#### 禁止存放：
- ❌ 功能子页面（应放在client/对应目录）
- ❌ 可复用的业务组件
- ❌ 通过内部导航访问的页面

#### views/ 当前组件示例：
```
components/views/
├── Dashboard.tsx          # ✅ 路由直接指向：/client/dashboard
├── MarketView.tsx         # ✅ 路由直接指向：/client/market
├── TradePanel.tsx         # ✅ 路由直接指向：/client/trade
├── ProfileView.tsx        # ✅ 路由直接指向：/client/profile
├── SettingsView.tsx       # ✅ 路由直接指向：/client/settings
├── HotStocksPanel.tsx     # ⚠️ 需要确认是否路由直接指向
└── SmartRecommendations.tsx # ⚠️ 需要确认是否路由直接指向
```

### client/ 目录规范

#### 按功能模块组织：
```
components/client/
├── profile/               # 个人资料相关
│   ├── ProfileDetailView.tsx    # ✅ 功能子页面
│   └── ProfileOverview.tsx      # ✅ 功能子页面
├── analysis/              # 分析功能
│   ├── AssetAnalysisView.tsx    # ✅ 功能子页面
│   └── FundFlowsView.tsx        # ✅ 功能子页面
├── trading/               # 交易功能
│   ├── IPOView.tsx              # ✅ 功能子页面
│   ├── BlockTradeView.tsx       # ✅ 功能子页面
│   └── ConditionalOrderPanel.tsx # ✅ 功能子页面
├── compliance/            # 合规功能
│   ├── ComplianceCenter.tsx     # ✅ 功能子页面
│   └── ComplianceShieldView.tsx # ✅ 功能子页面
└── ...其他功能目录
```

## 路由配置示例

### 正确示例：
```typescript
// routes/ClientRoutes.tsx
const ProfileView = lazy(() => import('../components/views/ProfileView'));
const ProfileDetailView = lazy(() => import('../components/client/profile/ProfileDetailView'));
const ProfileOverview = lazy(() => import('../components/client/profile/ProfileOverview'));

<Routes>
  <Route path="profile" element={<ProfileView />}>
    {/* ProfileView内部通过导航访问子页面 */}
    <Route path="detail" element={<ProfileDetailView />} />
    <Route path="overview" element={<ProfileOverview />} />
  </Route>
</Routes>
```

### 错误示例：
```typescript
// ❌ 错误：功能子页面放在views/
const ProfileDetailView = lazy(() => import('../components/views/ProfileDetailView'));

// ❌ 错误：路由直接指向的容器放在client/
const ProfileView = lazy(() => import('../components/client/profile/ProfileView'));
```

## 新组件创建决策流程

### 步骤1：判断组件类型
```
是否在路由配置中直接引用？
    ├── 是 → 放在 views/ 目录
    └── 否 → 进入步骤2
```

### 步骤2：判断功能归属
```
属于哪个业务功能模块？
    ├── 个人资料 → components/client/profile/
    ├── 交易功能 → components/client/trading/
    ├── 分析功能 → components/client/analysis/
    ├── 合规功能 → components/client/compliance/
    └── 其他功能 → components/client/对应目录/
```

### 步骤3：命名规范
- **views/ 组件**：使用`View`后缀，如`ProfileView.tsx`
- **client/ 子页面**：使用`View`后缀，如`ProfileDetailView.tsx`
- **功能组件**：使用描述性名称，如`TransactionHistory.tsx`

## 迁移和重构指南

### 1. 识别需要移动的组件
```bash
# 检查views/中是否包含功能子页面
grep -r "import.*from.*views" routes/*.tsx

# 检查client/中是否包含路由直接指向的容器
grep -r "path=.*element=" routes/*.tsx | grep "client/"
```

### 2. 安全迁移步骤
1. **创建目标目录**（如果不存在）
2. **移动文件**到正确目录
3. **更新所有导入语句**
4. **更新路由配置**（如果需要）
5. **测试功能完整性**

### 3. 常见迁移场景

#### 场景1：功能子页面误放在views/
```
原位置：components/views/ProfileDetailView.tsx
目标位置：components/client/profile/ProfileDetailView.tsx
操作：移动文件，更新导入
```

#### 场景2：路由容器误放在client/
```
原位置：components/client/profile/ProfileView.tsx
目标位置：components/views/ProfileView.tsx
操作：移动文件，更新路由配置和导入
```

## 最佳实践

### 1. 保持一致性
- 所有团队成员遵循相同的目录结构
- 新功能按照现有模式组织
- 定期进行代码审查确保合规

### 2. 文档化决策
- 在组件文件中添加注释说明放置原因
- 更新目录结构文档
- 为新成员提供导航指南

### 3. 自动化检查
```json
// 可考虑添加ESLint规则
{
  "rules": {
    "no-views-subpages": "error",
    "no-client-route-containers": "error"
  }
}
```

## 当前项目状态检查

### 需要确认的组件：
1. **HotStocksPanel.tsx** - 需要确认是否路由直接指向
2. **SmartRecommendations.tsx** - 需要确认是否路由直接指向

### 建议行动：
1. 检查上述组件在路由配置中的使用方式
2. 如果非路由直接指向，考虑移动到client/对应目录
3. 更新相关导入语句

## 总结

明确的目录结构界限有助于：
- **提高开发效率**：开发者快速找到正确位置
- **保持代码整洁**：避免目录混乱
- **便于维护**：清晰的组件归属关系
- **团队协作**：统一的开发规范

遵循"views存放路由容器，client存放功能组件"的原则，确保项目结构清晰可维护。