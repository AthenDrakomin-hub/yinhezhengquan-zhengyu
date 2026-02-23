
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface QuickOpenViewProps {
  onBack: () => void;
  onComplete: (data: any) => void;
}

const QuickOpenView: React.FC<QuickOpenViewProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [inviteCode, setInviteCode] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    realName: '',
    idNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";

  const handleVerifyInvite = () => {
    if (inviteCode === 'ZY2026' || inviteCode === 'NEXUS') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep(2);
      }, 800);
    } else {
      alert('无效的机构邀请码，请联系您的理财顾问');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onComplete({
        username: formData.username,
        email: formData.email,
        status: 'PENDING'
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col animate-slide-up relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,170,0.1),transparent_50%)]" />
      
      {/* 顶部进度条 */}
      <div className="h-1 bg-white/5 w-full sticky top-0 z-50">
        <div 
          className="h-full bg-[#00D4AA] transition-all duration-500 shadow-[0_0_10px_#00D4AA]" 
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <header className="p-4 flex items-center justify-between relative z-10">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
          <ICONS.ArrowRight className="rotate-180" size={18} />
        </button>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">第 {step} 步 / 共 3 步</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-sm mx-auto w-full relative z-10">
        <div className="mb-10 text-center space-y-6">
          <div className="w-full max-w-[280px] aspect-[2.5/1] bg-white rounded-[24px] mx-auto flex items-center justify-center p-6 shadow-2xl">
            <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {step === 1 ? '验证机构邀请码' : '填写实名账户资料'}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            {step === 1 ? '开通证裕交易单元需要专属邀请码' : '请提供您的真实信息以完成数字化合规审计'}
          </p>
        </div>

        {step === 1 && (
          <div className="w-full space-y-6">
            <div className="relative group">
              <input
                type="text"
                placeholder="机构邀请码 (如: ZY2026)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 font-mono font-black text-center text-lg text-[#00D4AA] outline-none focus:border-[#00D4AA] focus:bg-white/10 transition-all uppercase"
              />
              <div className="absolute inset-0 border border-[#00D4AA] rounded-2xl opacity-0 group-focus-within:opacity-20 pointer-events-none" />
            </div>
            <button
              onClick={handleVerifyInvite}
              disabled={loading || !inviteCode}
              className="w-full h-16 bg-[#00D4AA] text-[#0A1628] rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#00D4AA]/20 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? '正在验证...' : '下一步'}
            </button>
            <p className="text-center text-[9px] text-slate-500 font-bold">
              提示：您可以输入 ZY2026 进行演示
            </p>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleRegister} className="w-full space-y-4">
            <div className="space-y-3">
              <input
                required
                type="text"
                placeholder="用户昵称"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
              />
              <input
                required
                type="email"
                placeholder="联系邮箱"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="text"
                  placeholder="真实姓名"
                  value={formData.realName}
                  onChange={(e) => setFormData({...formData, realName: e.target.value})}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
                />
                <input
                  required
                  type="text"
                  placeholder="证件号码"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
                />
              </div>
              <input
                required
                type="password"
                placeholder="设置交易密码"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
              />
              <input
                required
                type="password"
                placeholder="确认交易密码"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-[#00D4AA] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#00D4AA] text-[#0A1628] rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#00D4AA]/20 disabled:opacity-50 transition-all active:scale-95 mt-6"
            >
              {loading ? '提交申请中...' : '提交开户申请'}
            </button>
          </form>
        )}
      </main>

      <footer className="p-8 text-center space-y-2 relative z-10">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">证裕交易单元 · 数字化安全审计</p>
        <p className="text-[8px] text-slate-600 font-medium leading-relaxed">所有提交的信息将通过银行级加密传输并受银河证券合规协议保护。</p>
      </footer>
    </div>
  );
};

export default QuickOpenView;
