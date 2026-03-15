#!/usr/bin/env python3
"""
检查管理端 RLS 策略
使用数据库直连方式
"""

import os
import sys

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Supabase PostgreSQL 连接信息（Session Pooler）
SUPABASE_DB_URL = os.environ.get(
    "SUPABASE_DB_URL",
    "postgres://postgres.kvlvbhzrrpspzaoiormt:HX0ydyF1nVKMDxMy@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&channel_binding=disable"
)

def main():
    print("=" * 70)
    print("检查管理端 RLS 策略")
    print("=" * 70)
    
    try:
        # 连接数据库
        print("\n[1/3] 连接远程 Supabase PostgreSQL...")
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        print("  ✓ 连接成功")
        
        # 1. 检查新表的 RLS 策略
        print("\n[2/3] 检查新表的 RLS 策略:")
        
        tables = ['conditional_orders', 'user_notifications', 'notification_settings', 'asset_snapshots', 'education_progress']
        
        for table in tables:
            cursor.execute(f"""
                SELECT policyname, permissive, roles, cmd, qual 
                FROM pg_policies 
                WHERE tablename = '{table}'
            """)
            policies = cursor.fetchall()
            print(f"\n  {table}:")
            if policies:
                for policy in policies:
                    print(f"    - {policy[0]}: {policy[3]}")
            else:
                print(f"    ⚠️ 无策略或表不存在")
        
        # 2. 检查关键业务表的 RLS 策略
        print("\n\n[3/3] 检查关键业务表的 RLS 策略:")
        
        core_tables = ['assets', 'positions', 'trades', 'profiles', 'trading_hours', 'approval_rules', 'fast_channel_rules']
        
        for table in core_tables:
            cursor.execute(f"""
                SELECT policyname, permissive, roles, cmd 
                FROM pg_policies 
                WHERE tablename = '{table}'
            """)
            policies = cursor.fetchall()
            print(f"\n  {table}:")
            if policies:
                for policy in policies:
                    print(f"    - {policy[0]}: {policy[3]}")
            else:
                print(f"    ⚠️ 无策略或表不存在")
        
        # 3. 检查管理员角色
        print("\n\n👤 检查管理员账户:")
        cursor.execute("""
            SELECT id, email, role, admin_level 
            FROM profiles 
            WHERE role = 'admin' OR admin_level IN ('admin', 'super_admin')
            LIMIT 5
        """)
        admins = cursor.fetchall()
        if admins:
            for admin in admins:
                print(f"  - ID: {admin[0]}, Email: {admin[1]}, Role: {admin[2]}, Level: {admin[3]}")
        else:
            print("  无管理员账户")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 70)
        print("✓ 检查完成！")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n✗ 检查失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    main()
