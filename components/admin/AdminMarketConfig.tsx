/**
 * 管理后台 - 市场分类与指数配置
 * 功能：市场分类管理、指数展示配置、涨跌分布设置
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { marketConfigService, IndexConfig, MarketCategory, UpDownDistributionConfig, DEFAULT_INDEX_CONFIGS, DEFAULT_UPDOWN_DISTRIBUTION } from '@/services/marketConfigService';

type TabType = 'categories' | 'indices' | 'distribution';

const AdminMarketConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('indices');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 指数配置
  const [indexConfigs, setIndexConfigs] = useState<IndexConfig[]>([]);
  
  // 市场分类配置
  const [marketCategories, setMarketCategories] = useState<MarketCategory[]>([]);
  
  // 涨跌分布配置
  const [distributionConfig, setDistributionConfig] = useState<UpDownDistributionConfig>(DEFAULT_UPDOWN_DISTRIBUTION);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [indices, categories, distribution] = await Promise.all([
      marketConfigService.getIndexConfigs(),
      marketConfigService.getMarketCategories(),
      marketConfigService.getUpDownDistributionConfig()
    ]);
    setIndexConfigs(indices);
    setMarketCategories(categories);
    setDistributionConfig(distribution);
    setLoading(false);
  };

  const handleSaveIndexConfigs = async () => {
    setSaving(true);
    const result = await marketConfigService.saveIndexConfigs(indexConfigs);
    setSaving(false);
    if (result.success) {
      alert('指数配置保存成功');
    } else {
      alert(`保存失败: ${result.error}`);
    }
  };

  const handleSaveDistributionConfig = async () => {
    setSaving(true);
    const result = await marketConfigService.saveUpDownDistributionConfig(distributionConfig);
    setSaving(false);
    if (result.success) {
      alert('涨跌分布配置保存成功');
    } else {
      alert(`保存失败: ${result.error}`);
    }
  };

  const handleToggleIndex = (id: string) => {
    setIndexConfigs(prev => prev.map(idx => 
      idx.id === id ? { ...idx, visible: !idx.visible } : idx
    ));
  };

  const handleToggleIndexEnabled = (id: string) => {
    setIndexConfigs(prev => prev.map(idx => 
      idx.id === id ? { ...idx, enabled: !idx.enabled } : idx
    ));
  };

  const handleUpdateIndexOrder = (id: string, order: number) => {
    setIndexConfigs(prev => prev.map(idx => 
      idx.id === id ? { ...idx, order } : idx
    ));
  };

  const tabs = [
    { id: 'indices' as TabType, label: '指数配置', icon: '📈' },
    { id: 'categories' as TabType, label: '市场分类', icon: '🗂️' },
    { id: 'distribution' as TabType, label: '涨跌分布', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">市场配置管理</h3>
          <p className="text-xs text-industrial-400 mt-1">管理行情分类、指数展示和涨跌分布配置</p>
        </div>
        <button className="industrial-button-secondary" onClick={loadData}>
          {loading ? '⏳' : '🔄'} 刷新
        </button>
      </div>

      {/* Tab导航 */}
      <div className="flex gap-2 border-b border-industrial-200 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-t transition-all ${
              activeTab === tab.id
                ? 'bg-industrial-800 text-white'
                : 'bg-industrial-100 text-industrial-600 hover:bg-industrial-200'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 指数配置 */}
      {activeTab === 'indices' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-industrial-700">指数展示配置</h4>
              <button
                onClick={handleSaveIndexConfigs}
                disabled={saving}
                className="industrial-button-primary"
              >
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200">
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">排序</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">指数名称</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">代码</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">市场</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">SECID</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase text-center">启用</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase text-center">显示</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {indexConfigs.map((index) => (
                    <tr key={index.id} className="hover:bg-industrial-50">
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={index.order}
                          onChange={(e) => handleUpdateIndexOrder(index.id, parseInt(e.target.value))}
                          className="w-12 px-2 py-1 text-xs border rounded text-center"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-industrial-700">{index.name}</span>
                        {index.description && (
                          <p className="text-xs text-industrial-400">{index.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-industrial-600">{index.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          index.market === 'CN' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {index.market === 'CN' ? 'A股' : '港股'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-industrial-400">{index.secid}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleIndexEnabled(index.id)}
                          className={`w-12 h-6 rounded-full transition-all ${
                            index.enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            index.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleIndex(index.id)}
                          className={`w-12 h-6 rounded-full transition-all ${
                            index.visible ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            index.visible ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 预览 */}
            <div className="mt-6 pt-4 border-t border-industrial-200">
              <h5 className="text-xs font-bold text-industrial-600 mb-3">预览效果</h5>
              <div className="bg-white rounded-lg p-4 flex gap-6 overflow-x-auto">
                {indexConfigs.filter(i => i.visible && i.enabled).sort((a, b) => a.order - b.order).map((index) => (
                  <div key={index.id} className="flex-shrink-0 w-24 text-center">
                    <p className="text-xs text-industrial-400 mb-1">{index.name}</p>
                    <p className="text-lg font-bold text-industrial-700">3,245.12</p>
                    <p className="text-xs text-red-500">+1.24%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 市场分类配置 */}
      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-4">
            <h4 className="text-sm font-bold text-industrial-700 mb-4">市场分类配置</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketCategories.map((category) => (
                <div key={category.id} className="border border-industrial-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      <span className="text-sm font-bold text-industrial-700">{category.label}</span>
                    </div>
                    <button
                      className={`w-10 h-5 rounded-full transition-all ${
                        category.visible ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        category.visible ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <p className="text-xs text-industrial-400">{category.description}</p>
                  {category.sub_categories && category.sub_categories.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-industrial-100">
                      <p className="text-xs text-industrial-400 mb-2">子分类:</p>
                      <div className="flex flex-wrap gap-1">
                        {category.sub_categories.map((sub) => (
                          <span key={sub.id} className="text-xs px-2 py-1 bg-industrial-100 rounded text-industrial-600">
                            {sub.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* 涨跌分布配置 */}
      {activeTab === 'distribution' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-industrial-700">涨跌分布配置</h4>
              <button
                onClick={handleSaveDistributionConfig}
                disabled={saving}
                className="industrial-button-primary"
              >
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>

            {/* 基础设置 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 border border-industrial-200 rounded-lg">
                <p className="text-xs text-industrial-400 mb-2">启用涨跌分布</p>
                <button
                  onClick={() => setDistributionConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full transition-all ${
                    distributionConfig.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    distributionConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div className="p-4 border border-industrial-200 rounded-lg">
                <p className="text-xs text-industrial-400 mb-2">显示涨跌停</p>
                <button
                  onClick={() => setDistributionConfig(prev => ({ ...prev, show_limit_up_down: !prev.show_limit_up_down }))}
                  className={`w-12 h-6 rounded-full transition-all ${
                    distributionConfig.show_limit_up_down ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    distributionConfig.show_limit_up_down ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div className="p-4 border border-industrial-200 rounded-lg">
                <p className="text-xs text-industrial-400 mb-2">刷新间隔（秒）</p>
                <input
                  type="number"
                  value={distributionConfig.refresh_interval}
                  onChange={(e) => setDistributionConfig(prev => ({ ...prev, refresh_interval: parseInt(e.target.value) || 30 }))}
                  className="w-full px-3 py-2 text-sm border rounded"
                />
              </div>
              <div className="p-4 border border-industrial-200 rounded-lg">
                <p className="text-xs text-industrial-400 mb-2">区间数量</p>
                <div className="text-lg font-bold text-industrial-700">{distributionConfig.ranges.length}</div>
              </div>
            </div>

            {/* 区间配置 */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-industrial-600">涨跌幅区间配置</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-industrial-50 border-b border-industrial-200">
                      <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">区间</th>
                      <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">最小%</th>
                      <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">最大%</th>
                      <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">上涨颜色</th>
                      <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">下跌颜色</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-100">
                    {distributionConfig.ranges.map((range, index) => (
                      <tr key={range.id}>
                        <td className="px-4 py-3 text-sm font-bold text-industrial-700">{range.label}</td>
                        <td className="px-4 py-3 text-xs text-industrial-600">{range.min}%</td>
                        <td className="px-4 py-3 text-xs text-industrial-600">{range.max}%</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: range.color_up }} />
                            <span className="text-xs font-mono">{range.color_up}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: range.color_down }} />
                            <span className="text-xs font-mono">{range.color_down}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminMarketConfig;
