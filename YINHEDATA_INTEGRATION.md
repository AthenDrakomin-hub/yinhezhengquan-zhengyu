# 银禾数据库集成指南

## 一、银禾数据库简介

银禾数据库提供**免费**的金融数据接口，无需认证，安装即用！

**官网**: https://yinhedata.com/interface/index.html

**特点**:
- ✅ 完全免费
- ✅ 无需认证
- ✅ 一行代码获取数据
- ✅ 覆盖A股、美股、港股、期货、ETF等

**数据类型**:
| A股 | 美股 | 港股 | 国内期货 | 外盘期货 | ETF | 可转债 |
|-----|------|------|----------|----------|-----|--------|
| 指数 | 基金 | 外汇 | 货币 | 宏观数据 | 财务数据 | 行业数据 |

## 二、安装 yinhedata 库

```bash
pip install yinhedata
```

## 三、启动数据代理服务

```bash
# 进入项目目录
cd /workspace/projects

# 安装 Python 依赖
pip install fastapi uvicorn

# 启动服务
python api/yinhedata_service.py
```

服务地址: `http://localhost:8080`

## 四、API 接口列表

| 接口 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 服务状态 |
| `/health` | GET | 健康检查 |
| `/api/quotes` | GET | 股票行情列表 |
| `/api/quote/{symbol}` | GET | 单只股票行情 |
| `/api/limit-up` | GET | 涨停股票列表 |
| `/api/ipo` | GET | 新股申购列表 |
| `/api/stock-list` | GET | 股票列表 |
| `/api/financial/{symbol}` | GET | 财务数据 |
| `/api/kline/{symbol}` | GET | K线数据 |
| `/api/money-flow/{symbol}` | GET | 资金流向 |
| `/api/dragon-tiger` | GET | 龙虎榜数据 |

## 五、前端调用示例

```typescript
import { yinhedataService } from '@/services/yinhedataService';

// 获取涨停股票
const limitUpStocks = await yinhedataService.getLimitUpStocks();

// 获取股票行情
const quotes = await yinhedataService.getQuotes(['600519', '000001']);

// 获取K线数据
const kline = await yinhedataService.getKline('600519', 'day', 100);

// 获取资金流向
const moneyFlow = await yinhedataService.getMoneyFlow('600519');
```

## 六、环境变量配置

在 `.env` 文件中添加:

```env
# 银禾数据服务地址
VITE_YINHE_API_URL=http://localhost:8080
```

## 七、数据获取优先级

系统采用多级数据获取策略:

```
1. Supabase 数据库 (缓存数据)
     ↓ (无数据)
2. 银禾数据服务 (免费数据源) ← 推荐
     ↓ (不可用)
3. Supabase Edge Function (备用)
     ↓ (不可用)
4. 模拟数据 (兜底方案)
```

## 八、常用数据接口说明

### 8.1 涨停股票
```python
# Python 直接调用 (待 yinhedata 文档补充)
import yinhedata as yh
data = yh.get_limit_up_stocks()
```

### 8.2 股票行情
```python
import yinhedata as yh
# 获取实时行情
quote = yh.get_quote('600519')
```

### 8.3 K线数据
```python
import yinhedata as yh
# 获取日K线
klines = yh.get_kline('600519', period='day')
```

## 九、注意事项

1. **数据延迟**: 免费接口可能有轻微延迟，不适合高频交易
2. **调用频率**: 建议设置合理的请求间隔，避免频繁调用
3. **缓存策略**: 重要数据建议本地缓存
4. **生产环境**: 需要配置认证和限流机制

## 十、更新日志

- 2024-03-08: 初始集成，支持行情、涨停、IPO等数据
