# Supabase 配置

本目录包含 Supabase 相关的配置、迁移文件和 Edge Functions。

## 目录结构

```
supabase/
├── config.toml              # Supabase 项目配置
├── seed.sql                 # 初始数据种子
├── migrations/              # 数据库迁移文件
│   ├── 20250327000000_init.sql
│   ├── 20250328000001_add_sms_hook.sql
│   ├── 20250330000003_add_chat_tables.sql
│   ├── 20250331000004_add_metadata_to_trades.sql
│   ├── 20250402000000_market_data_tables.sql
│   ├── 20250403000000_system_optimization.sql
│   └── README.md
└── functions/               # Edge Functions
    ├── admin-operations/    # 管理员操作
    ├── admin-verify/        # 管理员验证
    ├── approve-trade-order/ # 批准交易
    ├── cancel-trade-order/  # 取消交易
    ├── create-trade-order/  # 创建交易
    ├── fetch-galaxy-news/   # 获取银河新闻
    ├── fetch-stock-f10/     # 获取股票 F10
    ├── get-market-data/     # 获取行情数据
    ├── match-trade-order/   # 撮合交易
    └── nexus-sync/          # 系统同步
```

## 数据库迁移

### 快速开始

```bash
# 查看迁移状态
supabase db diff

# 执行迁移
supabase db push

# 重置数据库（开发环境）
supabase db reset
```

### 迁移文件说明

| 文件 | 说明 |
|------|------|
| `20250327000000_init.sql` | 核心表结构（profiles, holdings, transactions） |
| `20250328000001_add_sms_hook.sql` | 短信发送钩子 |
| `20250330000003_add_chat_tables.sql` | 客服聊天系统 |
| `20250331000004_add_metadata_to_trades.sql` | 交易元数据字段 |
| `20250402000000_market_data_tables.sql` | 市场数据表（IPO、大宗交易等） |
| `20250403000000_system_optimization.sql` | 系统优化（触发器、清算等） |

详细说明见 [migrations/README.md](./migrations/README.md)

## Edge Functions

### 函数列表

| 函数 | 说明 | 方法 |
|------|------|------|
| `admin-operations` | 管理员操作（用户管理、权限配置） | POST |
| `admin-verify` | 管理员身份验证 | GET/POST |
| `approve-trade-order` | 批准交易订单 | POST |
| `cancel-trade-order` | 取消交易订单 | POST |
| `create-trade-order` | 创建交易订单 | POST |
| `match-trade-order` | 撮合交易订单 | POST |
| `fetch-galaxy-news` | 获取银河新闻快讯 | GET |
| `fetch-stock-f10` | 获取股票 F10 资料 | POST |
| `get-market-data` | 获取市场行情数据 | POST |
| `nexus-sync` | 系统数据同步 | GET |

### 部署函数

```bash
# 部署单个函数
supabase functions deploy admin-verify

# 部署所有函数
supabase functions deploy
```

### 本地测试

```bash
# 启动本地函数服务
supabase functions serve

# 测试函数
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-trade-order' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"symbol":"600519","type":"BUY","quantity":100}'
```

## 环境变量

在 Supabase Dashboard 中配置以下环境变量：

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `SUPABASE_URL` | 项目 URL | ✅ |
| `SUPABASE_ANON_KEY` | 匿名密钥 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务角色密钥 | ✅ |
| `ADMIN_ALLOWED_IPS` | 管理员 IP 白名单 | 生产环境必需 |

## 配置文件说明

### config.toml

```toml
[api]
port = 54321           # API 端口
max_rows = 1000        # 最大返回行数

[auth]
site_url = "http://localhost:3000"
enable_signup = true   # 允许注册

[storage]
enabled = true         # 启用存储
```

## 常用命令

```bash
# 登录 Supabase
supabase login

# 关联项目
supabase link --project-ref your-project-ref

# 查看项目状态
supabase status

# 导出数据库结构
supabase db dump -f schema.sql

# 导出数据
supabase db dump --data-only -f data.sql

# 生成类型定义
supabase gen types typescript --local > lib/database.types.ts
```

## 注意事项

1. **迁移顺序**：必须按时间戳顺序执行迁移文件
2. **环境隔离**：开发和生产环境使用不同的项目
3. **密钥安全**：不要在代码中暴露 Service Role Key
4. **RLS 策略**：所有表已启用 RLS，确保数据隔离

---

**相关文档**:
- [数据库架构](../database/README.md)
- [API 文档](../docs/开发类/api-doc.md)
