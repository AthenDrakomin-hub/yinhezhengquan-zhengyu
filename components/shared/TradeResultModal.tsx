/**
 * 交易结果弹窗组件
 * 用于展示交易成功/失败的反馈
 */

import React, { useEffect, useState } from 'react';

export type TradeResultStatus = 'success' | 'failed' | 'pending';

interface TradeResultModalProps {
  visible: boolean;
  status: TradeResultStatus;
  tradeType: 'buy' | 'sell';
  stockName: string;
  stockCode: string;
  price: number;
  quantity: number;
  amount: number;
  errorMessage?: string;
  orderNo?: string;
  onClose: () => void;
  onContinue?: () => void;
  onViewOrder?: () => void;
}

const TradeResultModal: React.FC<TradeResultModalProps> = ({
  visible,
  status,
  tradeType,
  stockName,
  stockCode,
  price,
  quantity,
  amount,
  errorMessage,
  orderNo,
  onClose,
  onContinue,
  onViewOrder,
}) => {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (visible) {
      // 延迟启动动画
      setTimeout(() => setShowAnimation(true), 100);
    } else {
      setShowAnimation(false);
    }
  }, [visible]);

  if (!visible) return null;

  const isSuccess = status === 'success';
  const isPending = status === 'pending';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        {/* 动画区域 */}
        <div className="pt-8 pb-4 flex flex-col items-center">
          {isSuccess ? (
            <div className="relative w-20 h-20">
              {/* 成功动画 - 打钩 */}
              <div 
                className={`w-20 h-20 rounded-full bg-[#22C55E] flex items-center justify-center transition-all duration-500 ${
                  showAnimation ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                    className={`${showAnimation ? 'animate-draw' : ''}`}
                  />
                </svg>
              </div>
              {/* 光晕效果 */}
              <div 
                className={`absolute inset-0 rounded-full bg-[#22C55E]/30 transition-all duration-700 ${
                  showAnimation ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
                }`}
              />
            </div>
          ) : isPending ? (
            <div className="w-20 h-20 rounded-full bg-[#F97316] flex items-center justify-center">
              <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#E63946] flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* 状态文字 */}
          <h3 className={`text-xl font-bold mt-4 ${
            isSuccess ? 'text-[#22C55E]' : isPending ? 'text-[#F97316]' : 'text-[#E63946]'
          }`}>
            {isSuccess ? '委托成功' : isPending ? '处理中' : '委托失败'}
          </h3>
          <p className="text-sm text-[#999999] mt-1">
            {stockName} ({stockCode})
          </p>
        </div>

        {/* 交易详情 */}
        <div className="px-5 py-4 bg-[#F9FAFB] mx-4 rounded-xl">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#666666]">委托类型</span>
              <span className={tradeType === 'buy' ? 'text-[#E63946]' : 'text-[#3B82F6]'}>
                {tradeType === 'buy' ? '买入' : '卖出'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666666]">委托价格</span>
              <span className="text-[#333333]">¥{price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666666]">委托数量</span>
              <span className="text-[#333333]">{quantity}股</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#666666]">委托金额</span>
              <span className="text-[#333333] font-semibold">¥{amount.toFixed(2)}</span>
            </div>
            {orderNo && (
              <div className="flex justify-between text-sm pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#666666]">委托编号</span>
                <span className="text-[#333333] font-mono text-xs">{orderNo}</span>
              </div>
            )}
          </div>
        </div>

        {/* 错误信息 */}
        {!isSuccess && !isPending && errorMessage && (
          <div className="mx-4 mt-3 p-3 bg-[#FEF2F2] rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[#E63946] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm text-[#E63946] font-medium">委托失败原因</p>
                <p className="text-sm text-[#666666] mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="p-5 space-y-3">
          {isSuccess ? (
            <>
              <button
                onClick={onViewOrder}
                className="w-full py-3 border border-[#0066CC] text-[#0066CC] rounded-xl font-medium"
              >
                查看委托单
              </button>
              <button
                onClick={onContinue}
                className="w-full py-3 bg-[#0066CC] text-white rounded-xl font-medium"
              >
                继续交易
              </button>
            </>
          ) : isPending ? (
            <button
              onClick={onClose}
              className="w-full py-3 bg-[#F97316] text-white rounded-xl font-medium"
            >
              我知道了
            </button>
          ) : (
            <>
              <button
                onClick={onContinue}
                className="w-full py-3 bg-[#0066CC] text-white rounded-xl font-medium"
              >
                重新委托
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 border border-[#E5E5E5] text-[#666666] rounded-xl font-medium"
              >
                取消
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeResultModal;
