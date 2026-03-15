# 银河证券设计规范

## 概述

本文档定义了银河证券金融交易系统的视觉设计规范，确保所有客户端组件保持一致的视觉风格。

## 核心颜色

### 品牌主色 - 银河红

```css
--color-primary: #E63946;          /* 银河红 - 主按钮、强调色 */
--color-primary-hover: #C62836;    /* 银河红深色 - 悬停状态 */
--color-primary-light: #FFEBEE;    /* 银河红浅色 - 背景、标签 */
```

**使用场景：**
- 主要操作按钮
- 重要信息强调
- 涨幅显示
- 品牌标识

### 辅助色 - 科技蓝

```css
--color-secondary: #0066CC;        /* 科技蓝 - 链接、辅助色 */
--color-secondary-hover: #004C99;  /* 科技蓝深色 - 悬停状态 */
--color-secondary-light: #E3F2FD;  /* 科技蓝浅色 - 背景、标签 */
```

**使用场景：**
- 链接文字
- 次要按钮
- 信息提示
- 导航栏背景

### 涨跌色

```css
/* 浅色主题 */
--color-positive: #E63946;         /* 涨 - 红色 */
--color-negative: #117A65;         /* 跌 - 绿色 */

/* 深色主题 */
--color-positive-dark: #FF8C42;    /* 深色模式涨 - 橙红色 */
--color-negative-dark: #3B9AE1;    /* 深色模式跌 - 蓝色 */
```

**使用场景：**
- 股票涨跌显示
- 盈亏数据
- 涨跌标签

### 功能色

```css
--color-warning: #FF9800;          /* 警告 - 橙色 */
--color-info: #0066CC;             /* 信息 - 科技蓝 */
--color-success: #4CAF50;          /* 成功 - 绿色 */
--color-error: #E63946;            /* 错误 - 银河红 */
```

## 文字颜色

```css
--color-text-primary: #333333;     /* 主要文字 */
--color-text-secondary: #666666;   /* 次要文字 */
--color-text-muted: #999999;       /* 辅助文字 */
--color-text-link: #0066CC;        /* 链接文字 */
--color-text-inverse: #FFFFFF;     /* 反色文字 */
```

## 背景颜色

```css
--color-bg: #F5F5F5;               /* 页面背景 */
--color-surface: #FFFFFF;          /* 卡片背景 */
--color-surface-secondary: #FAFAFA;/* 次级背景 */
--color-overlay: rgba(0, 0, 0, 0.5); /* 遮罩层 */
```

## 边框颜色

```css
--color-border: #E5E5E5;           /* 主要边框 */
--color-border-light: #F0F0F0;     /* 次级边框 */
--color-divider: #EEEEEE;          /* 分隔线 */
```

## 组件样式规范

### 按钮

#### 主按钮（银河红）
```css
.galaxy-btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
}
```

#### 次要按钮（科技蓝）
```css
.galaxy-btn-secondary {
  background: transparent;
  color: var(--color-secondary);
  border: 1px solid var(--color-secondary);
  border-radius: 8px;
  padding: 12px 24px;
}
```

### 卡片

```css
.galaxy-card {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

### 输入框

```css
.galaxy-input {
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 15px;
}

.galaxy-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
```

### 标签

#### 涨跌标签
```css
.galaxy-tag-rise {
  background: rgba(230, 57, 70, 0.1);
  color: var(--color-positive);
}

.galaxy-tag-fall {
  background: rgba(17, 122, 101, 0.1);
  color: var(--color-negative);
}
```

## 深色主题

深色主题通过 `body.dark-mode` 类名切换：

```css
body.dark-mode {
  --color-bg: #121212;
  --color-surface: #1E1E1E;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B0B0B0;
  --color-positive: #FF8C42;
  --color-negative: #3B9AE1;
}
```

## 圆角规范

```css
--radius-sm: 4px;      /* 小圆角 - 标签、徽章 */
--radius-md: 8px;      /* 中圆角 - 按钮、输入框 */
--radius-lg: 12px;     /* 大圆角 - 卡片 */
--radius-xl: 16px;     /* 超大圆角 - 弹窗 */
--radius-2xl: 20px;    /* 特大圆角 - 大型卡片 */
```

## 阴影规范

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);      /* 轻微阴影 */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);     /* 中等阴影 */
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);     /* 较大阴影 */
--shadow-modal: 0 8px 32px rgba(0, 0, 0, 0.15);  /* 弹窗阴影 */
```

## 动画规范

```css
/* 淡入动画 */
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

/* 上滑动画 */
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

/* 缩放动画 */
.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
```

## 最佳实践

1. **使用CSS变量**：所有颜色应使用 `var(--color-xxx)` 形式，便于主题切换
2. **遵循涨跌色规范**：涨使用红色，跌使用绿色（符合中国市场习惯）
3. **保持一致性**：相同功能的组件应使用相同的样式类
4. **响应式设计**：使用 Tailwind CSS 的响应式类适配不同屏幕尺寸
5. **可访问性**：确保文字与背景的对比度符合 WCAG 标准

## 禁止使用的颜色

以下颜色已被替换，**禁止使用**：

- ❌ `#00D4AA`（深青色）→ ✅ 使用 `#E63946`（银河红）
- ❌ `#0055A4`（深蓝色）→ ✅ 使用 `#0066CC`（科技蓝）
- ❌ `#0A1628`（深蓝色）→ ✅ 使用 `#1E1E1E`（深色背景）
- ❌ `#003D73`（深蓝色）→ ✅ 使用 `#004C99`（科技蓝深色）

## 相关文档

- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [银河证券官方App设计参考](内部设计规范)

---

**最后更新：** 2026-03-14  
**维护者：** 前端开发团队
