import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface LandingViewProps {
  onEnterLogin: () => void;
  onQuickOpen: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onEnterLogin, onQuickOpen }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

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

  const announcements = [
    { type: '系统公告', title: '关于系统升级维护的公告', date: '2026-02-13', color: 'bg-red-50 text-red-500' },
    { type: '交易提醒', title: '2026年春节假期交易安排通知', date: '2026-02-10', color: 'bg-orange-50 text-orange-500' },
    { type: '业务通知', title: '新增港股通标的证券公告', date: '2026-02-08', color: 'bg-blue-50 text-blue-500' },
    { type: '产品公告', title: '理财产品到期兑付公告', date: '2026-02-05', color: 'bg-rose-50 text-rose-500' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-white flex flex-col animate-slide-up text-slate-900 selection:bg-red-100 selection:text-red-700">
      {/* 1. 顶部旗舰导航栏 */}
      <nav className="h-20 px-4 md:px-12 flex justify-between items-center bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-8 lg:gap-12">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="h-10 md:h-12 object-contain" />
            {/* 移除 redundant 文本 "证裕交易单元"，因为 Logo 已包含品牌信息 */}
          </div>
          <div className="hidden lg:flex items-center gap-8">
            {['首页', '机构理财', '托管与基金服务', '更多服务'].map(item => (
              <span key={item} className="text-[11px] font-bold text-slate-600 hover:text-red-600 cursor-pointer transition-colors whitespace-nowrap">{item}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onQuickOpen}
            className="hidden sm:block px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-black shadow-md shadow-blue-200 active:scale-95 transition-all"
          >
            快速开户
          </button>
          <button 
            onClick={onEnterLogin}
            className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-lg text-xs font-black hover:bg-blue-50 active:scale-95 transition-all"
          >
            登录 Nexus
          </button>
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

      {/* 3. 核心业务快速入口 */}
      <section className="max-w-7xl mx-auto w-full px-4 md:px-12 -mt-16 md:-mt-24 relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'A股交易', desc: '沪深A股实时委托交易', icon: '📈', color: 'bg-red-50 text-red-500', action: onQuickOpen },
          { label: '港股通', desc: '投资香港优质蓝筹股票', icon: '🌐', color: 'bg-blue-50 text-blue-500', action: onQuickOpen },
          { label: '新股申购', desc: '一键顶格参与极速申购', icon: '📊', color: 'bg-emerald-50 text-emerald-500', action: onQuickOpen },
          { label: '理财产品', desc: '稳健型收益产品天天赚', icon: '📒', color: 'bg-orange-50 text-orange-500', action: onQuickOpen },
        ].map((item, idx) => (
          <div key={idx} onClick={item.action} className="bg-white p-6 md:p-8 rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-4 hover:-translate-y-2 transition-all cursor-pointer group">
            <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-xl md:text-2xl shadow-inner`}>
              {item.icon}
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm md:text-base group-hover:text-red-600 transition-colors">{item.label}</h4>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* 4. 系统公告板块 */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto w-full px-4 md:px-12">
        <div className="space-y-4">
          {announcements.map((ann, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all cursor-pointer rounded-2xl border border-transparent hover:border-slate-100 group">
              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${ann.color} uppercase tracking-tighter`}>{ann.type}</span>
                <span className="text-xs md:text-sm font-bold text-slate-800 group-hover:text-red-600 transition-colors">{ann.title}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">{ann.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. APP 下载中心 (全新设计以匹配图片) */}
      <section className="bg-[#E30613] py-20 md:py-32 relative overflow-hidden text-center text-white">
        <div className="max-w-4xl mx-auto space-y-16 px-6">
          <div className="space-y-4">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight">下载银河证券APP</h3>
            <p className="text-white/80 text-xs md:text-base font-medium max-w-xl mx-auto leading-relaxed">
              扫码下载官方APP，开户交易更便捷。新用户专享多重好礼，惊喜不断！
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
            {[
              { label: '扫码下载', icon: QR_PLACEHOLDER },
              { label: '应用宝', icon: 'https://img.icons8.com/color/144/android-os.png' },
              { label: 'App Store', icon: 'https://img.icons8.com/ios-filled/150/ffffff/apple-app-store.png' }
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-6 group cursor-pointer">
                <div className="w-full aspect-square bg-white rounded-3xl md:rounded-[40px] flex items-center justify-center p-8 md:p-12 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                  <img src={item.icon} alt={item.label} className={`w-full h-full object-contain ${idx > 0 ? 'opacity-20 grayscale scale-75' : ''}`} />
                </div>
                <div className="px-8 py-2 bg-white/10 rounded-full backdrop-blur-md border border-white/20">
                  <span className="text-white font-black text-xs md:text-sm uppercase tracking-widest">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 页脚 */}
      <footer className="bg-[#f4f6f8] pt-12 pb-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          
          {/* 友情链接与站点地图 */}
          <div className="md:col-span-4 space-y-8">
            <div>
              <button className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-300 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                <span className="text-[8px] transform rotate-180">▼</span> 友情链接
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-slate-600">
                <span className="cursor-pointer hover:text-red-600">人员公示</span>
                <span className="cursor-pointer hover:text-red-600">营业网点</span>
                <span className="cursor-pointer hover:text-red-600">投资者教育</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-slate-600">
                <span className="cursor-pointer hover:text-red-600">银河交易终端应急措施公告</span>
                <span className="cursor-pointer hover:text-red-600">投诉与建议</span>
              </div>
            </div>
          </div>

          {/* 联系我们 */}
          <div className="md:col-span-5 space-y-6 md:border-l md:border-slate-200 md:pl-8">
            <h4 className="text-[13px] font-black text-slate-800">联系我们</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-[11px] text-slate-600 font-medium">
              <div className="flex items-start gap-2">
                <span className="mt-0.5">📞</span>
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mb-0.5">客服热线</p>
                  <p className="text-slate-800 font-bold">95551 或 4008-888-888</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">📧</span>
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mb-0.5">邮编</p>
                  <p className="text-slate-800 font-bold">100033</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">✉️</span>
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mb-0.5">公司邮箱</p>
                  <p className="text-slate-800 font-bold">webmaster@chinastock.com.cn</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5">✉️</span>
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mb-0.5">纪委邮箱</p>
                  <p className="text-slate-800 font-bold">xfjb@chinastock.com.cn</p>
                </div>
              </div>
              <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                <span className="mt-0.5">📍</span>
                <div>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mb-0.5">地址</p>
                  <p className="text-slate-800 font-bold">中国北京市丰台区西营街8号院1号楼青海大厦</p>
                </div>
              </div>
            </div>
          </div>

          {/* 关注我们 */}
          <div className="md:col-span-3 space-y-6 md:border-l md:border-slate-200 md:pl-8">
            <h4 className="text-[13px] font-black text-slate-800">关注我们</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="text-slate-400">💬</span> 微信公众号
              </div>
              <div className="w-24 h-24 bg-white p-1.5 border border-slate-200 rounded shadow-sm">
                <img src={QR_PLACEHOLDER} alt="WeChat QR" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* 底部版权与备案信息 */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 mt-12 pt-8 border-t border-slate-200 text-center">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] md:text-[11px] font-bold text-slate-400">
            <span>版权所有 © 中国银河证券股份有限公司</span>
            <span>京公网安备 11010202007775 号</span>
            <span>京 ICP 备 10021160 号</span>
            <span>本公司开展网上证券委托业务已经中国证监会核准</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;