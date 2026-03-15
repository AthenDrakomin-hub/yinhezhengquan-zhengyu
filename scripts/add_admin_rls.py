#!/usr/bin/env python3
"""
添加管理员访问所有数据的 RLS 策略
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
    print("添加管理员 RLS 策略")
    print("=" * 70)
    
    try:
        # 连接数据库
        print("\n[1/2] 连接远程 Supabase PostgreSQL...")
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        print("  ✓ 连接成功")
        
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
            
            # 扩展功能表
            ('etf_products', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
            ('wealth_products', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
            ('sectors', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
            ('sector_stocks', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
            ('margin_accounts', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
            ('margin_positions', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
            ('user_settings', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
        ]
        
        success_count = 0
        error_count = 0
        
        print("\n[2/2] 添加 RLS 策略...")
        
        for table, operations in tables_with_admin_access:
            print(f"\n📊 处理表: {table}")
            
            for op in operations:
                policy_name = f"Admin {op.lower()} all {table}"
                
                try:
                    # 先删除旧策略
                    cursor.execute(f"DROP POLICY IF EXISTS \"{policy_name}\" ON public.{table}")
                    
                    # 创建新策略
                    if op == 'SELECT':
                        create_sql = f"""
                            CREATE POLICY "{policy_name}" ON public.{table}
                            FOR {op} USING ({admin_check})
                        """
                    elif op == 'INSERT':
                        create_sql = f"""
                            CREATE POLICY "{policy_name}" ON public.{table}
                            FOR {op} WITH CHECK ({admin_check})
                        """
                    elif op == 'UPDATE':
                        create_sql = f"""
                            CREATE POLICY "{policy_name}" ON public.{table}
                            FOR {op} USING ({admin_check}) WITH CHECK ({admin_check})
                        """
                    elif op == 'DELETE':
                        create_sql = f"""
                            CREATE POLICY "{policy_name}" ON public.{table}
                            FOR {op} USING ({admin_check})
                        """
                    else:
                        continue
                    
                    cursor.execute(create_sql)
                    print(f"  ✅ {op}")
                    success_count += 1
                    
                except Exception as e:
                    error_msg = str(e)
                    if "relation" in error_msg.lower() and "does not exist" in error_msg.lower():
                        print(f"  ⚠️ 表不存在: {table}")
                        break
                    else:
                        print(f"  ❌ {op}: {error_msg[:100]}")
                    error_count += 1
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 70)
        print(f"✓ 完成！成功: {success_count}, 失败: {error_count}")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n✗ 执行失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    main()
