# 监控告警指南 - 银河证券证裕交易单元

## 监控指标

### 系统指标
- CPU使用率：< 70%
- 内存使用率：< 80%
- 磁盘使用率：< 85%
- 网络延迟：< 100ms

### 应用指标
- API响应时间：< 500ms
- 错误率：< 1%
- 并发用户数：实时监控
- 交易成功率：> 99%

### 数据库指标
- 连接数：< 80%连接池
- 查询时间：< 1s
- 慢查询：记录 > 1s的查询
- 死锁：实时告警

## Vercel监控

### 访问监控面板
1. 登录Vercel Dashboard
2. 选择项目
3. Analytics标签

### 关键指标
- 部署状态
- 访问量
- 响应时间
- 错误率

## Supabase监控

### 访问监控面板
1. 登录Supabase Dashboard
2. 选择项目
3. Reports标签

### 关键指标
- API请求数
- 数据库连接数
- 存储使用量
- 带宽使用量

## 告警配置

### 邮件告警
```javascript
// 在Edge Function中配置
if (errorRate > 0.05) {
  await sendEmail({
    to: 'admin@example.com',
    subject: '系统告警：错误率过高',
    body: `当前错误率：${errorRate * 100}%`
  });
}
```

### 钉钉/企业微信告警
```javascript
// Webhook告警
await fetch('https://oapi.dingtalk.com/robot/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    msgtype: 'text',
    text: { content: '系统告警：数据库连接失败' }
  })
});
```

## 日志查看

### Vercel日志
```bash
# 安装Vercel CLI
npm i -g vercel

# 查看实时日志
vercel logs --follow

# 查看特定部署日志
vercel logs [deployment-url]
```

### Supabase日志
1. Supabase Dashboard -> Logs
2. 选择日志类型：
   - API Logs
   - Database Logs
   - Auth Logs
3. 设置时间范围
4. 搜索关键词

## 性能监控

### 前端性能
```javascript
// 使用Performance API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Page Load Time:', entry.loadTime);
  }
});
observer.observe({ entryTypes: ['navigation'] });
```

### API性能
```sql
-- 查询慢SQL
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 告警处理流程

### P0告警（15分钟响应）
1. 收到告警通知
2. 确认问题严重性
3. 启动应急预案
4. 通知相关人员
5. 问题解决后复盘

### P1告警（1小时响应）
1. 收到告警通知
2. 分析问题原因
3. 制定解决方案
4. 实施修复
5. 验证修复效果

### P2告警（4小时响应）
1. 记录告警信息
2. 安排处理时间
3. 修复问题
4. 更新文档

## 监控最佳实践

- 设置合理的告警阈值
- 避免告警疲劳
- 定期审查告警规则
- 建立告警升级机制
- 记录告警处理过程
