/**
 * 意见反馈页面
 * 支持文字描述、图片上传、历史反馈查看
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FeedbackType {
  id: string;
  label: string;
  icon: string;
}

interface FeedbackHistory {
  id: string;
  type: string;
  content: string;
  status: 'pending' | 'processing' | 'resolved';
  createTime: string;
}

const FeedbackView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const feedbackTypes: FeedbackType[] = [
    { id: 'bug', label: '问题反馈', icon: '🐛' },
    { id: 'feature', label: '功能建议', icon: '💡' },
    { id: 'complaint', label: '投诉建议', icon: '📝' },
    { id: 'praise', label: '表扬鼓励', icon: '👍' },
    { id: 'other', label: '其他', icon: '📋' },
  ];

  // 模拟历史反馈
  const feedbackHistory: FeedbackHistory[] = [
    { id: '1', type: '功能建议', content: '希望能增加自选股分组功能', status: 'processing', createTime: '2025-01-18' },
    { id: '2', type: '问题反馈', content: '交易页面偶尔会卡顿', status: 'resolved', createTime: '2025-01-15' },
  ];

  // 添加图片
  const handleAddImage = () => {
    if (images.length >= 3) {
      alert('最多上传3张图片');
      return;
    }
    // 模拟添加图片
    const mockImage = `https://picsum.photos/200/200?random=${Date.now()}`;
    setImages(prev => [...prev, mockImage]);
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交反馈
  const handleSubmit = async () => {
    if (!selectedType) {
      alert('请选择反馈类型');
      return;
    }
    if (!content.trim()) {
      alert('请填写反馈内容');
      return;
    }

    setSubmitting(true);
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitting(false);
    
    alert('感谢您的反馈，我们会尽快处理！');
    // 重置表单
    setSelectedType(null);
    setContent('');
    setImages([]);
  };

  // 状态标签
  const getStatusBadge = (status: FeedbackHistory['status']) => {
    const statusMap = {
      pending: { label: '待处理', color: 'bg-[#FFF7ED] text-[#F97316]' },
      processing: { label: '处理中', color: 'bg-[#E3F2FD] text-[#0066CC]' },
      resolved: { label: '已解决', color: 'bg-[#E5F9EF] text-[#22C55E]' },
    };
    return statusMap[status];
  };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-[#F5F5F5]">
        {/* 顶部 */}
        <div className="bg-white px-4 py-3 flex items-center border-b border-[#F0F0F0]">
          <button onClick={() => setShowHistory(false)} className="mr-3">
            <svg className="w-6 h-6 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">反馈记录</h1>
        </div>

        {/* 历史列表 */}
        <div className="bg-white mt-2">
          {feedbackHistory.map((item, index) => (
            <div key={item.id} className={`px-4 py-4 ${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#333333]">{item.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge(item.status).color}`}>
                  {getStatusBadge(item.status).label}
                </span>
              </div>
              <p className="text-sm text-[#666666] line-clamp-2">{item.content}</p>
              <p className="text-xs text-[#CCCCCC] mt-2">{item.createTime}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 反馈类型 */}
      <div className="bg-white px-4 py-4">
        <p className="text-sm text-[#333333] font-medium mb-3">请选择反馈类型</p>
        <div className="grid grid-cols-5 gap-2">
          {feedbackTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-colors ${
                selectedType === type.id 
                  ? 'bg-[#0066CC]/10 border-2 border-[#0066CC]' 
                  : 'bg-[#F5F5F5]'
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="text-xs text-[#666666]">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 反馈内容 */}
      <div className="bg-white px-4 py-4 mt-2">
        <p className="text-sm text-[#333333] font-medium mb-3">详细描述</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请详细描述您遇到的问题或建议，以便我们更好地为您服务"
          className="w-full h-32 p-3 border border-[#E5E5E5] rounded-lg text-sm resize-none focus:outline-none focus:border-[#0066CC]"
          maxLength={500}
        />
        <p className="text-xs text-[#CCCCCC] text-right mt-1">{content.length}/500</p>
      </div>

      {/* 图片上传 */}
      <div className="bg-white px-4 py-4 mt-2">
        <p className="text-sm text-[#333333] font-medium mb-3">上传截图（选填，最多3张）</p>
        <div className="flex gap-3">
          {images.map((img, index) => (
            <div key={index} className="relative w-20 h-20">
              <img src={img} alt="反馈图片" className="w-full h-full object-cover rounded-lg" />
              <button
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[#E63946] text-white rounded-full flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button
              onClick={handleAddImage}
              className="w-20 h-20 border-2 border-dashed border-[#E5E5E5] rounded-lg flex flex-col items-center justify-center text-[#CCCCCC]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs mt-1">添加</span>
            </button>
          )}
        </div>
      </div>

      {/* 联系方式 */}
      <div className="bg-white px-4 py-4 mt-2">
        <p className="text-sm text-[#333333] font-medium mb-3">联系方式（选填）</p>
        <input
          type="text"
          placeholder="手机号/邮箱，方便我们回复您"
          className="w-full h-10 px-3 border border-[#E5E5E5] rounded-lg text-sm focus:outline-none focus:border-[#0066CC]"
        />
      </div>

      {/* 提交按钮 */}
      <div className="px-4 mt-6">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-medium ${
            submitting ? 'bg-[#E5E5E5] text-[#999999]' : 'bg-[#0066CC] text-white'
          }`}
        >
          {submitting ? '提交中...' : '提交反馈'}
        </button>
      </div>

      {/* 历史反馈入口 */}
      <div className="px-4 mt-4 mb-4">
        <button
          onClick={() => setShowHistory(true)}
          className="w-full py-3 border border-[#E5E5E5] text-[#666666] rounded-lg text-sm"
        >
          查看反馈记录
        </button>
      </div>
    </div>
  );
};

export default FeedbackView;
