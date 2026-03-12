#!/usr/bin/env python3
"""
检查管理端 RLS 策略
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
    print("检查管理端 RLS 策略")
    print("=" * 70)
    
    # 1. 检查新表的 RLS 策略
    print("\n📋 检查新表的 RLS 策略:")
    
    tables = ['conditional_orders', 'user_notifications', 'notification_settings', 'asset_snapshots', 'education_progress']
    
    for table in tables:
        result = exec_sql(f"""
            SELECT policyname, permissive, roles, cmd, qual 
            FROM pg_policies 
            WHERE tablename = '{table}'
        """)
        print(f"\n  {table}:")
        if "error" in result:
            print(f"    ❌ 错误: {result['error'][:100]}")
        elif result:
            for policy in (result if isinstance(result, list) else []):
                print(f"    - {policy.get('policyname', 'N/A')}: {policy.get('cmd', 'N/A')}")
        else:
            print(f"    ⚠️ 无策略")
    
    # 2. 检查关键业务表的 RLS 策略
    print("\n\n📋 检查关键业务表的 RLS 策略:")
    
    core_tables = ['assets', 'positions', 'trades', 'profiles', 'trading_hours', 'approval_rules', 'fast_channel_rules']
    
    for table in core_tables:
        result = exec_sql(f"""
            SELECT policyname, permissive, roles, cmd 
            FROM pg_policies 
            WHERE tablename = '{table}'
        """)
        print(f"\n  {table}:")
        if "error" in result:
            print(f"    ❌ 错误: {result['error'][:100]}")
        elif result:
            for policy in (result if isinstance(result, list) else []):
                print(f"    - {policy.get('policyname', 'N/A')}: {policy.get('cmd', 'N/A')}")
        else:
            print(f"    ⚠️ 无策略或表不存在")
    
    # 3. 检查管理员角色
    print("\n\n👤 检查管理员账户:")
    result = exec_sql("""
        SELECT id, email, role, admin_level 
        FROM profiles 
        WHERE role = 'admin' OR admin_level IN ('admin', 'super_admin')
        LIMIT 5
    """)
    if "error" not in result and result:
        for admin in (result if isinstance(result, list) else []):
            print(f"  - {admin}")
    else:
        print(f"  查询结果: {result}")

if __name__ == "__main__":
    main()
