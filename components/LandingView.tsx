import React, { useState, useEffect, useRef } from 'react';
import * as Constants from '../constants';

const ICONS = Constants.ICONS;

interface LandingViewProps {
  onEnterLogin: () => void;
  onQuickOpen: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onEnterLogin, onQuickOpen }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">投资者关系</span>
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">关于银河</span>
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">人才招聘</span>
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">English</span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">站点地图</span>
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">联系我们</span>
            <span className="hover:text-[#E30613] cursor-pointer transition-colors">无障碍辅助</span>
          </div>
        </div>
      </div>

      {/* 2. 顶部旗舰导航栏 */}
      <nav className="h-20 px-4 md:px-12 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-8 lg:gap-12">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="h-10 md:h-12 object-contain" />
          </div>
          <div className="hidden lg:flex items-center gap-8">
            {['首页', '银河证券-证裕交易单元APP', '快速开户', '登录Nexus'].map(item => (
              <span 
                key={item} 
                onClick={item === '快速开户' ? onQuickOpen : item === '登录Nexus' ? onEnterLogin : undefined}
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
                className="w-full h-full object-cover" 
                muted 
                loop 
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
                onEnded={() => {
                  setIsVideoPlaying(false);
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
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
                >
                  {isVideoPlaying ? (
                    <div className="flex items-center justify-center w-8 h-8">
                      <div className="w-2 h-8 bg-white mx-1"></div>
                      <div className="w-2 h-8 bg-white mx-1"></div>
                    </div>
                  ) : (
                    <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2"></div>
                  )}
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
                img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/wealth.html'
              },
              {
                title: '投资银行',
                desc: '为企业提供IPO、再融资、并购重组、债券发行等全周期投融资服务，支持实体经济发展。',
                img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/investment.html'
              },
              {
                title: '研究咨询',
                desc: '银河研究院提供宏观、策略、行业、企业研究，为机构投资者和政府企业提供智库支持。',
                img: 'https://images.unsplash.com/photo-1551288049-bbbda5366391?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/research.html'
              },
              {
                title: '国际业务',
                desc: '通过银河国际及银河海外网络，为境内外客户提供跨境交易、融资、投资和财富管理服务。',
                img: 'https://images.unsplash.com/photo-1449156001935-d28bc1ad7ead?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/global.html'
              },
              {
                title: '资产管理',
                desc: '为机构和个人客户提供公募基金、私募资管、专户理财等多元化资产管理解决方案。',
                img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/asset.html'
              },
              {
                title: '金融科技',
                desc: '运用人工智能、大数据、区块链等技术，打造智能化交易系统和数字化金融服务平台。',
                img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/fintech.html'
              },
              {
                title: '风险管理',
                desc: '建立全面风险管理体系，为客户提供风险识别、评估、监控和应对的专业服务。',
                img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/risk.html'
              },
              {
                title: '绿色金融',
                desc: '践行ESG理念，发展绿色债券、碳金融、可持续投资等业务，支持绿色低碳转型。',
                img: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?auto=format&fit=crop&q=80&w=800',
                url: 'https://www.chinastock.com.cn/newsite/green.html'
              }
            ].map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="border border-slate-100 rounded-xl overflow-hidden hover:shadow-lg transition-all group block bg-white">
                <div className="h-48 overflow-hidden">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

      {/* 6. 业务公告板块 (Refined with tabs and background) */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920" alt="Background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#2B3B52]/90 backdrop-blur-sm"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 md:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* 左侧 Tabs */}
            <div className="lg:w-1/4 flex flex-col gap-8 text-white/60">
              {[
                { text: '业务公告', url: 'https://www.chinastock.com.cn/newsite/businessAnnouncement.html' },
                { text: '公司公告', url: 'https://www.chinastock.com.cn/newsite/companyAnnouncement.html' },
                { text: '媒体关注', url: 'https://www.chinastock.com.cn/newsite/mediaAttention.html' }
              ].map((tab, i) => (
                <a key={tab.text} href={tab.url} target="_blank" rel="noopener noreferrer" className={`text-2xl font-black cursor-pointer transition-all flex items-center gap-4 ${i === 0 ? 'text-white' : 'hover:text-white'}`}>
                  {i === 2 && <span className="w-1 h-6 bg-white"></span>}
                  {tab.text}
                </a>
              ))}
            </div>
            
            {/* 右侧列表 */}
            <div className="lg:w-3/4">
              <div className="space-y-6">
                {[
                  { title: '中国银河证券助力海南打造全球供应链超级接口', date: '2026-01-20' },
                  { title: '中国银河证券：聚力海南自贸港 共绘全球供应链关键枢纽新蓝图', date: '2026-01-16' },
                  { title: '券商集约化运营并无统一模板，银河证券北京互联网分公司解答四个关注', date: '2025-12-22' },
                  { title: '中国银河证券刘冰：从规模增长转向价值深耕 做好社会财富的专业管理者', date: '2025-12-22' },
                  { title: '中资券商掘金东南亚 深度拆解银河证券打法', date: '2025-12-01' },
                  { title: '中国银河证券党委书记、董事长王晟：深耕文化建设廿五载 构建特色金融发展...', date: '2025-11-18' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-white/80 hover:text-white transition-colors cursor-pointer group pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="w-1 h-1 bg-white rounded-full"></span>
                      <span className="text-sm font-medium group-hover:translate-x-2 transition-transform">{item.title}</span>
                    </div>
                    <span className="text-xs font-mono opacity-60">{item.date}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <a href="https://www.chinastock.com.cn/newsite/announcement.html" target="_blank" rel="noopener noreferrer" className="text-white text-sm font-bold flex items-center gap-2 hover:underline">
                  更多 <ICONS.ArrowRight size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 银河观点板块 (Refined to match image) */}
      <section className="py-16 md:py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col lg:flex-row gap-0">
          {/* 左侧标题区 */}
          <div className="lg:w-1/4 bg-[#2B3B52] p-12 flex flex-col justify-between text-white relative">
            <div>
              <h2 className="text-3xl font-black mb-4">银河观点</h2>
              <div className="w-12 h-1 bg-[#E30613] mb-8"></div>
            </div>
            <div className="space-y-8">
              <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-all">
                <ICONS.ArrowLeft size={20} />
              </button>
              <a href="https://www.chinastock.com.cn/yhgd" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 border border-white rounded-full text-sm font-bold hover:bg-white hover:text-[#2B3B52] transition-all">
                更多观点
              </a>
            </div>
          </div>
          
          {/* 右侧内容区 (Carousel) */}
          <div className="lg:w-3/4 bg-slate-50 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  tag: '银河证券',
                  date: '2026-01-31',
                  title: '【中国银河宏观】美联储迎来供给侧改革者',
                  desc: 'Trump提名Warsh出任新一任美联储主席：美东时间1月30日，特朗普正式提名Kevin Warsh出任美联储主席，标志着自2018年Jerome Powell上任以来延续近八年的"鲍威尔时代"即将落幕...',
                  img: 'https://images.unsplash.com/photo-1611974717482-58f00017963d?auto=format&fit=crop&q=80&w=800'
                },
                {
                  tag: '银河证券',
                  date: '2026-02-02',
                  title: '【中国银河策略】2025年业绩预告有哪些线索值得关注？',
                  desc: '全部A股与上市板预喜率：截至1月31日，2956家A股上市公司已披露2025年年报业绩预告，披露率为54%。其中，1092家预喜，预喜率为37%...',
                  img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
                },
                {
                  tag: '银河证券',
                  date: '2026-01-27',
                  title: '【中国银河宏观】人民币升值逻辑再审视',
                  desc: '市场的焦点：人民币破7之后。2025年年末，在岸和离岸人民币汇率均升破7.0这一市场关键心理点位，这一点位也是前低（2024年9月30日为7.0156），市场单边的升值预期随之进一步扩散...',
                  img: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800'
                }
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                  <div className="h-40 overflow-hidden">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. 底部导航与版权 (Refined to match image) */}
      <footer className="bg-[#1A1A1A] pt-16 pb-4 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
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
            
            <div className="flex flex-col items-center md:items-end">
              <h4 className="text-white text-sm font-bold mb-8">关注我们</h4>
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-[13px]">
                  <ICONS.Globe size={16} className="text-slate-500" />
                  <span>微信公众号</span>
                </div>
                <div className="p-2 bg-white rounded-lg">
                  <img src={QR_PLACEHOLDER} alt="QR Code" className="w-24 h-24" />
                </div>
              </div>
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
