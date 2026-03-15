-- 登录审计日志表
-- 用于记录登录成功/失败及IP信息

CREATE TABLE IF NOT EXISTS login_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  device_id VARCHAR(255),
  success BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_email ON login_audit_logs(email);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_user_id ON login_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_ip ON login_audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_created_at ON login_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_logs_success ON login_audit_logs(success);

-- 添加注释
COMMENT ON TABLE login_audit_logs IS '登录审计日志表，记录所有登录尝试';
COMMENT ON COLUMN login_audit_logs.email IS '登录邮箱';
COMMENT ON COLUMN login_audit_logs.user_id IS '用户ID（登录成功时填充）';
COMMENT ON COLUMN login_audit_logs.ip_address IS '客户端IP地址';
COMMENT ON COLUMN login_audit_logs.user_agent IS '客户端User-Agent';
COMMENT ON COLUMN login_audit_logs.device_id IS '设备标识';
COMMENT ON COLUMN login_audit_logs.success IS '是否登录成功';
COMMENT ON COLUMN login_audit_logs.message IS '登录结果消息';
COMMENT ON COLUMN login_audit_logs.created_at IS '创建时间';

-- 创建视图：登录失败统计（按IP）
CREATE OR REPLACE VIEW v_login_failed_by_ip AS
SELECT 
  ip_address,
  COUNT(*) as failed_count,
  MAX(created_at) as last_failed_at,
  array_agg(DISTINCT email) as attempted_emails
FROM login_audit_logs
WHERE success = false
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failed_count DESC;

-- 创建视图：登录失败统计（按邮箱）
CREATE OR REPLACE VIEW v_login_failed_by_email AS
SELECT 
  email,
  COUNT(*) as failed_count,
  MAX(created_at) as last_failed_at,
  array_agg(DISTINCT ip_address) as attempted_ips
FROM login_audit_logs
WHERE success = false
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) >= 3
ORDER BY failed_count DESC;

-- 创建视图：最近登录记录
CREATE OR REPLACE VIEW v_recent_logins AS
SELECT 
  l.id,
  l.email,
  l.user_id,
  p.username,
  l.ip_address,
  l.user_agent,
  l.device_id,
  l.success,
  l.message,
  l.created_at
FROM login_audit_logs l
LEFT JOIN profiles p ON l.user_id = p.id
ORDER BY l.created_at DESC
LIMIT 100;

-- 启用行级安全策略
ALTER TABLE login_audit_logs ENABLE ROW LEVEL SECURITY;

-- 仅管理员可以查看所有日志
CREATE POLICY "管理员可以查看所有登录日志"
  ON login_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- 普通用户只能查看自己的登录日志
CREATE POLICY "用户可以查看自己的登录日志"
  ON login_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Edge Function 可以插入日志（使用 service_role）
CREATE POLICY "服务角色可以插入登录日志"
  ON login_audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 数据保留策略：保留90天的日志
-- 可以通过 pg_cron 定期执行清理
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup_login_audit_logs', '0 2 * * *', 
--   $$DELETE FROM login_audit_logs WHERE created_at < NOW() - INTERVAL '90 days'$$);
