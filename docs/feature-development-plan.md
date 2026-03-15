# 金融APP功能开发计划

## 一、当前状态分析

### 已实现功能 ✅
- 用户认证系统（Supabase Auth）
- 新闻资讯系统（热点资讯、7x24快讯、财经日历）
- 工单/在线客服系统
- 基础交易框架
- 账户管理基础

### 需要开发功能 🔧

#### 1. 行情页面 (MarketView)
| 功能 | 当前状态 | 解决方案 |
|------|----------|----------|
| 指数行情 | 硬编码数据 | 免费API: 新浪财经/腾讯财经 |
| 涨跌分布 | 硬编码数据 | 基于自选股实时计算 |
| 股票列表 | 基础实现 | 接入免费行情API |
| K线图表 | 未实现 | 使用 lightweight-charts |

#### 2. 交易页面 (TradePanel)
| 功能 | 当前状态 | 解决方案 |
|------|----------|----------|
| 股票搜索 | 基础实现 | 本地股票数据库 |
| 买卖交易 | 框架已有 | 完善下单逻辑 |
| 撤单功能 | 入口已有 | 实现撤单列表 |
| 条件单 | 入口已有 | 实现条件单系统 |

#### 3. 财富页面 (WealthView)
| 功能 | 当前状态 | 解决方案 |
|------|----------|----------|
| 资产概览 | 基础实现 | 完善计算逻辑 |
| 理财产品 | 未实现 | 本地理财数据库 |
| 基金列表 | 未实现 | 本地基金数据库 |

#### 4. 我的页面 (ProfileView)
| 功能 | 当前状态 | 解决方案 |
|------|----------|----------|
| 用户信息 | 基础实现 | 完善展示 |
| VIP权益 | 入口已有 | 实现权益系统 |
| 安全设置 | 已有表 | 完善UI |

---

## 二、免费数据源方案

### 1. 行情数据（免费）
- **新浪财经API**：`https://hq.sinajs.cn/list=股票代码`
- **腾讯财经API**：`https://web.sqt.gtimg.cn/q=r_股票代码`
- **东方财富API**：部分接口免费

### 2. 本地数据方案
- 股票基础信息：创建本地数据库表
- 理财产品：创建本地数据库表
- 基金列表：创建本地数据库表

---

## 三、迭代开发计划

### 第一阶段：行情系统（优先级最高）
1. 创建股票基础信息表
2. 实现免费行情API获取
3. 完善指数行情展示
4. 实现涨跌分布计算
5. 添加K线图表

### 第二阶段：交易系统
1. 完善股票搜索功能
2. 实现条件单系统
3. 完善委托/成交查询
4. 实现银证转账

### 第三阶段：财富系统
1. 创建理财产品表
2. 实现产品列表展示
3. 实现产品购买流程
4. 完善资产分布图表

### 第四阶段：用户系统
1. 完善用户信息展示
2. 实现VIP权益系统
3. 完善安全设置UI
4. 添加帮助中心

---

## 四、技术实现细节

### 行情数据缓存策略
```
前端内存缓存 (30秒) -> 数据库缓存 (5分钟) -> API获取
```

### 股票代码格式
- 沪市：sh + 代码（如 sh600000）
- 深市：sz + 代码（如 sz000001）
- 北交所：bj + 代码（如 bj830799）

### 数据库表设计

#### stocks（股票基础信息）
```sql
CREATE TABLE stocks (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL, -- SH/SZ/BJ
  industry TEXT,
  list_date DATE,
  total_shares BIGINT,
  circ_shares BIGINT
);
```

#### funds（基金信息）
```sql
CREATE TABLE funds (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  manager TEXT,
  company TEXT,
  nav DECIMAL(10,4),
  nav_date DATE
);
```

#### wealth_products（理财产品）
```sql
CREATE TABLE wealth_products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  expected_rate DECIMAL(5,2),
  min_amount DECIMAL(12,2),
  period INTEGER,
  risk_level TEXT
);
```
