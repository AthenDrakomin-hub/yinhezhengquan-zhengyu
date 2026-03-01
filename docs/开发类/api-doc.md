# 银河证券管理系统 - 开发维护指南

## 概述
本文档为开发人员提供内容管理模块的技术实现细节、维护指南和扩展说明。

## 1. 技术架构

### 1.1 前端架构
- **框架**：React 19 + TypeScript
- **路由**：React Router v7
- **状态管理**：React Hooks (useState, useEffect)
- **UI库**：Tailwind CSS + Framer Motion
- **图表**：Recharts

### 1.2 后端架构
- **数据库**：Supabase PostgreSQL
- **认证**：Supabase Auth
- **实时**：Supabase Realtime
- **存储**：Supabase Storage

### 1.3 项目结构
```
src/
├── components/
│   ├── admin/                    # 管理后台组件
│   │   ├── AdminDashboard.tsx    # 仪表板
│   │   ├── AdminReports.tsx      # 研报管理
│   │   ├── AdminEducation.tsx    # 投教内容管理
│   │   ├── AdminCalendar.tsx     # 日历事件管理
│   │   ├── AdminIPOs.tsx         # 新股管理

│   │   ├── AdminBanners.tsx      # 横幅管理
│   │   └── AdminLayout.tsx       # 管理后台布局
├── services/
│   └── contentService.ts         # 内容管理服务
├── types.ts                      # TypeScript类型定义
└── supabase/
    └── migrations/               # 数据库迁移
```

## 2. 数据库表结构

### 2.1 研报表 (reports)
```sql
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    date DATE NOT NULL,
    summary TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL CHECK (category IN ('个股', '行业', '宏观', '策略')),
    sentiment TEXT NOT NULL CHECK (sentiment IN ('看多', '中性', '看空')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 投教内容表 (education_topics)
```sql
CREATE TABLE education_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    duration TEXT,
    content TEXT,
    "order" INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 日历事件表 (calendar_events)
```sql
CREATE TABLE calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    time TEXT,
    markets TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.4 新股表 (ipos)
```sql
CREATE TABLE ipos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    change DECIMAL(10,2),
    change_percent DECIMAL(5,2),
    market TEXT NOT NULL CHECK (market IN ('CN', 'HK', 'US', 'BOND', 'FUND')),
    listing_date DATE,
    status TEXT DEFAULT 'UPCOMING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```


### 2.6 横幅表 (banners)
```sql
CREATE TABLE banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    desc TEXT NOT NULL,
    img TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    content TEXT,
    related_symbol TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 3. RLS策略概述

所有内容表采用相同的权限模式：
- **SELECT**：所有人可读（`FOR SELECT USING (true)`）
- **INSERT/UPDATE/DELETE**：仅管理员可写（`FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))`）

**示例策略**：
```sql
-- 研报表策略
CREATE POLICY "所有人可读研报" ON public.reports
    FOR SELECT USING (true);

CREATE POLICY "仅管理员可管理研报" ON public.reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
```

## 4. 服务层 (contentService.ts)

### 4.1 设计模式
- **降级机制**：当Supabase连接失败时，自动回退到模拟数据
- **统一接口**：所有CRUD操作遵循相同模式
- **错误处理**：统一的错误捕获和用户提示

### 4.2 核心函数
```typescript
// 读取函数
export const getReports = async (): Promise<ResearchReport[]>
export const getEducationTopics = async (): Promise<EducationTopic[]>
export const getCalendarEvents = async (): Promise<CalendarEvent[]>
export const getIPOs = async (): Promise<Stock[]>

export const getBanners = async (): Promise<Banner[]>

// 创建函数
export const createReport = async (report: Omit<ResearchReport, 'id'>)
export const createEducationTopic = async (topic: Omit<EducationTopic, 'id'>)
export const createCalendarEvent = async (event: Omit<CalendarEvent, 'id'>)
export const createIPO = async (ipo: Omit<Stock, 'id' | 'sparkline' | 'logoUrl'> & { listing_date: string, status: string })
export const createDerivative = async (derivative: Omit<Stock, 'id' | 'sparkline' | 'logoUrl'> & { type: string, underlying: string, strike?: number, expiry?: string })
export const createBanner = async (banner: Omit<Banner, 'id'>)

// 更新函数
export const updateReport = async (id: string, report: Partial<ResearchReport>)
export const updateEducationTopic = async (id: string, topic: Partial<EducationTopic>)
export const updateCalendarEvent = async (id: string, event: Partial<CalendarEvent>)
export const updateIPO = async (id: string, ipo: Partial<Stock> & { listing_date?: string, status?: string })
export const updateDerivative = async (id: string, derivative: Partial<Stock> & { type?: string, underlying?: string, strike?: number, expiry?: string })
export const updateBanner = async (id: string, banner: Partial<Banner>)

// 删除函数
export const deleteReport = async (id: string)
export const deleteEducationTopic = async (id: string)
export const deleteCalendarEvent = async (id: string)
export const deleteIPO = async (id: string)
export const deleteDerivative = async (id: string)
export const deleteBanner = async (id: string)
```

### 4.3 降级机制
```typescript
export const getReports = async (): Promise<ResearchReport[]> => {
  if (isDemoMode) {
    console.warn('演示模式：使用模拟研报数据');
    return MOCK_REPORTS;
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('数据库无研报数据，回退到模拟数据');
      return MOCK_REPORTS;
    }

    return data.map((report) => ({
      id: report.id,
      title: report.title,
      author: report.author,
      date: report.date,
      summary: report.summary,
      content: report.content,
      category: report.category,
      sentiment: report.sentiment,
      tags: report.tags || [],
    }));
  } catch (error) {
    console.error('获取研报失败:', error);
    console.warn('回退到模拟研报数据');
    return MOCK_REPORTS;
  }
};
```

## 5. 如何添加新的内容类型

### 5.1 步骤指南
1. **创建数据库表**
   - 在 `supabase/migrations/` 中添加新的迁移文件
   - 定义表结构、索引、RLS策略

2. **定义TypeScript类型**
   - 在 `types.ts` 中添加接口定义

3. **实现服务层函数**
   - 在 `contentService.ts` 中添加CRUD函数
   - 实现降级机制和模拟数据

4. **创建管理组件**
   - 在 `components/admin/` 中添加新的管理页面
   - 遵循现有设计模式：表格 + 模态框

5. **集成到应用**
   - 在 `App.tsx` 中导入组件并添加路由
   - 在 `AdminLayout.tsx` 中添加菜单项

6. **更新仪表板（可选）**
   - 在 `AdminDashboard.tsx` 中添加统计信息

### 5.2 示例：添加"新闻"内容类型
```typescript
// 1. 类型定义
export interface News {
  id: string;
  title: string;
  content: string;
  source: string;
  published_at: string;
  category: string;
}

// 2. 服务函数
export const getNews = async (): Promise<News[]> => {
  if (isDemoMode) return MOCK_NEWS;
  // ... 实现
};

// 3. 管理组件
// 创建 components/admin/AdminNews.tsx
```

## 6. 前端组件设计模式

### 6.1 管理页面模板
```typescript
const AdminXxx: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ /* 表单字段 */ });
  const [submitting, setSubmitting] = useState(false);

  // 获取数据
  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getItems();
      setItems(data || []);
    } catch (err) {
      console.error('获取数据失败:', err);
      alert('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建、更新、删除函数
  // ...

  return (
    <div className="space-y-6">
      {/* 标题和按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">列表</h3>
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchItems}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => setIsCreateModalOpen(true)}>
            <ICONS.Plus size={16} /> 新建
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            {/* 表头 */}
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                {/* 列定义 */}
              </tr>
            </thead>
            {/* 表格内容 */}
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={n} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={n} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无数据</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-industrial-50 transition-colors">
                  {/* 行数据 */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setSelectedItem(item); setFormData({...}); setIsEditModalOpen(true); }}>
                        编辑
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 创建模态框 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {/* 表单内容 */}
          </motion.div>
        </div>
      )}

      {/* 编辑模态框 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {/* 表单内容 */}
          </motion.div>
        </div>
      )}
    </div>
  );
};
```

## 7. 测试指南

### 7.1 单元测试
- **服务层**：测试contentService函数
- **组件**：测试管理页面组件
- **类型**：测试TypeScript类型定义

### 7.2 集成测试
- **权限测试**：验证RLS策略
- **降级测试**：断开Supabase连接，验证降级机制
- **端到端测试**：完整的管理流程测试

### 7.3 性能测试
- **数据库查询**：监控查询性能
- **页面加载**：测量页面加载时间
- **内存使用**：检查内存泄漏

## 8. 部署与维护

### 8.1 环境变量
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_IS_DEMO_MODE=false
```

### 8.2 数据库迁移
```bash
# 应用迁移
supabase db push

# 重置数据库
supabase db reset
```

### 8.3 监控与日志
- **Supabase控制台**：监控数据库性能
- **浏览器控制台**：查看前端错误
- **应用日志**：记录关键操作

## 9. 故障排除

### 9.1 常见问题
1. **RLS策略不生效**：检查auth.uid()和角色验证
2. **降级机制不工作**：检查isDemoMode环境变量
3. **类型错误**：检查TypeScript类型定义
4. **路由问题**：检查App.tsx中的路由配置

### 9.2 调试技巧
- 使用浏览器开发者工具
- 检查网络请求
- 查看Supabase日志
- 使用TypeScript严格模式

---

**版本**：1.0  
**更新日期**：2025-03-27  
**维护团队**：银河证券技术部