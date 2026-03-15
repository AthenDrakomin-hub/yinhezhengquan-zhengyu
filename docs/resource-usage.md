# 资源使用报告

> 更新时间: 2026-03-17

## 当前资源使用量

### 数据库

| 指标 | 数值 |
|------|------|
| 数据库大小 | 15 MB |
| 免费额度 | 500 MB |
| 使用率 | 3% |

### 存储

| 存储桶 | 文件数 | 大小 |
|--------|--------|------|
| faces | 0 | 0 MB |
| education | 0 | 0 MB |
| avatars | 0 | 0 MB |
| documents | 0 | 0 MB |
| **总计** | 0 | 0 MB |

免费额度: 1 GB，使用率: 0%

### Edge Functions

共 40 个函数：

| 功能分类 | 函数数量 |
|----------|----------|
| 订单创建 | 6 个 (create-*-order) |
| 基金/理财 | 5 个 |
| 管理功能 | 5 个 |
| 数据同步 | 4 个 |
| 其他 | 20 个 |

## Supabase 免费额度

| 资源 | 免费额度 | 当前使用 |
|------|----------|----------|
| 数据库存储 | 500 MB | 15 MB (3%) |
| 文件存储 | 1 GB | 0 MB (0%) |
| 月带宽 | 5 GB | 待监控 |
| Edge Functions 调用 | 500K/月 | 待监控 |
| 实时连接 | 200 并发 | 0 (未启用) |

## 优化建议

### 1. Edge Functions 合并

当前有多个相似的订单创建函数，建议合并：

```
create-a-share-order    ┐
create-block-trade-order├──→ create-order (type参数区分)
create-hk-order         │
create-ipo-order        │
create-limit-up-order   ┘
```

预期节省：4 个函数

### 2. 存储优化

- 人脸图片限制 10MB（已配置）
- 头像限制 5MB（已配置）
- 投教视频建议使用外部 CDN

### 3. 数据库优化

- 定期清理过期数据（market_data_cache）
- 资产快照保留最近 90 天

### 4. 监控建议

在 Supabase Dashboard 中设置告警：
- 数据库 > 400 MB
- 存储 > 800 MB
- Edge Functions 调用 > 400K/月

## 结论

当前资源使用量远低于免费额度，可支持轻量化操作。
