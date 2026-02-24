-- 先删除旧的不符合规范的函数（避免冲突）
DROP FUNCTION IF EXISTS public.send_sms(jsonb);

-- 创建符合Supabase Send SMS Hook要求的函数
CREATE OR REPLACE FUNCTION public.send_sms(payload jsonb)
RETURNS jsonb -- 强制要求：返回值必须是jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Supabase固定传入的参数，从payload中解析
  phone_number text := payload->>'phone'; -- 接收手机号
  sms_content text := payload->>'message'; -- 短信内容
  sms_channel text := payload->>'channel'; -- 短信渠道（sms/whatsapp）
  is_success boolean := false;
  error_msg text := '';
BEGIN
  -- 1. 写入短信日志到你的sms_logs表
  INSERT INTO public.sms_logs (
    phone_number, 
    message, 
    channel, 
    sent_at, 
    status
  ) VALUES (
    phone_number,
    sms_content,
    sms_channel,
    NOW(),
    'pending'
  );

  -- 2. 你的短信发送核心逻辑
  -- 示例1：读取你的sms_config配置
  -- 示例2：调用第三方短信API（需要先开启pg_net扩展）
  /*
  SELECT net.http_post(
    url := 'https://你的短信服务商API地址',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 你的API密钥'
    ),
    body := jsonb_build_object(
      'mobile', phone_number,
      'content', sms_content
    )
  ) INTO is_success;
  */

  -- 测试用：先默认返回成功，调试完成后替换为真实发送逻辑
  is_success := true;

  -- 3. 更新短信发送状态
  UPDATE public.sms_logs
  SET status = CASE WHEN is_success THEN 'sent' ELSE 'failed' END,
      error_msg = error_msg
  WHERE phone_number = phone_number
    AND sent_at >= NOW() - INTERVAL '5 seconds';

  -- 4. 强制要求：必须返回固定格式的jsonb
  RETURN jsonb_build_object(
    'success', is_success,
    'error', CASE WHEN NOT is_success THEN error_msg ELSE NULL END
  );

-- 异常捕获
EXCEPTION WHEN OTHERS THEN
  UPDATE public.sms_logs
  SET status = 'failed',
      error_msg = SQLERRM
  WHERE phone_number = phone_number
    AND sent_at >= NOW() - INTERVAL '5 seconds';

  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END $$;

-- 关键权限配置：必须给Supabase Auth系统角色授权，否则Hook看不到也调用不了函数
GRANT EXECUTE ON FUNCTION public.send_sms(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- 给你的表授权，避免函数操作表时报错
GRANT SELECT, INSERT, UPDATE ON TABLE public.sms_logs TO supabase_auth_admin;
GRANT SELECT ON TABLE public.sms_config TO supabase_auth_admin;

-- 如果你用pg_net调用外部API，需要额外授权
-- GRANT USAGE ON SCHEMA net TO supabase_auth_admin;