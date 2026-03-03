# 最终组件使用情况报告

## 已使用组件

以下组件在项目中被使用：

### 路由直接引用的组件
- App
- ClientApp
- AdminApp
- LandingView
- LoginView
- Dashboard
- MarketView
- TradePanel
- ProfileView
- Layout
- AdminDashboard
- AdminUserManagement
- AdminTradeManagement
- AdminRuleManagement
- AdminMatchIntervention
- AdminReports
- AdminEducation
- AdminCalendar
- AdminIPOs
- AdminBanners
- AdminTickets
- AdminTicketDetail
- AdminAuditLogs
- AdminDataExport
- AdminLayout
- AdminLoginView

### 间接引用的组件
- NetworkStatusBar (在 App.tsx 中使用)
- ErrorBoundary (在 ClientApp.tsx 和 AdminApp.tsx 中使用)
- HotStocksPanel (在 Dashboard.tsx 中使用)
- SmartRecommendations (在 Dashboard.tsx 中使用)
- StockIcon (在多个组件中使用)
- StockDetailView (被 MarketView 等组件使用)
- InteractiveChart (在 StockDetailView 中使用)
- SettingsView (在 ClientApp.tsx 中动态导入)
- SupabaseConnectionCheck (在 AdminApp.tsx 中使用)

### 通用组件
- FeedbackComponents/PermissionDenied (虽然没有直接在路由中使用，但在错误处理场景中可能被使用)

## 未使用组件

以下组件经过全面检查后确认未被项目中的任何地方使用，建议删除：

### 客户端组件
- AboutInvestZYView
- AppDownloadView
- AssetAnalysisView
- BannerDetailView
- BatchIPOPanel
- BlockTradeView
- ChatView
- ComplianceCenter
- ComplianceShieldView
- ConditionalOrderPanel
- EducationBaseView
- EducationCenter
- ForgotPasswordView
- FundFlowsView
- IPOView
- InvestmentCalendarView
- LimitUpPanel
- MobileMenu
- PersonalizedSettingsView
- ProfileDetailView
- ProfileOverview
- QuickOpenView
- ResearchReportsView
- SecurityCenterView
- ServiceCenter
- SettingsOverview
- TradingPreferencesView
- TransactionHistory

## 存疑组件

以下组件存在间接引用或特殊情况，需要进一步确认：

- ProtectedRoute (虽然有定义但似乎没有在路由中直接使用，而是各自实现权限控制逻辑)

## 清理建议

### 建议删除的组件（27个）
1. AboutInvestZYView
2. AppDownloadView
3. AssetAnalysisView
4. BannerDetailView
5. BatchIPOPanel
6. BlockTradeView
7. ChatView
8. ComplianceCenter
9. ComplianceShieldView
10. ConditionalOrderPanel
11. EducationBaseView
12. EducationCenter
13. ForgotPasswordView
14. FundFlowsView
15. IPOView
16. InvestmentCalendarView
17. LimitUpPanel
18. MobileMenu
19. PersonalizedSettingsView
20. ProfileDetailView
21. ProfileOverview
22. QuickOpenView
23. ResearchReportsView
24. SecurityCenterView
25. ServiceCenter
26. SettingsOverview
27. TradingPreferencesView
28. TransactionHistory

### 保留的组件
所有在"已使用组件"列表中的组件都应保留。

### 特殊处理建议
- ProtectedRoute 组件虽然没有直接在路由中使用，但作为通用权限控制组件可能在其他场景有用，建议保留或确认是否真的不需要。