// 显式导入React，解决JSX识别问题
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, loginWithPassword } from '@/lib/supabase';
import { verifyAdminWithEdgeFunction } from '@/lib/fetch';
import { ICONS } from '@/lib/constants';
import { adminService } from '@/services/adminService';

// 定义props类型，避免TS隐式any警告
interface AdminLoginViewProps {
  onLoginSuccess: (userData: Record<string, any>) => void;
}

// 明确组件类型，解决TS类型推断问题
const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(''); // 显式指定string类型
  const [password, setPassword] = useState<string>(''); // 显式指定string类型
  const [loading, setLoading] = useState<boolean>(false); // 显式指定boolean类型
  const [ipChecking, setIpChecking] = useState<boolean>(true);
  const [ipAllowed, setIpAllowed] = useState<boolean>(false);
  const [clientIP, setClientIP] = useState<string>('');
  const [ipCheckError, setIpCheckError] = useState<string>('');

  // 检查IP白名单 (本地开发临时绕过)
  useEffect(() => {
    const checkIPWhitelist = async () => {
      // 临时方案：直接设置为通过，不调用 Edge Function
      setIpChecking(false);
      setIpAllowed(true);
      setClientIP('127.0.0.1 (本地开发)');
    };

    checkIPWhitelist();
  }, []);

  // 显式指定函数返回类型，解决 TS隐式any警告
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔥 关键修复：管理端必须强制刷新 Session 上下文
      await supabase.auth.signOut();
      await new Promise(r => setTimeout(r, 100)); // 给网络重置一点时间

      console.log('[AdminLogin] 开始登录...', { email });
      
      // 1. 登录获取 session
      const { data, error } = await loginWithPassword(email.trim(), password.trim());
      // 注意加上 .trim() 防止密码管理器带入空格
      
      console.log('[AdminLogin] 登录响应:', { 
        hasError: !!error, 
        errorMessage: error ? (error as Error).message : undefined,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id 
      });
      
      if (error) {
        console.error('[AdminLogin] 登录失败:', error);
        throw error;
      }

      if (!data?.user) {
        console.error('[AdminLogin] 没有用户数据');
        throw new Error('登录失败，无法获取用户信息');
      }

      // 2. 获取最新 session（确保拿到真实的 access_token）
      console.log('[AdminLogin] 获取最新 session...');
      
      const { data: latestSessionData, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[AdminLogin] Session 检查结果:', {
        hasSessionError: !!sessionError,
        sessionErrorMessage: sessionError?.message,
        hasSession: !!latestSessionData?.session,
        userId: latestSessionData?.session?.user.id,
      });
      
      if (sessionError) {
        console.error('[AdminLogin] 获取 session 失败:', sessionError);
        throw sessionError;
      }
      
      const accessToken = latestSessionData?.session?.access_token;
      
      console.log('[AdminLogin] Access Token:', accessToken ? '存在' : '不存在');
      
      if (!accessToken) {
        console.error('[AdminLogin] 无法获取 access token');
        throw new Error('无法获取认证令牌');
      }

      // ========================
      // 启用 Edge Function IP 白名单验证
      // ========================
      console.log('[AdminLogin] 调用 Edge Function 验证 IP 白名单...');
      
      const verificationResult = await verifyAdminWithEdgeFunction(accessToken);
      
      console.log('[AdminLogin] Edge Function 响应:', {
        ok: verificationResult.ok,
        admin: verificationResult.admin,
        status: verificationResult.status,
        error: verificationResult.error,
      });
      
      if (!verificationResult.ok) {
        await supabase.auth.signOut();
        throw new Error(`IP 验证失败：${verificationResult.error || '您的 IP 不在白名单内'}`);
      }
      
      if (!verificationResult.admin) {
        await supabase.auth.signOut();
        throw new Error('此账户无管理员权限');
      }

      console.log('[AdminLogin] IP 白名单和管理员验证通过');

      console.log('[AdminLogin] 登录成功，准备跳转...');

      // 3. 通知父组件更新状态并跳转
      onLoginSuccess(data.user);
      
    } catch (error: any) {
      console.error('[AdminLogin] 登录异常:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      alert(error.message || '登录失败');
      setLoading(false);
    }
  };

  // IP检查中
  if (ipChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA] mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-white mb-2">安全检查中</h2>
            <p className="text-slate-400 text-sm">正在验证您的IP地址...</p>
            <p className="text-slate-500 text-xs mt-4">银监会管理后台仅允许白名单IP访问</p>
          </div>
        </div>
      </div>
    );
  }

  // IP不在白名单内
  if (!ipAllowed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ICONS.AlertCircle size={32} className="text-red-400" />
              </div>
              <h1 className="text-2xl font-black text-white mb-2">访问被拒绝</h1>
              <p className="text-slate-400 text-sm">银监会 - 银河证券·证裕交易单元</p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <ICONS.AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" /> {/* @ts-ignore 忽略Tailwind类名警告 */}
                <div>
                  <h3 className="text-red-300 font-bold text-sm mb-1">IP地址限制</h3>
                  <p className="text-slate-300 text-sm">{ipCheckError}</p>
                  {clientIP && (
                    <p className="text-slate-400 text-xs mt-2">检测到的IP: {clientIP}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-slate-400 text-sm text-center">
                银监会仅允许公司内部网络或特定IP地址访问。
              </p>
              
              <div className="bg-slate-800/30 rounded-lg p-4">
                <h4 className="text-slate-300 font-bold text-sm mb-2">如需访问，请：</h4>
                <ul className="text-slate-400 text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <ICONS.CheckCircle size={14} className="text-green-400 flex-shrink-0" /> {/* @ts-ignore */}
                    <span>使用银监会内部网络</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ICONS.CheckCircle size={14} className="text-green-400 flex-shrink-0" /> {/* @ts-ignore */}
                    <span>联系银监会系统管理员申请内部网络访问</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ICONS.CheckCircle size={14} className="text-green-400 flex-shrink-0" /> {/* @ts-ignore */}
                    <span>通过VPN连接公司网络</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-xl font-bold text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <ICONS.ArrowLeft size={16} />
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // IP验证通过，显示登录表单
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ICONS.CheckCircle size={32} className="text-green-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">银监会</h1>
            <p className="text-slate-400 text-sm">银监会-银河证券·证裕交易单元</p>
            {clientIP && (
              <div className="mt-2 inline-flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full">
                <ICONS.Globe size={12} className="text-green-400" />
                <span className="text-green-400 text-xs font-medium">IP已验证: {clientIP}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                <ICONS.User size={18} />
              </div>
              <input
                type="email"
                placeholder="系统账号"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-400"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                <ICONS.Shield size={18} />
              </div>
              <input
                type="password"
                placeholder="访问密钥"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl font-black text-base tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 bg-[#00D4AA] text-[#0A1628] hover:bg-[#00C49A] disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录银监会'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 text-sm hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <ICONS.ArrowLeft size={14} />
              返回首页
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
              <ICONS.AlertCircle size={12} />
              <span>银监会仅限授权IP访问，确保安全管控保障</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginView;