import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';

const AppDownloadView: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  // APP下载链接（实际部署时替换为真实的下载链接）
  const downloadLinks = {
    ios: 'https://apps.apple.com/app/证裕交易单元/id1234567890',
    android: 'https://play.google.com/store/apps/details?id=com.chinastock.zhengyu',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://www.zhengyutouzi.com/download'
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] flex flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 glass-nav p-4 flex items-center gap-4 border-b border-[var(--color-border)]">
        <button 
          onClick={handleBack}
          className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em]">证裕APP下载</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar pb-10">
        {/* Hero Section */}
        <div className="text-center py-12">
          <div className="mx-auto w-32 h-32 rounded-3xl bg-gradient-to-br from-[#00D4AA] to-[#00A888] flex items-center justify-center shadow-[0_20px_50px_rgba(0,212,170,0.3)] mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
              <ICONS.Trade size={40} className="text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-[var(--color-text-primary)] mb-2">证裕交易单元</h2>
          <p className="text-[var(--color-text-secondary)] max-w-md mx-auto">
            中国银河证券官方移动端交易软件，为您提供专业的股票、基金、期货等一站式金融服务
          </p>
        </div>

        {/* Download Options */}
        <div className="space-y-6">
          <h3 className="text-center text-lg font-black text-[var(--color-text-primary)] mb-6">立即下载</h3>
          
          {/* Mobile Platform Downloads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href={downloadLinks.ios}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <ICONS.Globe size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest">Download on the</p>
                <p className="text-xl font-black">App Store</p>
              </div>
            </a>
            
            <a 
              href={downloadLinks.android}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <ICONS.Globe size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-widest">GET IT ON</p>
                <p className="text-xl font-black">Google Play</p>
              </div>
            </a>
          </div>

          {/* QR Code Download */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 text-center">
            <h4 className="text-sm font-black text-[var(--color-text-primary)] mb-4">扫码下载</h4>
            <div className="flex flex-col items-center">
              <img 
                src={downloadLinks.qrCode} 
                alt="证裕APP下载二维码" 
                className="w-48 h-48 border-4 border-white rounded-xl shadow-lg mb-4"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                使用手机扫描二维码下载APP
              </p>
              <button 
                onClick={() => {
                  // 提供直接下载链接（根据设备类型）
                  if(/iPhone|iPad|iPod/.test(navigator.userAgent)) {
                    window.location.href = downloadLinks.ios;
                  } else if(/Android/.test(navigator.userAgent)) {
                    window.location.href = downloadLinks.android;
                  } else {
                    alert('请使用移动设备扫描二维码下载');
                  }
                }}
                className="px-6 py-3 bg-[#00D4AA] text-[#0A1628] rounded-xl font-black text-sm hover:bg-[#00C49A] transition-colors"
              >
                快速下载
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-6">
          <h3 className="text-center text-lg font-black text-[var(--color-text-primary)]">核心功能</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: ICONS.Chart, title: '实时行情', desc: '毫秒级行情推送，覆盖沪深港美全市场' },
              { icon: ICONS.Trade, title: '极速交易', desc: '低延迟交易通道，支持多种订单类型' },
              { icon: ICONS.Shield, title: '安全保障', desc: '银行级安全防护，多重身份验证' },
              { icon: ICONS.Headset, title: '在线客服', desc: '7×24小时专业客服团队' },
              { icon: ICONS.Zap, title: '智能投顾', desc: 'AI驱动的投资分析与建议' },
              { icon: ICONS.Book, title: '资讯研报', desc: '权威财经资讯与专业研究报告' }
            ].map((feature, index) => (
              <div 
                key={index} 
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 text-center"
              >
                <div className="w-12 h-12 bg-[#00D4AA]/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-[#00D4AA]">
                  <feature.icon size={24} />
                </div>
                <h4 className="font-black text-[var(--color-text-primary)] mb-2">{feature.title}</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Notice */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <ICONS.AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-black text-red-500 text-sm mb-1">安全提醒</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">
                请从官方渠道下载APP，谨防钓鱼网站。投资有风险，入市需谨慎。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDownloadView;