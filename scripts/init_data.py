#!/usr/bin/env python3
"""
Supabase 数据初始化脚本
向新创建的表插入初始数据
"""

import os
import sys
import json
from datetime import date, datetime

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Supabase PostgreSQL 连接信息
# 使用 Session Pooler 连接（亚太区域）
SUPABASE_DB_URL = os.environ.get(
    "SUPABASE_DB_URL",
    "postgres://postgres.kvlvbhzrrpspzaoiormt:HX0ydyF1nVKMDxMy@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&channel_binding=disable"
)

# ============================================================
# ETF 产品数据
# ============================================================
ETF_DATA = [
    # 股票型 ETF
    ('510050', '华夏上证50ETF', 'CN', 'stock', 2.856, 0.012, 0.42, 50.0, 0.5, '上证50指数'),
    ('510300', '华泰柏瑞沪深300ETF', 'CN', 'stock', 4.125, 0.025, 0.61, 120.0, 0.5, '沪深300指数'),
    ('159915', '易方达创业板ETF', 'CN', 'stock', 1.856, -0.012, -0.64, 85.0, 0.5, '创业板指数'),
    ('588000', '华夏科创50ETF', 'CN', 'stock', 0.925, 0.008, 0.87, 45.0, 0.5, '科创50指数'),
    ('512880', '国泰中证全指证券公司ETF', 'CN', 'stock', 1.025, 0.015, 1.48, 35.0, 0.6, '证券公司指数'),
    ('512690', '国泰中证煤炭ETF', 'CN', 'stock', 2.356, -0.025, -1.05, 18.0, 0.6, '中证煤炭指数'),
    ('515790', '华泰柏瑞中证光伏产业ETF', 'CN', 'stock', 1.456, 0.032, 2.25, 28.0, 0.5, '光伏产业指数'),
    ('159996', '华夏国证半导体芯片ETF', 'CN', 'stock', 1.125, 0.045, 4.17, 52.0, 0.5, '半导体芯片指数'),
    
    # 债券型 ETF
    ('511010', '国泰上证5年期国债ETF', 'CN', 'bond', 102.56, 0.05, 0.05, 15.0, 0.2, '上证5年期国债指数'),
    ('511220', '海富通中证短融ETF', 'CN', 'bond', 100.25, 0.01, 0.01, 22.0, 0.15, '中证短融指数'),
    
    # 商品型 ETF
    ('518880', '华安黄金易ETF', 'CN', 'commodity', 5.856, 0.025, 0.43, 85.0, 0.5, '黄金现货'),
    ('159934', '易方达黄金ETF', 'CN', 'commodity', 5.862, 0.022, 0.38, 45.0, 0.5, '黄金现货'),
    
    # 货币型 ETF
    ('511880', '银华交易货币ETF', 'CN', 'money', 100.02, 0.001, 0.00, 120.0, 0.1, '货币市场'),
    
    # 跨境 ETF (港股)
    ('159920', '华夏沪深300ETF', 'HK', 'cross', 32.56, 0.15, 0.46, 25.0, 0.8, '恒生指数'),
    ('513050', '易方达中证海外中国互联网50ETF', 'HK', 'cross', 0.856, 0.012, 1.42, 18.0, 0.9, '中国互联网指数'),
]

# ============================================================
# 理财产品数据
# ============================================================
WEALTH_DATA = [
    # 存款类
    ('YH001', '银河稳健理财1号', 'deposit', 3.2, 1000, 90, 1, '热销', '银河证券自营理财产品，稳健增值'),
    ('YH002', '银河季度盈', 'deposit', 3.5, 5000, 180, 2, '新品', '季度结算，收益稳健'),
    ('YH003', '银河年年盈', 'deposit', 3.8, 10000, 365, 2, None, '年度结算，长期持有更优'),
    ('YH004', '银河活期宝', 'deposit', 2.5, 1, None, 1, '灵活', '随存随取，灵活便捷'),
    
    # 基金类
    ('YH005', '银河优选混合基金', 'fund', None, 1000, None, 3, None, '混合型基金，专业团队管理'),
    ('YH006', '银河债券增强基金', 'fund', None, 5000, None, 2, None, '债券型基金，追求稳定收益'),
    
    # 债券类
    ('YH007', '银河国债宝90天', 'bond', 3.0, 10000, 90, 1, None, '国债投资，安全可靠'),
    ('YH008', '银河企业债精选', 'bond', 4.2, 50000, 180, 3, None, '精选企业债，收益较高'),
    
    # 保险类
    ('YH009', '银河养老保障计划', 'insurance', 4.5, 100000, 1825, 2, None, '长期养老规划，稳健增值'),
]

# ============================================================
# 板块数据
# ============================================================
SECTOR_DATA = [
    # 行业板块
    ('BK0001', '半导体', 'industry', 1256.34, 45.23, 3.73, '北方华创', 9.98),
    ('BK0002', '光伏设备', 'industry', 1892.56, -23.45, -1.22, '隆基绿能', 5.32),
    ('BK0003', '锂电池', 'industry', 2345.78, 67.89, 2.98, '宁德时代', 4.56),
    ('BK0004', '白酒', 'industry', 3456.12, -12.34, -0.36, '贵州茅台', 1.23),
    ('BK0005', '医疗器械', 'industry', 1567.89, 34.56, 2.25, '迈瑞医疗', 3.45),
    ('BK0006', '房地产开发', 'industry', 987.65, -45.67, -4.42, '万科A', -2.34),
    ('BK0007', '汽车整车', 'industry', 1789.23, 23.45, 1.33, '比亚迪', 2.67),
    ('BK0008', '银行', 'industry', 876.54, 5.67, 0.65, '招商银行', 1.12),
    ('BK0009', '保险', 'industry', 1234.56, 12.34, 1.01, '中国平安', 0.99),
    ('BK0010', '证券', 'industry', 1567.89, 23.45, 1.52, '中信证券', 2.15),
    
    # 概念板块
    ('BN0001', '人工智能', 'concept', 2567.89, 89.12, 3.60, '科大讯飞', 8.76),
    ('BN0002', '数字经济', 'concept', 1890.34, 56.78, 3.10, '深桑达A', 10.01),
    ('BN0003', '机器人', 'concept', 1234.56, 45.67, 3.84, '拓普集团', 7.89),
    ('BN0004', '新能源车', 'concept', 2345.67, -12.34, -0.52, '比亚迪', 2.67),
    ('BN0005', '元宇宙', 'concept', 987.65, -34.56, -3.38, '歌尔股份', -1.23),
    ('BN0006', 'Chiplet', 'concept', 1678.90, 78.90, 4.93, '通富微电', 10.02),
    ('BN0007', '数据中心', 'concept', 1456.78, 34.56, 2.43, '浪潮信息', 5.67),
    ('BN0008', '低空经济', 'concept', 1123.45, 67.89, 6.43, '万丰奥威', 10.03),
    ('BN0009', '可控核聚变', 'concept', 890.12, 45.67, 5.41, '东方钽业', 8.56),
    ('BN0010', '氢能源', 'concept', 1345.67, 23.45, 1.77, '美锦能源', 4.32),
]


def init_data():
    """初始化数据"""
    print("=" * 60)
    print("Supabase 数据初始化")
    print("=" * 60)
    
    try:
        # 连接数据库
        print("\n[1/4] 连接远程 Supabase PostgreSQL...")
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        print("  ✓ 连接成功")
        
        # 插入 ETF 数据
        print("\n[2/4] 插入 ETF 产品数据...")
        etf_sql = """
            INSERT INTO public.etf_products 
            (symbol, name, market, category, price, change, change_percent, scale, management_fee, tracking_index)
            VALUES %s
            ON CONFLICT (symbol) DO NOTHING
        """
        etf_values = [(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9]) for e in ETF_DATA]
        execute_values(cursor, etf_sql, etf_values)
        conn.commit()
        print(f"  ✓ 插入 {len(etf_values)} 条 ETF 数据")
        
        # 插入理财产品数据
        print("\n[3/4] 插入理财产品数据...")
        wealth_sql = """
            INSERT INTO public.wealth_products 
            (code, name, type, expected_return, min_amount, period_days, risk_level, tag, description, status)
            VALUES %s
            ON CONFLICT (code) DO NOTHING
        """
        wealth_values = [(w[0], w[1], w[2], w[3], w[4], w[5], w[6], w[7], w[8], 'active') for w in WEALTH_DATA]
        execute_values(cursor, wealth_sql, wealth_values)
        conn.commit()
        print(f"  ✓ 插入 {len(wealth_values)} 条理财产品数据")
        
        # 插入板块数据
        print("\n[4/4] 插入板块数据...")
        sector_sql = """
            INSERT INTO public.sectors 
            (code, name, type, price, change, change_percent, leading_stock_name, leading_stock_change)
            VALUES %s
            ON CONFLICT (code) DO NOTHING
        """
        sector_values = [(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]) for s in SECTOR_DATA]
        execute_values(cursor, sector_sql, sector_values)
        conn.commit()
        print(f"  ✓ 插入 {len(sector_values)} 条板块数据")
        
        # 验证数据
        print("\n" + "=" * 60)
        print("验证数据...")
        
        cursor.execute("SELECT COUNT(*) FROM public.etf_products")
        etf_count = cursor.fetchone()[0]
        print(f"  ✓ ETF 产品: {etf_count} 条")
        
        cursor.execute("SELECT COUNT(*) FROM public.wealth_products")
        wealth_count = cursor.fetchone()[0]
        print(f"  ✓ 理财产品: {wealth_count} 条")
        
        cursor.execute("SELECT COUNT(*) FROM public.sectors")
        sector_count = cursor.fetchone()[0]
        print(f"  ✓ 板块数据: {sector_count} 条")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✓ 数据初始化完成！")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗ 数据初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = init_data()
    sys.exit(0 if success else 1)
