/**
 * 板块行情页面
 * 包含行业板块列表、概念板块列表、板块涨跌排行
 * 数据来源：sectorService
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSectors, Sector } from '../../../services/sectorService';

interface SectorsViewProps {
  onBack?: () => void;
}

const SectorsView: React.FC<SectorsViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'industry' | 'concept'>('industry');
  const [sortField, setSortField] = useState<'changePercent' | 'volume' | 'amount'>('changePercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载板块数据
  useEffect(() => {
    loadSectors();
  }, []);

  const loadSectors = async () => {
    setLoading(true);
    try {
      const data = await getSectors();
      setSectors(data);
    } catch (error) {
      console.error('加载板块数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤板块
  const filteredSectors = useMemo(() => {
    return sectors.filter(s => s.type === activeTab);
  }, [sectors, activeTab]);

  // 排序板块
  const sortedSectors = useMemo(() => {
    return [...filteredSectors].sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      return (a[sortField] - b[sortField]) * multiplier;
    });
  }, [filteredSectors, sortField, sortOrder]);

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

  // 切换排序
  const handleSort = (field: 'changePercent' | 'volume' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 点击板块
  const handleSectorClick = (sector: Sector) => {
    navigate(`/client/market/sector/${sector.code}`);
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
          <h1 className="text-lg font-semibold text-[#333333]">板块行情</h1>
        </div>
      </header>

      {/* Tab切换 */}
      <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm">
        <div className="flex items-center border-b border-[#F0F0F0]">
          <button
            onClick={() => setActiveTab('industry')}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === 'industry' ? 'text-[#333333]' : 'text-[#999999]'
            }`}
          >
            行业板块
            {activeTab === 'industry' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('concept')}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === 'concept' ? 'text-[#333333]' : 'text-[#999999]'
            }`}
          >
            概念板块
            {activeTab === 'concept' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
            )}
          </button>
        </div>
      </section>

      {/* 涨跌概览 */}
      <section className="mx-4 mt-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#FEF2F2] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#E63946]">
              {sortedSectors.filter(s => s.changePercent > 0).length}
            </p>
            <p className="text-xs text-[#666666] mt-1">上涨</p>
          </div>
          <div className="bg-[#F0FDF4] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#10B981]">
              {sortedSectors.filter(s => s.changePercent < 0).length}
            </p>
            <p className="text-xs text-[#666666] mt-1">下跌</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#666666]">
              {sortedSectors.filter(s => s.changePercent === 0).length}
            </p>
            <p className="text-xs text-[#666666] mt-1">平盘</p>
          </div>
        </div>
      </section>

      {/* 板块列表 */}
      <section className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E63946]" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E5E5]">
              <span className="col-span-3 text-xs text-[#999999]">板块名称</span>
              <button 
                onClick={() => handleSort('changePercent')}
                className="col-span-2 text-xs text-[#999999] text-right flex items-center justify-end gap-1"
              >
                涨跌幅
                {sortField === 'changePercent' && (
                  <span className="text-[#E63946]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <span className="col-span-2 text-xs text-[#999999] text-right">领涨股</span>
              <button 
                onClick={() => handleSort('amount')}
                className="col-span-3 text-xs text-[#999999] text-right flex items-center justify-end gap-1"
              >
                成交额
                {sortField === 'amount' && (
                  <span className="text-[#E63946]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <span className="col-span-2 text-xs text-[#999999] text-right">领涨股涨幅</span>
            </div>
            
            {/* 列表 */}
            <div className="divide-y divide-[#F0F0F0]">
              {sortedSectors.map((sector) => (
                <div 
                  key={sector.code}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center active:bg-[#F9FAFB] cursor-pointer"
                  onClick={() => handleSectorClick(sector)}
                >
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-[#333333]">{sector.name}</p>
                    <p className="text-xs text-[#999999]">{sector.code}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={`text-sm font-semibold ${
                      sector.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'
                    }`}>
                      {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-xs text-[#333333] truncate">{sector.leadingStock}</p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-xs text-[#666666]">{formatAmount(sector.amount)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={`text-xs ${sector.leadingChange >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                      {sector.leadingChange >= 0 ? '+' : ''}{sector.leadingChange.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default SectorsView;
