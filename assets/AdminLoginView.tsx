import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AdminLoginViewProps {
  onLoginSuccess: (userData: Record<string, any>) => void;
}

const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[登录] 开始');
      
      // 添加超时机制
      const timeout = setTimeout(() => {
        console.log('[登录] 超时，强制跳转');
        window.location.href = '/admin/dashboard';
      }, 5000);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      clearTimeout(timeout);

      if (error) {
        alert('登录失败: ' + error.message);
        setLoading(false);
        return;
      }

      if (!data?.user) {
        alert('登录失败');
        setLoading(false);
        return;
      }

      console.log('[登录] 成功，跳转');
      setLoading(false);
      onLoginSuccess(data.user);
      
    } catch (err: any) {
      console.error('[登录] 异常', err);
      alert('登录异常: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '400px',
        background: '#1e293b',
        borderRadius: '16px',
        padding: '32px'
      }}>
        <h1 style={{ color: 'white', textAlign: 'center', marginBottom: '32px' }}>
          管理端登录
        </h1>
        
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              background: '#334155',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              boxSizing: 'border-box'
            }}
            required
          />
          
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '12px',
              background: '#334155',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              boxSizing: 'border-box'
            }}
            required
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#f59e0b' : '#00D4AA',
              color: '#0A1628',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '8px',
              background: 'transparent',
              color: '#94a3b8',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            返回首页
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginView;
