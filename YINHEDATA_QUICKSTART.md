# 银禾数据快速启动指南

## 一、安装 yinhedata 库

```bash
pip install yinhedata
```

## 二、启动数据代理服务

### 方式1: 使用 npm 脚本
```bash
pnpm yinhedata
```

### 方式2: 后台运行
```bash
pnpm yinhedata:bg
```

### 方式3: 直接运行
```bash
python3 api/yinhedata_service.py
```

## 三、访问 API 文档

服务启动后，访问: http://localhost:8080/docs

## 四、前端调用

系统已自动集成，数据获取优先级：

1. **Supabase 数据库** (缓存数据)
2. **银禾数据服务** (免费实时数据) ← 推荐
3. **Edge Function** (备用)
4. **模拟数据** (兜底)

### 代码示例

```typescript
import { yinhedataService } from '@/services/yinhedataService';

// 获取涨停股票
const limitUpStocks = await yinhedataService.getLimitUpStocks();

// 获取股票行情
const quotes = await yinhedataService.getQuotes(['600519', '000001']);

// 获取 K 线数据
const kline = await yinhedataService.getKline('600519', 'day', 100);

// 获取资金流向
const moneyFlow = await yinhedataService.getMoneyFlow('600519');

// 检查服务状态
const status = await yinhedataService.checkStatus();
```

## 五、可用接口

| 接口 | 说明 |
|------|------|
| `/api/quotes` | 股票行情列表 |
| `/api/quote/{symbol}` | 单只股票行情 |
| `/api/limit-up` | 涨停股票列表 |
| `/api/ipo` | 新股申购列表 |
| `/api/stock-list` | 股票列表 |
| `/api/financial/{symbol}` | 财务数据 |
| `/api/kline/{symbol}` | K线数据 |
| `/api/money-flow/{symbol}` | 资金流向 |
| `/api/dragon-tiger` | 龙虎榜数据 |

## 六、注意事项

1. **yinhedata 未安装**: 服务会自动使用模拟数据
2. **生产环境**: 建议部署到独立服务器并配置认证
3. **调用频率**: 免费接口建议设置合理请求间隔

## 七、下一步

当 yinhedata 库文档完善后，更新 `api/yinhedata_service.py` 中的 TODO 部分，替换模拟数据为真实 API 调用。

示例:
```python
# 替换
quotes = generate_mock_quotes(symbol_list)

# 为
quotes = yh.get_quotes(symbol_list)
```
