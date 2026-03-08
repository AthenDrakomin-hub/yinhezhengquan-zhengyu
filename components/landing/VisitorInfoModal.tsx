import React, { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaHeadset, FaSpinner } from 'react-icons/fa';

interface VisitorInfo {
  name: string;
  phone: string;
}

interface VisitorInfoModalProps {
  isOpen: boolean;
  onSubmit: (info: VisitorInfo) => void;
  onClose?: () => void;
}

const VisitorInfoModal: React.FC<VisitorInfoModalProps> = ({ isOpen, onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 检查本地存储是否有访客信息
    const saved = localStorage.getItem('visitor_info');
    if (saved) {
      try {
        const info = JSON.parse(saved);
        setName(info.name || '');
        setPhone(info.phone || '');
      } catch {
        // ignore
      }
    }
  }, []);

  const validate = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = '请输入姓名';
    } else if (name.trim().length < 2) {
      newErrors.name = '姓名至少2个字符';
    }
    
    if (!phone.trim()) {
      newErrors.phone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      newErrors.phone = '请输入有效的手机号';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    // 保存到本地存储
    localStorage.setItem('visitor_info', JSON.stringify({ name: name.trim(), phone: phone.trim() }));
    
    // 模拟网络请求
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSubmit({ name: name.trim(), phone: phone.trim() });
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <FaHeadset className="text-2xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold">在线客服</h2>
              <p className="text-sm text-blue-100">请填写信息开始咨询</p>
            </div>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              您的姓名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="请输入您的姓名"
                className={`w-full pl-10 pr-4 h-12 border-2 rounded-xl outline-none transition-all ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                }`}
              />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              手机号码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                  if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
                }}
                placeholder="请输入您的手机号"
                maxLength={11}
                className={`w-full pl-10 pr-4 h-12 border-2 rounded-xl outline-none transition-all ${
                  errors.phone 
                    ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                }`}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
            <p>填写信息后，系统将为您分配客服人员。</p>
            <p className="mt-1">客服工作时间为工作日 9:00-17:00</p>
          </div>

          {/* 按钮 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="animate-spin" />
                提交中...
              </>
            ) : (
              '开始咨询'
            )}
          </button>
        </form>

        {/* 底部 */}
        <div className="px-6 py-3 bg-gray-50 text-center text-xs text-gray-500">
          中国银河证券 · 证裕交易单元
        </div>
      </div>
    </div>
  );
};

export default VisitorInfoModal;
export type { VisitorInfo };
