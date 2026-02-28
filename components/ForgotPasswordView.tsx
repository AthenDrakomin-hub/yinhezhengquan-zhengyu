import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ICONS } from '../constants';
import { supabase } from '../lib/supabase';

// Zod 验证模式
const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, '请输入邮箱地址')
    .email('请输入有效的邮箱地址'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordViewProps {
  onBack: () => void;
  onComplete: () => void;
}

//忘密码主组件
const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  
  const methods = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const LOGO_URL = "https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png";

  const handleSendResetLink = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setEmail(data.email);
      setStep(2);
    } catch (error: any) {
      alert(`发送失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      alert('重置链接已重新发送，请查收邮件');
    } catch (error: any) {
      alert(`重发失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white mb-2">忘记密码</h3>
              <p className="text-sm text-slate-400">请输入您的注册邮箱，我们将为您发送密码重置链接</p>
            </div>
            
            <form onSubmit={methods.handleSubmit(handleSendResetLink)} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
                    <ICONS.User size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="请输入注册邮箱"
                    className="w-full h-14 bg-white/5 pl-12 pr-6 rounded-xl border border-white/10 text-sm font-bold outline-none focus:border-[#00D4AA] transition-all text-white placeholder:text-slate-400"
                    {...methods.register('email')}
                  />
                </div>
                {methods.formState.errors.email && (
                  <p className="text-red-400 text-xs mt-1">{methods.formState.errors.email.message}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <ICONS.Refresh className="animate-spin" size={16} />
                    发送中...
                  </>
                ) : (
                  <>
                    发送重置链接
                    <ICONS.ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
            
            <div className="text-center">
              <button 
                type="button"
                onClick={onBack}
                className="text-sm text-slate-400 hover:text-[#00D4AA] transition-colors flex items-center gap-1 mx-auto"
              >
                <ICONS.ArrowLeft size={14} />
                返回登录
              </button>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ICONS.Check size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">邮件已发送</h3>
              <p className="text-sm text-slate-400">
                重置链接已发送至 <span className="text-[#00D4AA] font-medium">{email}</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">请在24小时内点击邮件中的链接重置密码</p>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h4 className="text-sm font-bold text-white mb-2">没有收到邮件？</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>•检查垃圾邮件文件夹</li>
                <li>•确认邮箱地址正确</li>
                <li>•点下方按钮重新发送</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full h-12 bg-white/10 text-white rounded-xl font-bold text-sm border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50"
              >
                {loading ? '重新发送中...' : '重新发送邮件'}
              </button>
              
              <button
                type="button"
                onClick={onComplete}
                className="w-full h-12 bg-[#00D4AA] text-[#0A1628] rounded-xl font-bold text-sm uppercase tracking-widest"
              >
                返回登录页面
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white flex flex-col relative overflow-hidden">
        {/*背景装饰 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl animate-pulse"></div>
        </div>

        {/*固定定位的内容容器 */}
        <div className="fixed inset-0 flex flex-col items-center justify-center p-6 z-10 pointer-events-none">
          <div className="max-w-md w-full relative z-10 pointer-events-auto">
            <div className="backdrop-blur-xl bg-slate-800/20 border border-white/10 rounded-3xl p-8 shadow-2xl">
              {renderStep()}
            </div>
          </div>
        </div>
        
        {/* 页脚信息 */}
        <div className="fixed bottom-4 left-0 right-0 text-center z-10 pointer-events-none">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pointer-events-auto">
           证券 · 证裕交易系统 | 密码重置服务
          </p>
        </div>
      </div>
    </FormProvider>
  );
};

export default ForgotPasswordView;