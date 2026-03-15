/**
 * 板块详情页面
 * 展示板块成分股、资金流向、板块资讯
 * 数据来源：sectorService
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  getSectorDetail, 
  getSectorStocks, 
  getSectorFundFlow, 
  getSectorNews,
  SectorStock,
  SectorDetail,
  FundFlow,
  SectorNews 
} from '../../../services/sectorService';

interface SectorDetailViewProps {
  onBack?: () => void;
}

const SectorDetailView: React.FC<SectorDetailViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'stocks' | 'flow' | 'news'>('stocks');
  const [sortField, setSortField] = useState<'changePercent' | 'turnover' | 'marketValue'>('changePercent');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // 数据状态
  const [sectorInfo, setSectorInfo] = useState<SectorDetail | null>(null);
  const [stocks, setStocks] = useState<SectorStock[]>([]);
  const [fundFlows, setFundFlows] = useState<FundFlow[]>([]);
  const [newsList, setNewsList] = useState<SectorNews[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    if (id) {
      loadAllData(id);
    }
  }, [id]);

  const loadAllData = async (code: string) => {
    setLoading(true);
    try {
      const [detail, sectorStocks, flows, news] = await Promise.all([
        getSectorDetail(code),
        getSectorStocks(code),
        getSectorFundFlow(code),
        getSectorNews(code),
      ]);

      setSectorInfo(detail);
      setStocks(sectorStocks);
      setFundFlows(flows);
      setNewsList(news);
    } catch (error) {
      console.error('加载板块详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 排序后的股票列表
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks];
    sorted.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  }, [stocks, sortField, sortOrder]);

  // 切换排序
  const handleSort = (field: 'changePercent' | 'turnover' | 'marketValue') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(2)}亿`;
    }
    return amount.toString();
  };

  // 点击股票
  const handleStockClick = (symbol: string) => {
    navigate(`/client/stock/${symbol}`);
  };

  // 点击资讯
  const handleNewsClick = (newsId: string) => {
    navigate(`/client/news/${newsId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#F5F5F5]">
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
            <h1 className="text-lg font-semibold text-[#333333]">板块详情</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E63946]" />
        </div>
      </div>
    );
  }

  if (!sectorInfo) {
    return (
      <div className="flex flex-col h-full bg-[#F5F5F5]">
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
            <h1 className="text-lg font-semibold text-[#333333]">板块详情</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#999999]">板块不存在</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-semibold text-[#333333]">{sectorInfo.name}</h1>
          <span className="text-xs text-[#999999] ml-auto">{sectorInfo.code}</span>
        </div>
      </header>

      {/* 板块概览 */}
      <section className="bg-white px-4 py-4 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-3">
          <div className={`text-3xl font-bold ${
            sectorInfo.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'
          }`}>
            {sectorInfo.changePercent >= 0 ? '+' : ''}{sectorInfo.changePercent.toFixed(2)}%
          </div>
          <div className="text-right">
            <p className="text-sm text-[#999999]">成交额</p>
            <p className="text-base font-medium text-[#333333]">
              {formatAmount(sectorInfo.totalTurnover)}
            </p>
          </div>
        </div>

        {/* 涨跌统计 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] rounded">
            <span className="text-xs text-[#E63946]">涨 {sectorInfo.upCount}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-[#F0FDF4] rounded">
            <span className="text-xs text-[#10B981]">跌 {sectorInfo.downCount}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-[#F5F5F5] rounded">
            <span className="text-xs text-[#666666]">平 {sectorInfo.flatCount}</span>
          </div>
          {sectorInfo.limitUp > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] rounded">
              <span className="text-xs text-[#E63946]">涨停 {sectorInfo.limitUp}</span>
            </div>
          )}
        </div>
      </section>

      {/* Tab切换 */}
      <section className="bg-white border-b border-[#E5E5E5]">
        <div className="flex items-center">
          {[
            { key: 'stocks', label: `成分股 (${stocks.length})` },
            { key: 'flow', label: '资金流向' },
            { key: 'news', label: '资讯' },
          ].map(tab => (
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
      </section>

      {/* 内容区域 */}
      <section className="flex-1 overflow-y-auto">
        {/* 成分股列表 */}
        {activeTab === 'stocks' && (
          <div className="bg-white">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E5E5] text-xs text-[#999999]">
              <span className="col-span-3">股票名称</span>
              <span className="col-span-2 text-right">最新价</span>
              <button 
                onClick={() => handleSort('changePercent')}
                className="col-span-2 text-right flex items-center justify-end gap-1"
              >
                涨跌幅
                {sortField === 'changePercent' && (
                  <span className="text-[#E63946]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <span className="col-span-3 text-right">成交额</span>
              <span className="col-span-2 text-right">市值</span>
            </div>
            
            {/* 列表 */}
            <div className="divide-y divide-[#F0F0F0]">
              {sortedStocks.map((stock) => (
                <div 
                  key={stock.symbol}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center active:bg-[#F9FAFB] cursor-pointer"
                  onClick={() => handleStockClick(stock.symbol)}
                >
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-[#333333]">{stock.name}</p>
                    <p className="text-xs text-[#999999]">{stock.symbol}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm text-[#333333]">{stock.price.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className={`text-sm font-medium ${
                      stock.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-xs text-[#666666]">{formatAmount(stock.turnover)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-xs text-[#666666]">{formatAmount(stock.marketValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 资金流向 */}
        {activeTab === 'flow' && (
          <div className="p-4">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E5E5]">
                <p className="text-sm font-medium text-[#333333]">近5日资金流向（亿元）</p>
              </div>
              <div className="p-4">
                {/* 简单柱状图 */}
                <div className="space-y-3">
                  {fundFlows.map((flow, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-10 text-xs text-[#999999]">{flow.date}</span>
                      <div className="flex-1 h-6 bg-[#F5F5F5] rounded relative overflow-hidden">
                        {/* 流入 */}
                        <div 
                          className="absolute left-1/2 top-0 bottom-0 bg-[#E63946] opacity-60"
                          style={{ 
                            width: `${Math.min(Math.abs(flow.inflow) * 3, 45)}%`,
                            right: '50%',
                          }}
                        />
                        {/* 流出 */}
                        <div 
                          className="absolute left-1/2 top-0 bottom-0 bg-[#10B981] opacity-60"
                          style={{ 
                            width: `${Math.min(Math.abs(flow.outflow) * 3, 45)}%`,
                          }}
                        />
                      </div>
                      <span className={`w-12 text-xs text-right ${
                        flow.netFlow >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'
                      }`}>
                        {flow.netFlow >= 0 ? '+' : ''}{flow.netFlow.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 图例 */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[#E5E5E5]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#E63946] opacity-60 rounded" />
                    <span className="text-xs text-[#666666]">流入</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#10B981] opacity-60 rounded" />
                    <span className="text-xs text-[#666666]">流出</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 板块资讯 */}
        {activeTab === 'news' && (
          <div className="bg-white divide-y divide-[#F0F0F0]">
            {newsList.map((news) => (
              <div 
                key={news.id}
                className="px-4 py-3 active:bg-[#F9FAFB] cursor-pointer"
                onClick={() => handleNewsClick(news.id)}
              >
                <p className="text-sm text-[#333333] line-clamp-2">{news.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[#0066CC]">{news.source}</span>
                  <span className="text-xs text-[#999999]">{news.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SectorDetailView;
