# Supabase数据库操作规则文件

## 概述

本文件定义了银河证券管理系统（证裕交易单元）中Supabase数据库操作的所有规范和最佳实践。作为金融证券交易系统，数据库操作必须遵循最高级别的安全性、可靠性和合规性标准。

## 1. 数据库迁移管理规范

### 1.1 迁移文件命名规范
- **格式**：`YYYYMMDDHHMMSS_description.sql`
- **示例**：`20260303040000_add_user_profile_fields.sql`
- **要求**：
  - 使用UTC时间戳
  - 描述使用英文短横线分隔
  - 描述应简明扼要，反映迁移内容

### 1.2 迁移文件结构规范
```sql
-- ========================================
-- 迁移描述：简要说明本次迁移的目的
-- 作者：[开发者姓名]
-- 创建时间：YYYY-MM-DD HH:MM:SS
-- 关联需求：[需求编号或描述]
-- ========================================

BEGIN;

-- 1. 表结构变更
-- 2. 数据迁移
-- 3. 约束和索引
-- 4. RLS策略

COMMIT;
```

### 1.3 迁移操作规范
1. **原子性操作**：每个迁移文件必须是原子操作，要么全部成功，要么全部失败
2. **可逆性**：重要变更应提供回滚脚本
3. **测试验证**：迁移后必须验证数据完整性和业务逻辑
4. **版本控制**：所有迁移文件必须提交到版本控制系统

## 2. 表设计规范

### 2.1 命名规范
- **表名**：使用复数形式，小写，下划线分隔，如`profiles`, `trade_orders`
- **字段名**：小写，下划线分隔，如`user_id`, `created_at`
- **约束名**：`表名_字段名_约束类型`，如`profiles_admin_level_check`
- **索引名**：`idx_表名_字段名`，如`idx_profiles_role`

### 2.2 数据类型规范
```sql
-- 正确示例
CREATE TABLE profiles (
    id UUID PRIMARY KEY,                    -- 主键使用UUID
    email TEXT UNIQUE NOT NULL,             -- 文本字段使用TEXT
    balance NUMERIC(20, 2) DEFAULT 0.00,    -- 金额使用NUMERIC(20,2)
    quantity NUMERIC(20, 4) DEFAULT 0,      -- 数量使用NUMERIC(20,4)
    status TEXT DEFAULT 'ACTIVE',           -- 状态使用TEXT
    created_at TIMESTAMPTZ DEFAULT NOW(),   -- 时间戳使用TIMESTAMPTZ
    metadata JSONB                          -- 扩展数据使用JSONB
);
```

### 2.3 约束规范
1. **NOT NULL约束**：所有必填字段必须添加NOT NULL约束
2. **默认值**：为常用字段设置合理的默认值
3. **外键约束**：所有关联关系必须使用外键约束
4. **检查约束**：枚举值字段必须使用CHECK约束

### 2.4 金融交易表特殊要求
```sql
-- 交易相关表必须包含以下审计字段
CREATE TABLE trades (
    id TEXT PRIMARY KEY,                    -- 交易ID（业务ID）
    user_id UUID NOT NULL REFERENCES profiles(id),
    symbol TEXT NOT NULL,                    -- 证券代码
    trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL', 'IPO', 'BLOCK')),
    price NUMERIC(20, 4) NOT NULL,          -- 价格（保留4位小数）
    quantity NUMERIC(20, 4) NOT NULL,       -- 数量（保留4位小数）
    amount NUMERIC(20, 2) NOT NULL,         -- 金额（保留2位小数）
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'MATCHED', 'CANCELLED', 'SETTLED')),
    
    -- 审计字段
    created_by UUID REFERENCES profiles(id), -- 创建人
    approved_by UUID REFERENCES profiles(id), -- 审核人
    matched_by UUID REFERENCES profiles(id), -- 撮合人
    settled_by UUID REFERENCES profiles(id), -- 结算人
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    matched_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    
    -- 版本控制（防止并发修改）
    version INTEGER DEFAULT 1
);
```

## 3. RLS（行级安全）策略规范

### 3.1 基本原则
1. **默认拒绝**：所有表默认启用RLS，默认策略为拒绝所有操作
2. **最小权限**：只授予必要的最小权限
3. **基于角色的访问控制**：根据用户角色和业务需求设计策略

### 3.2 策略命名规范
```sql
-- 格式："[角色/操作] [表名] [条件]"
CREATE POLICY "Users view own profiles" ON profiles 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins manage all profiles" ON profiles 
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));
```

### 3.3 常见策略模式
```sql
-- 1. 用户只能访问自己的数据
CREATE POLICY "Users access own data" ON user_data 
    FOR ALL USING (auth.uid() = user_id);

-- 2. 管理员可以访问所有数据
CREATE POLICY "Admins access all data" ON user_data 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND admin_level IN ('admin', 'super_admin')
        )
    );

-- 3. 公开只读数据
CREATE POLICY "Public read access" ON market_data 
    FOR SELECT USING (true);

-- 4. 基于状态的访问控制
CREATE POLICY "Active users can trade" ON trades 
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status = 'ACTIVE'
        )
    );
```

### 3.4 金融系统特殊策略
```sql
-- 交易时间限制（仅交易时间可操作）
CREATE POLICY "Trading hours only" ON trades 
    FOR INSERT WITH CHECK (
        EXTRACT(HOUR FROM CURRENT_TIME) BETWEEN 9 AND 15
        AND EXTRACT(DOW FROM CURRENT_DATE) BETWEEN 1 AND 5
    );

-- 风险控制策略
CREATE POLICY "Risk control check" ON trades 
    FOR INSERT WITH CHECK (
        -- 检查用户风险等级
        (SELECT risk_level FROM profiles WHERE id = auth.uid()) IN ('C1', 'C2', 'C3', 'C4', 'C5')
        -- 检查单笔交易限额
        AND amount <= 1000000
        -- 检查日累计限额
        AND (
            SELECT COALESCE(SUM(amount), 0) 
            FROM trades 
            WHERE user_id = auth.uid() 
            AND DATE(created_at) = CURRENT_DATE
        ) + amount <= 5000000
    );
```

## 4. Edge Functions开发规范

### 4.1 函数结构规范
```typescript
// functions/function-name/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 验证请求
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // 2. 创建Supabase客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. 验证用户身份
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // 4. 业务逻辑处理
    const requestData = await req.json()
    
    // 5. 数据验证
    if (!requestData.requiredField) {
      throw new Error('Missing required field')
    }

    // 6. 数据库操作
    const { data, error } = await supabaseClient
      .from('table_name')
      .insert({ ...requestData, user_id: user.id })
      .select()
      .single()

    if (error) {
      throw error
    }

    // 7. 返回响应
    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    // 8. 错误处理
    console.error('Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Unauthorized') ? 401 : 400,
      }
    )
  }
})
```

### 4.2 安全规范
1. **身份验证**：所有函数必须验证JWT令牌
2. **输入验证**：验证所有输入参数
3. **错误处理**：不暴露内部错误信息
4. **日志记录**：记录关键操作和错误
5. **速率限制**：实现API调用频率限制

### 4.3 金融交易函数特殊要求
```typescript
// 交易相关函数必须包含以下检查
async function validateTradeRequest(userId: string, tradeData: any) {
  // 1. 用户状态检查
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('status, risk_level, balance')
    .eq('id', userId)
    .single()

  if (profile.status !== 'ACTIVE') {
    throw new Error('用户账户非活跃状态')
  }

  // 2. 风险等级检查
  const allowedRiskLevels = ['C1', 'C2', 'C3', 'C4', 'C5']
  if (!allowedRiskLevels.includes(profile.risk_level)) {
    throw new Error('用户风险等级不符合要求')
  }

  // 3. 资金检查
  if (tradeData.amount > profile.balance) {
    throw new Error('资金不足')
  }

  // 4. 交易时间检查
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0=周日, 1=周一, ..., 6=周六
  
  if (day === 0 || day === 6) {
    throw new Error('非交易日')
  }
  
  if (hour < 9 || hour >= 15) {
    throw new Error('非交易时间')
  }

  // 5. 单笔限额检查
  if (tradeData.amount > 1000000) {
    throw new Error('单笔交易超过限额')
  }

  // 6. 日累计限额检查
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const { data: todayTrades } = await supabaseClient
    .from('trades')
    .select('amount')
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString())

  const todayTotal = todayTrades?.reduce((sum, trade) => sum + trade.amount, 0) || 0
  if (todayTotal + tradeData.amount > 5000000) {
    throw new Error('日累计交易超过限额')
  }
}
```

## 5. 数据库操作最佳实践

### 5.1 查询优化
```sql
-- 1. 使用索引
CREATE INDEX idx_trades_user_id_created_at ON trades(user_id, created_at DESC);

-- 2. 避免SELECT *
SELECT id, symbol, price, quantity FROM trades WHERE user_id = $1;

-- 3. 使用EXPLAIN分析查询计划
EXPLAIN ANALYZE SELECT * FROM trades WHERE user_id = 'uuid' AND created_at >= NOW() - INTERVAL '7 days';

-- 4. 分页查询
SELECT * FROM trades 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
```

### 5.2 事务管理
```sql
BEGIN;

-- 1. 资金扣减
UPDATE profiles 
SET balance = balance - $1 
WHERE id = $2 AND balance >= $1;

-- 2. 创建交易记录
INSERT INTO trades (id, user_id, symbol, price, quantity, amount, status)
VALUES ($3, $2, $4, $5, $6, $1, 'PENDING');

-- 3. 记录资金流水
INSERT INTO fund_flows (user_id, type, amount, balance_before, balance_after)
SELECT $2, 'TRADE', $1, balance + $1, balance
FROM profiles WHERE id = $2;

COMMIT;
```

### 5.3 并发控制
```sql
-- 使用乐观锁
UPDATE profiles 
SET balance = $1, version = version + 1
WHERE id = $2 AND version = $3;

-- 使用行级锁
SELECT * FROM accounts 
WHERE id = $1 FOR UPDATE;
```

## 6. 数据备份与恢复

### 6.1 备份策略
1. **每日全量备份**：保留最近7天
2. **每小时增量备份**：保留最近24小时
3. **交易日志备份**：实时备份到异地

### 6.2 恢复流程
```sql
-- 1. 停止应用服务
-- 2. 恢复最新全量备份
pg_restore -d database_name backup_file.dump

-- 3. 应用增量备份
-- 4. 验证数据完整性
-- 5. 重新启动应用服务
```

### 6.3 灾难恢复
1. **RTO（恢复时间目标）**：< 4小时
2. **RPO（恢复点目标）**：< 15分钟数据丢失
3. **异地备份**：数据备份到不同地理区域

## 7. 监控与告警

### 7.1 监控指标
1. **数据库连接数**：监控活跃连接和空闲连接
2. **查询性能**：监控慢查询和查询吞吐量
3. **存储使用**：监控数据库存储增长
4. **复制延迟**：监控主从复制延迟

### 7.2 告警规则
```yaml
# 数据库告警规则
rules:
  - alert: HighDatabaseConnections
    expr: supabase_database_connections > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "数据库连接数过高"
      description: "数据库连接数超过100，当前值为{{ $value }}"
  
  - alert: SlowQueryDetected
    expr: rate(supabase_slow_queries_total[5m]) > 10
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "检测到慢查询"
      description: "过去5分钟内慢查询数量超过10个"
```

## 8. 安全与合规

### 8.1 数据加密
1. **传输加密**：所有连接使用TLS 1.3
2. **静态加密**：数据库存储层加密
3. **字段级加密**：敏感字段（如身份证号）额外加密

### 8.2 访问控制
1. **最小权限原则**：每个角色只授予必要权限
2. **多因素认证**：管理员操作需要MFA
3. **操作审计**：记录所有数据库操作日志

### 8.3 合规要求
1. **数据保留策略**：交易记录保留至少5年
2. **审计日志**：保留所有操作日志至少1年
3. **数据脱敏**：测试环境使用脱敏数据

## 9. 开发流程

### 9.1 新功能开发流程
1. **需求分析**：明确数据库变更需求
2. **设计评审**：数据库设计文档评审
3. **迁移开发**：编写迁移脚本
4. **测试验证**：在测试环境验证迁移
5. **代码审查**：团队代码审查
6. **生产部署**：按计划部署到生产环境

### 9.2 紧急修复流程
1. **问题诊断**：快速定位问题原因
2. **修复方案**：设计最小化修复方案
3. **紧急评审**：快速技术评审
4. **实施修复**：执行修复操作
5. **验证监控**：验证修复效果并持续监控

## 10. 附录

### 10.1 常用命令
```bash
# 启动本地Supabase
supabase start

# 停止本地Supabase
supabase stop

# 创建新迁移
supabase migration new add_user_profile_fields

# 应用迁移
supabase db push

# 重置数据库
supabase db reset

# 查看数据库状态
supabase status
```

### 10.2 参考文档
- [Supabase官方文档](https://supabase.com/docs)
- [PostgreSQL文档](https://www.postgresql.org/docs/)
- [金融行业数据库设计规范](https://www.example.com/financial-db-standards)

### 10.3 版本历史
| 版本 | 日期 | 作者 | 说明 |
|------|------|------|------|
| 1.0.0 | 2026-03-03 | 系统架构组 | 初始版本 |
| 1.1.0 | 2026-03-10 | 数据库团队 | 添加金融交易特殊规范 |

---

**最后更新**：2026-03-03  
**生效日期**：立即生效  
**适用范围**：银河证券管理系统所有Supabase数据库操作