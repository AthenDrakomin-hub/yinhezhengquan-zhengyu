import React, { useState } from 'react';
import { FaHeadset, FaPaperPlane, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const SupportTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'TECHNICAL',
    subject: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const ticketTypes = [
    { value: 'TECHNICAL', label: '技术问题' },
    { value: 'ACCOUNT', label: '账户问题' },
    { value: 'TRADE', label: '交易问题' },
    { value: 'SUGGESTION', label: '产品建议' },
    { value: 'COMPLAINT', label: '投诉反馈' },
    { value: 'OTHER', label: '其他' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newTicketId = `T-${Date.now().toString().slice(-6)}`;
      
      const { error } = await supabase.from('support_tickets').insert({
        id: newTicketId,
        title: formData.subject,
        description: formData.description,
        ticket_type: formData.type,
        status: 'OPEN',
        priority: 'NORMAL',
        user_email: formData.email,
        user_phone: formData.phone,
        user_name: formData.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setTicketId(newTicketId);
      setSubmitted(true);
    } catch (err) {
      console.error('提交工单失败:', err);
      alert('提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4 text-gray-900">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-green-600 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">提交成功</h2>
          <p className="text-gray-600 mb-4">您的工单已提交，客服将尽快与您联系</p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">工单编号</p>
            <p className="text-lg font-mono font-bold text-blue-600">{ticketId}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-900">
      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <FaArrowLeft />
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900">联系客服</h1>
          <div className="w-16" />
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* 标题区 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaHeadset className="text-blue-600 text-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">提交工单</h2>
          <p className="text-gray-500">请填写以下信息，我们将尽快为您处理</p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">姓名 *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="请输入您的姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">电话 *</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="请输入联系电话"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">邮箱 *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="请输入电子邮箱"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">问题类型 *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white"
            >
              {ticketTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">主题 *</label>
            <input
              type="text"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="请简要描述您的问题"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">详细描述 *</label>
            <textarea
              name="description"
              required
              rows={5}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
              placeholder="请详细描述您遇到的问题或建议..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                提交中...
              </>
            ) : (
              <>
                <FaPaperPlane />
                提交工单
              </>
            )}
          </button>
        </form>

        {/* 联系方式 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-2">客服热线</p>
          <p className="text-xl font-bold text-gray-900">400-888-8888</p>
          <p className="text-xs text-gray-400 mt-1">工作日 9:00-18:00</p>
        </div>
      </main>
    </div>
  );
};

export default SupportTicketPage;
