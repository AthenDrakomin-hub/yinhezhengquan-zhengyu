/**
 * 图片资源配置文件
 * 集中管理所有图片 URL
 * 
 * 图片来源：
 * - Logo 等核心图片：本地文件 (public/logo.png)
 * - 其他图片：Supabase Storage (xitongtu 存储桶)
 */

// Supabase Storage 基础 URL（用于非核心图片）
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kvlvbhzrrpspzaoiormt.supabase.co';
const STORAGE_BASE_URL = `${SUPABASE_URL}/storage/v1/object/public/xitongtu`;

export const imageConfig = {
  // ==================== Logo（使用本地文件，确保可靠性）====================
  logo: {
    // 主 Logo - 使用本地文件
    main: '/logo.png',
    // 客户端登录页 & 开户页
    fullUrl: '/logo.png',
    // 管理端登录页
    admin: '/logo.png',
    // 客户端首页顶部
    clientHeader: '/logo.png',
    // 公共页面首页
    publicHome: '/logo.png',
    training: '/logo.png',
  },

  // ==================== 公章（使用本地文件）====================
  seal: '/images/gongzhang.jpg',
  
  // ==================== 客服头像 ====================
  agentAvatar: '/logo.png',
  
  // ==================== 其他图片 ====================
  jigou: 'https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/xitongtu/1773005421322-019ccf5b-20b3-780f-afc1-02a862307568.png',

  // ==================== 首页 Banner ====================
  banners: [
    {
      id: 1,
      img: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
      category: '银河观点',
      title: '年度策略',
    },
    {
      id: 2,
      img: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
      category: '系统公告',
      title: '系统升级',
    },
  ],

  // ==================== 首页轮播图（公共首页）====================
  carousel: [
    {
      id: 1,
      img: '/images/carousel-1.jpg',
      title: '银河证券',
      subtitle: '专业投资服务',
    },
    {
      id: 2,
      img: '/images/carousel-2.png',
      title: '日斗投资单元',
      subtitle: '智能交易平台',
    },
    {
      id: 3,
      img: '/images/carousel-3.png',
      title: '财富管理',
      subtitle: '稳健增值',
    },
  ],

  // ==================== 客户端首页轮播图 ====================
  clientBanners: [
    {
      id: 1,
      img: '/images/client-banner-1.png',
      title: '银河证券',
      subtitle: '专业投资服务',
    },
    {
      id: 2,
      img: '/images/client-banner-2.png',
      title: '财富管理',
      subtitle: '稳健增值',
    },
    {
      id: 3,
      img: '/images/client-banner-3.jpg',
      title: '日斗投资单元',
      subtitle: '智能交易平台',
    },
  ],

  // ==================== 首页服务图标 ====================
  serviceIcons: {
    icon1: '/images/service-icon-1.png',
    icon2: '/images/service-icon-2.png',
    icon3: '/images/service-icon-3.png',
    icon4: '/images/service-icon-4.png',
  },

  // ==================== 头像 ====================
  avatars: {
    agent: '/logo.png',
    default: '/logo.png',
  },

  // ==================== 公章和协议（使用本地文件）====================
  documents: {
    seal: '/images/gongzhang.jpg',
  },

  // ==================== 培训营背景 ====================
  training: {
    bg1: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
    bg2: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
    joinUs: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
  },

  // ==================== 背景图 ====================
  backgrounds: {
    bg1: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
    bg2: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
    research: '/images/service-icon-3.png',
    // 银河观点板块背景图
    galaxyViewpoint: `${STORAGE_BASE_URL}/screenshot-20260315-050724.png`,
  },
};

// 便捷函数
export const getBannerUrl = (index: number): string => {
  return imageConfig.banners[index - 1]?.img || imageConfig.banners[0]?.img || '';
};

export const getCarouselUrl = (index: number): string => {
  return imageConfig.carousel[index - 1]?.img || imageConfig.carousel[0]?.img || '';
};

export const getClientBannerUrl = (index: number): string => {
  return imageConfig.clientBanners[index - 1]?.img || imageConfig.clientBanners[0]?.img || '';
};

export const getServiceIconUrl = (key: keyof typeof imageConfig.serviceIcons): string => {
  return imageConfig.serviceIcons[key] || '/logo.png';
};

export default imageConfig;
