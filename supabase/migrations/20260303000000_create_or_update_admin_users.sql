-- Up migration: create table if not exists and ensure columns/constraints
BEGIN;

-- 1) 创建 enum 类型（如果尚不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'admin_user_role'
  ) THEN
    CREATE TYPE public.admin_user_role AS ENUM ('super_admin', 'admin');
  END IF;
END $$;

-- 2) 创建表（如果不存在）
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 下面的列在后续会用 ALTER TABLE 添加/修改以兼容已有表
  notes TEXT,
  last_login_at TIMESTAMPTZ
);

-- 3) 确保 role 列存在并使用 ENUM 类型（或回退为 VARCHAR 若无法转换）
-- 如果 role 列不存在，添加并使用 enum type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'admin_users' 
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.admin_users ADD COLUMN role public.admin_user_role NOT NULL DEFAULT 'admin';
  ELSE
    -- 如果存在但类型不是 enum，尝试转换为 enum safely
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='admin_users' 
          AND column_name='role') <> 'USER-DEFINED' THEN
      -- 将现有字符串列临时改名并创建新列为 enum，然后迁移数据
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' 
          AND table_name='admin_users' 
          AND column_name='role_old_tmp'
      ) THEN
        ALTER TABLE public.admin_users RENAME COLUMN role TO role_old_tmp;
        ALTER TABLE public.admin_users ADD COLUMN role public.admin_user_role NOT NULL DEFAULT 'admin';
        UPDATE public.admin_users SET role = role_old_tmp::text WHERE role_old_tmp IS NOT NULL;
        ALTER TABLE public.admin_users DROP COLUMN role_old_tmp;
      END IF;
    END IF;
  END IF;
END $$;

-- 4) 确保 notes 与 last_login_at 列存在（如果尚不存在则添加）
ALTER TABLE public.admin_users 
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 5) Ensure updated_at is kept current via trigger
-- 创建或替换函数以更新 updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 如果触发器不存在则创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'admin_users_set_timestamp'
  ) THEN
    CREATE TRIGGER admin_users_set_timestamp
      BEFORE UPDATE ON public.admin_users
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_set_timestamp();
  END IF;
END $$;

-- 6) 索引（若需要）
CREATE INDEX IF NOT EXISTS idx_admin_users_created_at ON public.admin_users (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_login_at ON public.admin_users (last_login_at);

COMMIT;

-- Down migration (rollback): drop table and enum (optional)
-- 注意：回滚将删除表与类型，请谨慎执行
-- BEGIN;
-- DROP TABLE IF EXISTS public.admin_users;
-- DROP TYPE IF EXISTS public.admin_user_role;
-- COMMIT;

-- 说明与注意事项：
-- 1. 若你偏好 role 为 VARCHAR 而不是 ENUM，将上面创建 ENUM 的部分替换为：
--    ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';
--    并可随后添加 CHECK 约束：
--    ALTER TABLE public.admin_users ADD CONSTRAINT chk_admin_users_role CHECK (role IN ('super_admin','admin'));
-- 2. 如果你的迁移系统需要单条语句而不是 DO 块，请拆分 DO 块逻辑为多个迁移步骤并在每一步人工确认。
-- 3. 在为 role 应用 ENUM/CHECK 约束前，请确保现有 role 数据均有效，否则迁移会失败。
-- 4. 我已经在之前的操作中插入了两条记录（见你之前的查询）。在执行此迁移前请确认这些记录的 role 值均为 'super_admin' 或 'admin'（当前它们是符合的）。