/**
 * 月度账单页面
 * 展示用户月度交易和资金流水汇总
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface BillSummary {
  totalAsset: number;
  stockBuy: { count: number; amount: number };
  stockSell: { count: number; amount: number };
  transferIn: { count: number; amount: number };
  transferOut: { count: number; amount: number };
  fees: number;
}

const MonthlyBillView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [billSummary, setBillSummary] = useState<BillSummary>({
    totalAsset: 0,
    stockBuy: { count: 0, amount: 0 },
    stockSell: { count: 0, amount: 0 },
    transferIn: { count: 0, amount: 0 },
    transferOut: { count: 0, amount: 0 },
    fees: 0
  });

  useEffect(() => {
    loadBillData();
  }, [user, selectedMonth]);

  const loadBillData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 解析年月
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // 获取用户资产
      const { data: assets } = await supabase
        .from('assets')
        .select('total_asset')
        .eq('user_id', user.id)
        .maybeSingle();

      // 获取当月买入交易
      const { data: buyTrades } = await supabase
        .from('trades')
        .select('price, quantity, fee')
        .eq('user_id', user.id)
        .eq('trade_type', 'BUY')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 获取当月卖出交易
      const { data: sellTrades } = await supabase
        .from('trades')
        .select('price, quantity, fee')
        .eq('user_id', user.id)
        .eq('trade_type', 'SELL')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 获取当月银证转账
      const { data: transfers } = await supabase
        .from('bank_transfers')
        .select('amount, transfer_type')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // 计算汇总
      const stockBuy = {
        count: buyTrades?.length || 0,
        amount: buyTrades?.reduce((sum, t) => sum + (Number(t.price) * Number(t.quantity)), 0) || 0
      };

      const stockSell = {
        count: sellTrades?.length || 0,
        amount: sellTrades?.reduce((sum, t) => sum + (Number(t.price) * Number(t.quantity)), 0) || 0
      };

      const transferIn = {
        count: transfers?.filter(t => t.transfer_type === 'IN').length || 0,
        amount: transfers?.filter(t => t.transfer_type === 'IN').reduce((sum, t) => sum + Number(t.amount), 0) || 0
      };

      const transferOut = {
        count: transfers?.filter(t => t.transfer_type === 'OUT').length || 0,
        amount: transfers?.filter(t => t.transfer_type === 'OUT').reduce((sum, t) => sum + Number(t.amount), 0) || 0
      };

      const fees = [...(buyTrades || []), ...(sellTrades || [])]
        .reduce((sum, t) => sum + (Number(t.fee) || 0), 0);

      setBillSummary({
        totalAsset: Number(assets?.total_asset) || 0,
        stockBuy,
        stockSell,
        transferIn,
        transferOut,
        fees
      });
    } catch (error) {
      console.error('加载账单数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 生成可选月份列表（最近12个月）
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}年${parseInt(month)}月`;
  };

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

      {/* 月份选择 */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full p-3 border border-[#E5E5E5] rounded-lg text-sm"
        >
          {monthOptions.map(month => (
            <option key={month} value={month}>{formatMonth(month)}</option>
          ))}
        </select>
      </div>

      {/* 账单概览 */}
      <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] mx-4 mt-4 rounded-xl p-5 text-white">
        <p className="text-white/70 text-sm mb-1">{formatMonth(selectedMonth)}账单</p>
        {loading ? (
          <div className="h-8 w-32 bg-white/20 rounded animate-pulse"></div>
        ) : (
          <p className="text-3xl font-bold">¥{billSummary.totalAsset.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
        )}
        <p className="text-white/70 text-sm mt-2">月度总资产</p>
      </div>

      {/* 收支明细 */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#333333] mb-4">收支明细</h3>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-[#F5F5F5] rounded animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
              <div>
                <p className="text-sm text-[#333333]">股票买入</p>
                <p className="text-xs text-[#999999]">{billSummary.stockBuy.count}笔交易</p>
              </div>
              <span className="text-[#E63946] font-medium">-¥{billSummary.stockBuy.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
              <div>
                <p className="text-sm text-[#333333]">股票卖出</p>
                <p className="text-xs text-[#999999]">{billSummary.stockSell.count}笔交易</p>
              </div>
              <span className="text-[#22C55E] font-medium">+¥{billSummary.stockSell.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
              <div>
                <p className="text-sm text-[#333333]">银证转入</p>
                <p className="text-xs text-[#999999]">{billSummary.transferIn.count}笔</p>
              </div>
              <span className="text-[#22C55E] font-medium">+¥{billSummary.transferIn.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-[#F0F0F0]">
              <div>
                <p className="text-sm text-[#333333]">银证转出</p>
                <p className="text-xs text-[#999999]">{billSummary.transferOut.count}笔</p>
              </div>
              <span className="text-[#E63946] font-medium">-¥{billSummary.transferOut.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <div>
                <p className="text-sm text-[#333333]">手续费</p>
                <p className="text-xs text-[#999999]">印花税、佣金</p>
              </div>
              <span className="text-[#999999] font-medium">-¥{billSummary.fees.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
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
