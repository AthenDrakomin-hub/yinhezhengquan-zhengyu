/**
 * 涨停板监控页面
 * 完整的涨停板监控功能页面
 */

import React, { useState } from 'react';
import { Search, Settings, TrendingUp, Filter } from 'lucide-react';
import LimitUpMonitor from './LimitUpMonitor';

const LimitUpView: React.FC = () => {
  const [customSymbols, setCustomSymbols] = useState('');
  const [useCustomList, setUseCustomList] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false); // 默认关闭自动刷新
  const [refreshInterval, setRefreshInterval] = useState(60000); // 60秒
  const [showSettings, setShowSettings] = useState(false);

  // 默认热门股票列表
  const defaultSymbols: string[] = [
    '600519', // 贵州茅台
    '000001', // 平安银行
    '600000', // 浦发银行
    '000002', // 万科A
    '600036', // 招商银行
    '601318', // 中国平安
    '000333', // 美的集团
    '600276', // 恒瑞医药
    '002594', // 比亚迪
    '600887', // 伊利股份
    '601888', // 中国中免
    '002415', // 海康威视
    '600309', // 万华化学
    '601012', // 隆基绿能
    '300750', // 宁德时代
  ];

  // 解析自定义股票列表
  const parseCustomSymbols = (): string[] | undefined => {
    if (!customSymbols.trim()) return undefined;
    return customSymbols
      .split(/[,，\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  // 获取当前使用的股票列表
  const getCurrentSymbols = (): string[] | undefined => {
    if (useCustomList) {
      return parseCustomSymbols();
    }
    return undefined;
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* 页面标题 */}
      <div className="bg-[var(--color-surface)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  涨停板监控
                </h1>
                <p className="text-sm text-gray-600">
                  实时监控 A 股涨停板情况
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-active)] text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>设置</span>
            </button>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">监控设置</h2>
            </div>

            <div className="space-y-6">
              {/* 股票列表设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  股票列表
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={!useCustomList}
                      onChange={() => setUseCustomList(false)}
                      className="text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">使用默认热门股票列表</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={useCustomList}
                      onChange={() => setUseCustomList(true)}
                      className="text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">自定义股票列表</span>
                  </label>
                </div>

                {useCustomList && (
                  <div className="mt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={customSymbols}
                        onChange={(e) => setCustomSymbols(e.target.value)}
                        placeholder="输入股票代码，用逗号分隔（如：600519,000001,600000）"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      支持的格式：600519, 000001, 600000（用逗号或空格分隔）
                    </p>
                  </div>
                )}
              </div>

              {/* 刷新设置 */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">自动刷新</span>
                </label>

                {autoRefresh && (
                  <div className="mt-3 ml-6">
                    <label className="block text-sm text-gray-600 mb-2">
                      刷新间隔
                    </label>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value={3000}>3 秒</option>
                      <option value={5000}>5 秒</option>
                      <option value={10000}>10 秒</option>
                      <option value={30000}>30 秒</option>
                      <option value={60000}>1 分钟</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 监控组件 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LimitUpMonitor
          symbols={getCurrentSymbols()}
          autoRefresh={autoRefresh}
          refreshInterval={refreshInterval}
        />
      </div>

      {/* 页脚信息 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-[var(--color-surface)] rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">说明</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• <strong>涨停判断</strong>：根据股票类型自动判断（主板10%、ST 5%、创业板20%、科创板20%）</p>
            <p>• <strong>实时更新</strong>：通过 QVeris API 获取实时行情数据</p>
            <p>• <strong>龙头标识</strong>：排名第一的涨停股票标注为"龙头"</p>
            <p>• <strong>数据来源</strong>：同花顺 iFinD 实时行情</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimitUpView;
