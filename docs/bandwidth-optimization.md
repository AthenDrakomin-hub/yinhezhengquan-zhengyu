# Supabase 带宽优化指南

> 免费额度：5 GB/月

## 当前状态

### 已优化的项目 ✅

| 项目 | 优化措施 | 节省效果 |
|------|----------|----------|
| Logo 图片 | 改为本地文件 `/logo.png` | ~100KB/次 × N次访问 |
| 轮播图 | 使用本地文件 | ~500KB/次 × N次访问 |
| Realtime | 未启用 | 节省 WebSocket 带宽 |
| 行情数据 | Redis 缓存 (30秒 TTL) | 减少 Edge Function 调用 |

### 潜在带宽消耗点 ⚠️

| 项目 | 消耗估算 | 优化建议 |
|------|----------|----------|
| proxy-market Edge Function | ~5-20KB/请求 | 已有 Redis 缓存 |
| Supabase Storage 图片 | ~50-500KB/张 | 减少大图片 |
| REST API 查询 | ~1-10KB/请求 | 启用前端缓存 |

## 带宽估算

### 场景：10 个活跃用户/天

| 操作 | 频率 | 单次大小 | 日消耗 |
|------|------|----------|--------|
| 登录 | 10 次 | 5 KB | 50 KB |
| 行情刷新 | 100 次 | 15 KB | 1.5 MB |
| 下单 | 20 次 | 10 KB | 200 KB |
| 查持仓 | 50 次 | 5 KB | 250 KB |
| 图片加载 | 50 次 | 50 KB | 2.5 MB |
| **日总计** | - | - | **~4.5 MB** |
| **月总计** | - | - | **~135 MB** |

### 结论：10 用户/天 ≈ 135 MB/月，远低于 5GB 额度 ✅

### 场景：100 个活跃用户/天

| 操作 | 频率 | 单次大小 | 日消耗 |
|------|------|----------|--------|
| 登录 | 100 次 | 5 KB | 500 KB |
| 行情刷新 | 1000 次 | 15 KB | 15 MB |
| 下单 | 200 次 | 10 KB | 2 MB |
| 查持仓 | 500 次 | 5 KB | 2.5 MB |
| 图片加载 | 500 次 | 50 KB | 25 MB |
| **日总计** | - | - | **~45 MB** |
| **月总计** | - | - | **~1.35 GB** |

### 结论：100 用户/天 ≈ 1.35 GB/月，仍在 5GB 额度内 ✅

## 优化建议

### 1. 行情数据优化

```typescript
// ✅ 当前已有 Redis 缓存
// 确保缓存 TTL 合理
export const CacheTTL = {
  QUOTE: 30,     // 实时行情：30秒
  BATCH: 30,     // 批量行情：30秒
  KLINE: 300,    // K线数据：5分钟
}
```

### 2. 图片优化

```typescript
// ✅ Logo 已使用本地文件
// 建议：其他图片也本地化或使用 CDN

// 当前从 Supabase Storage 加载的图片：
// -公章: xitongtu/gongzhang.jpg
// - Banner: xitongtu/banners/*.jpeg
```

### 3. API 响应优化

```typescript
// 限制返回字段，减少传输量
const { data } = await supabase
  .from('trades')
  .select('id, stock_code, status, quantity, price')  // 只选需要的字段
  .eq('user_id', userId)
  .limit(50);  // 限制数量
```

### 4. 前端缓存

```typescript
// 使用 React Query 缓存
const { data } = useQuery({
  queryKey: ['trades', userId],
  queryFn: () => fetchTrades(userId),
  staleTime: 30 * 1000,  // 30秒内不重新请求
  cacheTime: 5 * 60 * 1000,  // 缓存5分钟
});
```

### 5. 分页加载

```typescript
// 大列表分页，避免一次加载过多
const PAGE_SIZE = 20;

const { data } = await supabase
  .from('trades')
  .select('*')
  .range(start, start + PAGE_SIZE - 1);
```

## 监控与告警

### 在 Supabase Dashboard 设置

1. 进入 **Settings** → **Billing**
2. 设置用量告警阈值：
   - 带宽 > 4GB 时发送告警
   - Edge Functions > 400K 调用时发送告警

### 检查当前用量

```sql
-- 数据库大小
SELECT pg_size_pretty(pg_database_size(current_database()));

-- 存储使用
SELECT bucket_id, COUNT(*), SUM((metadata->>'size')::bigint) 
FROM storage.objects GROUP BY bucket_id;
```

## 紧急降级方案

如果带宽接近上限：

1. **禁用非必要功能**
   - 暂停 K线图数据更新
   - 减少行情刷新频率（30秒 → 60秒）

2. **图片本地化**
   - 将所有图片下载到 `public/` 目录
   - 更新 `imageConfig.ts` 使用本地路径

3. **启用 CDN**
   - 使用 Cloudflare 等 CDN 加速静态资源
   - 减少 Supabase 带宽消耗

## 结论

当前配置下，**100 个日活用户的带宽消耗约 1.35 GB/月**，远低于 5GB 免费额度。

如需支持更多用户，建议：
1. 本地化所有图片资源
2. 增加 Redis 缓存时间
3. 使用外部 CDN
