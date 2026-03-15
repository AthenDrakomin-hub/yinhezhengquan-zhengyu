-- =====================================================
-- 用户待办事项表迁移脚本
-- 包含：待办事项表、触发器、RLS策略
-- =====================================================

-- 1. 用户待办事项表 (user_todos)
CREATE TABLE IF NOT EXISTS user_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 待办类型
    todo_type VARCHAR(30) NOT NULL, 
    -- 'RISK_ASSESSMENT' (风险测评过期)
    -- 'IPO_SUBSCRIPTION' (新股申购)
    -- 'DOCUMENT_UPDATE' (资料更新)
    -- 'AGREEMENT_SIGN' (协议签署)
    -- 'VERIFICATION' (身份验证)
    -- 'TRADE_REVIEW' (交易复盘)
    -- 'SYSTEM' (系统任务)
    
    -- 标题和描述
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 关联信息
    related_type VARCHAR(50), -- 'risk_assessment', 'ipo', 'document', 'agreement', 'trade'
    related_id UUID,
    
    -- 优先级
    priority VARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    
    -- 状态
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'EXPIRED'
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- 跳转链接
    action_url VARCHAR(500), -- 点击后跳转的URL
    action_text VARCHAR(100), -- 操作按钮文字，如"立即测评"、"去申购"
    
    -- 有效期
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 提醒设置
    remind_at TIMESTAMP WITH TIME ZONE,
    is_reminded BOOLEAN DEFAULT FALSE,
    
    -- 元数据
    metadata JSONB, -- 扩展信息
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_todo_type CHECK (todo_type IN (
        'RISK_ASSESSMENT', 'IPO_SUBSCRIPTION', 'DOCUMENT_UPDATE', 
        'AGREEMENT_SIGN', 'VERIFICATION', 'TRADE_REVIEW', 'SYSTEM'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    CONSTRAINT valid_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED', 'EXPIRED'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_todos_user_id ON user_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_todos_status ON user_todos(status);
CREATE INDEX IF NOT EXISTS idx_user_todos_type ON user_todos(todo_type);
CREATE INDEX IF NOT EXISTS idx_user_todos_priority ON user_todos(priority);
CREATE INDEX IF NOT EXISTS idx_user_todos_expires_at ON user_todos(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_todos_created_at ON user_todos(created_at DESC);

-- 2. 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_user_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_todos_updated_at
    BEFORE UPDATE ON user_todos
    FOR EACH ROW
    EXECUTE FUNCTION update_user_todos_updated_at();

-- 3. RLS 策略
ALTER TABLE user_todos ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的待办事项
CREATE POLICY "Users can view own todos"
    ON user_todos FOR SELECT
    USING (auth.uid() = user_id);

-- 用户可以插入自己的待办事项
CREATE POLICY "Users can insert own todos"
    ON user_todos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的待办事项
CREATE POLICY "Users can update own todos"
    ON user_todos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的待办事项
CREATE POLICY "Users can delete own todos"
    ON user_todos FOR DELETE
    USING (auth.uid() = user_id);

-- 4. 辅助函数：获取用户待办统计
CREATE OR REPLACE FUNCTION get_user_todo_stats(p_user_id UUID)
RETURNS TABLE (
    total_count BIGINT,
    pending_count BIGINT,
    high_priority_count BIGINT,
    expired_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::BIGINT as pending_count,
        COUNT(*) FILTER (WHERE priority IN ('HIGH', 'URGENT') AND status = 'PENDING')::BIGINT as high_priority_count,
        COUNT(*) FILTER (WHERE status = 'EXPIRED' OR (expires_at IS NOT NULL AND expires_at < NOW() AND status = 'PENDING'))::BIGINT as expired_count
    FROM user_todos
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 辅助函数：自动过期待办事项
CREATE OR REPLACE FUNCTION expire_overdue_todos()
RETURNS void AS $$
BEGIN
    UPDATE user_todos
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE status = 'PENDING'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建定时任务：每天凌晨自动过期待办事项（需要 pg_cron 扩展）
-- 如果 pg_cron 已启用，取消下面的注释
-- SELECT cron.schedule(
--     'expire-overdue-todos',
--     '0 0 * * *', -- 每天凌晨执行
--     $$SELECT expire_overdue_todos()$$
-- );

-- 7. 插入示例数据（仅用于测试，生产环境应删除）
-- 注意：这里使用硬编码的 user_id，实际使用时需要替换为真实用户ID
-- INSERT INTO user_todos (user_id, todo_type, title, description, priority, action_url, action_text) VALUES
--     ('用户UUID', 'RISK_ASSESSMENT', '风险测评即将过期', '您的风险承受能力评估即将过期，请及时更新以确保交易正常进行', 'HIGH', '/client/profile/risk-assessment', '立即测评'),
--     ('用户UUID', 'IPO_SUBSCRIPTION', '新股申购提醒', '今日有2只新股可申购，点击查看详情', 'NORMAL', '/client/ipo', '去申购');
