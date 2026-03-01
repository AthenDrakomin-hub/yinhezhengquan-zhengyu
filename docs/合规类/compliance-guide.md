# 合规指南 - 银河证券证裕交易单元

## 数据加密

### 敏感数据加密
- 用户密码：Supabase Auth自动加密（bcrypt）
- 身份证号：前端脱敏显示，数据库明文存储（需加密）
- 手机号：前端脱敏显示
- 银行卡号：前端脱敏显示

### 传输加密
- 所有API请求使用HTTPS
- Supabase连接使用TLS 1.2+

## 审计日志

### 必须记录的操作
- 管理员操作：`admin_operation_logs`表
- 资金操作：`fund_flows`表
- 交易操作：`trades`表
- 用户登录：Supabase Auth日志

### 日志保留期
- 审计日志：1年
- 交易记录：永久
- 资金流水：永久

## 数据备份

### 自动备份
- Supabase自动每日备份
- 保留7天

### 手动备份
```bash
# 导出数据库
supabase db dump -f backup_$(date +%Y%m%d).sql

# 导出特定表
pg_dump -h xxx -U postgres -t trades -t assets > critical_backup.sql
```

## 合规要求

### 虚拟交易声明
- 所有页面显著标注"虚拟交易系统"
- 用户首次使用需同意协议
- 交易页面显示风险提示

### 数据隐私
- 遵循《个人信息保护法》
- 用户数据不得泄露
- 定期安全审计

### 操作审计
- 所有管理员操作可追溯
- 关键操作需二次确认
- 异常操作自动告警
