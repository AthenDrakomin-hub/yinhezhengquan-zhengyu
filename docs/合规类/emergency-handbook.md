# 应急手册 - 银河证券证裕交易单元

## 故障分级

### P0（紧急）- 15分钟响应
- 系统崩溃无法访问
- 数据库连接失败
- 大规模用户无法登录

### P1（高）- 1小时响应
- 核心功能不可用（交易、充值）
- 严重性能问题
- 数据不一致

### P2（中）- 4小时响应
- 次要功能异常
- 一般性能问题

### P3（低）- 1天响应
- UI问题
- 优化建议

## 常见故障处理

### 1. 系统无法访问
```bash
# 检查Vercel状态
curl https://your-domain.vercel.app/health

# 检查Supabase状态
# 访问 Supabase Dashboard

# 回滚到上一版本
vercel rollback
```

### 2. 数据库连接失败
```bash
# 检查连接池
# Supabase Dashboard -> Settings -> Database -> Connection pooling

# 重启连接池
# Supabase Dashboard -> Restart
```

### 3. 交易撮合异常
```sql
-- 检查待撮合订单
SELECT * FROM trades WHERE status = 'MATCHING' ORDER BY created_at;

-- 手动触发撮合
SELECT match_trade_orders();

-- 检查资产一致性
SELECT reconcile_user_assets('user_id');
```

### 4. 用户无法登录
```sql
-- 检查用户状态
SELECT * FROM profiles WHERE id = 'user_id';

-- 重置用户状态
UPDATE profiles SET status = 'ACTIVE' WHERE id = 'user_id';
```

## 数据恢复

### 从Supabase备份恢复
1. Supabase Dashboard -> Database -> Backups
2. 选择备份点
3. 点击Restore

### 从本地备份恢复
```bash
# 恢复数据库
psql -h xxx -U postgres -d postgres -f backup.sql

# 验证数据
SELECT COUNT(*) FROM trades;
SELECT COUNT(*) FROM assets;
```

## 应急联系人

- 技术负责人：[待补充]
- 数据库管理员：[待补充]
- Supabase支持：support@supabase.io
- Vercel支持：support@vercel.com

## 应急演练

- 每季度进行一次应急演练
- 记录演练结果
- 优化应急流程
