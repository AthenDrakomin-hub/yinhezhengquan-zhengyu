/**
 * 管理后台 - 搜索规则配置
 * 功能：搜索规则管理、市场限制、股票类型、敏感词过滤
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { searchConfigService, DEFAULT_MARKET_RESTRICTIONS, DEFAULT_STOCK_TYPES, MarketRestriction, StockTypeConfig, SensitiveWord } from '@/services/searchConfigService';

type TabType = 'rules' | 'markets' | 'types' | 'sensitive';

const AdminSearchConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 市场限制配置
  const [marketRestrictions, setMarketRestrictions] = useState<MarketRestriction[]>(DEFAULT_MARKET_RESTRICTIONS);
  
  // 股票类型配置
  const [stockTypes, setStockTypes] = useState<StockTypeConfig[]>(DEFAULT_STOCK_TYPES);
  
  // 敏感词列表
  const [sensitiveWords, setSensitiveWords] = useState<SensitiveWord[]>([]);
  const [showAddSensitive, setShowAddSensitive] = useState(false);
  const [newSensitiveWord, setNewSensitiveWord] = useState({ word: '', category: 'custom', action: 'block' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [markets, types, words] = await Promise.all([
      searchConfigService.getMarketRestrictions(),
      searchConfigService.getStockTypes(),
      searchConfigService.getSensitiveWords()
    ]);
    setMarketRestrictions(markets);
    setStockTypes(types);
    setSensitiveWords(words);
    setLoading(false);
  };

  const handleSaveMarketRestrictions = async () => {
    setSaving(true);
    const result = await searchConfigService.saveMarketRestrictions(marketRestrictions);
    setSaving(false);
    if (result.success) {
      alert('市场限制配置保存成功');
    } else {
      alert(`保存失败: ${result.error}`);
    }
  };

  const handleSaveStockTypes = async () => {
    setSaving(true);
    const result = await searchConfigService.saveStockTypes(stockTypes);
    setSaving(false);
    if (result.success) {
      alert('股票类型配置保存成功');
    } else {
      alert(`保存失败: ${result.error}`);
    }
  };

  const handleAddSensitiveWord = async () => {
    if (!newSensitiveWord.word.trim()) {
      alert('请输入敏感词');
      return;
    }
    const result = await searchConfigService.addSensitiveWord({
      ...newSensitiveWord,
      is_active: true
    } as any);
    if (result.success) {
      loadData();
      setShowAddSensitive(false);
      setNewSensitiveWord({ word: '', category: 'custom', action: 'block' });
    } else {
      alert(`添加失败: ${result.error}`);
    }
  };

  const handleDeleteSensitiveWord = async (id: string) => {
    if (!window.confirm('确定要删除此敏感词吗？')) return;
    const result = await searchConfigService.deleteSensitiveWord(id);
    if (result.success) {
      loadData();
    } else {
      alert(`删除失败: ${result.error}`);
    }
  };

  const tabs = [
    { id: 'rules' as TabType, label: '搜索规则', icon: '🔍' },
    { id: 'markets' as TabType, label: '市场限制', icon: '🌍' },
    { id: 'types' as TabType, label: '股票类型', icon: '📊' },
    { id: 'sensitive' as TabType, label: '敏感词', icon: '🚫' },
  ];

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">搜索配置管理</h3>
          <p className="text-xs text-industrial-400 mt-1">管理股票搜索规则、市场限制和敏感词过滤</p>
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

      {/* 市场限制配置 */}
      {activeTab === 'markets' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-4">
            <h4 className="text-sm font-bold text-industrial-700 mb-4">市场搜索限制</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200">
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">市场</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">描述</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">代码长度</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">代码格式</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase text-center">启用</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {marketRestrictions.map((market, index) => (
                    <tr key={market.market} className="hover:bg-industrial-50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-industrial-700">{market.market}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-industrial-600">{market.description}</td>
                      <td className="px-4 py-3 text-xs text-industrial-600">
                        {market.min_code_length}-{market.max_code_length}位
                      </td>
                      <td className="px-4 py-3 text-xs text-industrial-400 font-mono">{market.code_pattern}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            const updated = [...marketRestrictions];
                            updated[index].enabled = !updated[index].enabled;
                            setMarketRestrictions(updated);
                          }}
                          className={`w-12 h-6 rounded-full transition-all ${
                            market.enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            market.enabled ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveMarketRestrictions}
                disabled={saving}
                className="industrial-button-primary"
              >
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 股票类型配置 */}
      {activeTab === 'types' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-4">
            <h4 className="text-sm font-bold text-industrial-700 mb-4">可搜索股票类型</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockTypes.map((type, index) => (
                <div key={type.type} className="border border-industrial-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{type.icon}</span>
                      <span className="text-sm font-bold text-industrial-700">{type.label}</span>
                    </div>
                    <button
                      onClick={() => {
                        const updated = [...stockTypes];
                        updated[index].enabled = !updated[index].enabled;
                        setStockTypes(updated);
                      }}
                      className={`w-12 h-6 rounded-full transition-all ${
                        type.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        type.enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                  <p className="text-xs text-industrial-400">{type.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveStockTypes}
                disabled={saving}
                className="industrial-button-primary"
              >
                {saving ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 敏感词管理 */}
      {activeTab === 'sensitive' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-industrial-700">敏感词过滤</h4>
              <button
                onClick={() => setShowAddSensitive(true)}
                className="industrial-button-primary text-xs"
              >
                + 添加敏感词
              </button>
            </div>

            {/* 添加敏感词弹窗 */}
            {showAddSensitive && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-96 space-y-4">
                  <h5 className="text-sm font-bold">添加敏感词</h5>
                  <input
                    type="text"
                    value={newSensitiveWord.word}
                    onChange={(e) => setNewSensitiveWord({ ...newSensitiveWord, word: e.target.value })}
                    placeholder="输入敏感词"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                  <select
                    value={newSensitiveWord.category}
                    onChange={(e) => setNewSensitiveWord({ ...newSensitiveWord, category: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="political">政治敏感</option>
                    <option value="fraud">诈骗相关</option>
                    <option value="sensitive">敏感信息</option>
                    <option value="custom">自定义</option>
                  </select>
                  <select
                    value={newSensitiveWord.action}
                    onChange={(e) => setNewSensitiveWord({ ...newSensitiveWord, action: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="block">屏蔽</option>
                    <option value="replace">替换</option>
                    <option value="warn">警告</option>
                  </select>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddSensitive(false)} className="industrial-button-secondary text-xs">取消</button>
                    <button onClick={handleAddSensitiveWord} className="industrial-button-primary text-xs">确认添加</button>
                  </div>
                </div>
              </div>
            )}

            {/* 敏感词列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200">
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">敏感词</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">分类</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">处理方式</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">状态</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {sensitiveWords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-industrial-400">暂无敏感词</td>
                    </tr>
                  ) : sensitiveWords.map((word) => (
                    <tr key={word.id} className="hover:bg-industrial-50">
                      <td className="px-4 py-3 text-sm font-bold text-industrial-700">{word.word}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-industrial-100 text-industrial-600">
                          {word.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-industrial-600">
                        {word.action === 'block' ? '屏蔽' : word.action === 'replace' ? '替换' : '警告'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${word.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                          {word.is_active ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSensitiveWord(word.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* 搜索规则说明 */}
      {activeTab === 'rules' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="industrial-card p-6 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h4 className="text-sm font-bold text-industrial-700 mb-2">搜索规则配置</h4>
            <p className="text-xs text-industrial-400 mb-4">
              通过配置市场限制、股票类型和敏感词过滤来控制搜索行为
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="p-4 border border-industrial-200 rounded-lg">
                <div className="text-2xl mb-2">🌍</div>
                <p className="text-xs font-bold text-industrial-600">市场限制</p>
                <p className="text-xs text-industrial-400">控制可搜索的市场范围</p>
              </div>
              <div className="p-4 border border-industrial-200 rounded-lg">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-xs font-bold text-industrial-600">股票类型</p>
                <p className="text-xs text-industrial-400">过滤可搜索的证券类型</p>
              </div>
              <div className="p-4 border border-industrial-200 rounded-lg">
                <div className="text-2xl mb-2">🚫</div>
                <p className="text-xs font-bold text-industrial-600">敏感词过滤</p>
                <p className="text-xs text-industrial-400">屏蔽违规搜索关键词</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminSearchConfig;
