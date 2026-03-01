import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Constants from '../constants';

const ICONS = Constants.ICONS;

interface LandingViewProps {
  onEnter: () => void;
  onQuickOpen: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onEnter, onQuickOpen }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [announcementTab, setAnnouncementTab] = useState<'business' | 'company' | 'media'>('business');
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate(); // 添加导航钩子

  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";
  const QR_PLACEHOLDER = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.zhengyutouzi.com/";
  
  const slides = [
    {
      image: "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/75581daa-fd55-45c5-8376-f51bf6852fde.jpg",
      title: "证裕交易单元 Nexus",
      subtitle: "极速、稳定、合规的数字化底座"
    },
    {
      image: "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/123.png",
      title: "数字化资产管理",
      subtitle: "赋能机构与专业投资者"
    },
    {
      image: "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/456.png",
      title: "全球市场直连",
      subtitle: "多维度的投资组合管理体验"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-white flex flex-col animate-slide-up text-slate-900 selection:bg-[#E30613] selection:text-white">
      {/* 1. 顶部工具栏 (Utility Bar) */}
      <div className="hidden md:block bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-12 h-10 flex justify-between items-center text-[11px] font-medium text-slate-500">
          <div className="flex gap-6">
            <a href="https://www.chinastock.com.cn/newsite/investorRelations.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">投资者关系</a>
            <a href="https://www.chinastock.com.cn/newsite/cgs.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">关于银河</a>
            <a href="https://www.chinastock.com.cn/newsite/online/recruitment.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">人才招聘</a>
            <a href="https://www.chinastock.com.cn/newsite/index_en.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">English</a>
          </div>
          <div className="flex gap-6">
            <a href="https://www.chinastock.com.cn/newsite/online/siteMap.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">站点地图</a>
            <a href="https://www.chinastock.com.cn/newsite/online/contactUs.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">联系我们</a>
            <a href="https://www.chinastock.com.cn/newsite/online/accessibility.html" target="_blank" rel="noopener noreferrer" className="hover:text-[#E30613] cursor-pointer transition-colors">无障碍辅助</a>
          </div>
        </div>
      </div>

      {/* 2. 顶部旗舰导航栏 */}
      <nav className="h-20 px-4 md:px-12 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-8 lg:gap-12">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="h-10 md:h-12 object-contain" />
          </div>
          <div className="flex items-center gap-8">
            {['首页', '银河证券-证裕交易单元APP', '快速开户', '进入平台'].map(item => (
              <span 
                key={item} 
                onClick={item === '快速开户' ? onQuickOpen : item === '进入平台' ? onEnter : item === '银河证券-证裕交易单元APP' ? () => navigate('/app-download') : undefined}
                className={`text-[13px] font-bold ${item === '首页' ? 'text-[#E30613]' : 'text-slate-700'} hover:text-[#E30613] cursor-pointer transition-colors whitespace-nowrap`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Buttons removed as they are now in the main menu per request */}
        </div>
      </nav>

      {/* 2. 品牌轮播图区域 (Hero Carousel) */}
      <section className="relative w-full aspect-[21/9] min-h-[400px] md:min-h-[600px] overflow-hidden bg-slate-100">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img 
              src={slide.image} 
              alt={slide.title} 
              className="w-full h-full object-cover object-center lg:object-[center_20%]"
            />
          </div>
        ))}
        {/* 轮播指示器 */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-red-600 shadow-[0_0_10px_#E30613]' : 'w-2 bg-white/50 hover:bg-white'}`}
            />
          ))}
        </div>
      </section>

      {/* 2.5 指数行情条 (Market Bar) */}
      <div className="bg-slate-900 text-white py-3 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex items-center gap-12 animate-marquee whitespace-nowrap">
          {[
            { name: '上证指数', value: '3,245.12', change: '+1.24%', color: 'text-red-500' },
            { name: '深证成指', value: '10,456.78', change: '+0.85%', color: 'text-red-500' },
            { name: '创业板指', value: '2,123.45', change: '-0.12%', color: 'text-emerald-500' },
            { name: '恒生指数', value: '19,876.54', change: '+1.56%', color: 'text-red-500' },
            { name: '中国银河', value: '12.45', change: '+2.31%', color: 'text-red-500' }
          ].map((idx, i) => (
            <div key={i} className="flex items-center gap-3 text-xs font-bold">
              <span className="text-slate-400">{idx.name}</span>
              <span>{idx.value}</span>
              <span className={idx.color}>{idx.change}</span>
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {[
            { name: '上证指数', value: '3,245.12', change: '+1.24%', color: 'text-red-500' },
            { name: '深证成指', value: '10,456.78', change: '+0.85%', color: 'text-red-500' },
            { name: '创业板指', value: '2,123.45', change: '-0.12%', color: 'text-emerald-500' },
            { name: '恒生指数', value: '19,876.54', change: '+1.56%', color: 'text-red-500' },
            { name: '中国银河', value: '12.45', change: '+2.31%', color: 'text-red-500' }
          ].map((idx, i) => (
            <div key={i+'_dup'} className="flex items-center gap-3 text-xs font-bold">
              <span className="text-slate-400">{idx.name}</span>
              <span>{idx.value}</span>
              <span className={idx.color}>{idx.change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5.5 中国银河介绍板块 (Refined to match image) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">中国银河证券</h2>
          <p className="text-lg text-slate-500 font-medium mb-16">中国证券行业领先的综合金融服务提供商</p>
          
          <div className="flex flex-col lg:flex-row items-center gap-0 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
            <div className="lg:w-1/2 aspect-video bg-slate-100 relative group cursor-pointer">
              <video 
                ref={videoRef}
                src="https://cdn.chinastock.com.cn/downloadwz/yhzp/indexvideo2024.m4v" 
                className="w-full h-full object-cover cursor-pointer" 
                loop 
                muted
                playsInline
                onClick={() => {
                  if (videoRef.current) {
                    if (isVideoPlaying) {
                      videoRef.current.pause();
                      setIsVideoPlaying(false);
                    } else {
                      videoRef.current.play();
                      setIsVideoPlaying(true);
                    }
                  }
                }}
                onEnded={() => setIsVideoPlaying(false)}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  className={`w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-all hover:bg-white/30 ${isVideoPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current) {
                      videoRef.current.play();
                      setIsVideoPlaying(true);
                    }
                  }}
                >
                  <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2"></div>
                </button>
              </div>
              <div className="absolute bottom-8 left-8 text-white text-left">
                <p className="text-4xl font-black italic">百年盛世 筑梦银河</p>
              </div>
            </div>
            <div className="lg:w-1/2 p-12 text-left">
              <h3 className="text-xl font-black text-slate-900 mb-8">关于银河</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                中国银河证券股份有限公司（股票代码：06881.HK，601881.SH，下称“公司”），中国最大的国有证券公司之一。公司根植中国资本市场超25年，服务中国及“一带一路”沿线超1900万客户，客户托管资产超6万亿元，已发展成为亚洲网络布局领先的投资银行。公司实际控制人为中央汇金投资有限责任公司，其母公司为中国投资有限责任公司，是中国的国家主权财富基金。
              </p>
              <a href="https://www.chinastock.com.cn/newsite/cgs.html" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-400 hover:text-[#E30613] transition-colors flex items-center gap-2">
                了解更多 <ICONS.ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 综合金融服务板块 (Refined with images) */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4">综合金融服务</h2>
            <p className="text-lg text-slate-600 font-medium">金融报国 客户至上</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: '财富管理',
                desc: '为客户提供证券经纪、金融产品、投资顾问、证券金融、机构服务等多元化、智能化、专业化服务。',
                img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_wealth_management@2x.96211330.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfd2VhbHRoX21hbmFnZW1lbnRAMnguOTYyMTEzMzAucG5nIiwiaWF0IjoxNzcyMzg5MzU1LCJleHAiOjE4MDM5MjUzNTV9.7V8gVGq24tWFBSLDUfDXMUB1rX8jJOiUtzHvPP5rETQ',
                url: 'https://www.chinastock.com.cn/newsite/cgs-services/wealthManagement.html'
              },
              {
                title: '投融资业务',
                desc: '为企业提供IPO、再融资、并购重组、债券发行等全周期投融资服务，支持实体经济发展。',
                img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_investment_financing@2x.541f016f.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfaW52ZXN0bWVudF9maW5hbmNpbmdAMnguNTQxZjAxNmYucG5nIiwiaWF0IjoxNzcyMzg5MzEwLCJleHAiOjE4MDM5MjUzMTB9.gNSFeBBk35kDEPVwV2wJmchpMNlXqUN1Vto5JqCQfD8',
                url: 'https://www.chinastock.com.cn/newsite/cgs-services/investFinance.html'
              },
              {
                title: '研究业务',
                desc: '银河研究院提供宏观、策略、行业、企业研究，为机构投资者和政府企业提供智库支持。',
                img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_research_service@2x.213da3c3.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfcmVzZWFyY2hfc2VydmljZUAyeC4yMTNkYTNjMy5wbmciLCJpYXQiOjE3NzIzODkzMzcsImV4cCI6MTgwMzkyNTMzN30.nc7RAyo25jplNNl9R2Xuhv7DTg1RcCDSwW8bls5GEYk',
                url: 'https://www.chinastock.com.cn/newsite/cgs-services/researchBusiness.html'
              },
              {
                title: '国际业务',
                desc: '通过银河国际及银河海外网络，为境内外客户提供跨境交易、融资、投资和财富管理服务。',
                img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_international_business@2x.d9987cf6.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfaW50ZXJuYXRpb25hbF9idXNpbmVzc0AyeC5kOTk4N2NmNi5wbmciLCJpYXQiOjE3NzIzODkyNzgsImV4cCI6MTgwMzkyNTI3OH0.EUasMximyC8PwoBmvG5IXPsX69crOsiC2AJNha-cCxs',
                url: 'https://www.chinastock.com.cn/newsite/cgs-services/internationalBusiness.html'
              }
            ].map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="border border-slate-100 rounded-xl overflow-hidden hover:shadow-lg transition-all group block bg-white">
                <div className="h-48 overflow-hidden bg-slate-100">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      // 图片加载失败时使用备用图片
                      const target = e.target as HTMLImageElement;
                      target.src = `https://picsum.photos/800/600?random=${i + 10}`;
                      // 再次失败则隐藏图片或显示占位符
                      target.onerror = null; // 防止无限循环
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-black text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 业务公告板块 */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* 底图 */}
        <div className="absolute inset-0">
          <img 
            src="https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_investment_financing@2x.541f016f.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfaW52ZXN0bWVudF9maW5hbmNpbmdAMnguNTQxZjAxNmYucG5nIiwiaWF0IjoxNzcyMzkxMzU2LCJleHAiOjE4MDM5MjczNTZ9.uDT5S9E7Zl0fVoEgLWqcqg0TpDQgxFdOpYfGx4Ls7iI"
            alt="背景"
            className="w-full h-full object-cover"
          />
          {/* 蓝色渐变遮罩 */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(145deg, rgba(18, 89, 207, 0.85) 0%, rgba(8, 45, 110, 0.75) 60%, rgba(2, 20, 60, 0.7) 100%)'
          }} />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {/* 左侧标签导航 */}
            <div className="w-full lg:w-64 p-8 bg-black/40 backdrop-blur-sm">
              <div className="space-y-6">
                {[
                  { key: 'business', text: '业务公告' },
                  { key: 'company', text: '公司公告' },
                  { key: 'media', text: '媒体关注' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAnnouncementTab(tab.key as 'business' | 'company' | 'media')}
                    style={{
                      color: 'white',
                      backgroundColor: announcementTab === tab.key ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                      borderLeft: announcementTab === tab.key ? '4px solid white' : 'none'
                    }}
                    className="w-full text-left font-bold text-lg py-3 px-4 rounded-lg transition-all duration-300 hover:bg-white/10"
                  >
                    {tab.text}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 右侧内容区域 */}
            <div className="flex-1 p-8 relative bg-black/40 backdrop-blur-sm">
              {/* 更多按钮 */}
              <div className="absolute top-6 right-6 z-20">
                <a 
                  href={announcementTab === 'business' ? 'https://www.chinastock.com.cn/newsite/cgs-services/stockFinance/information.html' : announcementTab === 'company' ? 'https://www.chinastock.com.cn/newsite/announcement.html' : 'https://www.chinastock.com.cn/newsite/mediaAttention.html'}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-white/80 hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
                >
                  更多 <ICONS.ArrowRight size={16} />
                </a>
              </div>

              {/* 业务公告内容 */}
              {announcementTab === 'business' && (
                <div className="space-y-3 relative z-10">
                  {[
                    { title: '关于"中韩芯片"（513310）基金交易风险提示公告', date: '2026-02-27', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260227_YZQ4.pdf' },
                    { title: '关于"豫能控股"（001896）交易风险提示公告', date: '2026-02-27', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260227_YZQ5.pdf' },
                    { title: '关于"南方原油"（501018）基金交易风险提示公告', date: '2026-02-25', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260225_YZQ6.pdf' },
                    { title: '关于"*ST熊猫"（600599）交易风险提示公告', date: '2026-02-24', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260224_YZQ7.pdf' },
                    { title: '关于"*ST岩石"（600696）、"*ST精伦"（600355）交易风险提示公告', date: '2026-02-12', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260212_YZQ8.pdf' },
                    { title: '关于"天普股份"（605255）交易风险提示公告', date: '2026-02-06', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260206_YZQ9.pdf' }
                  ].map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-3 px-3 border-b border-white/10 hover:bg-white/5 transition-all duration-300 rounded group">
                      <span className="text-white/90 group-hover:text-yellow-300 transition-colors text-sm font-medium flex-1">{item.title}</span>
                      <span className="text-white/60 text-xs ml-4 flex-shrink-0">{item.date}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* 公司公告内容 */}
              {announcementTab === 'company' && (
                <div className="space-y-3 relative z-10">
                  {[
                    { title: '中国银河：关于行使21银河Y1发行人赎回选择权的第三次提示性公告', date: '2026-02-25', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260225_YZQ4.pdf' },
                    { title: '中国银河：2026年第一次临时股东大会决议公告', date: '2026-02-13', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260213_YZQ4.pdf' },
                    { title: '北京市金杜律师事务所关于中国银河证券股份有限公司2026年第一次临时股东大会的法律意见书', date: '2026-02-13', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260213_YZQ5.pdf' },
                    { title: '海外监管公告', date: '2026-02-24', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260224_YZQ6.pdf' },
                    { title: '海外监管公告', date: '2026-02-12', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260212_YZQ7.pdf' },
                    { title: '海外监管公告', date: '2026-02-12', url: 'https://cdn.chinastock.com.cn/omc/investRelation/sh/601881_20260212_YZQ8.pdf' }
                  ].map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-3 px-3 border-b border-white/10 hover:bg-white/5 transition-all duration-300 rounded group">
                      <span className="text-white/90 group-hover:text-yellow-300 transition-colors text-sm font-medium flex-1">{item.title}</span>
                      <span className="text-white/60 text-xs ml-4 flex-shrink-0">{item.date}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* 媒体关注内容 */}
              {announcementTab === 'media' && (
                <div className="space-y-3 relative z-10">
                  {[
                    { title: '中国银河证券助力海南打造全球供应链超级接口', date: '2026-01-20', url: 'https://www.chinastock.com.cn/newsite/cgs/attentionDetail.html?docId=7866031' },
                    { title: '中国银河证券：聚力海南自贸港 共绘全球供应链关键枢纽新蓝图', date: '2026-01-16', url: 'https://www.chinastock.com.cn/newsite/cgs/attentionDetail.html?docId=7866032' },
                    { title: '券商集约化运营并无统一模板，银河证券北京互联网分公司解答四个关注', date: '2025-12-22', url: 'https://www.chinastock.com.cn/newsite/cgs/attentionDetail.html?docId=7866033' },
                    { title: '中国银河证券刘冰：从规模增长转向价值深耕 做好社会财富的专业管理者', date: '2025-12-22', url: 'https://www.chinastock.com.cn/newsite/cgs/attentionDetail.html?docId=7866034' },
                    { title: '中资券商掘金东南亚 深度拆解银河证券打法', date: '2025-12-01', url: 'https://www.chinastock.com.cn/newsite/cgs/attentionDetail.html?docId=7866035' },
                    { title: '中国银河证券党委书记、董事长王晟：深耕文化建设十五载 构建特色金融发展', date: '2025-11-18', url: 'https://www.chinastock.com.cn/newsite/cgs/attentionDetail.html?docId=7866036' }
                  ].map((item, i) => (
                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-3 px-3 border-b border-white/10 hover:bg-white/5 transition-all duration-300 rounded group">
                      <span className="text-white/90 group-hover:text-yellow-300 transition-colors text-sm font-medium flex-1">{item.title}</span>
                      <span className="text-white/60 text-xs ml-4 flex-shrink-0">{item.date}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. 银河观点板块 */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* 几何分割背景 */}
        <div className="absolute inset-0">
          {/* 左侧深蓝色区域 */}
          <div className="absolute inset-0 bg-[#1a3b5d]" style={{
            clipPath: 'polygon(0 0, 40% 0, 30% 100%, 0 100%)'
          }} />
          {/* 右侧白色区域 */}
          <div className="absolute inset-0 bg-white" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* 左侧标题区 */}
            <div className="lg:w-1/4 flex flex-col justify-between py-8">
              <div>
                <h2 className="text-3xl font-black text-white mb-4">银河观点</h2>
                <div className="w-16 h-1 bg-[#E30613] mb-8"></div>
              </div>
              <div className="space-y-6">
                <div className="flex gap-3">
                  <button className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                    <ICONS.ArrowUp size={20} />
                  </button>
                  <button className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                    <ICONS.ArrowDown size={20} />
                  </button>
                </div>
                <a href="https://www.chinastock.com.cn/newsite/insights.html" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 border-2 border-white rounded-full text-sm font-bold text-white hover:bg-white hover:text-[#1a3b5d] transition-all">
                  更多观点
                </a>
              </div>
            </div>
            
            {/* 右侧内容区 */}
            <div className="lg:w-3/4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    tag: '银河证券',
                    date: '2026-02-25',
                    title: '银河证券:节后A股市场震荡上行概率较大',
                    desc: '春节后，在政策预期、流动性加持与产业趋势催化下，市场震荡上行概率较大，同时需密切关注海外不确定性对于市场情绪的短期扰动。两会前后，A股市场或将以政策催化为核心驱动力，资金围绕政策导向的产业主线与主题机会博弈。',
                    img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_CGS_research_2@2x.93bd3473.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfQ0dTX3Jlc2VhcmNoXzJAMnguOTNiZDM0NzMucG5nIiwiaWF0IjoxNzcyMzkyMDYzLCJleHAiOjE4MDM5MjgwNjN9.bW08hjqisXA14YzQxkVHNSqtoXA7MBtqXeGr_PxdNw4',
                    url: 'https://www.chinastock.com.cn/newsite/cgs-services/researchReportDetail.html?id=7866412'
                  },
                  {
                    tag: '银河证券',
                    date: '2026-02-25',
                    title: '【中国银河宏观】美联储迎来供给侧改革者',
                    desc: 'Trump提名Warsh出任新一任美联储主席：美东时间1月30日，特朗普正式提名Kevin Warsh出任美联储主席，标志着自2018年Jerome Powell上任以来延续近八年的"鲍威尔时代"即将落幕。',
                    img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_CGS_research_4@2x.bf6eba20.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfQ0dTX3Jlc2VhcmNoXzRAMnguYmY2ZWJhMjAucG5nIiwiaWF0IjoxNzcyMzkxOTkxLCJleHAiOjE4MDM5Mjc5OTF9.iiGudGU1Z8Bj-KDJ91by1xwr7Y_yI3AYS0LZMj_i6GY',
                    url: 'https://www.chinastock.com.cn/newsite/cgs-services/researchReportDetail.html?id=7866447'
                  },
                  {
                    tag: '银河证券',
                    date: '2026-02-25',
                    title: '【中国银河策略】2025年业绩预告有哪些线索值得关注？',
                    desc: '截至1月31日，2956家A股上市公司已披露2025年年报业绩预告，披露率为54%。其中，1092家预喜，预喜率为37%，全部A股与上市板预喜率呈现不同特征，为市场提供了业绩线索。',
                    img: 'https://rfnrosyfeivcbkimjlwo.supabase.co/storage/v1/object/sign/tupian/img_home_CGS_research_3@2x.6b975cfd.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV81OTE1YzMzMC03MGY2LTQ2ZmQtOGViMy01YzdjZDA2ODQ4NjgiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ0dXBpYW4vaW1nX2hvbWVfQ0dTX3Jlc2VhcmNoXzNAMnguNmI5NzVjZmQucG5nIiwiaWF0IjoxNzcyMzkxOTc1LCJleHAiOjE4MDM5Mjc5NzV9.Vx1HFOICMSW4kDY0mXbpgHDNdgbQPaGb77TDZcxdafw',
                    url: 'https://www.chinastock.com.cn/newsite/cgs-services/researchReportDetail.html?id=7866017'
                  }
                ].map((item, i) => (
                <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
                  <div className="h-40 overflow-hidden bg-slate-100">
                    <img 
                      src={item.img} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        // 图片加载失败时使用备用图片
                        const target = e.target as HTMLImageElement;
                        target.src = `https://picsum.photos/800/600?random=${i + 110}`;
                        // 再次失败则隐藏图片或显示占位符
                        target.onerror = null; // 防止无限循环
                      }}
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-base font-black text-slate-900 mb-3 line-clamp-2 group-hover:text-[#E30613] transition-colors">{item.title}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-4">
                      <span>{item.tag}</span>
                      <span>|</span>
                      <span>{item.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-4">{item.desc}</p>
                  </div>
                </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 底部导航与版权 (Refined to match image) */}
      <footer className="bg-[#1A1A1A] pt-16 pb-4 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-8 cursor-pointer group">
                <h4 className="text-white text-sm font-bold">友情链接</h4>
                <ICONS.ArrowRight size={14} className="rotate-90 group-hover:translate-y-1 transition-transform" />
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                {[
                  { text: '人员公示', url: 'https://www.chinastock.com.cn/newsite/online/personnelAnnc.html' },
                  { text: '营业网点', url: 'https://www.chinastock.com.cn/newsite/online/branch.html' },
                  { text: '网站声明', url: 'https://www.chinastock.com.cn/newsite/online/statement.html' },
                  { text: '投资者教育', url: 'https://www.chinastock.com.cn/newsite/online/investorEducation.html' },
                  { text: '银河交易终端应急措施公告', url: 'https://www.chinastock.com.cn/newsite/online/emergency.html' },
                  { text: '反洗钱', url: 'https://www.chinastock.com.cn/newsite/online/antiMoneyLaundering.html' },
                  { text: '投诉与建议', url: 'https://www.chinastock.com.cn/newsite/online/complaint.html' },
                  { text: '非法仿冒机构信息公示', url: 'https://www.chinastock.com.cn/newsite/online/counterfeit.html' }
                ].map(item => (
                  <li key={item.text} className="hover:text-white cursor-pointer transition-colors">
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-white">{item.text}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-white text-sm font-bold mb-8">联系我们</h4>
              <ul className="space-y-4 text-[13px]">
                <li className="flex items-center gap-3">
                  <ICONS.Phone size={16} className="text-slate-500" />
                  <span>客服热线：<span className="text-white font-bold">95551</span> 或 4008-888-888</span>
                </li>
                <li className="flex items-center gap-3">
                  <ICONS.Mail size={16} className="text-slate-500" />
                  <span>公司邮箱：webmaster@chinastock.com.cn</span>
                </li>
                <li className="flex items-center gap-3">
                  <ICONS.Globe size={16} className="text-slate-500" />
                  <span>地址：北京市丰台区西营街8号院1号楼青海金融大厦</span>
                </li>
                <li className="flex items-center gap-3">
                  <ICONS.Shield size={16} className="text-slate-500" />
                  <span>邮编：100073</span>
                </li>
                <li className="flex items-center gap-3">
                  <ICONS.Activity size={16} className="text-slate-500" />
                  <span>纪委邮箱：xfjb@chinastock.com.cn</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-4 text-[11px] tracking-tight">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <span>版权所有©中国银河证券股份有限公司</span>
              <span>京公网安备11010602201151号</span>
              <span>京ICP备10021160号</span>
              <span>本公司开展网上证券业务业务已经中国证监会核准</span>
              <span className="flex items-center gap-1">本网站支持 <span className="px-1 border border-slate-600 rounded text-[9px]">IPv6</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
