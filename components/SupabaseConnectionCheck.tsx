
import React, { useEffect, useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { ICONS } from '../constants';

const SupabaseConnectionCheck: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isDemoMode) return; // 演示模式下不显示报错

    const check = async () => {
      const { error } = await supabase.from('_non_existent_').select('id').limit(1);
      // 排除常见的“表不存在”错误，因为这代表连接是通的
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
        setErrorMsg(error.message);
      }
    };
    check();
  }, []);

  if (!errorMsg) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] px-4 py-2 bg-red-600/90 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl animate-slide-up flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      <span className="text-[10px] font-black text-white uppercase tracking-widest">
        数据同步离线: {errorMsg.slice(0, 20)}...
      </span>
      <ICONS.Shield size={12} className="text-white" />
    </div>
  );
};

export default SupabaseConnectionCheck;
