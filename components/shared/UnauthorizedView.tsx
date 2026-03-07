import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../../lib/constants';

/**
 * 无权限页面组件
 * 当用户访问无权限的页面时显示
 */
const UnauthorizedView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 border border-white/10 rounded-3xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ICONS.AlertTriangle size={32} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">访问权限不足</h1>
          <p className="text-slate-400 text-sm">银河证券·证裕交易单元</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-sm">
          <h3 className="text-amber-300 font-bold mb-1">权限说明</h3>
          <p className="text-slate-300">您当前的角色无权访问此页面。如需更高权限，请联系管理员。</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/client/dashboard')}
            className="w-full h-12 rounded-xl font-bold bg-[#00D4AA] text-white hover:bg-[#00B894] transition-all flex items-center justify-center gap-2"
          >
            <ICONS.Home size={16} /> 返回客户端首页
          </button>
          <button
            onClick={() => navigate('/auth/login')}
            className="w-full h-12 rounded-xl font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <ICONS.ArrowLeft size={16} /> 返回登录页
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedView;
