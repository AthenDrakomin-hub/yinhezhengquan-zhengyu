import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

type TabKey = 'approval' | 'trading_hours' | 'fast_channel' | 'trade_rules';

interface ApprovalRule {
  id: string;
  trade_type: string;
  auto_approve_enabled: boolean;
  auto_approve_threshold: {
    max_amount?: number;
    max_quantity?: number;
  };
  manual_review_conditions: {
    amount_above?: number;
    all?: boolean;
  };
  reviewer_level_required: string;
  description: string;
  status: boolean;
}

interface TradingHour {
  id: string;
  market_type: string;
  market_name: string;
  trading_sessions: Array<{
    session_name: string;
    start: string;
    end: string;
    type: string;
  }>;
  timezone: string;
  status: boolean;
}

interface FastChannelRule {
  id: string;
  channel_type: string;
  channel_name: string;
  allowed_user_levels: string[];
  bypass_trading_hours: boolean;
  bypass_price_limit: boolean;
  description: string;
  status: boolean;
}

interface TradeRule {
  id: string;
  rule_type: string;
  config: Record<string, any>;
  status: boolean;
}

const TradeRulesManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('approval');
  const [loading, setLoading] = useState(true);
  
  // 数据状态
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [tradingHours, setTradingHours] = useState<TradingHour[]>([]);
  const [fastChannels, setFastChannels] = useState<FastChannelRule[]>([]);
  const [tradeRules, setTradeRules] = useState<TradeRule[]>([]);
  
  // 编辑状态
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // 加载数据
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [approvalRes, hoursRes, channelRes, rulesRes] = await Promise.all([
        supabase.from('approval_rules').select('*').order('trade_type'),
        supabase.from('trading_hours').select('*').order('market_type'),
        supabase.from('fast_channel_rules').select('*').order('channel_type'),
        supabase.from('trade_rules').select('*').order('rule_type')
      ]);

      if (approvalRes.data) setApprovalRules(approvalRes.data);
      if (hoursRes.data) setTradingHours(hoursRes.data);
      if (channelRes.data) setFastChannels(channelRes.data);
      if (rulesRes.data) setTradeRules(rulesRes.data);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 更新审核规则
  const updateApprovalRule = async (id: string, updates: Partial<ApprovalRule>) => {
    try {
      const { error } = await supabase
        .from('approval_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      await loadAllData();
      setShowModal(false);
      setEditingItem(null);
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  };

  // 更新快速通道规则
  const updateFastChannel = async (id: string, updates: Partial<FastChannelRule>) => {
    try {
      const { error } = await supabase
        .from('fast_channel_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      await loadAllData();
      setShowModal(false);
      setEditingItem(null);
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  };

  // 切换状态
  const toggleStatus = async (table: string, id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ status: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      await loadAllData();
    } catch (err: any) {
      alert('操作失败: ' + err.message);
    }
  };

  // 渲染审核规则表格
  const renderApprovalRules = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400">交易类型</th>
            <th className="text-left py-3 px-4 text-gray-400">自动审核</th>
            <th className="text-left py-3 px-4 text-gray-400">自动审核阈值</th>
            <th className="text-left py-3 px-4 text-gray-400">审核级别</th>
            <th className="text-left py-3 px-4 text-gray-400">状态</th>
            <th className="text-left py-3 px-4 text-gray-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {approvalRules.map((rule) => (
            <tr key={rule.id} className="border-b border-gray-800 hover:bg-gray-800/50">
              <td className="py-3 px-4 font-medium">{rule.trade_type}</td>
              <td className="py-3 px-4">
                <button
                  onClick={() => updateApprovalRule(rule.id, { auto_approve_enabled: !rule.auto_approve_enabled })}
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    rule.auto_approve_enabled 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {rule.auto_approve_enabled ? '已开启' : '已关闭'}
                </button>
              </td>
              <td className="py-3 px-4 text-gray-300">
                {rule.auto_approve_threshold?.max_amount && (
                  <span className="mr-2">金额 ≤{rule.auto_approve_threshold.max_amount.toLocaleString()}元</span>
                )}
                {rule.auto_approve_threshold?.max_quantity && (
                  <span>数量 ≤{rule.auto_approve_threshold.max_quantity.toLocaleString()}股</span>
                )}
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  rule.reviewer_level_required === 'super_admin' 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {rule.reviewer_level_required === 'super_admin' ? '超级管理员' : '普通管理员'}
                </span>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => toggleStatus('approval_rules', rule.id, rule.status)}
                  className={`w-12 h-6 rounded-full relative ${
                    rule.status ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${
                    rule.status ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => {
                    setEditingItem({ type: 'approval', data: rule });
                    setShowModal(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  编辑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 渲染交易时间配置
  const renderTradingHours = () => (
    <div className="space-y-4">
      {tradingHours.map((market) => (
        <div key={market.id} className="bg-gray-800/50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-lg font-bold">{market.market_name}</h4>
              <p className="text-sm text-gray-400">时区: {market.timezone}</p>
            </div>
            <button
              onClick={() => toggleStatus('trading_hours', market.id, market.status)}
              className={`w-12 h-6 rounded-full relative ${
                market.status ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${
                market.status ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {market.trading_sessions.map((session, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg ${
                  session.type === 'continuous' ? 'bg-green-500/10 border border-green-500/20' :
                  session.type === 'call_auction' ? 'bg-blue-500/10 border border-blue-500/20' :
                  'bg-gray-700/50 border border-gray-600'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{session.session_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    session.type === 'continuous' ? 'bg-green-500/20 text-green-400' :
                    session.type === 'call_auction' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-600 text-gray-400'
                  }`}>
                    {session.type === 'continuous' ? '连续竞价' :
                     session.type === 'call_auction' ? '集合竞价' : '休市'}
                  </span>
                </div>
                <p className="text-lg font-bold mt-1">{session.start} - {session.end}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // 渲染快速通道配置
  const renderFastChannels = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400">通道名称</th>
            <th className="text-left py-3 px-4 text-gray-400">允许用户级别</th>
            <th className="text-left py-3 px-4 text-gray-400">绕过交易时间</th>
            <th className="text-left py-3 px-4 text-gray-400">绕过涨跌停</th>
            <th className="text-left py-3 px-4 text-gray-400">状态</th>
            <th className="text-left py-3 px-4 text-gray-400">操作</th>
          </tr>
        </thead>
        <tbody>
          {fastChannels.map((channel) => (
            <tr key={channel.id} className="border-b border-gray-800 hover:bg-gray-800/50">
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium">{channel.channel_name}</p>
                  <p className="text-xs text-gray-500">{channel.description}</p>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {channel.allowed_user_levels?.map((level) => (
                    <span 
                      key={level}
                      className={`px-2 py-0.5 rounded text-xs ${
                        level === 'institution' ? 'bg-purple-500/20 text-purple-400' :
                        level === 'svip' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {level === 'institution' ? '机构' :
                       level === 'svip' ? 'SVIP' :
                       level === 'vip' ? 'VIP' : level}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={channel.bypass_trading_hours ? 'text-green-400' : 'text-gray-500'}>
                  {channel.bypass_trading_hours ? '✓ 是' : '✗ 否'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={channel.bypass_price_limit ? 'text-green-400' : 'text-gray-500'}>
                  {channel.bypass_price_limit ? '✓ 是' : '✗ 否'}
                </span>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => toggleStatus('fast_channel_rules', channel.id, channel.status)}
                  className={`w-12 h-6 rounded-full relative ${
                    channel.status ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${
                    channel.status ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={() => {
                    setEditingItem({ type: 'fast_channel', data: channel });
                    setShowModal(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  编辑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // 渲染交易规则
  const renderTradeRules = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tradeRules.map((rule) => (
        <div key={rule.id} className="bg-gray-800/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold">{rule.rule_type}</h4>
            <button
              onClick={() => toggleStatus('trade_rules', rule.id, rule.status)}
              className={`w-10 h-5 rounded-full relative ${
                rule.status ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all ${
                rule.status ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            {Object.entries(rule.config).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500">{key}:</span>
                <span>
                  {typeof value === 'object' ? JSON.stringify(value) : 
                   typeof value === 'number' ? value.toLocaleString() : 
                   String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // 编辑模态框
  const renderModal = () => {
    if (!editingItem) return null;

    if (editingItem.type === 'approval') {
      const rule = editingItem.data as ApprovalRule;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold mb-4">编辑审核规则 - {rule.trade_type}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">自动审核最大金额</label>
                <input
                  type="number"
                  defaultValue={rule.auto_approve_threshold?.max_amount || ''}
                  id="max_amount"
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-[var(--color-text-primary)]"
                  placeholder="输入金额阈值"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">自动审核最大数量</label>
                <input
                  type="number"
                  defaultValue={rule.auto_approve_threshold?.max_quantity || ''}
                  id="max_quantity"
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-[var(--color-text-primary)]"
                  placeholder="输入数量阈值"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">审核级别要求</label>
                <select
                  defaultValue={rule.reviewer_level_required}
                  id="reviewer_level"
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-[var(--color-text-primary)]"
                >
                  <option value="admin">普通管理员</option>
                  <option value="super_admin">超级管理员</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const maxAmount = (document.getElementById('max_amount') as HTMLInputElement).value;
                  const maxQuantity = (document.getElementById('max_quantity') as HTMLInputElement).value;
                  const reviewerLevel = (document.getElementById('reviewer_level') as HTMLSelectElement).value;
                  
                  updateApprovalRule(rule.id, {
                    auto_approve_threshold: {
                      max_amount: maxAmount ? Number(maxAmount) : undefined,
                      max_quantity: maxQuantity ? Number(maxQuantity) : undefined
                    },
                    reviewer_level_required: reviewerLevel
                  });
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-[var(--color-text-primary)] py-2 rounded-lg font-medium"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-[var(--color-text-primary)] py-2 rounded-lg font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (editingItem.type === 'fast_channel') {
      const channel = editingItem.data as FastChannelRule;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold mb-4">编辑快速通道 - {channel.channel_name}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">允许用户级别</label>
                <div className="space-y-2">
                  {['vip', 'svip', 'institution'].map((level) => (
                    <label key={level} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        defaultChecked={channel.allowed_user_levels?.includes(level)}
                        id={`level_${level}`}
                        className="w-4 h-4 rounded"
                      />
                      <span>{level === 'institution' ? '机构' : level === 'svip' ? 'SVIP' : 'VIP'}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked={channel.bypass_trading_hours}
                  id="bypass_hours"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="bypass_hours" className="text-sm">绕过交易时间限制</label>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked={channel.bypass_price_limit}
                  id="bypass_limit"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="bypass_limit" className="text-sm">绕过涨跌停限制</label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const allowedLevels = ['vip', 'svip', 'institution'].filter(
                    level => (document.getElementById(`level_${level}`) as HTMLInputElement)?.checked
                  );
                  const bypassHours = (document.getElementById('bypass_hours') as HTMLInputElement).checked;
                  const bypassLimit = (document.getElementById('bypass_limit') as HTMLInputElement).checked;
                  
                  updateFastChannel(channel.id, {
                    allowed_user_levels: allowedLevels,
                    bypass_trading_hours: bypassHours,
                    bypass_price_limit: bypassLimit
                  });
                }}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-[var(--color-text-primary)] py-2 rounded-lg font-medium"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-[var(--color-text-primary)] py-2 rounded-lg font-medium"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const tabs = [
    { key: 'approval' as TabKey, label: '审核规则', count: approvalRules.length },
    { key: 'trading_hours' as TabKey, label: '交易时间', count: tradingHours.length },
    { key: 'fast_channel' as TabKey, label: '快速通道', count: fastChannels.length },
    { key: 'trade_rules' as TabKey, label: '交易规则', count: tradeRules.length },
  ];

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">交易规则管理</h2>
          <p className="text-sm text-gray-400 mt-1">配置审核规则、交易时间、快速通道等</p>
        </div>
        <button
          onClick={loadAllData}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium"
        >
          刷新数据
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-800 text-[var(--color-text-primary)] border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-[var(--color-text-primary)] hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 bg-gray-700 rounded text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="bg-gray-900/50 rounded-xl p-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <>
            {activeTab === 'approval' && renderApprovalRules()}
            {activeTab === 'trading_hours' && renderTradingHours()}
            {activeTab === 'fast_channel' && renderFastChannels()}
            {activeTab === 'trade_rules' && renderTradeRules()}
          </>
        )}
      </div>

      {/* 编辑模态框 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderModal()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeRulesManagement;
