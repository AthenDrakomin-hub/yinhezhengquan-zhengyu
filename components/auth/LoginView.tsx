import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaUser, FaLock } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { imageConfig } from '../../lib/imageConfig';
import { useRouteTheme } from '../../contexts/ThemeContext';

interface LoginViewProps {
  onLoginSuccess: (userData?: any) => void;
  onBackToHome: () => void;
}

// 生成随机验证码
const generateCaptcha = (): { code: string; text: string } => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return { code, text: code };
};

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToHome }) => {
  const navigate = useNavigate();
  useRouteTheme('auth');
  
  const LOGO_URL = imageConfig.logo.fullUrl;
  
  // 表单状态
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [rememberAccount, setRememberAccount] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化
  useEffect(() => {
    const savedAccount = localStorage.getItem('rememberedAccount');
    if (savedAccount) {
      setAccount(savedAccount);
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!account.trim()) {
      newErrors.account = '请输入账号';
    }
    
    if (!password.trim()) {
      newErrors.password = '请输入密码';
    }
    
    if (!captchaInput.trim()) {
      newErrors.captcha = '请输入验证码';
    } else if (captchaInput.toUpperCase() !== captcha.code) {
      newErrors.captcha = '验证码错误';
    }

    if (!agreedToTerms) {
      newErrors.terms = '请阅读并同意用户协议和隐私政策';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 判断是否为手机号
  const isPhoneNumber = (input: string): boolean => {
    return /^1[3-9]\d{9}$/.test(input.trim());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      refreshCaptcha();
      return;
    }
    
    setLoading(true);

    try {
      const input = account.trim();
      let loginEmail = input;
      
      // 如果输入的是手机号，查询对应的邮箱
      if (isPhoneNumber(input)) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const profileRes = await fetch(`${supabaseUrl}/functions/v1/sql-exec`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: `SELECT email FROM public.profiles WHERE phone = '${input}' LIMIT 1`
          }),
        });
        
        const profileData = await profileRes.json();
        if (profileData.success && profileData.data?.length > 0) {
          loginEmail = profileData.data[0].email;
        } else {
          setErrors({ form: '该手机号未注册' });
          refreshCaptcha();
          setLoading(false);
          return;
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.trim(),
      });

      if (authError || !authData?.user) {
        setErrors({ form: '账号或密码错误' });
        refreshCaptcha();
        setLoading(false);
        return;
      }

      // 获取用户 profile
      let profile: { status?: string; admin_level?: string; username?: string } | null = null;
      
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const profileResponse = await fetch(`${supabaseUrl}/functions/v1/sql-exec`, {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${authData.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: `SELECT id, email, username, status, admin_level FROM public.profiles WHERE id = '${authData.user.id}'`
          }),
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.data?.length > 0) {
            profile = profileData.data[0];
          }
        }
      } catch (e) {
        console.warn('[LoginView] 获取 profile 失败:', e);
      }

      if (!profile) {
        profile = {
          status: 'ACTIVE',
          admin_level: 'user',
          username: authData.user.email?.split('@')[0] || '用户'
        };
      }

      if (profile.status?.toLowerCase() === 'pending') {
        await supabase.auth.signOut();
        setErrors({ form: '账户正在审核中' });
        setLoading(false);
        return;
      }

      if (profile.status?.toLowerCase() === 'banned') {
        await supabase.auth.signOut();
        setErrors({ form: '账户已被禁用' });
        setLoading(false);
        return;
      }

      // 保存账号
      if (rememberAccount) {
        localStorage.setItem('rememberedAccount', account.trim());
      } else {
        localStorage.removeItem('rememberedAccount');
      }

      setLoading(false);
      onLoginSuccess({
        ...authData.user,
        admin_level: profile.admin_level,
        username: profile.username
      });
      
    } catch (error: any) {
      console.error('[LoginView] 登录错误:', error);
      setErrors({ form: '登录失败，请稍后重试' });
      refreshCaptcha();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex flex-col relative overflow-hidden">
      {/* 背景图片 */}
      <div 
        className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('https://kvlvbhzrrpspzaoiormt.supabase.co/storage/v1/object/public/xitongtu/screenshot-20260315-065818-removebg-preview.png')`,
          backgroundSize: 'contain',
          backgroundPosition: 'right center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* 顶部 Logo 区域 */}
      <div className="pt-12 pb-8 text-center relative z-10">
        <img src={LOGO_URL} alt="中国银河证券" className="h-12 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">中国银河证券</h1>
        <p className="text-sm text-gray-500 mt-1">日斗投资单元</p>
      </div>

      {/* 登录卡片 */}
      <div className="flex-1 flex justify-center px-4 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-6">欢迎登录</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* 错误提示 */}
              {errors.form && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  {errors.form}
                </div>
              )}

              {/* 账号输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">账号</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaUser />
                  </div>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder="邮箱 / 手机号"
                    className={`w-full h-12 pl-11 pr-4 border rounded-xl text-gray-800 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500
                      transition-all ${errors.account ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                </div>
                {errors.account && <p className="text-red-500 text-xs mt-1">{errors.account}</p>}
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaLock />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className={`w-full h-12 pl-11 pr-12 border rounded-xl text-gray-800 placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500
                      transition-all ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* 验证码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">验证码</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    placeholder="请输入验证码"
                    maxLength={4}
                    className={`flex-1 h-12 px-4 border rounded-xl text-gray-800 placeholder-gray-400 uppercase tracking-wider font-medium
                      focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500
                      transition-all ${errors.captcha ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                  <div 
                    onClick={refreshCaptcha}
                    className="h-12 w-28 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center 
                      font-mono font-bold text-lg tracking-widest text-white cursor-pointer hover:from-red-600 hover:to-red-700 
                      transition-all select-none"
                    title="点击刷新"
                  >
                    {captcha.text}
                  </div>
                </div>
                {errors.captcha && <p className="text-red-500 text-xs mt-1">{errors.captcha}</p>}
              </div>

              {/* 记住账号 & 忘记密码 */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberAccount}
                    onChange={(e) => setRememberAccount(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500/20"
                  />
                  <span className="text-sm text-gray-600">记住账号</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/auth/forgot-password')}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  忘记密码？
                </button>
              </div>

              {/* 用户协议勾选 */}
              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500/20 mt-0.5"
                  />
                  <span className="text-xs text-gray-500 leading-relaxed">
                    我已阅读并同意
                    <button 
                      type="button"
                      onClick={() => navigate('/client/legal/user-agreement')}
                      className="text-red-500 hover:text-red-600 mx-1"
                    >
                      《用户服务协议》
                    </button>
                    和
                    <button 
                      type="button"
                      onClick={() => navigate('/client/legal/privacy-policy')}
                      className="text-red-500 hover:text-red-600 mx-1"
                    >
                      《隐私政策》
                    </button>
                  </span>
                </label>
                {errors.terms && <p className="text-red-500 text-xs">{errors.terms}</p>}
              </div>

              {/* 登录按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                  text-white font-semibold rounded-xl transition-all duration-200 
                  disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2
                  shadow-lg shadow-red-500/25"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登 录'
                )}
              </button>
            </form>

            {/* 底部链接 */}
            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center gap-6 text-sm">
              <button
                type="button"
                onClick={onBackToHome}
                className="text-gray-500 hover:text-gray-700"
              >
                返回首页
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth/quick-open')}
                className="text-red-500 hover:text-red-600 font-medium"
              >
                开通账户
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部版权 */}
      <div className="py-6 text-center relative z-10">
        <p className="text-xs text-gray-400">© 2026 中国银河证券股份有限公司</p>
        <p className="text-xs text-gray-400 mt-1">投资有风险，入市需谨慎</p>
      </div>
    </div>
  );
};

export default LoginView;
