/**
 * 图片资源配置文件
 * 集中管理所有图片 URL，避免使用环境变量
 * 
 * 图片来源：Supabase Storage (tupian 存储桶)
 * 基础 URL 从环境变量获取，或使用默认值
 */

// 从 Supabase URL 构建存储 URL，避免硬编码
const getStorageBaseUrl = (): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/tupian`;
  }
  // 开发环境回退
  return '/images';
};

const STORAGE_BASE_URL = getStorageBaseUrl();

export const imageConfig = {
  // ==================== Logo ====================
  logo: {
    main: '/logo.png',
    admin: '/logo.png',
    training: '/logo.png',
    // 完整 URL 版本（用于某些需要完整 URL 的场景）
    fullUrl: `${STORAGE_BASE_URL}/logo.png`,
  },

  // ==================== 公章 ====================
  seal: `${STORAGE_BASE_URL}/gongzhang.jpg`,
  
  // ==================== 客服头像 ====================
  agentAvatar: `${STORAGE_BASE_URL}/yinxiaohe.png`,
  
  // ==================== 其他图片 ====================
  jigou: `${STORAGE_BASE_URL}/jigou.png`,

  // ==================== 首页 Banner ====================
  banners: [
    {
      id: 1,
      img: `${STORAGE_BASE_URL}/yinheguandian-1.png`,
      category: '银河观点',
      title: '年度策略',
    },
    {
      id: 2,
      img: `${STORAGE_BASE_URL}/121.png`,
      category: '系统公告',
      title: '系统升级',
    },
  ],

  // ==================== 首页轮播图 ====================
  carousel: [
    {
      id: 1,
      img: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
      title: '银河证券',
      subtitle: '专业投资服务',
    },
    {
      id: 2,
      img: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
      title: '日斗投资单元',
      subtitle: '智能交易平台',
    },
    {
      id: 3,
      img: `${STORAGE_BASE_URL}/1773260182777-019cde8a-7e52-78e6-bbf3-19510e1feb9b.jpeg`,
      title: '财富管理',
      subtitle: '稳健增值',
    },
  ],

  // ==================== 首页服务图标 ====================
  serviceIcons: {
    icon1: `${STORAGE_BASE_URL}/img_home_wealth_management@2x.96211330.png`,
    icon2: `${STORAGE_BASE_URL}/img_home_investment_financing@2x.541f016f.png`,
    icon3: `${STORAGE_BASE_URL}/img_home_CGS_research_3@2x.6b975cfd.png`,
    icon4: `${STORAGE_BASE_URL}/img_home_international_business@2x.d9987cf6.png`,
  },

  // ==================== 头像 ====================
  avatars: {
    agent: `${STORAGE_BASE_URL}/yinxiaohe.png`, // 客服/智能助理头像
    default: '/logo.png',
  },

  // ==================== 公章和协议 ====================
  documents: {
    seal: `${STORAGE_BASE_URL}/gongzhang.jpg`, // 电子公章
  },

  // ==================== 培训营背景 ====================
  training: {
    bg1: `${STORAGE_BASE_URL}/yinheguandian-1.png`,
    bg2: `${STORAGE_BASE_URL}/121.png`,
    joinUs: `${STORAGE_BASE_URL}/jiaruwomen-1.png`,
  },

  // ==================== 背景图 ====================
  backgrounds: {
    bg1: `${STORAGE_BASE_URL}/yinheguandian-1.png`,
    bg2: `${STORAGE_BASE_URL}/121.png`,
    research: `${STORAGE_BASE_URL}/img_home_CGS_research_5@2x.dc6d9350.png`,
  },
};

// 便捷函数
export const getBannerUrl = (index: number): string => {
  return imageConfig.banners[index - 1]?.img || imageConfig.banners[0]?.img || '';
};

export const getCarouselUrl = (index: number): string => {
  return imageConfig.carousel[index - 1]?.img || imageConfig.carousel[0]?.img || '';
};

export const getServiceIconUrl = (key: keyof typeof imageConfig.serviceIcons): string => {
  return imageConfig.serviceIcons[key] || '/logo.png';
};

export default imageConfig;
