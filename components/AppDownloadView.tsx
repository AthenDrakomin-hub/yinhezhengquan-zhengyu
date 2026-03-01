import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';

const AppDownloadView: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const downloadLinks = {
    ios: 'https://apps.apple.com/app/证裕交易单元/id1234567890',
    android: 'https://play.google.com/store/apps/details?id=com.chinastock.zhengyu',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://www.zhengyutouzi.com/download'
  };

  const banks = [
    '工商银行', '建设银行', '招商银行', '农业银行', '交通银行', '中信银行',
    '光大银行', '兴业银行', '浦发银行', '民生银行', '平安银行', '华夏银行',
    '北京银行', '上海银行', '南京银行', '杭州银行', '宁波银行', '邮储银行',
    '中国银行', '浙商银行', '广发银行'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md p-4 flex items-center gap-4 border-b border-slate-200 shadow-sm">
        <button 
          onClick={handleBack}
          className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 hover:bg-slate-200 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">银河开户</h1>
      </header>

      {/* 顶部视觉横幅区 */}
      <section className="relative overflow-hidden" style={{ 
        background: 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)',
        minHeight: '500px'
      }}>
        {/* 背景纹理 */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 212, 170, 0.3) 0%, transparent 50%)'
        }} />
        
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* 左侧：标题 */}
            <div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-4">银河开户</h2>
            </div>
            
            {/* 中间：手机APP模拟图 */}
            <div className="flex justify-center">
              <div className="w-64 h-96 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl flex items-center justify-center">
                <ICONS.Trade size={80} className="text-white/50" />
              </div>
            </div>
            
            {/* 右侧：开户入口 */}
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-black text-white">一键开户 智选银河</h3>
              
              {/* 二维码 */}
              <div className="bg-white p-4 rounded-2xl inline-block">
                <img 
                  src={downloadLinks.qrCode} 
                  alt="扫描二维码一键开户" 
                  className="w-48 h-48"
                />
                <p className="text-sm font-bold text-slate-900 mt-2">扫描二维码一键开户</p>
              </div>
              
              {/* 下载按钮 */}
              <div className="flex gap-3 justify-center">
                <a href={downloadLinks.ios} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                  iOS下载
                </a>
                <a href={downloadLinks.android} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                  Android下载
                </a>
              </div>
              
              {/* 提示文字 */}
              <p className="text-white/80 text-sm">
                <span className="font-bold">二代身份证</span> · <span className="font-bold">银行卡</span> · 需准备
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 底部银行支持区 */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <h3 className="text-2xl font-black text-slate-900 text-center mb-12">
            我们支持 21 家三方存管银行
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {banks.map((bank, index) => (
              <div key={index} className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                  <ICONS.Globe size={24} className="text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-900 text-center">{bank}</p>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-slate-500 text-center mt-8">
            注：民生银行签约时需输入银行查询密码
          </p>
        </div>
      </section>
    </div>
  );
};

export default AppDownloadView;