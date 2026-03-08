"""
银禾数据库数据适配器
通过 yinhedata Python 库获取A股等各类金融数据
文档: https://yinhedata.com/interface/index.html
安装: pip install yinhedata
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime
import random

app = FastAPI(
    title="银禾数据库数据代理服务",
    description="通过 yinhedata 库获取A股等金融数据",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 尝试导入 yinhedata
try:
    import yinhedata as yh
    YINHE_AVAILABLE = True
    print("✅ yinhedata 库加载成功")
except ImportError:
    YINHE_AVAILABLE = False
    print("⚠️ yinhedata 库未安装，将使用模拟数据")
    print("   安装命令: pip install yinhedata")

# ==================== 数据模型 ====================

class StockQuote(BaseModel):
    """股票行情"""
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float
    volume: int
    turnover: float
    high: float
    low: float
    open: float
    preClose: float
    market: str
    timestamp: str

class LimitUpStock(BaseModel):
    """涨停股票"""
    symbol: str
    name: str
    market: str
    stockType: str
    currentPrice: float
    preClose: float
    limitUpPrice: float
    limitDownPrice: float
    change: float
    changePercent: float
    volume: int
    turnover: float
    isLimitUp: bool
    timestamp: str

class StockInfo(BaseModel):
    """股票基础信息"""
    symbol: str
    name: str
    market: str
    industry: Optional[str] = None
    listDate: Optional[str] = None

class IPOInfo(BaseModel):
    """新股申购信息"""
    symbol: str
    name: str
    issuePrice: float
    issueDate: str
    subscriptionCode: str
    status: str

class FinancialData(BaseModel):
    """财务数据"""
    symbol: str
    name: str
    pe: Optional[float] = None
    pb: Optional[float] = None
    roe: Optional[float] = None
    eps: Optional[float] = None
    totalAssets: Optional[float] = None
    totalLiabilities: Optional[float] = None

# ==================== 配置数据 ====================

DEFAULT_STOCKS = [
    "600519", "000001", "600000", "000002", "600036",
    "601318", "000333", "600276", "002594", "600887",
    "601888", "002415", "600309", "601012", "300750"
]

STOCK_NAMES = {
    "600519": "贵州茅台", "000001": "平安银行", "600000": "浦发银行",
    "000002": "万科A", "600036": "招商银行", "601318": "中国平安",
    "000333": "美的集团", "600276": "恒瑞医药", "002594": "比亚迪",
    "600887": "伊利股份", "601888": "中国中免", "002415": "海康威视",
    "600309": "万华化学", "601012": "隆基绿能", "300750": "宁德时代",
    "000651": "格力电器", "600900": "长江电力", "601398": "工商银行",
    "601288": "农业银行", "601939": "建设银行",
}

# ==================== 工具函数 ====================

def get_stock_type(symbol: str) -> str:
    """判断股票类型"""
    if symbol.startswith("3"):
        return "GEM"  # 创业板
    elif symbol.startswith("688"):
        return "STAR"  # 科创板
    elif symbol.startswith("8"):
        return "BJ"  # 北交所
    return "NORMAL"  # 主板

def calculate_limit_prices(pre_close: float, stock_type: str) -> tuple:
    """计算涨跌停价"""
    if stock_type == "GEM" or stock_type == "STAR":
        limit_percent = 0.20
    elif stock_type == "ST":
        limit_percent = 0.05
    else:
        limit_percent = 0.10
    
    limit_up = round(pre_close * (1 + limit_percent), 2)
    limit_down = round(pre_close * (1 - limit_percent), 2)
    return limit_up, limit_down

def get_market(symbol: str) -> str:
    """获取市场代码"""
    if symbol.startswith("6"):
        return "SH"
    elif symbol.startswith("8"):
        return "BJ"
    return "SZ"

# ==================== 模拟数据生成 ====================

def generate_mock_quotes(symbols: List[str] = None) -> List[StockQuote]:
    """生成模拟行情数据"""
    symbols = symbols or DEFAULT_STOCKS
    data = []
    
    for symbol in symbols:
        pre_close = round(10 + random.random() * 100, 2)
        change_percent = round((random.random() - 0.5) * 20, 2)
        price = round(pre_close * (1 + change_percent / 100), 2)
        
        data.append(StockQuote(
            symbol=symbol,
            name=STOCK_NAMES.get(symbol, f"股票{symbol}"),
            price=price,
            change=round(price - pre_close, 2),
            changePercent=change_percent,
            volume=random.randint(100000, 100000000),
            turnover=random.uniform(1000000, 1000000000),
            high=round(price * (1 + random.random() * 0.02), 2),
            low=round(price * (1 - random.random() * 0.02), 2),
            open=round(pre_close * (1 + (random.random() - 0.5) * 0.02), 2),
            preClose=pre_close,
            market=get_market(symbol),
            timestamp=datetime.now().isoformat()
        ))
    
    return data

def generate_mock_limit_up() -> List[LimitUpStock]:
    """生成模拟涨停数据"""
    # 随机选择几只股票作为涨停
    limit_up_symbols = random.sample(DEFAULT_STOCKS, min(5, len(DEFAULT_STOCKS)))
    data = []
    
    for symbol in limit_up_symbols:
        stock_type = get_stock_type(symbol)
        pre_close = round(10 + random.random() * 50, 2)
        limit_up_price, limit_down_price = calculate_limit_prices(pre_close, stock_type)
        
        data.append(LimitUpStock(
            symbol=symbol,
            name=STOCK_NAMES.get(symbol, f"股票{symbol}"),
            market=get_market(symbol),
            stockType=stock_type,
            currentPrice=limit_up_price,
            preClose=pre_close,
            limitUpPrice=limit_up_price,
            limitDownPrice=limit_down_price,
            change=round(limit_up_price - pre_close, 2),
            changePercent=round((limit_up_price - pre_close) / pre_close * 100, 2),
            volume=random.randint(10000000, 100000000),
            turnover=random.uniform(100000000, 1000000000),
            isLimitUp=True,
            timestamp=datetime.now().isoformat()
        ))
    
    return data

def generate_mock_ipo() -> List[IPOInfo]:
    """生成模拟IPO数据"""
    return [
        IPOInfo(
            symbol="001234",
            name="测试新股A",
            issuePrice=15.50,
            issueDate="2024-03-15",
            subscriptionCode="001234",
            status="申购中"
        ),
        IPOInfo(
            symbol="001235",
            name="测试新股B",
            issuePrice=8.80,
            issueDate="2024-03-16",
            subscriptionCode="001235",
            status="待申购"
        )
    ]

# ==================== API 接口 ====================

@app.get("/")
async def root():
    """服务状态"""
    return {
        "status": "ok",
        "service": "银禾数据库数据代理服务",
        "version": "1.0.0",
        "yinhedata_available": YINHE_AVAILABLE,
        "endpoints": [
            "/api/quotes - 获取股票行情",
            "/api/limit-up - 获取涨停股票",
            "/api/ipo - 获取新股申购",
            "/api/stock-list - 获取股票列表",
            "/api/financial/{symbol} - 获取财务数据"
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """健康检查"""
    return {"status": "healthy", "yinhedata": YINHE_AVAILABLE}

# ---------- 行情接口 ----------

@app.get("/api/quotes", response_model=List[StockQuote])
async def get_quotes(symbols: Optional[str] = None):
    """
    获取股票行情数据
    
    参数:
    - symbols: 股票代码列表，用逗号分隔（如：600519,000001）
    """
    symbol_list = symbols.split(",") if symbols else DEFAULT_STOCKS
    
    if YINHE_AVAILABLE:
        try:
            # TODO: 根据 yinhedata 文档调用真实接口
            # quotes = yh.get_quotes(symbol_list)
            # if quotes:
            #     return quotes
            pass
        except Exception as e:
            print(f"获取真实数据失败: {e}")
    
    return generate_mock_quotes(symbol_list)

@app.get("/api/quote/{symbol}", response_model=StockQuote)
async def get_quote(symbol: str):
    """获取单只股票行情"""
    quotes = generate_mock_quotes([symbol])
    if quotes:
        return quotes[0]
    raise HTTPException(status_code=404, detail=f"未找到股票 {symbol}")

# ---------- 涨停接口 ----------

@app.get("/api/limit-up", response_model=List[LimitUpStock])
async def get_limit_up():
    """
    获取当日涨停股票列表
    """
    if YINHE_AVAILABLE:
        try:
            # TODO: 根据 yinhedata 文档调用涨停接口
            # data = yh.get_limit_up_stocks()
            # if data:
            #     return data
            pass
        except Exception as e:
            print(f"获取涨停数据失败: {e}")
    
    return generate_mock_limit_up()

# ---------- IPO接口 ----------

@app.get("/api/ipo", response_model=List[IPOInfo])
async def get_ipo_list():
    """
    获取新股申购列表
    """
    if YINHE_AVAILABLE:
        try:
            # TODO: 根据 yinhedata 文档调用IPO接口
            # data = yh.get_ipo_list()
            # if data:
            #     return data
            pass
        except Exception as e:
            print(f"获取IPO数据失败: {e}")
    
    return generate_mock_ipo()

# ---------- 股票列表 ----------

@app.get("/api/stock-list")
async def get_stock_list(market: Optional[str] = None):
    """
    获取股票列表
    
    参数:
    - market: 市场类型 (sh/sz/bj)，可选
    """
    stocks = []
    for symbol, name in STOCK_NAMES.items():
        stock_market = get_market(symbol)
        if market and market.lower() != stock_market.lower():
            continue
        stocks.append({
            "symbol": symbol,
            "name": name,
            "market": stock_market,
            "type": get_stock_type(symbol)
        })
    
    return {"total": len(stocks), "data": stocks}

# ---------- 财务数据 ----------

@app.get("/api/financial/{symbol}", response_model=FinancialData)
async def get_financial(symbol: str):
    """
    获取股票财务数据
    """
    if YINHE_AVAILABLE:
        try:
            # TODO: 根据 yinhedata 文档调用财务数据接口
            pass
        except Exception as e:
            print(f"获取财务数据失败: {e}")
    
    # 返回模拟数据
    return FinancialData(
        symbol=symbol,
        name=STOCK_NAMES.get(symbol, f"股票{symbol}"),
        pe=round(10 + random.random() * 30, 2),
        pb=round(1 + random.random() * 5, 2),
        roe=round(random.random() * 20, 2),
        eps=round(random.random() * 5, 2),
        totalAssets=round(random.random() * 10000, 2),
        totalLiabilities=round(random.random() * 5000, 2)
    )

# ---------- 历史K线 ----------

@app.get("/api/kline/{symbol}")
async def get_kline(symbol: str, period: str = "day", limit: int = 100):
    """
    获取股票K线数据
    
    参数:
    - symbol: 股票代码
    - period: 周期 (day/week/month/minute)
    - limit: 返回条数
    """
    if YINHE_AVAILABLE:
        try:
            # TODO: 根据 yinhedata 文档调用K线接口
            pass
        except Exception as e:
            print(f"获取K线数据失败: {e}")
    
    # 生成模拟K线数据
    base_price = 50 + random.random() * 50
    klines = []
    for i in range(limit):
        open_price = base_price * (1 + (random.random() - 0.5) * 0.02)
        close_price = open_price * (1 + (random.random() - 0.5) * 0.03)
        high_price = max(open_price, close_price) * (1 + random.random() * 0.01)
        low_price = min(open_price, close_price) * (1 - random.random() * 0.01)
        
        klines.append({
            "date": f"2024-{(i // 30) + 1:02d}-{(i % 30) + 1:02d}",
            "open": round(open_price, 2),
            "close": round(close_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "volume": random.randint(100000, 10000000),
            "turnover": random.uniform(1000000, 100000000)
        })
        base_price = close_price
    
    return {"symbol": symbol, "period": period, "data": klines}

# ---------- 实时资金流 ----------

@app.get("/api/money-flow/{symbol}")
async def get_money_flow(symbol: str):
    """
    获取股票资金流向
    """
    return {
        "symbol": symbol,
        "name": STOCK_NAMES.get(symbol, f"股票{symbol}"),
        "mainNetInflow": round((random.random() - 0.5) * 100000000, 2),
        "retailNetInflow": round((random.random() - 0.5) * 50000000, 2),
        "superLargeInflow": round(random.random() * 50000000, 2),
        "largeInflow": round(random.random() * 30000000, 2),
        "mediumInflow": round(random.random() * 20000000, 2),
        "smallInflow": round(random.random() * 10000000, 2),
        "timestamp": datetime.now().isoformat()
    }

# ---------- 龙虎榜 ----------

@app.get("/api/dragon-tiger")
async def get_dragon_tiger(date: Optional[str] = None):
    """
    获取龙虎榜数据
    """
    return {
        "date": date or datetime.now().strftime("%Y-%m-%d"),
        "data": [
            {
                "symbol": "600519",
                "name": "贵州茅台",
                "changePercent": 10.01,
                "turnover": 500000000,
                "reason": "日涨幅偏离值达7%",
                "buySeats": [
                    {"name": "机构专用", "amount": 50000000},
                    {"name": "沪股通专用", "amount": 30000000}
                ],
                "sellSeats": [
                    {"name": "机构专用", "amount": 20000000},
                    {"name": "沪股通专用", "amount": 15000000}
                ]
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("银禾数据库数据代理服务")
    print("=" * 50)
    print(f"yinhedata 状态: {'已安装 ✅' if YINHE_AVAILABLE else '未安装 ⚠️'}")
    if not YINHE_AVAILABLE:
        print("安装命令: pip install yinhedata")
    print("服务地址: http://localhost:8080")
    print("API文档: http://localhost:8080/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8080)
