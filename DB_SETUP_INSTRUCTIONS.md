# 数据库设置说明

## 重要提醒
本项目使用 Supabase 作为数据库后端。要正确设置新股申购（IPO）功能所需的数据库表结构，请按以下步骤操作。

## 前提条件
确保已安装 Supabase CLI：
```bash
# 安装 Supabase CLI
npm install -g supabase

# 或者使用 Homebrew (macOS)
brew install supabase/tap/supabase
```

## 数据库迁移步骤

### 1. 登录 Supabase
```bash
supabase login
```

### 2. 链接到远程项目（如果适用）
```bash
supabase link --project-ref <your-project-ref>
```

### 3. 执行数据库迁移
```bash
# 推送所有迁移
supabase db push

# 或者，如果你想先本地运行迁移
supabase db reset
```

### 4. 验证表结构
迁移完成后，验证 `ipos` 表是否已正确创建和扩展：

```sql
-- 检查表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ipos'
ORDER BY ordinal_position;
```

## 手动创建表（备用方案）
如果迁移失败，你可以手动创建表：

```sql
-- 创建基础 ipos 表
CREATE TABLE IF NOT EXISTS public.ipos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price NUMERIC(10,2),
    change NUMERIC(10,2) DEFAULT 0,
    change_percent NUMERIC(5,2) DEFAULT 0,
    market TEXT NOT NULL CHECK (market IN ('CN', 'HK', 'US', 'OTHER')),
    listing_date DATE,
    status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'LISTED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加扩展字段
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS subscription_code TEXT;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS issue_volume BIGINT;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS online_issue_volume BIGINT;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS pe_ratio NUMERIC(8,2);
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS online_issue_date DATE;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS lottery_date DATE;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS refund_date DATE;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS listing_date_plan DATE;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS issue_method TEXT;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS underwriter TEXT;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS min_subscription_unit INTEGER DEFAULT 500;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS max_subscription_quantity BIGINT;
ALTER TABLE public.ipos ADD COLUMN IF NOT EXISTS lockup_period INTEGER;

-- 添加 RLS 策略（如果还没有）
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可读新股信息" ON public.ipos;
CREATE POLICY "所有人可读新股信息" ON public.ipos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "仅管理员可管理新股信息" ON public.ipos;
CREATE POLICY "仅管理员可管理新股信息" ON public.ipos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ipos_subscription_code ON public.ipos(subscription_code);
CREATE INDEX IF NOT EXISTS idx_ipos_online_issue_date ON public.ipos(online_issue_date);
CREATE INDEX IF NOT EXISTS idx_ipos_status_subscription_date ON public.ipos(status, online_issue_date);
CREATE INDEX IF NOT EXISTS idx_ipos_listing_date ON public.ipos(listing_date);
```

## 验证设置
运行以下命令验证数据库设置：

```bash
# 运行数据库检查脚本
npm run init-db
```

## 同步 IPO 数据
一旦数据库设置完成，你可以同步 IPO 数据：

```bash
# 同步 IPO 数据
npm run sync-ipo
```

## 故障排除

### 如果收到 "relation 'public.ipos' does not exist" 错误
1. 确认 Supabase 项目已正确链接
2. 运行 `supabase db push` 应用迁移
3. 检查迁移文件是否按正确顺序排列

### 如果迁移失败
检查迁移文件的时间戳顺序，确保：
- `20250329000002_add_content_tables.sql` （创建基础表）
- `20250401000005_extend_ipos_table.sql` （扩展表）

## 注意事项
- 扩展表的迁移文件已设计为安全执行（使用 IF NOT EXISTS 子句）
- 所有更改都是向后兼容的，不会删除现有数据
- 建议在生产环境中先在测试环境中验证迁移