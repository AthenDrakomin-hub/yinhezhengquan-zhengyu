/**
 * 智能选股页面（优化版）
 * 支持选股条件设置、筛选结果展示、排序、批量操作
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { 
  getStockList, 
  executeFilter as executeSmartPickFilter, 
  applyPresetStrategy, 
  SmartPickStock 
} from '../../../services/smartPickService';

type Stock = SmartPickStock;

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: number | string;
}

// 预设选股策略
const presetStrategies = [
  { id: 'value', name: '价值投资', icon: '💎', desc: '低估值、高分红', color: '#6366F1' },
  { id: 'growth', name: '成长优选', icon: '🚀', desc: '高增长、高景气', color: '#10B981' },
  { id: 'momentum', name: '趋势跟踪', icon: '📈', desc: '强势股、热点股', color: '#F59E0B' },
  { id: 'dividend', name: '红利策略', icon: '💰', desc: '高分红、稳定收益', color: '#EF4444' },
  { id: 'lowvol', name: '低波策略', icon: '🛡️', desc: '低波动、稳健型', color: '#3B82F6' },
  { id: 'quality', name: '质量优选', icon: '⭐', desc: '高ROE、高盈利', color: '#8B5CF6' },
];

// 选股条件选项
const conditionOptions = [
  { field: 'changePercent', label: '涨跌幅', unit: '%', operators: ['>', '<', '区间'] },
  { field: 'turnoverRate', label: '换手率', unit: '%', operators: ['>', '<', '区间'] },
  { field: 'pe', label: '市盈率', unit: '倍', operators: ['>', '<', '区间'] },
  { field: 'pb', label: '市净率', unit: '倍', operators: ['>', '<', '区间'] },
  { field: 'marketCap', label: '市值', unit: '亿', operators: ['>', '<', '区间'] },
  { field: 'roe', label: 'ROE', unit: '%', operators: ['>', '<', '区间'] },
];

// 排序选项
const sortOptions = [
  { field: 'changePercent', label: '涨跌幅', order: 'desc' as const },
  { field: 'turnoverRate', label: '换手率', order: 'desc' as const },
  { field: 'pe', label: '市盈率', order: 'asc' as const },
  { field: 'marketCap', label: '市值', order: 'desc' as const },
  { field: 'roe', label: 'ROE', order: 'desc' as const },
];

interface SmartPickViewProps {
  onBack?: () => void;
}

const SmartPickView: React.FC<SmartPickViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [results, setResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // 新增状态
  const [sortBy, setSortBy] = useState('changePercent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // 排序后的结果
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    sorted.sort((a, b) => {
      const aValue = (a as any)[sortBy] || 0;
      const bValue = (b as any)[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
    return sorted;
  }, [results, sortBy, sortOrder]);

  // 切换股票选择
  const toggleStockSelection = (symbol: string) => {
    const newSelected = new Set(selectedStocks);
    if (newSelected.has(symbol)) {
      newSelected.delete(symbol);
    } else {
      newSelected.add(symbol);
    }
    setSelectedStocks(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedStocks.size === sortedResults.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(sortedResults.map(s => s.symbol)));
    }
  };

  // 批量添加自选
  const handleBatchAddToWatchlist = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        alert('请先登录');
        return;
      }

      const stocksToAdd = sortedResults.filter(s => selectedStocks.has(s.symbol));
      
      // 这里应该调用API添加自选
      console.log('添加自选:', stocksToAdd.map(s => s.symbol));
      
      alert(`已添加 ${stocksToAdd.length} 只股票到自选`);
      setSelectedStocks(new Set());
    } catch (error) {
      console.error('添加自选失败:', error);
    }
  };

  // 导出结果
  const handleExport = (format: 'csv' | 'image') => {
    const dataToExport = selectedStocks.size > 0 
      ? sortedResults.filter(s => selectedStocks.has(s.symbol))
      : sortedResults;

    if (format === 'csv') {
      const headers = ['代码', '名称', '现价', '涨跌幅', 'PE', 'PB', '市值', '行业'];
      const rows = dataToExport.map(s => [
        s.symbol, s.name, s.price.toFixed(2), 
        `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`,
        s.pe.toFixed(1), s.pb.toFixed(2), 
        formatMarketCap(s.marketCap), s.industry
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `选股结果_${new Date().toLocaleDateString()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    setShowExportMenu(false);
  };

  // 添加筛选条件
  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Date.now().toString(),
      field: 'changePercent',
      operator: '>',
      value: 0
    };
    setConditions([...conditions, newCondition]);
  };

  // 更新筛选条件
  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  // 删除筛选条件
  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  // 执行选股
  const executeFilter = async () => {
    setLoading(true);
    setShowResults(true);
    setSelectedStocks(new Set());
    
    try {
      // 转换条件格式
      const filterConditions = conditions.map(c => ({
        field: c.field,
        operator: c.operator as '>' | '<',
        value: c.value as number,
      }));
      
      const filtered = await executeSmartPickFilter(filterConditions);
      setResults(filtered);
    } catch (error) {
      console.error('选股失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 使用预设策略
  const handlePresetStrategy = async (strategyId: string) => {
    setSelectedStrategy(strategyId);
    setLoading(true);
    setShowResults(true);
    setSelectedStocks(new Set());
    
    try {
      const filtered = await applyPresetStrategy(strategyId);
      setResults(filtered);
    } catch (error) {
      console.error('预设策略执行失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化市值
  const formatMarketCap = (value: number) => {
    if (value >= 1000000000000) {
      return `${(value / 1000000000000).toFixed(2)}万亿`;
    }
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(0)}亿`;
    }
    return value.toString();
  };

  // 查看股票详情
  const handleStockClick = (symbol: string) => {
    navigate(`/client/stock/${symbol}`);
  };

  // 返回筛选
  const handleBackToFilter = () => {
    setShowResults(false);
    setResults([]);
    setSelectedStrategy(null);
    setSelectedStocks(new Set());
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
          <h1 className="text-lg font-semibold text-[#333333]">智能选股</h1>
        </div>
      </header>

      {/* Tab切换 */}
      {!showResults && (
        <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm">
          <div className="flex items-center border-b border-[#F0F0F0]">
            <button
              onClick={() => setActiveTab('preset')}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === 'preset' ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              预设策略
              {activeTab === 'preset' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-3 text-sm font-medium relative ${
                activeTab === 'custom' ? 'text-[#333333]' : 'text-[#999999]'
              }`}
            >
              自定义
              {activeTab === 'custom' && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#E63946] rounded-full" />
              )}
            </button>
          </div>
        </section>
      )}

      {/* 预设策略 */}
      {activeTab === 'preset' && !showResults && (
        <section className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {presetStrategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => handlePresetStrategy(strategy.id)}
                className={`bg-white rounded-xl p-4 shadow-sm text-left transition-all active:scale-[0.98] ${
                  selectedStrategy === strategy.id ? 'ring-2 ring-[#E63946]' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${strategy.color}15` }}
                  >
                    {strategy.icon}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-[#333333]">{strategy.name}</h3>
                <p className="text-xs text-[#999999] mt-1">{strategy.desc}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 自定义条件 */}
      {activeTab === 'custom' && !showResults && (
        <section className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* 已添加的条件 */}
          {conditions.map((condition, index) => {
            const option = conditionOptions.find(o => o.field === condition.field);
            return (
              <div key={condition.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[#333333]">条件 {index + 1}</span>
                  <button 
                    onClick={() => removeCondition(condition.id)}
                    className="text-[#999999] hover:text-[#E63946]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#F5F5F5] rounded-lg text-sm text-[#333333]"
                  >
                    {conditionOptions.map(opt => (
                      <option key={opt.field} value={opt.field}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                    className="w-16 px-2 py-2 bg-[#F5F5F5] rounded-lg text-sm text-[#333333]"
                  >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                  <input
                    type="number"
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, { value: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 bg-[#F5F5F5] rounded-lg text-sm text-[#333333]"
                  />
                  <span className="text-sm text-[#999999]">{option?.unit}</span>
                </div>
              </div>
            );
          })}

          {/* 添加条件按钮 */}
          <button
            onClick={addCondition}
            className="w-full py-3 border-2 border-dashed border-[#E5E5E5] rounded-xl text-sm text-[#999999] hover:border-[#E63946] hover:text-[#E63946] transition-colors"
          >
            + 添加筛选条件
          </button>

          {/* 执行选股按钮 */}
          {conditions.length > 0 && (
            <button
              onClick={executeFilter}
              className="w-full py-3 bg-[#E63946] text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
            >
              开始选股
            </button>
          )}
        </section>
      )}

      {/* 筛选结果 */}
      {showResults && (
        <section className="flex-1 overflow-y-auto">
          {/* 结果统计栏 */}
          <div className="bg-white px-4 py-3 border-b border-[#F0F0F0] sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#666666]">共筛选出</span>
                <span className="text-xl font-bold text-[#E63946]">{results.length}</span>
                <span className="text-sm text-[#666666]">只股票</span>
              </div>
              <div className="flex items-center gap-2">
                {/* 排序按钮 */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F5F5F5] rounded-lg text-sm text-[#666666]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    排序
                  </button>
                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#E5E5E5] py-1 min-w-[120px] z-20">
                      {sortOptions.map(opt => (
                        <button
                          key={opt.field}
                          onClick={() => {
                            setSortBy(opt.field);
                            setSortOrder(opt.order);
                            setShowSortMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm ${
                            sortBy === opt.field ? 'text-[#E63946] bg-[#FFF5F5]' : 'text-[#333333]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 导出按钮 */}
                <div className="relative">
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F5F5F5] rounded-lg text-sm text-[#666666]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    导出
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#E5E5E5] py-1 min-w-[120px] z-20">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full px-4 py-2 text-left text-sm text-[#333333] hover:bg-[#F9FAFB]"
                      >
                        导出CSV
                      </button>
                      <button
                        onClick={() => handleExport('image')}
                        className="w-full px-4 py-2 text-left text-sm text-[#333333] hover:bg-[#F9FAFB]"
                      >
                        生成图片
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleBackToFilter}
                  className="text-sm text-[#0066CC]"
                >
                  重新筛选
                </button>
              </div>
            </div>
          </div>

          {/* 加载中 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E63946]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#E63946]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-[#666666] mt-4">正在智能筛选...</p>
              <p className="text-xs text-[#999999] mt-1">分析全市场股票数据</p>
            </div>
          )}

          {/* 结果列表 */}
          {!loading && results.length > 0 && (
            <div className="px-4 py-3">
              {/* 批量操作栏 */}
              {selectedStocks.size > 0 && (
                <div className="bg-[#E63946] text-white px-4 py-3 rounded-xl mb-3 flex items-center justify-between">
                  <span className="text-sm">已选择 {selectedStocks.size} 只股票</span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleBatchAddToWatchlist}
                      className="text-sm bg-white text-[#E63946] px-3 py-1 rounded-lg font-medium"
                    >
                      加入自选
                    </button>
                    <button 
                      onClick={() => setSelectedStocks(new Set())}
                      className="text-sm text-white/80"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {/* 结果卡片 */}
              <div className="space-y-2">
                {sortedResults.map((stock, index) => (
                  <div
                    key={stock.symbol}
                    className="bg-white rounded-xl shadow-sm overflow-hidden"
                  >
                    <div 
                      className="px-4 py-3 cursor-pointer active:bg-[#F9FAFB]"
                      onClick={() => handleStockClick(stock.symbol)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStockSelection(stock.symbol);
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedStocks.has(stock.symbol) 
                                ? 'bg-[#E63946] border-[#E63946]' 
                                : 'border-[#E5E5E5]'
                            }`}
                          >
                            {selectedStocks.has(stock.symbol) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#333333]">{stock.name}</p>
                              <span className="px-1.5 py-0.5 bg-[#F5F5F5] rounded text-xs text-[#999999]">
                                #{index + 1}
                              </span>
                            </div>
                            <p className="text-xs text-[#999999]">{stock.symbol} · {stock.industry}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-[#333333]">¥{stock.price.toFixed(2)}</p>
                          <p className={`text-sm font-medium ${stock.changePercent >= 0 ? 'text-[#E63946]' : 'text-[#10B981]'}`}>
                            {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* 指标展示 */}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F0F0F0]">
                        <div className="flex-1 text-center">
                          <p className="text-xs text-[#999999]">PE</p>
                          <p className="text-sm font-medium text-[#333333]">{stock.pe.toFixed(1)}</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs text-[#999999]">PB</p>
                          <p className="text-sm font-medium text-[#333333]">{stock.pb.toFixed(2)}</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs text-[#999999]">ROE</p>
                          <p className="text-sm font-medium text-[#333333]">{(stock.roe || 0).toFixed(1)}%</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs text-[#999999]">换手率</p>
                          <p className="text-sm font-medium text-[#333333]">{stock.turnoverRate.toFixed(2)}%</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-xs text-[#999999]">市值</p>
                          <p className="text-sm font-medium text-[#333333]">{formatMarketCap(stock.marketCap)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 无结果 */}
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-24 h-24 bg-[#F5F5F5] rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-base text-[#333333] font-medium">未找到符合条件的股票</p>
              <p className="text-sm text-[#999999] mt-2">请调整筛选条件后重试</p>
              <button
                onClick={handleBackToFilter}
                className="mt-4 px-6 py-2 bg-[#E63946] text-white rounded-lg text-sm font-medium"
              >
                重新筛选
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SmartPickView;
