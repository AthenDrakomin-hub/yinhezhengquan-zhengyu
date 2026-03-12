#!/usr/bin/env python3
"""
添加管理员访问所有数据的 RLS 策略
"""

import json
import urllib.request
import urllib.error

SUPABASE_URL = "https://rfnrosyfeivcbkimjlwo.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbnJvc3lmZWl2Y2JraW1qbHdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU1NDA2MywiZXhwIjoyMDgzMTMwMDYzfQ.QpI-mg-0yTClhaVkiXT2C5AdW9YOLnlmJPKeOmoIFjQ"

def exec_sql(sql: str) -> dict:
    """执行 SQL 语句"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    data = json.dumps({"sql": sql}).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}"
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {"error": error_body, "status": e.code}

def main():
    print("=" * 70)
    print("添加管理员 RLS 策略")
    print("=" * 70)
    
    # 管理员检查条件
    admin_check = "EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')"
    
    # 需要添加管理员策略的表
    tables_with_admin_access = [
        # 新创建的表
        ('conditional_orders', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('user_notifications', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('notification_settings', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('asset_snapshots', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('education_progress', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        
        # 核心业务表（确保管理员有权限）
        ('assets', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('positions', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('trades', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('profiles', ['SELECT', 'INSERT', 'UPDATE']),
        ('watchlist', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('user_configs', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('tickets', ['SELECT', 'INSERT', 'UPDATE']),
        ('trade_match_pool', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('education_topics', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        
        # 系统配置表
        ('trading_hours', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('approval_rules', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('fast_channel_rules', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('news', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('banners', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ('ipos', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
    ]
    
    success_count = 0
    error_count = 0
    
    for table, operations in tables_with_admin_access:
        print(f"\n📊 处理表: {table}")
        
        for op in operations:
            policy_name = f"Admin {op.lower()} all {table}"
            
            # 先删除旧策略
            drop_sql = f"DROP POLICY IF EXISTS \"{policy_name}\" ON {table}"
            exec_sql(drop_sql)
            
            # 创建新策略
            if op == 'SELECT':
                create_sql = f"""
                    CREATE POLICY "{policy_name}" ON {table}
                    FOR {op} USING ({admin_check})
                """
            elif op == 'INSERT':
                create_sql = f"""
                    CREATE POLICY "{policy_name}" ON {table}
                    FOR {op} WITH CHECK ({admin_check})
                """
            elif op == 'UPDATE':
                create_sql = f"""
                    CREATE POLICY "{policy_name}" ON {table}
                    FOR {op} USING ({admin_check}) WITH CHECK ({admin_check})
                """
            elif op == 'DELETE':
                create_sql = f"""
                    CREATE POLICY "{policy_name}" ON {table}
                    FOR {op} USING ({admin_check})
                """
            else:
                continue
            
            result = exec_sql(create_sql)
            if "error" in result:
                # 可能是表不存在或其他错误
                error_msg = result['error']
                if "relation" in error_msg.lower() and "does not exist" in error_msg.lower():
                    print(f"  ⚠️ 表不存在: {table}")
                else:
                    print(f"  ❌ {op}: {error_msg[:100]}")
                error_count += 1
            else:
                print(f"  ✅ {op}")
                success_count += 1
    
    print("\n" + "=" * 70)
    print(f"完成！成功: {success_count}, 失败: {error_count}")
    print("=" * 70)

if __name__ == "__main__":
    main()
