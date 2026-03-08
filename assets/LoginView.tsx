import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ICONS } from '../../lib/constants';

interface LoginViewProps {
  onLoginSuccess: (userData?: any) => void;
  onBackToHome: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToHome }) => {
  const navigate = useNavigate();
  
  const BG_URL = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070";
  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";
  
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 11) {
      alert('请输入正确的11位手机号');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+86${phone}`,
      });
      if (error) throw error;
      setOtpSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      alert(error?.message || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[Login] 开始登录...');

      if (loginMethod === 'email') {
        if (!email || !password) {
          throw new Error('请输入邮箱和密码');
        }

        console.log('[Login] 调用 signInWithPassword...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        console.log('[Login] API返回:', { 
          hasData: !!authData, 
          hasError: !!authError,
          errorMessage: authError?.message 
        });

        if (authError) {
          console.error('[Login] 登录失败:', authError.message);
          setLoading(false);
          alert(`登录失败: ${authError.message}`);
          return;
        }
        if (!authData?.user) throw new Error('登录失败');

        console.log('[Login] Auth成功，查询profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, role, username')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw new Error('用户资料不存在');
        
        if (profile?.status === 'PENDING') {
          await supabase.auth.signOut();
          throw new Error('账户正在审核中');
        }
        if (profile?.status === 'BANNED') {
          await supabase.auth.signOut();
          throw new Error('账户已被禁用');
        }

        console.log('[Login] 登录成功，调用 onLoginSuccess...');
        setLoading(false);
        
        onLoginSuccess({
          ...authData.user,
          role: profile?.role,
          username: profile?.username
        });
        return;
      }

      if (loginMethod === 'phone') {
        if (!phone || phone.length !== 11) {
          throw new Error('请输入正确的11位手机号');
        }
        if (!otpSent) {
          throw new Error('请先获取验证码');
        }
        if (!otp || otp.length !== 6) {
          throw new Error('请输入6位验证码');
        }

        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
          phone: `+86${phone}`,
          token: otp,
          type: 'sms',
        });

        if (authError) throw authError;
        if (!authData?.user) throw new Error('验证失败');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, role, username')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw new Error('用户资料不存在');

        if (profile?.status === 'PENDING') {
          await supabase.auth.signOut();
          throw new Error('账户正在审核中');
        }
        if (profile?.status === 'BANNED') {
          await supabase.auth.signOut();
          throw new Error('账户已被禁用');
        }

        setLoading(false);
        onLoginSuccess({
          ...authData.user,
          role: profile?.role,
          username: profile?.username
        });
        return;
      }
    } catch (error: any) {
      console.error('[Login] 登录失败:', error);
      alert(error?.message || '登录失败，请稍后重试');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: `url('${BG_URL}')` }}
    >
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-0" />

      <button 
        onClick={onBackToHome}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10"
      >
        <ICONS.ArrowRight className="rotate-180" size={12} />
        <span className="hidden sm:inline">返回官网首页</span>
        <span className="sm:hidden">返回</span>
      </button>

      <div className="w-full max-w-md text-center relative z-10">
        <div className="glass-card p-6 sm:p-8 bg-slate-900/60 border-white/10 backdrop-blur-2xl shadow-2xl rounded-[24px]">
          <div className="flex flex-col items-center mb-6 sm:mb-8">
            <div className="w-full max-w-[240px] aspect-[2.5/1] bg-white rounded-[20px] flex items-center justify-center p-3 shadow-xl border border-white/30">
              <img src={LOGO_URL} alt="中国银河证券 证裕交易单元" className="w-full h-full object-contain" />
            </div>
            <p className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">NEXUS 交易单元认证中心</p>
          </div>

          <div className="flex border-b border-white/5 mb-6">
            <button 
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-wider transition-all relative ${loginMethod === 'phone' ? 'text-[#00D4AA]' : 'text-slate-500'}`}
            >
              <span className="hidden sm:inline">验证码登录</span>
              <span className="sm:hidden">验证码</span>
              {loginMethod === 'phone' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4AA]" />}
            </button>
            <button 
              onClick={() => setLoginMethod('email')}
              className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-wider transition-all relative ${loginMethod === 'email' ? 'text-[#00D4AA]' : 'text-slate-500'}`}
            >
              <span className="hidden sm:inline">账号密码登录</span>
              <span className="sm:hidden">密码</span>
              {loginMethod === 'email' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D4AA]" />}
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginMethod === 'phone' ? (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <span className="text-[10px] font-black">+86</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full h-12 bg-white/5 pl-12 pr-4 rounded-xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] text-[#00D4AA]"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <ICONS.Shield size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="请输入验证码"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full h-12 bg-white/5 pl-10 pr-24 rounded-xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] text-[#00D4AA]"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || loading || phone.length < 11}
                    className="absolute right-2 top-2 bottom-2 px-3 bg-[#00D4AA]/10 text-[#00D4AA] rounded-lg text-[9px] font-black uppercase disabled:opacity-30"
                  >
                    {countdown > 0 ? `${countdown}S` : '获取验证码'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <ICONS.User size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="请输入登录邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 bg-white/5 pl-10 pr-4 rounded-xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] text-[#00D4AA]"
                    required
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <ICONS.Shield size={16} />
                  </div>
                  <input
                    type="password"
                    placeholder="请输入登录密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 bg-white/5 pl-10 pr-4 rounded-xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] text-[#00D4AA]"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-14 rounded-xl font-black text-sm tracking-[0.15em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${loading ? 'bg-amber-500 text-white cursor-not-allowed' : 'bg-[#00D4AA] text-[#0A1628] hover:bg-[#00C49A]'}`}
            >
              {loading ? (
                <>
                  <ICONS.Refresh className="animate-spin" size={18} />
                  <span>正在验证...</span>
                </>
              ) : (
                <>
                  确认登录
                  <ICONS.ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
