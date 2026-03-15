"use strict";

import React, { useState } from 'react';
import { 
  ArrowLeft,
  Smartphone,
  Monitor,
  Apple,
  ChevronRight,
  Star,
  Shield,
  Zap,
  Users,
  CheckCircle,
  Download,
  QrCode
} from 'lucide-react';

interface ServiceCenterViewProps {
  onBack?: () => void;
}

// 产品数据
const products = [
  {
    id: 'app',
    name: '中国银河证券',
    subtitle: '官方APP',
    description: '一站式财富管理平台，为您提供极速交易、实时行情、财富管理等全方位服务',
    tags: ['智能交易', '实时行情', '财富管理', '新股申购'],
    icon: <Smartphone className="w-10 h-10" />,
    color: '#E30613',
    downloads: '5000万+',
    rating: '4.9',
    platforms: [
      { name: 'iOS', icon: <Apple className="w-5 h-5" />, url: 'https://apps.apple.com/cn/app/id420156359', label: 'App Store' },
      { name: 'Android', icon: <Smartphone className="w-5 h-5" />, url: '/downloads/galaxy-android.apk', label: 'Android下载' }
    ],
    features: [
      '极速交易，毫秒级响应',
      'Level-2行情免费看',
      '智能条件单自动盯盘',
      '新股申购一键操作',
      '资产分析全景视图'
    ]
  },
  {
    id: 'pc',
    name: '日斗银河交易单元',
    subtitle: 'PC交易终端',
    description: '专业投资交易终端，支持多窗口布局、程序化交易、深度行情分析',
    tags: ['专业分析', '多屏联动', '程序化交易', 'Level-2'],
    icon: <Monitor className="w-10 h-10" />,
    color: '#E30613',
    downloads: '100万+',
    rating: '4.9',
    platforms: [
      { name: 'Windows', icon: <Monitor className="w-5 h-5" />, url: 'https://www.chinastock.com.cn/newsite/download/text/GBK_Help/ZhuYeXiaZai.html', label: 'Windows版' },
      { name: 'macOS', icon: <Apple className="w-5 h-5" />, url: 'https://www.chinastock.com.cn/newsite/download/text/GBK_Help/ZhuYeXiaZai.html', label: 'macOS版' }
    ],
    features: [
      '专业K线分析工具',
      '多窗口自由布局',
      '程序化交易支持',
      'Level-2深度行情',
      '智能选股策略'
    ]
  }
];

// 特色服务
const services = [
  { icon: <Zap className="w-6 h-6" />, title: '极速交易', desc: '毫秒级委托下单', color: '#E30613' },
  { icon: <Shield className="w-6 h-6" />, title: '安全可靠', desc: '多重加密防护', color: '#1E40AF' },
  { icon: <Users className="w-6 h-6" />, title: '专属服务', desc: '7x24小时在线', color: '#059669' },
  { icon: <Star className="w-6 h-6" />, title: '专业团队', desc: '投研实力雄厚', color: '#D97706' }
];

// 评价数据
const reviews = [
  { user: '投资达人', content: '界面简洁，交易速度快，用起来很顺手！', rating: 5, date: '3天前' },
  { user: '股海老手', content: '行情数据准确，分析工具专业，推荐！', rating: 5, date: '1周前' },
  { user: '新手小白', content: '开户方便，客服耐心指导，新手友好。', rating: 5, date: '2周前' }
];

// 更多产品
const moreProducts = [
  { name: '海王星', desc: '经典行情交易软件', platform: 'Windows', icon: '🌊' },
  { name: '火星子', desc: '智能投资助手', platform: 'Windows/macOS', icon: '🔥' },
  { name: '银河通达信', desc: '专业交易终端', platform: 'Windows', icon: '📊' }
];

const ServiceCenterView: React.FC<ServiceCenterViewProps> = ({ onBack }) => {
  const [activeProduct, setActiveProduct] = useState(products[0]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handleDownload = (url: string, platformName: string) => {
    setSelectedPlatform(platformName);
    
    // 外部链接直接打开
    if (url.startsWith('http')) {
      window.open(url, '_blank');
      setTimeout(() => setSelectedPlatform(null), 1000);
      return;
    }
    
    // 本地文件下载
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setSelectedPlatform(null), 1000);
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-lg font-bold text-slate-900">下载中心</h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-[#E30613]" />
            <span>官方正版 · 安全认证</span>
          </div>
        </div>
      </div>

      {/* Hero 区域 - 主推产品 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-red-50/30 min-h-[600px]">
        {/* 背景图片 */}
        <div 
          className="absolute right-0 top-0 w-1/2 h-full opacity-10"
          style={{
            backgroundImage: `url('https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/xitongtu/screenshot-20260315-065802-removebg-preview.png')`,
            backgroundSize: 'contain',
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E30613]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-8">
          {/* 产品切换 Tabs */}
          <div className="flex gap-3 mb-8">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => setActiveProduct(product)}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                  activeProduct.id === product.id
                    ? 'bg-[#E30613] text-white shadow-lg shadow-red-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {product.name}
              </button>
            ))}
          </div>

          {/* 主产品展示 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* 左侧信息 */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${activeProduct.color}, ${activeProduct.color}CC)` }}
                >
                  {activeProduct.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-black text-slate-900">{activeProduct.name}</h2>
                    <span className="px-2 py-0.5 bg-[#E30613] text-white text-xs font-bold rounded">官方</span>
                  </div>
                  <p className="text-base text-slate-500 mt-1">{activeProduct.subtitle}</p>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">{activeProduct.description}</p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2">
                {activeProduct.tags.map((tag, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full border border-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 统计数据 */}
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-900">{activeProduct.downloads}</div>
                  <div className="text-xs text-slate-500">下载量</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="text-2xl font-black text-[#E30613]">{activeProduct.rating}</span>
                    <Star className="w-5 h-5 text-amber-400 fill-current" />
                  </div>
                  <div className="text-xs text-slate-500">用户评分</div>
                </div>
              </div>

              {/* 下载按钮组 */}
              <div className="flex flex-wrap gap-3">
                {activeProduct.platforms.map((platform) => {
                  const isDownloading = selectedPlatform === platform.name;
                  return (
                    <button
                      key={platform.name}
                      onClick={() => handleDownload(platform.url, platform.name)}
                      disabled={isDownloading}
                      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                        isDownloading
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#E30613] text-white hover:bg-[#C70510] active:scale-95 shadow-lg shadow-red-500/20'
                      }`}
                    >
                      {isDownloading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          下载中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          {platform.icon}
                          <span>{platform.label}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 功能列表 */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">核心功能</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeProduct.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧二维码 */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
                <div className="w-48 h-48 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-200">
                  {/* 模拟二维码 */}
                  <QrCode className="w-24 h-24 text-slate-300" />
                  <p className="text-xs text-slate-400 mt-2">扫码下载</p>
                </div>
                <p className="text-center text-slate-900 font-bold mt-4">扫码下载APP</p>
                <p className="text-center text-slate-500 text-xs mt-1">支持 iOS / Android</p>
              </div>
              <p className="text-slate-400 text-xs mt-4 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                扫描二维码，即刻下载官方APP
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 特色服务 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((service, i) => (
            <div 
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all group"
            >
              <div style={{ color: service.color }} className="mb-3">{service.icon}</div>
              <h4 className="text-slate-900 font-bold text-sm">{service.title}</h4>
              <p className="text-slate-500 text-xs mt-1">{service.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 用户评价 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">用户评价</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.map((review, i) => (
            <div 
              key={i}
              className="bg-white rounded-2xl p-5 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                </div>
                <span className="text-xs text-slate-400">{review.date}</span>
              </div>
              <p className="text-slate-600 text-sm mb-3">"{review.content}"</p>
              <p className="text-slate-400 text-xs">—— {review.user}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 其他下载 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">更多产品</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {moreProducts.map((item, i) => (
            <button
              key={i}
              onClick={() => window.open('https://www.chinastock.com.cn/newsite/download/text/GBK_Help/ZhuYeXiaZai.html', '_blank')}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg hover:border-[#E30613]/30 transition-all group text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="text-slate-900 font-bold">{item.name}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                    <p className="text-slate-400 text-xs mt-1">{item.platform}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#E30613] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 底部说明 */}
      <div className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-slate-500 text-sm">
                ⚠️ 投资有风险，入市需谨慎
              </p>
              <p className="text-slate-400 text-xs mt-1">
                中国银河证券股份有限公司 版权所有
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <a href="https://www.chinastock.com.cn" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] transition-colors">
                官方网站
              </a>
              <span>·</span>
              <a href="https://www.chinastock.com.cn/newsite/cgs.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] transition-colors">
                关于银河
              </a>
              <span>·</span>
              <span className="text-slate-300">客服热线: 95551</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCenterView;
