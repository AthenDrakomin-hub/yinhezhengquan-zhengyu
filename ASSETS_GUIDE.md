# 项目资源管理指南

本文档整合所有图片、存储桶和静态资源的管理说明。

---

## 一、Storage 配置

### 1.1 存储桶列表

| 存储桶 | 状态 | 公开访问 | 用途 |
|--------|------|----------|------|
| **tupian** | ✅ 活跃 | ✅ 是 | 主图片存储（Logo、Banner、轮播图等） |
| ai-models | ✅ 活跃 | ✅ 是 | AI 模型文件（face-api.js、tesseract.js 模型） |
| documents | ✅ 活跃 | ❌ 否 | 用户文档、协议文件 |
| backups | ✅ 活跃 | ❌ 否 | 数据库备份 |
| public | 🆕 推荐 | ✅ 是 | 新项目的默认公开存储 |
| temp | ⚠️ 清理中 | ❌ 否 | 临时文件（计划清理） |
| avatars | 🗑️ 废弃 | ✅ 是 | 用户头像（已迁移到 tupian） |

### 1.2 tupian 存储桶文件清单

| 文件名 | 用途 | 环境变量 |
|--------|------|---------|
| logologo-removebg-preview.png | 客户端 Logo (透明背景) | VITE_LOGO_URL, VITE_TRAINING_LOGO |
| guanlijiemianlogo.jpeg | 管理端 Logo | VITE_ADMIN_LOGO_URL |
| yinheguandian-1.png | 银河观点背景 | VITE_BANNER_IMAGE_1, VITE_TRAINING_BG_1 |
| 121.png | 系统升级公告背景 | VITE_BANNER_IMAGE_2, VITE_TRAINING_BG_2 |
| 1111.jpg | 首页轮播图1 | VITE_CAROUSEL_IMAGE_1 |
| 456.png | 首页轮播图2 | VITE_CAROUSEL_IMAGE_2 |
| 123.png | 首页轮播图3 | VITE_CAROUSEL_IMAGE_3 |
| img_home_wealth_management@2x.96211330.png | 财富管理图标 | VITE_SERVICE_ICON_1 |
| img_home_investment_financing@2x.541f016f.png | 投融资图标 | VITE_SERVICE_ICON_2 |
| img_home_CGS_research_3@2x.6b975cfd.png | 研究业务图标 | VITE_SERVICE_ICON_3 |
| img_home_international_business@2x.d9987cf6.png | 国际业务图标 | VITE_SERVICE_ICON_4 |
| yinxiaohe.png | 客服/吉祥物头像 | VITE_AGENT_AVATAR_URL |
| gongzhang.jpg | 电子公章 | VITE_SEAL_URL |
| jiaruwomen-1.png | 加入我们页面背景 | VITE_JOIN_US_BG |

---

## 二、环境变量配置

### 2.1 基础 Storage 配置

```env
VITE_STORAGE_BUCKET=tupian
VITE_STORAGE_FOLDER=
```

### 2.2 图片 URL 环境变量

```env
# Logo 配置
VITE_LOGO_URL=https://your-project.supabase.co/storage/v1/object/public/tupian/logologo-removebg-preview.png
VITE_ADMIN_LOGO_URL=https://your-project.supabase.co/storage/v1/object/public/tupian/guanlijiemianlogo.jpeg
VITE_TRAINING_LOGO=https://your-project.supabase.co/storage/v1/object/public/tupian/logologo-removebg-preview.png

# Banner 配置
VITE_BANNER_IMAGE_1=https://your-project.supabase.co/storage/v1/object/public/tupian/yinheguandian-1.png
VITE_BANNER_IMAGE_2=https://your-project.supabase.co/storage/v1/object/public/tupian/121.png

# 轮播图配置
VITE_CAROUSEL_IMAGE_1=https://your-project.supabase.co/storage/v1/object/public/tupian/1111.jpg
VITE_CAROUSEL_IMAGE_2=https://your-project.supabase.co/storage/v1/object/public/tupian/456.png
VITE_CAROUSEL_IMAGE_3=https://your-project.supabase.co/storage/v1/object/public/tupian/123.png

# 服务图标配置
VITE_SERVICE_ICON_1=https://your-project.supabase.co/storage/v1/object/public/tupian/img_home_wealth_management@2x.96211330.png
VITE_SERVICE_ICON_2=https://your-project.supabase.co/storage/v1/object/public/tupian/img_home_investment_financing@2x.541f016f.png
VITE_SERVICE_ICON_3=https://your-project.supabase.co/storage/v1/object/public/tupian/img_home_CGS_research_3@2x.6b975cfd.png
VITE_SERVICE_ICON_4=https://your-project.supabase.co/storage/v1/object/public/tupian/img_home_international_business@2x.d9987cf6.png

# 头像和形象配置
VITE_AGENT_AVATAR_URL=https://your-project.supabase.co/storage/v1/object/public/tupian/yinxiaohe.png

# 公章配置
VITE_SEAL_URL=https://your-project.supabase.co/storage/v1/object/public/tupian/gongzhang.jpg

# 培训营背景配置
VITE_TRAINING_BG_1=https://your-project.supabase.co/storage/v1/object/public/tupian/yinheguandian-1.png
VITE_TRAINING_BG_2=https://your-project.supabase.co/storage/v1/object/public/tupian/121.png
VITE_JOIN_US_BG=https://your-project.supabase.co/storage/v1/object/public/tupian/jiaruwomen-1.png
```

---

## 三、代码中图片位置

### 3.1 Logo 使用位置

| 环境变量 | 文件路径 | 用途 |
|---------|---------|------|
| VITE_LOGO_URL | components/core/Layout.tsx | 顶部导航栏 Logo |
| VITE_LOGO_URL | components/core/LandingView.tsx | 首页导航 Logo |
| VITE_LOGO_URL | components/auth/LoginView.tsx | 登录页 Logo |
| VITE_LOGO_URL | components/auth/ForgotPasswordView.tsx | 忘记密码页 Logo |
| VITE_LOGO_URL | components/auth/QuickOpenView.tsx | 快速开户页 Logo |
| VITE_LOGO_URL | components/auth/AccountOpeningAgreement.tsx | 开户协议页 Logo |
| VITE_LOGO_URL | components/landing/OnlineChatView.tsx | 在线聊天组件 Logo |
| VITE_ADMIN_LOGO_URL | components/admin/AdminLoginView.tsx | 管理员登录页 Logo |
| VITE_TRAINING_LOGO | components/landing/GalaxyTrainingCamp.tsx | 培训营页面 Logo |

### 3.2 轮播图使用位置

| 环境变量 | 文件路径 | 用途 |
|---------|---------|------|
| VITE_CAROUSEL_IMAGE_1~3 | components/core/LandingView.tsx | 首页 Hero 轮播 |
| VITE_CAROUSEL_IMAGE_1~3 | components/client/ImageDiagnosticPage.tsx | 图片诊断页 |

### 3.3 服务图标使用位置

| 环境变量 | 文件路径 | 用途 |
|---------|---------|------|
| VITE_SERVICE_ICON_1~4 | components/core/LandingView.tsx | 首页4个服务卡片 |
| VITE_SERVICE_ICON_1~4 | components/client/ImageDiagnosticPage.tsx | 图片诊断页 |

### 3.4 Banner 使用位置

| 环境变量 | 文件路径 | 用途 |
|---------|---------|------|
| VITE_BANNER_IMAGE_1~2 | lib/constants.tsx | 首页公告栏 Banner |

### 3.5 其他图片使用位置

| 环境变量 | 文件路径 | 用途 |
|---------|---------|------|
| VITE_AGENT_AVATAR_URL | components/landing/OnlineChatView.tsx | 客服头像 |
| VITE_SEAL_URL | components/auth/AccountOpeningAgreement.tsx | 电子公章 |
| VITE_TRAINING_BG_1~2 | components/landing/GalaxyTrainingCamp.tsx | 培训营背景 |
| VITE_JOIN_US_BG | components/landing/GalaxyTrainingCamp.tsx | 加入我们页面 |
| VITE_RESEARCH_IMAGE_1 | components/core/LandingView.tsx | 研报区域图片 |

---

## 四、图片命名规范

### 4.1 新命名规范（推荐）

| 文件名 | 用途 | 状态 |
|--------|------|------|
| logologo-removebg-preview.png | 客户端 Logo (透明背景) | ✅ 已使用 |
| guanlijiemianlogo.jpeg | 管理端 Logo | ✅ 已使用 |
| yinheguandian-1.png | 银河观点背景 | ✅ 已使用 |
| gongzhang.jpg | 电子公章 | ✅ 已使用 |
| 1111.jpg | 首页轮播图1 | ✅ 已使用 |
| 456.png | 首页轮播图2 | ✅ 已使用 |
| 123.png | 首页轮播图3 | ✅ 已使用 |
| jiaruwomen-1.png | 加入我们背景 | ✅ 已使用 |

### 4.2 旧文件命名（待优化）

以下文件名不规范，建议后续重命名：

| 当前文件名 | 建议新文件名 | 用途 |
|-----------|-------------|------|
| img_home_wealth_management@2x.96211330.png | service-wealth.png | 财富管理图标 |
| img_home_investment_financing@2x.541f016f.png | service-investment.png | 投融资图标 |
| img_home_international_business@2x.d9987cf6.png | service-international.png | 国际业务图标 |
| img_home_CGS_research_3@2x.6b975cfd.png | service-research.png | 研究业务图标 |
| 121.png | banner-system-upgrade.png | 系统升级公告 |
| 1111.jpg | carousel-home-1.jpg | 首页轮播图1 |
| yinxiaohe.png | avatar-agent.png | 客服头像 |

---

## 五、工具函数使用

### 5.1 getImageUrl 工具

```typescript
import { getImageUrl, getLogoUrl, getBannerUrl, getCarouselImageUrl } from '@/lib/imageUtils';

// 获取通用图片
const imageUrl = getImageUrl('banner-1.png');

// 获取 Logo
const logoUrl = getLogoUrl();

// 获取 Banner
const bannerUrl = getBannerUrl(1);

// 获取轮播图
const carouselUrl = getCarouselImageUrl(1);
```

### 5.2 环境变量读取优先级

1. 优先使用完整 URL 环境变量 (如 VITE_LOGO_URL)
2. 其次使用 Storage 基础配置 + 文件名拼接
3. 最后使用本地占位图路径

---

## 六、上传新图片流程

1. 登录 Supabase Dashboard
2. 进入 Storage → tupian 存储桶
3. 上传图片文件
4. 确认文件权限为公开
5. 更新 `.env` 文件中的对应环境变量
6. 如需在代码中使用，更新对应组件

---

*本文档由 IMAGE_MAPPING.md, IMAGE_NAMING_STANDARD.md, RENAME_GUIDE.md, IMAGE_LOCATIONS.md, STORAGE_IMAGES_GUIDE.md, STORAGE_BUCKETS_REPORT.md 合并而成*
