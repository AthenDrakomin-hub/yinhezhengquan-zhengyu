import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSync, FaShieldAlt, FaMobileAlt, FaCheckCircle } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { generateTOTPSecret, verifyTOTP } from '@/lib/totp';

interface AdminLoginViewProps {
  onLoginSuccess: (userData: Record<string, any>) => void;
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
const Alert: React.FC<{ message: string; type?: 'error' | 'success' | 'info' }> = ({ message, type = 'error' }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-600',
    success: 'bg-green-50 border-green-200 text-green-600',
    info: 'bg-blue-50 border-blue-200 text-blue-600',
  };
  return (
    <div role="alert" className={`${styles[type]} border text-sm px-4 py-3 rounded flex items-center gap-2`}>
      {type === 'error' && <span>⚠️</span>}
      {type === 'success' && <span>✅</span>}
      {type === 'info' && <span>ℹ️</span>}
      {message}
    </div>
  );
};

// FormField 组件
interface FormFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({ id, label, children, error }) => (
  <div>
    <label htmlFor={id} className="text-sm font-medium text-gray-700 block mb-1.5">
      {label}
    </label>
    {children}
    {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
  </div>
);

// CaptchaBox 组件
interface CaptchaBoxProps {
  value: string;
  onChange: (value: string) => void;
  captchaText: string;
  onRefresh: () => void;
  disabled?: boolean;
}

const CaptchaBox: React.FC<CaptchaBoxProps> = ({ value, onChange, captchaText, onRefresh, disabled }) => (
  <div className="flex gap-3 items-center">
    <input
      id="captcha"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      placeholder="验证码"
      maxLength={4}
      disabled={disabled}
      className="w-24 h-10 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 uppercase tracking-wider disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
    <div 
      className="h-10 w-20 bg-gray-100 rounded flex items-center justify-center font-mono font-bold text-lg tracking-wider text-gray-800 cursor-pointer hover:bg-gray-200 transition-colors"
      onClick={onRefresh}
      title="点击刷新验证码"
    >
      {captchaText}
    </div>
    <button
      type="button"
      onClick={onRefresh}
      className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
      aria-label="刷新验证码"
    >
      <FaSync className="text-xs" />
      换一张
    </button>
  </div>
);

const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  
  const LOGO_URL = import.meta.env.VITE_ADMIN_LOGO_URL || import.meta.env.VITE_LOGO_URL || '/logo.png';
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    captcha: '',
    otp: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [captcha, setCaptcha] = useState<{ code: string; text: string }>({ code: '', text: '' });
  const [clientIP, setClientIP] = useState('获取中...');
  const [lastLogin, setLastLogin] = useState('--');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  // TOTP 相关状态
  const [step, setStep] = useState<'login' | 'totp-setup' | 'totp-verify'>('login');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bindingOtp, setBindingOtp] = useState('');

  // 获取真实IP
  useEffect(() => {
    setCaptcha(generateCaptcha());
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setClientIP(data.ip))
      .catch(() => setClientIP('获取失败'));
    
    const savedLastLogin = localStorage.getItem('adminLastLogin');
    if (savedLastLogin) {
      setLastLogin(savedLastLogin);
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setFormData(prev => ({ ...prev, captcha: '' }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.email.trim()) errors.email = '请输入邮箱';
    if (!formData.password.trim()) errors.password = '请输入密码';
    if (!formData.captcha.trim()) errors.captcha = '请输入验证码';
    else if (formData.captcha.toUpperCase() !== captcha.code) errors.captcha = '验证码错误';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 第一阶段：验证账号密码
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (!validateForm()) {
      refreshCaptcha();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      if (authError || !data?.user) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        if (newAttempts >= 5) {
          setIsLocked(true);
          setError('账户已锁定，请联系IT支持');
        } else {
          setError(`工号或密码错误，还剩 ${5 - newAttempts} 次机会`);
        }
        refreshCaptcha();
        setLoading(false);
        return;
      }

      // 获取用户资料
      const profileResult = await supabase
        .from('profiles')
        .select('admin_level, status, username, email')
        .eq('id', data.user.id)
        .single();

      console.log('[Admin] profileResult:', profileResult);
      console.log('[Admin] data.user.id:', data.user.id);

      const profile = profileResult.data;
      
      if (profileResult.error) {
        console.error('[Admin] profiles 查询错误:', profileResult.error);
      }

      if (!profile || profile.status?.toLowerCase() === 'banned') {
        setError(profile?.status?.toLowerCase() === 'banned' ? '账户已被禁用' : '用户资料不存在');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      if (profile.admin_level !== 'admin' && profile.admin_level !== 'super_admin') {
        setError('无管理员权限');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 登录成功，直接完成
      const userData = { ...data.user, ...profile };
      setCurrentUser(userData);
      const now = new Date().toLocaleString('zh-CN');
      localStorage.setItem('adminLastLogin', now);
      setLoading(false);
      onLoginSuccess(userData);
    } catch {
      setError('登录失败，请稍后重试');
      refreshCaptcha();
      setLoading(false);
    }
  };

  // 第二阶段：绑定 TOTP
  const handleBindTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindingOtp || bindingOtp.length !== 6) {
      setError('请输入6位动态口令');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 验证输入的 TOTP 码
      const isValid = verifyTOTP(totpSecret, bindingOtp);
      
      if (!isValid) {
        setError('动态口令错误，请检查手机时间是否准确');
        setLoading(false);
        return;
      }

      // 保存 TOTP 密钥到数据库
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ totp_secret: totpSecret })
        .eq('id', currentUser.id);

      if (updateError) {
        setError('绑定失败，请稍后重试');
        setLoading(false);
        return;
      }

      // 绑定成功，完成登录
      completeLogin();
    } catch {
      setError('绑定失败，请稍后重试');
      setLoading(false);
    }
  };

  // 第二阶段：验证 TOTP
  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.otp || formData.otp.length !== 6) {
      setError('请输入6位动态口令');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = verifyTOTP(currentUser.totp_secret, formData.otp);
      
      if (!isValid) {
        setError('动态口令错误，请检查手机时间是否准确');
        setLoading(false);
        return;
      }

      completeLogin();
    } catch {
      setError('验证失败，请稍后重试');
      setLoading(false);
    }
  };

  // 完成登录
  const completeLogin = () => {
    const now = new Date().toLocaleString('zh-CN');
    localStorage.setItem('adminLastLogin', now);
    setLoading(false);
    onLoginSuccess(currentUser);
  };

  // 返回登录
  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    setStep('login');
    setQrCodeUrl('');
    setTotpSecret('');
    setBindingOtp('');
    setCurrentUser(null);
    setError('');
    setInfo('');
    refreshCaptcha();
  };

  // 渲染登录表单
  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-4">
      {error && <Alert message={error} />}

      <FormField id="email" label="邮箱" error={formErrors.email}>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="请输入登录邮箱"
          disabled={isLocked || loading}
          autoFocus
          className="w-full h-10 px-3 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </FormField>

      <FormField id="password" label="密码" error={formErrors.password}>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="请输入密码"
            disabled={isLocked || loading}
            className="w-full h-10 px-3 pr-20 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-blue-600"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => navigate('/auth/forgot-password')}
            className="text-xs text-blue-600 hover:underline"
          >
            忘记密码?
          </button>
        </div>
      </FormField>

      <FormField id="captcha" label="验证码" error={formErrors.captcha}>
        <CaptchaBox
          value={formData.captcha}
          onChange={(val) => setFormData(prev => ({ ...prev, captcha: val }))}
          captchaText={captcha.text}
          onRefresh={refreshCaptcha}
          disabled={isLocked || loading}
        />
      </FormField>

      <button
        type="submit"
        disabled={loading || isLocked}
        aria-disabled={loading || isLocked}
        className={`w-full h-11 rounded text-base font-semibold transition-colors mt-2 flex items-center justify-center gap-2 ${
          loading || isLocked
            ? 'bg-blue-600 opacity-50 cursor-not-allowed text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            登录中...
          </>
        ) : isLocked ? (
          '账户已锁定'
        ) : (
          '下一步'
        )}
      </button>
    </form>
  );

  // 渲染 TOTP 绑定界面
  const renderTOTPSetup = () => (
    <div className="space-y-4">
      {info && <Alert message={info} type="info" />}
      {error && <Alert message={error} />}

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
          <FaMobileAlt className="text-blue-600 text-xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">绑定动态口令</h3>
        <p className="text-sm text-gray-500 mt-1">首次登录，请完成安全绑定</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>下载并安装 <strong>Google Authenticator</strong> 或 <strong>微软 Authenticator</strong></li>
          <li>打开 APP，点击"添加账户"→"扫描二维码"</li>
          <li>扫描下方二维码</li>
          <li>输入 APP 显示的 6 位数字完成绑定</li>
        </ol>
      </div>

      {qrCodeUrl && (
        <div className="flex flex-col items-center">
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <img src={qrCodeUrl} alt="TOTP QR Code" className="w-40 h-40" />
          </div>
          <p className="text-xs text-gray-400 mt-2">无法扫码？手动输入密钥：</p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 select-all">{totpSecret}</code>
        </div>
      )}

      <form onSubmit={handleBindTOTP} className="space-y-3">
        <FormField id="binding-otp" label="输入 APP 中的 6 位数字" error={formErrors.otp}>
          <input
            id="binding-otp"
            type="text"
            value={bindingOtp}
            onChange={(e) => setBindingOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
            className="w-full h-11 px-3 border border-gray-200 rounded text-base focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 tracking-[0.5em] text-center font-mono"
          />
        </FormField>

        <button
          type="submit"
          disabled={loading || bindingOtp.length !== 6}
          className={`w-full h-11 rounded text-base font-semibold transition-colors flex items-center justify-center gap-2 ${
            loading || bindingOtp.length !== 6
              ? 'bg-blue-600 opacity-50 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? '验证中...' : '确认绑定'}
        </button>
      </form>

      <button
        onClick={handleBackToLogin}
        className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
      >
        ← 返回重新登录
      </button>
    </div>
  );

  // 渲染 TOTP 验证界面
  const renderTOTPVerify = () => (
    <div className="space-y-4">
      {error && <Alert message={error} />}

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
          <FaShieldAlt className="text-green-600 text-xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">动态口令验证</h3>
        <p className="text-sm text-gray-500 mt-1">请输入 Google Authenticator 中的 6 位数字</p>
      </div>

      <form onSubmit={handleVerifyTOTP} className="space-y-4">
        <FormField id="otp" label="动态口令" error={formErrors.otp}>
          <input
            id="otp"
            type="text"
            name="otp"
            value={formData.otp}
            onChange={(e) => setFormData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
            placeholder="000000"
            maxLength={6}
            autoFocus
            className="w-full h-14 px-3 border border-gray-200 rounded text-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 tracking-[0.5em] text-center font-mono"
          />
        </FormField>

        <button
          type="submit"
          disabled={loading || formData.otp.length !== 6}
          className={`w-full h-11 rounded text-base font-semibold transition-colors flex items-center justify-center gap-2 ${
            loading || formData.otp.length !== 6
              ? 'bg-blue-600 opacity-50 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              验证中...
            </>
          ) : (
            <>
              <FaCheckCircle />
              完成登录
            </>
          )}
        </button>
      </form>

      <div className="text-center space-y-2">
        <button
          onClick={handleBackToLogin}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← 使用其他账号登录
        </button>
        <p className="text-xs text-gray-400">
          无法获取动态口令？请联系 IT 支持重置
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 text-gray-900">
      {/* 顶部品牌区 */}
      <div className="w-full max-w-md mb-6 flex justify-center">
        <img src={LOGO_URL} alt="中国银河证券" className="h-12 object-contain" />
      </div>

      {/* 登录卡片 */}
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 sm:p-8">
        {step === 'login' && (
          <>
            <h1 className="text-lg font-semibold text-gray-900 text-center mb-6">
              员工登录 (内部专用)
            </h1>
            {renderLoginForm()}
          </>
        )}
        {step === 'totp-setup' && renderTOTPSetup()}
        {step === 'totp-verify' && renderTOTPVerify()}
      </div>

      {/* 底部信息 */}
      {step === 'login' && (
        <div className="w-full max-w-md mt-6 space-y-1.5 text-xs text-gray-500 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span>🔒</span>
            <span>安全提示：本系统仅限授权人员访问</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span>🖥️</span>
            <span>当前IP：{clientIP}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span>📅</span>
            <span>上次登录：{lastLogin}</span>
          </div>
        </div>
      )}

      {step === 'login' && (
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-blue-600 text-sm flex items-center gap-1 mx-auto transition-colors"
          >
            <span>←</span> 返回官网首页
          </button>
        </div>
      )}

      <div className="mt-4 text-center text-xs text-gray-400">
        Copyright © 2026 中国银河证券·证裕交易单元 版权所有
      </div>
    </div>
  );
};

export default AdminLoginView;
