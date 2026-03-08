"use strict";

import React, { useState } from 'react';
import { ICONS } from '../../../lib/constants';

interface StockFactor {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface SmartPickResult {
  symbol: string;
  name: string;
  score: number;
  factors: string[];
  trend: 'up' | 'down' | 'neutral';
  price: number;
  changePercent: number;
}

interface SmartStockPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

const factors: StockFactor[] = [
  { id: 'momentum', name: '动量因子', description: '近期价格趋势强劲', icon: ICONS.TrendingUp },
  { id: 'value', name: '价值因子', description: '低估值高股息', icon: ICONS.DollarSign },
  { id: 'quality', name: '质量因子', description: '盈利稳定负债低', icon: ICONS.Shield },
  { id: 'growth', name: '成长因子', description: '营收利润高增长', icon: ICONS.Zap },
  { id: 'liquidity', name: '流动性因子', description: '成交活跃易进出', icon: ICONS.Activity },
  { id: 'volatility', name: '波动率因子', description: '价格稳定风险低', icon: ICONS.BarChart },
];

// 模拟选股结果数据
const mockResults: SmartPickResult[] = [
  { symbol: '600519', name: '贵州茅台', score: 92, factors: ['quality', 'liquidity'], trend: 'up', price: 1688.88, changePercent: 1.25 },
  { symbol: '000001', name: '平安银行', score: 87, factors: ['value', 'dividend'], trend: 'up', price: 12.35, changePercent: 2.18 },
  { symbol: '300750', name: '宁德时代', score: 85, factors: ['growth', 'momentum'], trend: 'up', price: 198.50, changePercent: 3.42 },
  { symbol: '002415', name: '海康威视', score: 82, factors: ['quality', 'value'], trend: 'neutral', price: 32.18, changePercent: -0.35 },
  { symbol: '000858', name: '五粮液', score: 80, factors: ['liquidity', 'quality'], trend: 'up', price: 145.20, changePercent: 0.88 },
];

const SmartStockPicker: React.FC<SmartStockPickerProps> = ({ isOpen, onClose }) => {
  const [selectedFactors, setSelectedFactors] = useState<string[]>(['momentum', 'quality']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<SmartPickResult[] | null>(null);
  const [riskPreference, setRiskPreference] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');

  const toggleFactor = (factorId: string) => {
    setSelectedFactors(prev => 
      prev.includes(factorId) 
        ? prev.filter(id => id !== factorId)
        : [...prev, factorId]
    );
  };

  const handleAnalyze = async () => {
    if (selectedFactors.length === 0) return;
    
    setIsAnalyzing(true);
    setResults(null);
    
    // 模拟AI选股分析过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 根据选择的因子和风险偏好生成结果
    const filteredResults = mockResults.map(stock => ({
      ...stock,
      score: Math.min(100, stock.score + Math.floor(Math.random() * 10) - 5),
    })).sort((a, b) => b.score - a.score);
    
    setResults(filteredResults);
    setIsAnalyzing(false);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <span className="text-[#00D4AA]">↗</span>;
      case 'down': return <span className="text-[#FF6B6B]">↘</span>;
      default: return <span className="text-[var(--color-text-muted)]">→</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--color-bg)] rounded-3xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-slide-up">
        {/* 头部 */}
        <header className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-gradient-to-r from-[#00D4AA]/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00D4AA]/20 border border-[#00D4AA]/30 flex items-center justify-center">
              <ICONS.Brain size={24} className="text-[#00D4AA]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[var(--color-text-primary)]">AI 智能选股</h2>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">Galaxy Nexus Quant Engine</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-all"
          >
            <ICONS.X size={20} />
          </button>
        </header>

        <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
          {/* 左侧：选股条件 */}
          <div className="w-full md:w-80 border-r border-[var(--color-border)] p-6 space-y-6 overflow-y-auto">
            {/* 风险偏好 */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">风险偏好</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'conservative', label: '稳健型', color: 'bg-emerald-500' },
                  { id: 'moderate', label: '平衡型', color: 'bg-blue-500' },
                  { id: 'aggressive', label: '进取型', color: 'bg-orange-500' },
                ].map((risk) => (
                  <button
                    key={risk.id}
                    onClick={() => setRiskPreference(risk.id as any)}
                    className={`p-2 rounded-xl text-[10px] font-black transition-all ${
                      riskPreference === risk.id
                        ? `${risk.color} text-white shadow-lg`
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[#00D4AA]/30'
                    }`}
                  >
                    {risk.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 选股因子 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">选股因子</h3>
                <span className="text-[9px] text-[#00D4AA]">已选 {selectedFactors.length} 个</span>
              </div>
              <div className="space-y-2">
                {factors.map((factor) => {
                  const Icon = factor.icon;
                  const isSelected = selectedFactors.includes(factor.id);
                  return (
                    <button
                      key={factor.id}
                      onClick={() => toggleFactor(factor.id)}
                      className={`w-full p-3 rounded-xl border transition-all text-left ${
                        isSelected
                          ? 'bg-[#00D4AA]/10 border-[#00D4AA] text-[#00D4AA]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[#00D4AA]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} />
                        <div className="flex-1">
                          <p className="text-xs font-bold">{factor.name}</p>
                          <p className="text-[9px] text-[var(--color-text-muted)]">{factor.description}</p>
                        </div>
                        {isSelected && <ICONS.Check size={14} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 分析按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={selectedFactors.length === 0 || isAnalyzing}
              className="w-full py-4 rounded-xl bg-[#00D4AA] text-[#0A1628] font-black text-sm uppercase tracking-widest hover:bg-[#00D4AA]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0A1628]/30 border-t-[#0A1628] rounded-full animate-spin" />
                  智能分析中...
                </>
              ) : (
                <>
                  <ICONS.Search size={16} />
                  开始选股
                </>
              )}
            </button>

            {/* 免责声明 */}
            <div className="p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <p className="text-[8px] text-[var(--color-text-muted)] leading-relaxed">
                <span className="text-[#FF6B6B]">*</span> AI选股结果仅供参考，不构成投资建议。投资有风险，入市需谨慎。
              </p>
            </div>
          </div>

          {/* 右侧：分析结果 */}
          <div className="flex-1 p-6 overflow-y-auto bg-[var(--color-surface)]/30">
            {!results && !isAnalyzing && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                  <ICONS.Brain size={40} className="text-[var(--color-text-muted)] opacity-50" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">选择因子开始智能选股</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">基于银河Nexus量化引擎的多因子模型</p>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-[#00D4AA]/10 border border-[#00D4AA]/30 flex items-center justify-center">
                    <ICONS.Brain size={40} className="text-[#00D4AA]" />
                  </div>
                  <div className="absolute -inset-2 border-2 border-[#00D4AA]/20 rounded-3xl animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">AI正在分析市场数据...</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">扫描全市场5000+标的 · 计算多因子得分</p>
                </div>
              </div>
            )}

            {results && !isAnalyzing && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-[var(--color-text-primary)]">
                    选股结果 <span className="text-[#00D4AA]">{results.length}</span> 只
                  </h3>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    按综合评分排序
                  </span>
                </div>

                <div className="space-y-3">
                  {results.map((stock, index) => (
                    <div
                      key={stock.symbol}
                      className="p-4 bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] hover:border-[#00D4AA]/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#00D4AA]/10 flex items-center justify-center">
                            <span className="text-sm font-black text-[#00D4AA]">{index + 1}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-[var(--color-text-primary)]">{stock.name}</h4>
                              <span className="text-[9px] font-mono text-[var(--color-text-muted)]">{stock.symbol}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {stock.factors.map((factor) => (
                                <span
                                  key={factor}
                                  className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                                >
                                  {factors.find(f => f.id === factor)?.name || factor}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-lg font-black font-mono text-[var(--color-text-primary)]">
                              ¥{stock.price.toFixed(2)}
                            </span>
                            {getTrendIcon(stock.trend)}
                          </div>
                          <div className="flex items-center gap-3 mt-1 justify-end">
                            <span className={`text-xs font-black font-mono ${stock.changePercent >= 0 ? 'text-[#00D4AA]' : 'text-[#FF6B6B]'}`}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-[var(--color-text-muted)]">评分</span>
                              <div className="w-12 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#00D4AA] rounded-full"
                                  style={{ width: `${stock.score}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-black text-[#00D4AA]">{stock.score}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 智能建议 */}
                <div className="p-4 bg-[#00D4AA]/5 rounded-2xl border border-[#00D4AA]/20">
                  <div className="flex items-start gap-3">
                    <ICONS.Lightbulb size={18} className="text-[#00D4AA] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-[#00D4AA] uppercase tracking-widest mb-1">智能建议</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                        基于您选择的「动量因子」和「质量因子」，系统筛选出近期表现强劲且基本面优质的标的。
                        建议关注排名前三的股票，并结合市场走势分批建仓，控制单只股票仓位不超过总资产的20%。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartStockPicker;
