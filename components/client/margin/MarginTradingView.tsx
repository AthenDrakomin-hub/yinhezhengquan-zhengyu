/**
 * 融资融券页面
 * 提供融资融券业务入口，满足用户的杠杆投资需求
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

interface MarginInfo {
  totalAsset: number;      // 总资产
  availableCash: number;   // 可用资金
  marginBalance: number;   // 融资余额
  shortBalance: number;    // 融券余额
  maintenanceRatio: number; // 维持担保比例
  availableMargin: number; // 可融资额度
  availableShort: number;  // 可融券额度
}

interface MarginStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marginRatio: number;      // 融资保证金比例
  shortRatio: number;       // 融券保证金比例
  availableMargin: number;  // 可融资数量
  availableShort: number;   // 可融券数量
}

// 可融资融券标的
const marginStocks: MarginStock[] = [
  { symbol: '600519', name: '贵州茅台', price: 1850.00, changePercent: 1.25, marginRatio: 0.5, shortRatio: 0.6, availableMargin: 10000, availableShort: 5000 },
  { symbol: '000858', name: '五粮液', price: 165.00, changePercent: -0.35, marginRatio: 0.5, shortRatio: 0.6, availableMargin: 50000, availableShort: 30000 },
  { symbol: '601318', name: '中国平安', price: 45.80, changePercent: 0.88, marginRatio: 0.5, shortRatio: 0.6, availableMargin: 200000, availableShort: 150000 },
  { symbol: '600036', name: '招商银行', price: 32.50, changePercent: -0.45, marginRatio: 0.5, shortRatio: 0.6, availableMargin: 300000, availableShort: 200000 },
  { symbol: '000333', name: '美的集团', price: 58.20, changePercent: 1.52, marginRatio: 0.5, shortRatio: 0.6, availableMargin: 150000, availableShort: 100000 },
];

interface MarginTradingViewProps {
  onBack?: () => void;
}

const MarginTradingView: React.FC<MarginTradingViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'margin' | 'short'>('info');
  const [marginInfo, setMarginInfo] = useState<MarginInfo>({
    totalAsset: 500000,
    availableCash: 150000,
    marginBalance: 200000,
    shortBalance: 50000,
    maintenanceRatio: 280,
    availableMargin: 100000,
    availableShort: 50000
  });
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // 搜索过滤
  const filteredStocks = marginStocks.filter(stock =>
    stock.name.includes(searchText) ||
    stock.symbol.includes(searchText)
  );

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(2)}万`;
    }
    return amount.toFixed(2);
  };

  // 计算维持担保比例状态
  const getRatioStatus = (ratio: number) => {
    if (ratio >= 300) return { label: '安全', color: 'text-[#10B981]' };
    if (ratio >= 200) return { label: '正常', color: 'text-[#3B82F6]' };
    if (ratio >= 150) return { label: '警戒', color: 'text-[#F97316]' };
    return { label: '危险', color: 'text-[#E63946]' };
  };

  const ratioStatus = getRatioStatus(marginInfo.maintenanceRatio);

  // 融资买入
  const handleMarginBuy = async (stock: MarginStock) => {
    try {
      const maxAmount = marginInfo.availableMargin;
      const maxShares = Math.floor(maxAmount / (stock.price * (1 + stock.marginRatio)));
      
      const sharesStr = prompt(`融资买入 ${stock.name}\n可融资额度: ¥${formatAmount(maxAmount)}\n最大可买: ${maxShares}股\n\n请输入买入数量:`, '100');
      if (!sharesStr) return;
      
      const shares = parseInt(sharesStr);
      if (isNaN(shares) || shares <= 0) {
        alert('请输入有效数量');
        return;
      }
      
      const requiredMargin = shares * stock.price * stock.marginRatio;
      if (requiredMargin > maxAmount) {
        alert('保证金不足');
        return;
      }

      // 调用融资买入接口
      const { data, error } = await supabase.functions.invoke('create-margin-order', {
        body: {
          type: 'MARGIN_BUY',
          symbol: stock.symbol,
          name: stock.name,
          price: stock.price,
          quantity: shares,
          marginRatio: stock.marginRatio
        }
      });

      if (error) throw new Error(error.message);
      
      if (data?.success) {
        alert(`融资买入成功！\n股票: ${stock.name}\n数量: ${shares}股\n融资金额: ¥${formatAmount(shares * stock.price)}`);
      } else {
        alert(`融资买入失败: ${data?.error || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('融资买入失败:', error);
      alert(`融资买入失败: ${error.message || '未知错误'}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onBack?.() || navigate(-1)}
            className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">融资融券</h1>
        </div>
      </header>

      {/* Tab切换 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm">
        <div className="flex items-center border-b border-[#F0F0F0]">
          {[
            { key: 'info', label: '信用账户' },
            { key: 'margin', label: '融资交易' },
            { key: 'short', label: '融券交易' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === tab.key ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 信用账户信息 */}
      {activeTab === 'info' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* 资产概览卡片 */}
          <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">信用总资产</p>
            <p className="text-3xl font-bold mt-1">¥{formatAmount(marginInfo.totalAsset)}</p>
            <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs opacity-60">可用资金</p>
                <p className="text-lg font-semibold mt-1">¥{formatAmount(marginInfo.availableCash)}</p>
              </div>
              <div>
                <p className="text-xs opacity-60">维持担保比例</p>
                <p className={`text-lg font-semibold mt-1 ${ratioStatus.color.replace('text-', 'text-white')}`}>
                  {marginInfo.maintenanceRatio}%
                  <span className="text-xs ml-1 opacity-80">({ratioStatus.label})</span>
                </p>
              </div>
            </div>
          </div>

          {/* 融资融券余额 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-[#333333] mb-3">融资融券余额</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FEF2F2] rounded-lg p-3">
                <p className="text-xs text-[#666666]">融资余额</p>
                <p className="text-xl font-bold text-[#E63946] mt-1">¥{formatAmount(marginInfo.marginBalance)}</p>
              </div>
              <div className="bg-[#F0FDF4] rounded-lg p-3">
                <p className="text-xs text-[#666666]">融券余额</p>
                <p className="text-xl font-bold text-[#10B981] mt-1">¥{formatAmount(marginInfo.shortBalance)}</p>
              </div>
            </div>
          </div>

          {/* 可用额度 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-[#333333] mb-3">可用额度</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">可融资额度</span>
                <span className="text-sm font-semibold text-[#E63946]">¥{formatAmount(marginInfo.availableMargin)}</span>
              </div>
              <div className="w-full bg-[#F5F5F5] rounded-full h-2">
                <div 
                  className="bg-[#E63946] h-2 rounded-full" 
                  style={{ width: `${Math.min((marginInfo.availableMargin / 200000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#666666]">可融券额度</span>
                <span className="text-sm font-semibold text-[#10B981]">¥{formatAmount(marginInfo.availableShort)}</span>
              </div>
              <div className="w-full bg-[#F5F5F5] rounded-full h-2">
                <div 
                  className="bg-[#10B981] h-2 rounded-full" 
                  style={{ width: `${Math.min((marginInfo.availableShort / 100000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 风险提示 */}
          <div className="bg-[#FEF3C7] rounded-xl p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#92400E]">风险提示</p>
                <p className="text-xs text-[#92400E] mt-1">
                  融资融券交易具有杠杆效应，可能放大盈利也可能放大亏损。当维持担保比例低于130%时，可能被强制平仓。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 融资交易 */}
      {activeTab === 'margin' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* 搜索框 */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索可融资标的"
                className="flex-1 text-sm text-[#333333] placeholder:text-[#999999] bg-transparent outline-none"
              />
            </div>
          </div>

          {/* 可融资标的列表 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E5E5]">
              <h3 className="text-sm font-semibold text-[#333333]">可融资标的</h3>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {filteredStocks.map((stock) => (
                <div key={stock.symbol} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#333333]">{stock.name}</p>
                      <p className="text-xs text-[#999999]">{stock.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#333333]">{stock.price.toFixed(2)}</p>
                      <p className={`text-xs ${stock.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-[#666666]">
                      保证金比例: {stock.marginRatio * 100}% | 可融资: {formatAmount(stock.availableMargin)}
                    </div>
                    <button 
                      onClick={() => handleMarginBuy(stock)}
                      className="px-3 py-1 bg-[#E63946] text-white text-xs rounded-lg"
                    >
                      融资买入
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 融券交易 */}
      {activeTab === 'short' && (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* 搜索框 */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索可融券标的"
                className="flex-1 text-sm text-[#333333] placeholder:text-[#999999] bg-transparent outline-none"
              />
            </div>
          </div>

          {/* 可融券标的列表 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E5E5]">
              <h3 className="text-sm font-semibold text-[#333333]">可融券标的</h3>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {filteredStocks.map((stock) => (
                <div key={stock.symbol} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#333333]">{stock.name}</p>
                      <p className="text-xs text-[#999999]">{stock.symbol}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#333333]">{stock.price.toFixed(2)}</p>
                      <p className={`text-xs ${stock.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-[#666666]">
                      保证金比例: {stock.shortRatio * 100}% | 可融券: {stock.availableShort}股
                    </div>
                    <button 
                      onClick={() => alert('融券卖出功能开发中...')}
                      className="px-3 py-1 bg-[#10B981] text-white text-xs rounded-lg"
                    >
                      融券卖出
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarginTradingView;
