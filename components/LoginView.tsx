
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ICONS } from '../constants';

interface LoginViewProps {
  onLoginSuccess: (userData?: any) => void;
  onBackToHome: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToHome }) => {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 倒计时逻辑
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // 环境检查
  const isPlaceholder = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');

  // 发送验证码
  const handleSendOtp = async () => {
    if (!phone || phone.length < 11) return alert('请输入正确的 11 位手机号');
    setLoading(true);
    
    try {
      if (isPlaceholder) {
        console.warn('演示模式：模拟发送验证码到', phone);
        setTimeout(() => {
          setOtpSent(true);
          setCountdown(60);
          setLoading(false);
          alert('验证码已发送（演示模式：请输入任意 6 位数字）');
        }, 1000);
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: `+86${phone}`,
        });
        if (error) throw error;
        setOtpSent(true);
        setCountdown(60);
        setLoading(false);
      }
    } catch (error: any) {
      alert(error.message || '发送失败，请检查手机号格式或后台配置');
      setLoading(false);
    }
  };

  // 执行登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (loginMethod === 'phone') {
        if (isPlaceholder) {
          if (otp.length === 6) {
            setTimeout(() => {
              onLoginSuccess({ email: `${phone}@demo.com`, username: `User_${phone.slice(-4)}` });
              setLoading(false);
            }, 1000);
          } else {
            throw new Error('请输入 6 位验证码');
          }
        } else {
          const { data, error } = await supabase.auth.verifyOtp({
            phone: `+86${phone}`,
            token: otp,
            type: 'sms',
          });
          if (error) throw error;
          onLoginSuccess(data.user);
        }
      } else {
        if (isPlaceholder) {
          if (email && password) {
            setTimeout(() => {
              onLoginSuccess({ email, username: email.split('@')[0] });
              setLoading(false);
            }, 1000);
          } else {
            throw new Error('请输入邮箱和密码');
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          onLoginSuccess(data.user);
        }
      }
    } catch (error: any) {
      alert(error.message || '登录验证失败');
      setLoading(false);
    }
  };

  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";
  const BG_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/75581daa-fd55-45c5-8376-f51bf6852fde.jpg";

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-8 animate-slide-up relative"
      style={{ backgroundImage: `url('${BG_URL}')` }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[4px] z-0" />

      {/* 返回官网 */}
      <button 
        onClick={onBackToHome}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
      >
        <ICONS.ArrowRight className="rotate-180" size={14} />
        返回官网首页
      </button>

      <div className="w-full max-w-sm space-y-10 text-center relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[320px] aspect-[2.5/1] bg-white rounded-[32px] flex items-center justify-center p-6 shadow-2xl border border-white/30 transition-transform hover:scale-105 duration-500 mb-8">
            <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="glass-card p-8 bg-slate-900/60 border-white/10 backdrop-blur-2xl shadow-2xl rounded-[32px]">
          <div className="flex border-b border-white/5 mb-8">
            <button 
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${loginMethod === 'phone' ? 'text-[#00D4AA]' : 'text-slate-500'}`}
            >
              验证码登录
              {loginMethod === 'phone' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4AA] shadow-[0_0_10px_#00D4AA]" />}
            </button>
            <button 
              onClick={() => setLoginMethod('email')}
              className={`flex-1 pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${loginMethod === 'email' ? 'text-[#00D4AA]' : 'text-slate-500'}`}
            >
              账号密码登录
              {loginMethod === 'email' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4AA] shadow-[0_0_10px_#00D4AA]" />}
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginMethod === 'phone' ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                    <span className="text-[11px] font-black">+86</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full h-14 bg-white/5 pl-14 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                    <ICONS.Shield size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full h-14 bg-white/5 pl-12 pr-32 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || loading || phone.length < 11}
                    className="absolute right-2 top-2 bottom-2 px-4 bg-[#00D4AA]/10 text-[#00D4AA] rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 active:scale-95 transition-all"
                  >
                    {countdown > 0 ? `${countdown}S` : '获取验证码'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                    <ICONS.User size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="证券账户 / 邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                    <ICONS.Shield size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder="交易密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#00D4AA] text-[#0A1628] rounded-2xl font-black text-base tracking-[0.2em] shadow-xl shadow-[#00D4AA]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? '正在进行安全验证...' : '确认登录'}
              <ICONS.ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between px-2">
              <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-[#00D4AA]">忘记密码</button>
              <button className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest">申请开通单元</button>
            </div>
            
            <div className="h-px bg-white/5 w-1/2 mx-auto" />
            
            <div className="space-y-2">
              <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                登录即代表您同意《银河证券·证裕用户隐私协议》<br/>
                <span className="text-[#00D4AA]/60">本平台仅用于模拟资产验证，不涉及真实资金交易</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 opacity-50">
          <p className="text-[8px] font-black text-slate-500 leading-loose uppercase tracking-[0.2em]">
            中国银河证券 · 证裕交易系统 2.0 <br/>
            数字资产安全审计中心 
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
