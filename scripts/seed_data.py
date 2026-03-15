#!/usr/bin/env python3
"""
数据库种子数据脚本
插入真实的种子数据到新数据库
"""

import os
import sys
from datetime import datetime, date, timedelta

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# Supabase PostgreSQL 连接信息（Session Pooler）
SUPABASE_DB_URL = os.environ.get(
    "SUPABASE_DB_URL",
    "postgres://postgres.kvlvbhzrrpspzaoiormt:HX0ydyF1nVKMDxMy@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&channel_binding=disable"
)

# ============================================================
# IPO 数据 (根据现有表结构)
# market: SH=上海, SZ=深圳
# status: UPCOMING=即将上市, ONGOING=申购中, LISTED=已上市
# ============================================================
IPO_DATA = [
    ('001301', '尚太科技', 'SZ', 'UPCOMING', 33.88, date(2025, 3, 14), date(2025, 3, 24), '001301', 30000000, 12000000, 22.56),
    ('001302', '康冠科技', 'SZ', 'ONGOING', 28.56, date(2025, 3, 12), date(2025, 3, 20), '001302', 50000000, 20000000, 18.34),
    ('603277', '银都股份', 'SH', 'ONGOING', 15.23, date(2025, 3, 9), date(2025, 3, 18), '603277', 40000000, 16000000, 15.67),
    ('688567', '孚能科技', 'SH', 'UPCOMING', 25.67, date(2025, 3, 4), date(2025, 3, 15), '688567', 25000000, 10000000, 28.45),
    ('301269', '华大九天', 'SZ', 'LISTED', 88.00, date(2025, 2, 24), date(2025, 3, 6), '301269', 15000000, 6000000, 45.23),
    ('688111', '金山办公', 'SH', 'LISTED', 168.00, date(2025, 1, 19), date(2025, 2, 5), '688111', 8000000, 3200000, 65.78),
    ('002938', '鹏鼎控股', 'SZ', 'ONGOING', 16.78, date(2025, 3, 5), date(2025, 3, 15), '002938', 60000000, 24000000, 12.34),
    ('688599', '天合光能', 'SH', 'UPCOMING', 12.45, date(2025, 3, 1), date(2025, 3, 12), '688599', 80000000, 32000000, 18.90),
]

# ============================================================
# 新闻数据
# ============================================================
NEWS_DATA = [
    ('市场早报：A股三大指数集体高开，科技板块领涨', 
     '市场',
     '今日A股市场表现强劲，上证指数开盘涨0.5%，深证成指涨0.6%，创业板指涨0.8%。科技板块集体走强，半导体、人工智能概念股涨幅居前。',
     5, True, date.today()),
    
    ('半导体板块大涨，北方华创涨停', 
     '行业',
     '半导体板块今日表现强势，北方华创涨停，中芯国际涨超5%。消息面上，国家加大对半导体产业的支持力度，产业链国产化进程加速。',
     4, True, date.today()),
    
    ('新能源汽车销量创新高，比亚迪领跑', 
     '行业',
     '2025年2月新能源汽车销量数据公布，比亚迪以30万辆的月销量继续领跑市场，同比增长45%。新能源汽车渗透率已达35%。',
     4, True, date.today()),
    
    ('央行降准落地，市场流动性充裕', 
     '宏观',
     '中国人民银行决定下调金融机构存款准备金率0.5个百分点，预计释放长期资金约1万亿元。市场流动性将保持合理充裕。',
     5, True, date.today()),
    
    ('人工智能概念股持续活跃', 
     '概念',
     'ChatGPT概念持续发酵，人工智能板块多只个股涨停。机构预测，2025年AI产业规模将突破5000亿元。',
     3, True, date.today()),
    
    ('光伏产业迎来新一轮增长周期', 
     '行业',
     '受益于全球能源转型，光伏产业迎来新一轮增长周期。隆基绿能、阳光电源等龙头企业订单饱满，产能利用率处于高位。',
     4, True, date.today()),
    
    ('港股科技股反弹，腾讯控股涨超3%', 
     '港股',
     '港股市场今日走强，科技股领涨。腾讯控股涨超3%，阿里巴巴、美团等互联网龙头股纷纷上涨。',
     4, True, date.today()),
    
    ('投资策略：关注科技创新主线', 
     '策略',
     '展望后市，建议关注科技创新主线，重点布局半导体、人工智能、新能源等赛道。同时注意控制仓位，做好风险管理。',
     3, True, date.today()),
]

# ============================================================
# Banner 数据 (根据现有表结构)
# ============================================================
BANNER_DATA = [
    ('新手开户礼', '活动', '开户即送100元体验金，更有专属新手礼包等你来领', 'https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/tupian/banner1.jpg', date.today(), '新用户注册即可参与，限时活动'),
    ('理财季活动', '理财', '精选理财产品年化收益高达5%，稳健投资首选', 'https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/tupian/banner2.jpg', date.today(), '活动期间购买理财产品享双倍积分'),
    ('交易大赛', '活动', '参与模拟交易大赛，赢取万元现金大奖', 'https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/tupian/banner3.jpg', date.today(), '月度收益率前10名可瓜分奖金池'),
    ('VIP会员专享', '会员', '开通VIP会员，享受专属投顾服务和低佣金费率', 'https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/tupian/banner4.jpg', date.today(), '年费会员享8折优惠'),
]

# ============================================================
# 教育内容数据 (根据现有表结构)
# ============================================================
EDUCATION_DATA = [
    ('股票入门基础知识', 'basic', '适合新手投资者学习', '15分钟', '了解股票的基本概念、交易规则和投资风险'),
    ('如何看懂K线图', 'basic', '技术分析入门', '20分钟', 'K线图是股票分析的基本工具，本文将详细讲解K线图的构成和含义'),
    ('技术分析入门', 'basic', '技术分析', '25分钟', '学习技术分析的基本方法，包括趋势线、支撑压力位等内容'),
    ('基本面分析方法', 'intermediate', '基本面分析', '30分钟', '了解如何通过财务报表、行业分析等方法进行基本面分析'),
    ('风险管理与仓位控制', 'intermediate', '风险管理', '25分钟', '投资中风险控制至关重要，学习如何合理管理仓位和控制风险'),
    ('ETF投资指南', 'intermediate', 'ETF投资', '20分钟', 'ETF是一种便捷的投资工具，了解ETF的种类和投资策略'),
    ('融资融券基础知识', 'advanced', '融资融券', '30分钟', '了解融资融券的基本概念、操作流程和风险提示'),
    ('期权投资入门', 'advanced', '期权投资', '35分钟', '期权是复杂的衍生品工具，本文将介绍期权的基本概念和交易策略'),
    ('港股通投资指南', 'intermediate', '港股投资', '25分钟', '了解港股通的开通条件、交易规则和投资策略'),
    ('打新策略与技巧', 'intermediate', 'IPO打新', '20分钟', '学习IPO打新的策略和技巧，提高中签率'),
]

# ============================================================
# 审批规则数据
# ============================================================
APPROVAL_RULES_DATA = [
    ('大额交易审批', '单笔交易金额超过50万元需要人工审批', 'manual', '{"min_amount": 500000}', True, 1),
    ('高频交易监控', '同一股票日内交易次数超过5次触发监控', 'auto', '{"max_daily_trades": 5}', True, 2),
    ('新股交易限制', '上市不足30天的新股交易需要审批', 'manual', '{"min_listed_days": 30}', True, 3),
    ('风险股票预警', 'ST股票和退市风险股票交易需要审批', 'manual', '{"stock_types": ["ST", "退市风险"]}', True, 4),
    ('自动审批规则', '普通股票交易自动审批通过', 'auto', '{"stock_types": ["普通"], "max_amount": 500000}', True, 5),
]

# ============================================================
# 快速通道规则数据
# ============================================================
FAST_CHANNEL_RULES_DATA = [
    ('VIP客户通道', '资产50万以上客户享受快速审批', 500000, None, 10, 1, True),
    ('高频交易者通道', '月交易次数超过50次的活跃交易者', 100000, None, 50, 2, True),
    ('新客户快速通道', '开户不足3个月的新客户', 0, 100000, 0, 3, True),
    ('专业投资者通道', '认证专业投资者享受专属服务', 1000000, None, 20, 4, True),
]


def seed_data():
    """执行种子数据插入"""
    print("=" * 60)
    print("数据库种子数据插入")
    print("=" * 60)
    
    try:
        # 连接数据库
        print("\n[1/7] 连接远程 Supabase PostgreSQL...")
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = False
        cursor = conn.cursor()
        print("  ✓ 连接成功")
        
        # 1. 插入 IPO 数据
        print("\n[2/7] 插入 IPO 数据...")
        ipo_sql = """
            INSERT INTO public.ipos 
            (symbol, name, market, status, ipo_price, issue_date, listing_date, subscription_code, issue_volume, online_issue_volume, pe_ratio)
            VALUES %s
        """
        ipo_values = IPO_DATA
        execute_values(cursor, ipo_sql, ipo_values)
        conn.commit()
        print(f"  ✓ 插入 {len(ipo_values)} 条 IPO 数据")
        
        # 2. 插入新闻数据
        print("\n[3/7] 插入新闻数据...")
        news_sql = """
            INSERT INTO public.news 
            (title, category, content, importance, is_published, publish_at)
            VALUES %s
        """
        news_values = [(n[0], n[1], n[2], n[3], n[4], n[5]) for n in NEWS_DATA]
        execute_values(cursor, news_sql, news_values)
        conn.commit()
        print(f"  ✓ 插入 {len(news_values)} 条新闻数据")
        
        # 3. 插入 Banner 数据
        print("\n[4/7] 插入 Banner 数据...")
        banner_sql = """
            INSERT INTO public.banners 
            (title, category, description, img, date, content)
            VALUES %s
        """
        banner_values = BANNER_DATA
        execute_values(cursor, banner_sql, banner_values)
        conn.commit()
        print(f"  ✓ 插入 {len(banner_values)} 条 Banner 数据")
        
        # 4. 插入教育内容数据
        print("\n[5/7] 插入教育内容数据...")
        edu_sql = """
            INSERT INTO public.education_topics 
            (title, category, image, duration, content)
            VALUES %s
        """
        edu_values = EDUCATION_DATA
        execute_values(cursor, edu_sql, edu_values)
        conn.commit()
        print(f"  ✓ 插入 {len(edu_values)} 条教育内容数据")
        
        # 5. 插入审批规则数据
        print("\n[6/7] 插入审批规则数据...")
        approval_sql = """
            INSERT INTO public.approval_rules 
            (name, description, rule_type, conditions, is_active, priority)
            VALUES %s
        """
        approval_values = APPROVAL_RULES_DATA
        execute_values(cursor, approval_sql, approval_values)
        conn.commit()
        print(f"  ✓ 插入 {len(approval_values)} 条审批规则数据")
        
        # 6. 插入快速通道规则数据
        print("\n[7/7] 插入快速通道规则数据...")
        fast_sql = """
            INSERT INTO public.fast_channel_rules 
            (name, description, min_asset, max_asset, min_trade_count, priority, is_active)
            VALUES %s
        """
        fast_values = FAST_CHANNEL_RULES_DATA
        execute_values(cursor, fast_sql, fast_values)
        conn.commit()
        print(f"  ✓ 插入 {len(fast_values)} 条快速通道规则数据")
        
        # 验证数据
        print("\n" + "=" * 60)
        print("数据验证:")
        
        tables = [
            ('ipos', 'IPO数据'),
            ('news', '新闻数据'),
            ('banners', 'Banner数据'),
            ('education_topics', '教育内容'),
            ('etf_products', 'ETF产品'),
            ('wealth_products', '理财产品'),
            ('sectors', '板块数据'),
            ('trading_hours', '交易时间'),
            ('approval_rules', '审批规则'),
            ('fast_channel_rules', '快速通道规则'),
        ]
        
        for table, name in tables:
            cursor.execute(f"SELECT COUNT(*) FROM public.{table}")
            count = cursor.fetchone()[0]
            print(f"  {name}: {count} 条")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✓ 种子数据插入完成！")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗ 种子数据插入失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = seed_data()
    sys.exit(0 if success else 1)
