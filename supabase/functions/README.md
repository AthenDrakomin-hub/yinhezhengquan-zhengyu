# Edge Functions 目录说明

## 目录结构

```
supabase/functions/
├── trade/              # 交易相关
│   ├── create-trade-order/    # 创建交易订单
│   ├── match-trade-order/     # 撮合交易订单
│   ├── cancel-trade-order/    # 取消交易订单
│   └── approve-trade-order/   # 审批交易订单
├── market/             # 行情/资讯
│   ├── get-market-data/       # 获取行情数据
│   ├── fetch-galaxy-news/     # 获取银河新闻
│   └── fetch-stock-f10/       # 获取F10资料
├── admin/              # 管理后台
│   └── admin-operations/      # 管理员操作
└── sync/               # 数据同步
    └── nexus-sync/            # Nexus数据同步
```

## 部署命令

### 部署所有函数
```bash
supabase functions deploy
```

### 部署单个函数
```bash
# 交易相关
supabase functions deploy trade/create-trade-order
supabase functions deploy trade/match-trade-order
supabase functions deploy trade/cancel-trade-order
supabase functions deploy trade/approve-trade-order

# 行情相关
supabase functions deploy market/get-market-data
supabase functions deploy market/fetch-galaxy-news
supabase functions deploy market/fetch-stock-f10

# 管理相关
supabase functions deploy admin/admin-operations

# 同步相关
supabase functions deploy sync/nexus-sync
```

## 调用方式

### 前端调用
```typescript
// 创建交易订单
const { data, error } = await supabase.functions.invoke('trade/create-trade-order', {
  body: { symbol, quantity, price }
});

// 获取行情数据
const { data, error } = await supabase.functions.invoke('market/get-market-data', {
  body: { symbols: ['SH600000'] }
});
```

## 环境变量

在 Supabase Dashboard -> Edge Functions -> Settings 配置：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QOS_KEY`（大宗交易）

## 注意事项

- Edge Functions 使用 Deno 运行时
- 超时时间：默认 60 秒
- 内存限制：150MB
- 并发限制：根据 Supabase 套餐
