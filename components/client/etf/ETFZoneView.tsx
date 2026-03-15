/**
 * ETF专区
 * 集中展示ETF相关产品，支持查看和交易ETF
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { getETFList, getHotETFs, ETF, ETF_CATEGORIES } from '../../../services/etfService';

interface ETFZoneViewProps {
  onBack?: () => void;
}

const ETFZoneView: React.FC<ETFZoneViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [etfList, setEtfList] = useState<ETF[]>([]);
  const [hotETFs, setHotETFs] = useState<ETF[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedETF, setSelectedETF] = useState<ETF | null>(null);

  // 加载ETF数据
  useEffect(() => {
    loadETFData();
  }, [activeCategory]);

  const loadETFData = async () => {
    try {
      setLoading(true);
      const [list, hot] = await Promise.all([
        getETFList(activeCategory),
        activeCategory === 'all' ? getHotETFs() : Promise.resolve([])
      ]);
      setEtfList(list);
      setHotETFs(hot);
    } catch (error) {
      console.error('加载ETF数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(2)}亿`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}万`;
    }
    return amount.toString();
  };

  // 搜索过滤
  const filteredETFs = etfList.filter(etf => 
    etf.name.includes(searchText) || 
    etf.symbol.includes(searchText) ||
    etf.tracking_index.includes(searchText)
  );

  // 买入ETF
  const handleBuyETF = async (etf: ETF) => {
    try {
      const quantity = 100; // 默认100份
      const amount = etf.price * quantity;
      
      if (!window.confirm(`确认买入 ${etf.name}(${etf.symbol}) ${quantity}份，金额 ¥${amount.toFixed(2)}？`)) {
        return;
      }

      // 调用交易接口
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          market_type: etf.market,
          stock_code: etf.symbol,
          stock_name: etf.name,
          price: etf.price,
          quantity,
          trade_type: 'BUY'
        }
      });

      if (error) throw new Error(error.message);
      
      if (data?.success) {
        alert('买入成功！');
        loadETFData();
      } else {
        alert(`买入失败: ${data?.error || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('买入ETF失败:', error);
      alert(`买入失败: ${error.message || '未知错误'}`);
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
          <h1 className="text-lg font-semibold text-[#333333]">ETF专区</h1>
        </div>
      </header>

      {/* 搜索框 */}
      <div className="bg-white px-4 py-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-lg px-3 py-2">
          <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索ETF代码或名称"
            className="flex-1 text-sm text-[#333333] placeholder:text-[#999999] bg-transparent outline-none"
          />
        </div>
      </div>

      {/* 分类标签 */}
      <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center overflow-x-auto no-scrollbar">
          {ETF_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-3 text-sm whitespace-nowrap ${
                activeCategory === cat.key 
                  ? 'text-[#E63946] font-medium border-b-2 border-[#E63946]' 
                  : 'text-[#666666]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* 热门ETF推荐 */}
      {activeCategory === 'all' && hotETFs.length > 0 && (
        <section className="mx-4 mt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#333333]">热门ETF</h2>
            <span className="text-xs text-[#999999]">成交额排行</span>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {hotETFs.map((etf) => (
              <div 
                key={etf.id}
                className="bg-white rounded-xl p-3 shadow-sm min-w-[140px]"
                onClick={() => setSelectedETF(etf)}
              >
                <p className="text-xs text-[#666666]">{etf.symbol}</p>
                <p className="text-sm font-medium text-[#333333] mt-1 truncate">{etf.name}</p>
                <p className="text-lg font-semibold text-[#333333] mt-2">{etf.price.toFixed(3)}</p>
                <p className={`text-xs ${etf.change_percent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                  {etf.change_percent >= 0 ? '+' : ''}{etf.change_percent.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ETF列表 */}
      <section className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E63946]" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E5E5]">
              <span className="text-xs text-[#999999]">名称/代码</span>
              <span className="text-xs text-[#999999] text-right">最新价</span>
              <span className="text-xs text-[#999999] text-right">涨跌幅</span>
              <span className="text-xs text-[#999999] text-right">成交额</span>
            </div>
            
            {/* 列表 */}
            <div className="divide-y divide-[#F0F0F0]">
              {filteredETFs.map((etf) => (
                <div 
                  key={etf.id}
                  className="grid grid-cols-4 gap-2 px-4 py-3 items-center active:bg-[#F9FAFB]"
                  onClick={() => setSelectedETF(etf)}
                >
                  <div>
                    <p className="text-sm font-medium text-[#333333]">{etf.name}</p>
                    <p className="text-xs text-[#999999]">{etf.symbol}</p>
                  </div>
                  <p className="text-sm text-[#333333] text-right">{etf.price.toFixed(3)}</p>
                  <p className={`text-sm text-right ${etf.change_percent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                    {etf.change_percent >= 0 ? '+' : ''}{etf.change_percent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-[#666666] text-right">{formatAmount(etf.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ETF详情弹窗 */}
      {selectedETF && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setSelectedETF(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-t-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-lg font-semibold text-[#333333]">{selectedETF.name}</h3>
                <p className="text-sm text-[#999999]">{selectedETF.symbol}</p>
              </div>
              <button 
                onClick={() => setSelectedETF(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 价格信息 */}
            <div className="p-4 border-b border-[#E5E5E5]">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-[#333333]">{selectedETF.price.toFixed(3)}</span>
                <span className={`text-lg ${selectedETF.change_percent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                  {selectedETF.change_percent >= 0 ? '+' : ''}{selectedETF.change.toFixed(3)}
                </span>
                <span className={`text-lg ${selectedETF.change_percent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                  ({selectedETF.change_percent >= 0 ? '+' : ''}{selectedETF.change_percent.toFixed(2)}%)
                </span>
              </div>
            </div>
            
            {/* ETF信息 */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">跟踪指数</span>
                <span className="text-sm text-[#333333]">{selectedETF.tracking_index}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">基金规模</span>
                <span className="text-sm text-[#333333]">{selectedETF.scale}亿</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">管理费</span>
                <span className="text-sm text-[#333333]">{selectedETF.management_fee}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">成交额</span>
                <span className="text-sm text-[#333333]">{formatAmount(selectedETF.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">上市日期</span>
                <span className="text-sm text-[#333333]">{selectedETF.listed_date}</span>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  handleBuyETF(selectedETF);
                }}
                className="py-3 bg-[#E63946] text-white rounded-lg font-medium"
              >
                买入
              </button>
              <button 
                onClick={() => {
                  setSelectedETF(null);
                  navigate('/client/trade');
                }}
                className="py-3 bg-[#10B981] text-white rounded-lg font-medium"
              >
                卖出
              </button>
            </div>
            
            {/* 风险提示 */}
            <div className="px-4 pb-4">
              <p className="text-xs text-[#999999] text-center">
                投资有风险，入市需谨慎
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ETFZoneView;
