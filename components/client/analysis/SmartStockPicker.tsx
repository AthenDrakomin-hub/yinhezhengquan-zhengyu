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
  { symbol: '000001', name: '平安银行', score: 87, factors: ['value', 'liquidity'], trend: 'up', price: 12.35, changePercent: 2.18 },
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative w-full max-w-5xl bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden animate-slide-up">
        {/* 头部 */}
        <header className="px-6 py-5 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
              <ICONS.Brain size={24} className="text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">AI 智能选股</h2>
              <p className="text-xs text-[var(--color-text-muted)]">多因子量化模型选股引擎</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg)] transition-all"
          >
            <ICONS.X size={20} />
          </button>
        </header>

        <div className="flex flex-col md:flex-row">
          {/* 左侧：选股条件 */}
          <div className="w-full md:w-80 border-r border-[var(--color-border)] p-6 space-y-6 bg-[var(--color-bg)]">
            {/* 风险偏好 */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">风险偏好</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'conservative', label: '稳健型' },
                  { id: 'moderate', label: '平衡型' },
                  { id: 'aggressive', label: '进取型' },
                ].map((risk) => (
                  <button
                    key={risk.id}
                    onClick={() => setRiskPreference(risk.id as any)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      riskPreference === risk.id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
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
                <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">选股因子</h3>
                <span className="text-xs text-[var(--color-primary)]">已选 {selectedFactors.length} 个</span>
              </div>
              <div className="space-y-2">
                {factors.map((factor) => {
                  const Icon = factor.icon;
                  const isSelected = selectedFactors.includes(factor.id);
                  return (
                    <button
                      key={factor.id}
                      onClick={() => toggleFactor(factor.id)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{factor.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{factor.description}</p>
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
              className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            <div className="p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                <span className="text-[var(--color-accent)]">* </span>
                AI选股结果仅供参考，不构成投资建议。投资有风险，入市需谨慎。
              </p>
            </div>
          </div>

          {/* 右侧：分析结果 */}
          <div className="flex-1 p-6 min-h-[400px] max-h-[70vh] overflow-y-auto bg-[var(--color-surface)]">
            {!results && !isAnalyzing && (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-[var(--color-bg)] flex items-center justify-center mb-4">
                  <ICONS.Brain size={36} className="text-[var(--color-text-muted)]" />
                </div>
                <div>
                  <p className="text-base font-medium text-[var(--color-text-primary)]">选择因子开始智能选股</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">基于多因子量化模型的智能选股系统</p>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center">
                    <ICONS.Brain size={36} className="text-[var(--color-primary)]" />
                  </div>
                  <div className="absolute -inset-1 border-2 border-[var(--color-primary)]/20 rounded-2xl animate-pulse" />
                </div>
                <div>
                  <p className="text-base font-medium text-[var(--color-text-primary)]">AI正在分析市场数据...</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">扫描全市场标的 · 计算多因子得分</p>
                </div>
              </div>
            )}

            {results && !isAnalyzing && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    选股结果 <span className="text-[var(--color-primary)]">{results.length}</span> 只
                  </h3>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    按综合评分排序
                  </span>
                </div>

                <div className="space-y-3">
                  {results.map((stock, index) => {
                    const isUp = stock.changePercent >= 0;
                    return (
                      <div
                        key={stock.symbol}
                        className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* 左侧：排名和股票信息 */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              index < 3 ? 'bg-[var(--color-positive)] text-white' : 'bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)]'
                            }`}>
                              <span className="text-sm font-bold">{index + 1}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-[var(--color-text-primary)]">{stock.name}</h4>
                                <span className="text-xs text-[var(--color-text-muted)] font-mono">{stock.symbol}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {stock.factors.map((factor) => (
                                  <span
                                    key={factor}
                                    className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                                  >
                                    {factors.find(f => f.id === factor)?.name || factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* 右侧：价格和评分 */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-lg font-bold text-[var(--color-text-primary)]">
                              ¥{stock.price.toFixed(2)}
                            </div>
                            <div className="flex items-center gap-3 mt-1 justify-end">
                              <span className={`text-sm font-bold ${isUp ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
                                {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-[var(--color-text-muted)]">评分</span>
                                <div className="w-16 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden border border-[var(--color-border)]">
                                  <div 
                                    className="h-full bg-[var(--color-primary)] rounded-full"
                                    style={{ width: `${stock.score}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-[var(--color-primary)]">{stock.score}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 操作按钮 */}
                <div className="flex gap-3 pt-4 border-t border-[var(--color-border)] mt-4">
                  <button
                    onClick={() => setResults(null)}
                    className="flex-1 py-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-all"
                  >
                    重新选股
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-all"
                  >
                    完成选股
                  </button>
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
