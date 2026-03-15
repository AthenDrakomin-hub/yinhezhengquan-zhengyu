#!/usr/bin/env python3
"""
验证迁移结果
"""

import os
import json
import requests
from pathlib import Path

def load_env():
    """加载 .env 文件"""
    env_file = Path('.env')
    supabase_url = None
    supabase_key = None
    
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('VITE_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip('"\'')
            elif line.startswith('VITE_SUPABASE_ANON_KEY='):
                supabase_key = line.split('=', 1)[1].strip('"\'')
    
    return supabase_url, supabase_key

def execute_sql(supabase_url: str, supabase_key: str, sql: str):
    """执行 SQL"""
    function_url = f"{supabase_url}/functions/v1/sql-exec"
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {supabase_key}',
        'apikey': supabase_key
    }
    
    payload = {'sql': sql}
    
    try:
        response = requests.post(function_url, headers=headers, json=payload, timeout=30)
        return response.status_code, response.json()
    except Exception as e:
        return None, {'error': str(e)}

def main():
    supabase_url, supabase_key = load_env()
    
    print("=" * 50)
    print("验证迁移结果")
    print("=" * 50)
    print()
    
    # 1. 检查表
    print("1. 检查表创建...")
    sql = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('match_logs', 'app_config', 'notifications')
    ORDER BY table_name;
    """
    status, result = execute_sql(supabase_url, supabase_key, sql)
    
    if status == 200 and result.get('success'):
        tables = [row['table_name'] for row in result.get('data', [])]
        print(f"   创建的表: {tables}")
        if len(tables) == 3:
            print("   ✓ 所有表创建成功")
        else:
            print(f"   ⚠ 只创建了 {len(tables)}/3 个表")
    else:
        print(f"   ✗ 查询失败: {result}")
    print()
    
    # 2. 检查视图
    print("2. 检查视图创建...")
    sql = """
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name IN ('match_statistics', 'match_status_realtime')
    ORDER BY table_name;
    """
    status, result = execute_sql(supabase_url, supabase_key, sql)
    
    if status == 200 and result.get('success'):
        views = [row['table_name'] for row in result.get('data', [])]
        print(f"   创建的视图: {views}")
        if len(views) == 2:
            print("   ✓ 所有视图创建成功")
        else:
            print(f"   ⚠ 只创建了 {len(views)}/2 个视图")
    else:
        print(f"   ✗ 查询失败: {result}")
    print()
    
    # 3. 检查函数
    print("3. 检查函数创建...")
    sql = """
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name = 'is_trading_time';
    """
    status, result = execute_sql(supabase_url, supabase_key, sql)
    
    if status == 200 and result.get('success'):
        functions = [row['routine_name'] for row in result.get('data', [])]
        if functions:
            print(f"   创建的函数: {functions}")
            print("   ✓ 函数创建成功")
        else:
            print("   ⚠ 函数未创建")
    else:
        print(f"   ✗ 查询失败: {result}")
    print()
    
    # 4. 检查 Realtime 发布
    print("4. 检查 Realtime 发布...")
    sql = """
    SELECT tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime'
      AND tablename IN ('match_logs', 'notifications')
    ORDER BY tablename;
    """
    status, result = execute_sql(supabase_url, supabase_key, sql)
    
    if status == 200 and result.get('success'):
        tables = [row['tablename'] for row in result.get('data', [])]
        print(f"   已发布的表: {tables}")
        if len(tables) >= 2:
            print("   ✓ Realtime 配置成功")
        else:
            print("   ⚠ 部分 Realtime 配置缺失")
    else:
        print(f"   ✗ 查询失败: {result}")
    print()
    
    # 5. 测试插入撮合日志
    print("5. 测试插入撮合日志...")
    sql = """
    INSERT INTO match_logs (batch_id, status, total_orders, matched_count)
    VALUES (gen_random_uuid(), 'COMPLETED', 0, 0)
    RETURNING id, batch_id, status;
    """
    status, result = execute_sql(supabase_url, supabase_key, sql)
    
    if status == 200 and result.get('success'):
        print(f"   插入成功: {result.get('data', [])}")
        print("   ✓ 表可正常写入")
    else:
        print(f"   ✗ 插入失败: {result}")
    print()
    
    print("=" * 50)
    print("验证完成！")
    print("=" * 50)

if __name__ == '__main__':
    main()
