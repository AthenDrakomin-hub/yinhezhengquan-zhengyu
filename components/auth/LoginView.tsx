import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSync, FaLock, FaUser, FaShieldAlt } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

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

// Alert 组件
const Alert: React.FC<{ message: string; type?: 'error' | 'success' }> = ({ message, type = 'error' }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-600',
    success: 'bg-green-50 border-green-200 text-green-600',
  };
  return (
    <div className={`${styles[type]} border text-sm px-4 py-3 rounded-lg flex items-center gap-2`}>
      {type === 'error' ? '⚠️' : '✅'}
      {message}
    </div>
  );
};

// 表单输入组件
interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({ id, label, type = 'text', value, onChange, placeholder, error, icon, suffix }) => (
  <div>
    <label htmlFor={id} className="text-sm font-semibold text-gray-900 block mb-2">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 ${icon ? 'pl-10' : ''} ${suffix ? 'pr-12' : ''} border-2 rounded-lg text-sm text-gray-900 placeholder:text-gray-400
          focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10
          transition-all duration-200
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
    {error && <p className="text-red-600 text-xs mt-1.5 font-medium">{error}</p>}
  </div>
);

// 验证码组件
interface CaptchaBoxProps {
  value: string;
  onChange: (value: string) => void;
  captchaText: string;
  onRefresh: () => void;
}

const CaptchaBox: React.FC<CaptchaBoxProps> = ({ value, onChange, captchaText, onRefresh }) => (
  <div className="flex gap-3 items-center">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      placeholder="验证码"
      maxLength={4}
      className="flex-1 h-12 px-4 border-2 border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400
        focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 uppercase tracking-wider font-medium"
    />
    <div 
      className="h-12 w-28 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center 
        font-mono font-bold text-lg tracking-wider text-blue-800 cursor-pointer hover:from-blue-200 hover:to-indigo-200 
        transition-all duration-200 border-2 border-blue-200"
      onClick={onRefresh}
      title="点击刷新"
    >
      {captchaText}
    </div>
    <button
      type="button"
      onClick={onRefresh}
      className="h-12 w-12 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      aria-label="刷新验证码"
    >
      <FaSync className="text-base" />
    </button>
  </div>
);

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToHome }) => {
  const navigate = useNavigate();
  
  const LOGO_URL = import.meta.env.VITE_LOGO_URL || '/logo.png';
  
  // 表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [rememberAccount, setRememberAccount] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // 验证码状态
  const [captcha, setCaptcha] = useState(generateCaptcha());
  
  // 安全信息状态
  const [clientIP, setClientIP] = useState('获取中...');
  const [lastLogin, setLastLogin] = useState('--');
  const [verifyInfo] = useState('证裕交易单元欢迎您');
  
  // 错误状态
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化
  useEffect(() => {
    // 获取真实IP
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(() => setClientIP('获取失败'));
    
    // 读取记住的邮箱
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
    
    // 读取上次登录时间
    const savedLastLogin = localStorage.getItem('clientLastLogin');
    if (savedLastLogin) {
      setLastLogin(savedLastLogin);
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) {
      newErrors.email = '请输入邮箱';
    }
    
    if (!password.trim()) {
      newErrors.password = '请输入交易密码';
    }
    
    if (!captchaInput.trim()) {
      newErrors.captcha = '请输入验证码';
    } else if (captchaInput.toUpperCase() !== captcha.code) {
      newErrors.captcha = '验证码错误';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      refreshCaptcha();
      return;
    }
    
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError || !authData?.user) {
        setErrors({ form: '客户号/手机号或密码错误' });
        refreshCaptcha();
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status, role, username')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setErrors({ form: '用户资料不存在' });
        setLoading(false);
        return;
      }

      if (profile.status === 'PENDING') {
        await supabase.auth.signOut();
        setErrors({ form: '账户正在审核中' });
        setLoading(false);
        return;
      }

      if (profile.status === 'BANNED') {
        await supabase.auth.signOut();
        setErrors({ form: '账户已被禁用' });
        setLoading(false);
        return;
      }

      // 保存记住的邮箱
      if (rememberAccount) {
        localStorage.setItem('rememberedEmail', email.trim());
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // 保存本次登录时间
      const now = new Date().toLocaleString('zh-CN');
      localStorage.setItem('clientLastLogin', now);

      setLoading(false);
      onLoginSuccess({
        ...authData.user,
        role: profile.role,
        username: profile.username
      });
      
    } catch (error: any) {
      console.error('[LoginView] 登录错误:', error);
      setErrors({ form: error?.message || '登录失败，请稍后重试' });
      refreshCaptcha();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4 sm:p-6 text-gray-900">
      {/* 装饰性背景元素 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl" />
      </div>

      {/* 顶部品牌区 */}
      <div className="relative z-10 w-full max-w-md mb-6 flex flex-col items-center">
        <img src={LOGO_URL} alt="中国银河证券" className="h-14 object-contain mb-2" />
        <p className="text-gray-500 text-sm">证裕交易单元 · 专业投资平台</p>
      </div>

      {/* 登录卡片 */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm w-full max-w-md rounded-2xl shadow-xl border border-white/50 p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
          客户登录
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          {errors.form && <Alert message={errors.form} />}

          <InputField
            id="email"
            label="邮箱"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="请输入登录邮箱"
            error={errors.email}
            icon={<FaUser />}
          />

          <InputField
            id="password"
            label="交易密码"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="请输入交易密码"
            error={errors.password}
            icon={<FaLock />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            }
          />

          <div>
            <label className="text-sm font-semibold text-gray-900 block mb-2">验证码</label>
            <CaptchaBox
              value={captchaInput}
              onChange={setCaptchaInput}
              captchaText={captcha.text}
              onRefresh={refreshCaptcha}
            />
            {errors.captcha && <p className="text-red-600 text-xs mt-1.5 font-medium">{errors.captcha}</p>}
          </div>

          {/* 记住账号 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberAccount}
                onChange={(e) => setRememberAccount(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-2 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">记住客户号</span>
            </label>
            <button
              type="button"
              onClick={() => navigate('/auth/forgot-password')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              忘记密码？
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 rounded-xl text-base font-semibold transition-all duration-200 
              flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25
              ${loading 
                ? 'bg-blue-400 cursor-not-allowed text-white' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl hover:shadow-blue-500/30'
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                登录中...
              </>
            ) : (
              '立即登录'
            )}
          </button>
        </form>

        {/* 快速开户入口 */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-3">还没有账户？</p>
          <button
            onClick={() => navigate('/auth/quick-open')}
            className="text-blue-600 hover:text-blue-700 text-sm font-bold hover:underline"
          >
            立即开户 →
          </button>
        </div>
      </div>

      {/* 安全信息区 */}
      <div className="relative z-10 w-full max-w-md mt-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 text-blue-700 mb-3">
            <FaShieldAlt className="text-base" />
            <span className="text-sm font-bold">安全提示</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">预留验证信息：</span>
              <span className="text-gray-900 font-medium">{verifyInfo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">当前IP：</span>
              <span className="text-gray-900 font-mono font-medium">{clientIP}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">上次登录：</span>
              <span className="text-gray-900 font-medium">{lastLogin}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 返回首页 */}
      <div className="relative z-10 mt-4">
        <button
          onClick={onBackToHome}
          className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1 transition-colors"
        >
          <span>←</span> 返回官网首页
        </button>
      </div>

      {/* 版权 */}
      <div className="relative z-10 mt-6 text-center text-xs text-gray-400">
        Copyright © 2026 中国银河证券·证裕交易单元 版权所有
      </div>
    </div>
  );
};

export default LoginView;
