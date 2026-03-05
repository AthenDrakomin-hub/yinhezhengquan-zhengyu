// 显式导入React，解决JSX识别问题
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, loginWithPassword } from '@/lib/supabase';
import { ICONS } from '@/lib/constants';
import { useAdminGuard } from '@/hooks/useAdminGuard';

// 定义props类型
interface AdminLoginViewProps {
  onLoginSuccess: (userData: Record<string, any>) => void;
}

const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [ipChecking, setIpChecking] = useState<boolean>(true);
  const [ipAllowed, setIpAllowed] = useState<boolean>(false);
  const [clientIP, setClientIP] = useState<string>('');
  const [ipCheckError, setIpCheckError] = useState<string>('');
  
  // 使用 useRef 确保只验证一次，防止 React 19 StrictMode 下的二次验证干扰
  const hasChecked = useRef(false);

  const { checkIP } = useAdminGuard();

  // ✅ 核心修复：检查IP地址
  useEffect(() => {
    // 如果已经验证过，就不再执行（防御性编程）
    if (hasChecked.current) return;

    const checkIPAddress = async () => {
      try {
        setIpChecking(true);
        console.log('[AdminLogin] 开始IP验证...');
        
        const result = await checkIP();
        console.log('[AdminLogin] IP验证结果:', result);
        
        if (result.allowed) {
          setIpAllowed(true);
          setClientIP(result.ip || '已验证IP');
        } else {
          setIpAllowed(false);
          setClientIP(result.ip || '验证失败');
          setIpCheckError(result.message || '您的IP地址不在白名单内，无法访问管理后台。');
        }
      } catch (error: any) {
        console.error('[AdminLogin] IP验证异常:', error);
        setIpAllowed(false);
        setIpCheckError('IP验证服务异常，请稍后重试。');
      } finally {
        setIpChecking(false);
        hasChecked.current = true; // 标记已完成验证
      }
    };

    checkIPAddress();
    
    // 注意：这里的依赖项数组必须为 []
    // 如果需要 checkIP 保持最新，应该在 useAdminGuard 内部用 useCallback 包裹 checkIP
  }, []); 

      // 登录处理逻辑
      const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (!ipAllowed) return; // 再次确认IP权限

        setLoading(true);

        try {
          console.log('[AdminLogin] 发起登录...', { email });

          const { data, error } = await loginWithPassword(email.trim(), password.trim());

          console.log('[AdminLogin] loginWithPassword 返回:', { data, error });

          if (error) throw error;
          if (!data?.user) throw new Error('登录失败，无法获取用户信息');

          console.log('[AdminLogin] 登录成功，用户ID:', data.user.id);

          // 添加详细的profiles查询调试
          console.log('[AdminLogin] 开始查询profiles表，用户ID:', data.user.id);
          console.log('[AdminLogin] 查询SQL等效: SELECT is_admin, admin_level FROM profiles WHERE id = $1', data.user.id);
          
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, admin_level, email, username, role, status')
            .eq('id', data.user.id)
            .single();

          console.log('[AdminLogin] profiles查询完成:', { 
            hasProfileData: !!profileData, 
            hasProfileError: !!profileError,
            profileError: profileError ? {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            } : null
          });

          if (profileError) {
            console.error('[AdminLogin] 查询profiles表失败:', profileError);
            console.error('[AdminLogin] 错误详情:', {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint
            });
            throw new Error(`查询用户资料失败: ${profileError.message}`);
          }

          console.log('[AdminLogin] profiles查询结果:', profileData);
          console.log('[AdminLogin] is_admin字段值:', profileData?.is_admin);
          console.log('[AdminLogin] admin_level字段值:', profileData?.admin_level);
          console.log('[AdminLogin] role字段值:', profileData?.role);
          console.log('[AdminLogin] status字段值:', profileData?.status);

          if (!profileData) {
            console.error('[AdminLogin] profileData为null或undefined');
            throw new Error('用户资料不存在');
          }

          if (profileData.is_admin !== true) {
            console.warn('[AdminLogin] 用户不是管理员，详细检查:');
            console.warn('[AdminLogin] - is_admin:', profileData.is_admin);
            console.warn('[AdminLogin] - admin_level:', profileData.admin_level);
            console.warn('[AdminLogin] - role:', profileData.role);
            console.warn('[AdminLogin] - 建议检查数据库is_admin字段是否已设置为true');
            
            // 尝试自动修复：如果admin_level是管理员但is_admin不是true
            if (profileData.admin_level === 'admin' || profileData.admin_level === 'super_admin' || profileData.role === 'admin') {
              console.warn('[AdminLogin] 检测到用户可能是管理员但is_admin字段未设置，建议执行数据库修复脚本');
            }
            
            await supabase.auth.signOut();
            throw new Error('您不是管理员，无法访问管理后台。请确认您的管理员权限。');
          }

          console.log('[AdminLogin] 验证通过，同步状态...');
          
          // 传递 adminLevel 给父组件
          onLoginSuccess({
            ...data.user,
            adminLevel: profileData.admin_level || 'admin',
          });

          console.log('[AdminLogin] onLoginSuccess 已调用，导航由父组件处理');
        } catch (error: any) {
          console.error('[AdminLogin] 登录异常:', error);
          alert(error.message || '登录失败');
        } finally {
          setLoading(false);
        }
      };

  // --- 视图渲染部分 ---

  if (ipChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-slate-900/60 border border-white/10 rounded-3xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4AA] mx-auto mb-6"></div>
          <h2 className="text-xl font-bold text-white mb-2">安全检查中</h2>
          <p className="text-slate-400 text-sm">正在验证您的网络准入权限...</p>
        </div>
      </div>
    );
  }

  if (!ipAllowed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/60 border border-white/10 rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ICONS.AlertCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">访问被拒绝</h1>
            <p className="text-slate-400 text-sm">银河证券·证裕交易单元 - 管理后台</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-sm">
            <h3 className="text-red-300 font-bold mb-1">IP地址受限</h3>
            <p className="text-slate-300">{ipCheckError}</p>
            <p className="text-slate-500 text-xs mt-2 font-mono">Detected IP: {clientIP}</p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full h-12 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <ICONS.ArrowLeft size={16} /> 返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 border border-white/10 rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ICONS.CheckCircle size={32} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-black text-white">银监管理</h1>
          <p className="text-slate-400 text-sm mt-1">身份密钥访问控制</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-green-500/20">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-400 text-xs font-mono">Secure IP: {clientIP}</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <ICONS.User size={18} />
            </div>
            <input
              type="email"
              placeholder="系统账号"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <ICONS.Shield size={18} />
            </div>
            <input
              type="password"
              placeholder="访问密钥"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-2xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-2xl font-black text-base tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 bg-[#00D4AA] text-[#0A1628] hover:bg-[#00C49A] disabled:opacity-50"
          >
            {loading ? '验证中...' : '进入控制台'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginView;