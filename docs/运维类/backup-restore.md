# 备份恢复流程 - 银河证券证裕交易单元

## 自动备份

### Supabase自动备份
- 频率：每日自动备份
- 保留期：7天
- 位置：Supabase Dashboard -> Database -> Backups

### 查看备份
1. 登录Supabase Dashboard
2. 选择项目
3. Database -> Backups
4. 查看备份列表

## 手动备份

### 完整数据库备份
```bash
# 使用pg_dump
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# 使用Supabase CLI
supabase db dump -f backup.sql
```

### 关键表备份
```bash
# 备份交易相关表
pg_dump -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  -t trades \
  -t assets \
  -t positions \
  -t fund_flows \
  -f critical_backup.sql
```

### 备份验证
```bash
# 检查备份文件大小
ls -lh backup.sql

# 验证备份内容
head -100 backup.sql
```

## 数据恢复

### 从Supabase备份恢复
1. Supabase Dashboard -> Database -> Backups
2. 选择恢复点
3. 点击"Restore"
4. 确认恢复操作
5. 等待恢复完成（约5-10分钟）

### 从本地备份恢复
```bash
# 恢复完整数据库
psql -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql

# 恢复特定表
psql -h db.xxx.supabase.co \
  -U postgres \
  -d postgres \
  -f critical_backup.sql
```

### 恢复验证
```sql
-- 检查表数量
SELECT COUNT(*) FROM trades;
SELECT COUNT(*) FROM assets;
SELECT COUNT(*) FROM positions;

-- 检查最新数据
SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;

-- 资产对账
SELECT reconcile_user_assets('user_id');
```

## 灾难恢复

### 场景1：数据库完全丢失
1. 创建新Supabase项目
2. 运行所有迁移文件
3. 从最新备份恢复数据
4. 更新前端环境变量
5. 验证数据完整性

### 场景2：部分数据损坏
1. 识别损坏的表
2. 从备份中提取该表数据
3. 删除损坏数据
4. 恢复正确数据
5. 验证数据一致性

### 场景3：误删除数据
1. 立即停止所有写操作
2. 从最近备份恢复
3. 对比恢复前后数据
4. 验证业务逻辑

## 备份策略

### 每日备份
- 时间：凌晨2:00
- 内容：完整数据库
- 保留：7天

### 每周备份
- 时间：周日凌晨
- 内容：完整数据库
- 保留：4周

### 每月备份
- 时间：每月1日
- 内容：完整数据库
- 保留：12个月

## 备份存储

### 本地存储
```bash
# 创建备份目录
mkdir -p /backup/supabase

# 设置权限
chmod 700 /backup/supabase

# 定期清理旧备份
find /backup/supabase -name "*.sql" -mtime +30 -delete
```

### 云存储
- 使用AWS S3或阿里云OSS
- 启用版本控制
- 设置生命周期策略
- 加密存储

## 恢复测试

### 每月恢复演练
1. 选择一个备份文件
2. 在测试环境恢复
3. 验证数据完整性
4. 记录恢复时间
5. 更新恢复文档
