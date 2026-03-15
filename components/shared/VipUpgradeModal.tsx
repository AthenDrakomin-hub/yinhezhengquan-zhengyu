/**
 * VIP权限不足提示弹窗
 */

import React from 'react';

interface VipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredLevel?: number;
}

const VipUpgradeModal: React.FC<VipUpgradeModalProps> = ({
  isOpen,
  onClose,
  featureName = '该功能',
  requiredLevel = 1,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-[85%] max-w-sm p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* 图标 */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h3 className="text-lg font-bold text-center text-[#333333] mb-2">
          VIP专属功能
        </h3>
        
        {/* 描述 */}
        <p className="text-sm text-center text-[#666666] mb-4">
          {featureName}仅限VIP用户使用
        </p>
        <p className="text-xs text-center text-[#999999] mb-6">
          需要VIP{requiredLevel}及以上等级，升级VIP解锁更多专属权益
        </p>

        {/* VIP权益说明 */}
        <div className="bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] rounded-xl p-4 mb-6">
          <h4 className="text-sm font-medium text-[#92400E] mb-3">VIP专属权益</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-xs text-[#78350F]">
              <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              条件单/止盈止损/网格交易
            </li>
            <li className="flex items-center gap-2 text-xs text-[#78350F]">
              <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              智能盯盘/到价提醒
            </li>
            <li className="flex items-center gap-2 text-xs text-[#78350F]">
              <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              预约打新/优先申购
            </li>
            <li className="flex items-center gap-2 text-xs text-[#78350F]">
              <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              交易手续费折扣
            </li>
          </ul>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 bg-gray-100 rounded-xl text-sm font-medium text-[#666666] hover:bg-gray-200 transition-colors"
          >
            稍后再说
          </button>
          <button
            onClick={() => {
              onClose();
              // 跳转到VIP升级页面
              window.location.href = '/client/vip-benefits';
            }}
            className="flex-1 h-11 bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            立即开通VIP
          </button>
        </div>
      </div>
    </div>
  );
};

export default VipUpgradeModal;
