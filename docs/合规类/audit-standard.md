# 审计标准 - 银河证券证裕交易单元

## 日志格式

### 管理员操作日志
```json
{
  "id": "uuid",
  "admin_id": "uuid",
  "operate_type": "USER_FUND_OPERATION",
  "target_user_id": "uuid",
  "operate_content": {
    "operation": "DEPOSIT",
    "amount": 10000,
    "remark": "充值"
  },
  "ip_address": "192.168.1.1",
  "created_at": "2026-03-01T10:00:00Z"
}
```

### 资金流水日志
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "flow_type": "BUY_DEDUCT",
  "amount": 1000.00,
  "balance_after": 99000.00,
  "related_trade_id": "uuid",
  "remark": "SH600000 买入",
  "created_at": "2026-03-01T10:00:00Z"
}
```

### 交易记录
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "stock_code": "SH600000",
  "stock_name": "浦发银行",
  "trade_type": "BUY",
  "quantity": 100,
  "price": 10.00,
  "fee": 5.00,
  "status": "SUCCESS",
  "created_at": "2026-03-01T10:00:00Z",
  "finish_time": "2026-03-01T10:00:01Z"
}
```

## 留存要求

### 必须永久保留
- 交易记录（trades）
- 资金流水（fund_flows）
- 用户资产变更（assets历史）

### 保留1年
- 管理员操作日志（admin_operation_logs）
- 清算日志（settlement_logs）
- 用户行为日志（user_behavior_logs）

### 保留30天
- 性能监控数据（performance_metrics）
- 缓存数据（market_data_cache）

## 审计检查项

### 每日检查
- [ ] 资产对账：所有用户资产 = 可用余额 + 冻结余额 + 持仓市值
- [ ] 交易对账：成交订单数量 = 资金流水数量
- [ ] 异常订单：检查长时间未撮合的订单

### 每周检查
- [ ] 管理员操作审计
- [ ] 大额资金变动审计
- [ ] 系统性能审计

### 每月检查
- [ ] 数据备份验证
- [ ] 安全漏洞扫描
- [ ] 合规性审查

## 审计SQL

### 资产对账
```sql
SELECT 
  user_id,
  available_balance + frozen_balance + 
  COALESCE((SELECT SUM(market_value) FROM positions WHERE positions.user_id = assets.user_id), 0) as calculated_total,
  total_asset as recorded_total,
  ABS(calculated_total - total_asset) as diff
FROM assets
WHERE ABS(calculated_total - total_asset) > 0.01;
```

### 异常订单检查
```sql
SELECT * FROM trades 
WHERE status = 'MATCHING' 
  AND created_at < NOW() - INTERVAL '1 hour';
```

### 大额资金变动
```sql
SELECT * FROM fund_flows 
WHERE ABS(amount) > 100000 
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```
