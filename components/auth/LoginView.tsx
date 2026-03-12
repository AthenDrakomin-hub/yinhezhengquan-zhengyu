import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSync, FaLock, FaUser, FaShieldAlt } from 'react-icons/fa';
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

// Alert 组件
const Alert: React.FC<{ message: string; type?: 'error' | 'success' }> = ({ message, type = 'error' }) => {
  const styles = {
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
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
    <label htmlFor={id} className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          {icon}
        </div>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 ${icon ? 'pl-10' : ''} ${suffix ? 'pr-12' : ''} border-2 rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/20
          transition-all duration-200 bg-[var(--color-surface)]
          ${error ? 'border-red-500 bg-red-500/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
    {error && <p className="text-red-400 text-xs mt-1.5 font-medium">{error}</p>}
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
      className="flex-1 h-12 px-4 border-2 border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
        focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/20 uppercase tracking-wider font-medium bg-[var(--color-surface)]"
    />
    <div 
      className="h-12 w-28 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center 
        font-mono font-bold text-lg tracking-wider text-[var(--color-primary)] cursor-pointer hover:bg-[var(--color-primary)]/30 
        transition-all duration-200 border-2 border-[var(--color-primary)]/30"
      onClick={onRefresh}
      title="点击刷新"
    >
      {captchaText}
    </div>
    <button
      type="button"
      onClick={onRefresh}
      className="h-12 w-12 flex items-center justify-center text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
      aria-label="刷新验证码"
    >
      <FaSync className="text-base" />
    </button>
  </div>
);

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBackToHome }) => {
  const navigate = useNavigate();
  
  // 使用统一主题管理 - 认证区域使用浅色主题
  useRouteTheme('auth');
  
  const LOGO_URL = imageConfig.logo.fullUrl;
  
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
  const [verifyInfo] = useState('日斗投资单元欢迎您');
  
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
        .select('status, admin_level, username, email')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        setErrors({ form: '用户资料不存在' });
        setLoading(false);
        return;
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
        admin_level: profile.admin_level,
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
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)]">
      {/* 装饰性背景元素 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
      </div>

      {/* 顶部品牌区 */}
      <div className="relative z-10 w-full max-w-md mb-6 flex flex-col items-center">
        <img src={LOGO_URL} alt="中国银河证券" className="h-14 object-contain mb-2" />
        <p className="text-[var(--color-text-secondary)] text-sm">日斗投资单元 · 专业投资平台</p>
      </div>

      {/* 登录卡片 */}
      <div className="relative z-10 bg-[var(--color-surface)] w-full max-w-md rounded-2xl shadow-xl border border-[var(--color-border)] p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-6">
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
            label="密码"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="请输入密码"
            error={errors.password}
            icon={<FaLock />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            }
          />

          <div>
            <label className="text-sm font-semibold text-[var(--color-text-primary)] block mb-2">验证码</label>
            <CaptchaBox
              value={captchaInput}
              onChange={setCaptchaInput}
              captchaText={captcha.text}
              onRefresh={refreshCaptcha}
            />
            {errors.captcha && <p className="text-red-400 text-xs mt-1.5 font-medium">{errors.captcha}</p>}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberAccount}
                onChange={(e) => setRememberAccount(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">记住账号</span>
            </label>
            <button
              type="button"
              onClick={() => navigate('/auth/forgot-password')}
              className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors"
            >
              忘记密码？
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-lg 
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        {/* 安全提示 */}
        <div className="mt-6 p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-3">
            <FaShieldAlt className="text-[var(--color-primary)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">安全信息</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center">
              <span className="w-16 shrink-0 text-[var(--color-text-muted)]">登录IP</span>
              <span className="text-[var(--color-text-secondary)] font-mono">{clientIP}</span>
            </div>
            <div className="flex items-center">
              <span className="w-16 shrink-0 text-[var(--color-text-muted)]">上次登录</span>
              <span className="text-[var(--color-text-secondary)]">{lastLogin}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            {verifyInfo}
          </div>
        </div>

        {/* 底部链接 */}
        <div className="mt-6 flex justify-center gap-4 text-sm">
          <button
            type="button"
            onClick={onBackToHome}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            返回首页
          </button>
          <span className="text-[var(--color-border)]">|</span>
          <button
            type="button"
            onClick={() => navigate('/auth/quick-open')}
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors font-medium"
          >
            开通账户
          </button>
        </div>
      </div>

      {/* 底部版权 */}
      <div className="relative z-10 mt-6 text-center text-xs text-[var(--color-text-muted)]">
        <p>© 2026 中国银河证券 · 日斗投资单元</p>
        <p className="mt-1">投资有风险，入市需谨慎</p>
      </div>
    </div>
  );
};

export default LoginView;
