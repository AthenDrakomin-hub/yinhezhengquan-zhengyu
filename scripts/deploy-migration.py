#!/usr/bin/env python3
"""
撮合引擎部署脚本
通过 sql-exec Edge Function 执行数据库迁移
"""

import os
import json
import requests
from pathlib import Path

def load_env():
    """加载 .env 文件"""
    env_file = Path('.env')
    if not env_file.exists():
        print("错误: .env 文件不存在")
        return None, None
    
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

def execute_migration(supabase_url: str, supabase_key: str, sql: str):
    """执行 SQL 迁移"""
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
    print("=" * 50)
    print("撮合引擎部署脚本")
    print("=" * 50)
    print()
    
    # 加载环境变量
    supabase_url, supabase_key = load_env()
    
    if not supabase_url or not supabase_key:
        print("错误: 缺少必要的环境变量")
        return
    
    print(f"Supabase URL: {supabase_url}")
    print()
    
    # 读取迁移文件
    migration_file = Path('supabase/migrations/20250804000000_match_orders_safe.sql')
    
    if not migration_file.exists():
        print(f"错误: 迁移文件不存在: {migration_file}")
        return
    
    sql_content = migration_file.read_text(encoding='utf-8')
    
    print("执行数据库迁移...")
    print()
    
    # 执行迁移
    status_code, result = execute_migration(supabase_url, supabase_key, sql_content)
    
    print(f"HTTP 状态码: {status_code}")
    print("响应内容:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()
    
    if status_code and 200 <= status_code < 300:
        print("✓ 迁移执行成功！")
        print()
        print("下一步:")
        print("1. 在 Dashboard → Settings → Edge Functions 设置环境变量:")
        print("   - PROJECT_URL=https://kvlvbhzrrpspzaoiormt.supabase.co")
        print("   - SERVICE_ROLE_KEY=<从 Settings → API 获取>")
        print()
        print("2. 部署 match-orders Edge Function:")
        print("   方式1: supabase functions deploy match-orders")
        print("   方式2: 在 Dashboard 中手动创建函数")
    else:
        print("✗ 迁移执行失败")
        print()
        print("请在 Supabase Dashboard SQL Editor 中手动执行迁移文件:")
        print(f"文件路径: {migration_file}")
        print()
        print("Dashboard 地址: https://supabase.com/dashboard/project/kvlvbhzrrpspzaoiormt/sql/new")

if __name__ == '__main__':
    main()
