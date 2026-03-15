/**
 * 月度账单页面
 * 展示用户月度交易和资金流水汇总
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const MonthlyBillView: React.FC = () => {
  const navigate = useNavigate();

  // 模拟月度账单数据
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center border-b border-[#F0F0F0]">
        <button onClick={() => navigate('/client/profile')} className="mr-3">
          <svg className="w-6 h-6 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[#333333]">月度账单</h1>
      </div>

      {/* 账单概览 */}
      <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] mx-4 mt-4 rounded-xl p-5 text-white">
        <p className="text-white/70 text-sm mb-1">{currentYear}年{currentMonth}月账单</p>
        <p className="text-3xl font-bold">¥1,000,000.00</p>
        <p className="text-white/70 text-sm mt-2">月度总资产</p>
      </div>

      {/* 收支明细 */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#333333] mb-4">收支明细</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
            <div>
              <p className="text-sm text-[#333333]">股票买入</p>
              <p className="text-xs text-[#999999]">3笔交易</p>
            </div>
            <span className="text-[#E63946] font-medium">-¥50,000.00</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
            <div>
              <p className="text-sm text-[#333333]">股票卖出</p>
              <p className="text-xs text-[#999999]">2笔交易</p>
            </div>
            <span className="text-[#22C55E] font-medium">+¥35,000.00</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
            <div>
              <p className="text-sm text-[#333333]">银证转入</p>
              <p className="text-xs text-[#999999]">1笔</p>
            </div>
            <span className="text-[#22C55E] font-medium">+¥100,000.00</span>
          </div>
          
          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm text-[#333333]">手续费</p>
              <p className="text-xs text-[#999999]">印花税、佣金</p>
            </div>
            <span className="text-[#999999] font-medium">-¥125.00</span>
          </div>
        </div>
      </div>

      {/* 提示 */}
      <div className="mx-4 mt-4 mb-4 text-center">
        <p className="text-xs text-[#999999]">
          账单数据仅供参考，以实际交易记录为准
        </p>
      </div>
    </div>
  );
};

export default MonthlyBillView;
