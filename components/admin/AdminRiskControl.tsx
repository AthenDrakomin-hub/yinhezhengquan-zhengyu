/**
 * 管理后台 - 风控管理
 * 功能：风控规则配置、风险事件监控、事件处理
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  adminRiskControlService,
  RULE_TYPES,
  ACTION_TYPES,
  RISK_LEVELS,
  SCOPES,
  RiskRule,
  RiskEvent
} from '@/services/riskControlService';

type TabType = 'rules' | 'events' | 'stats';

const AdminRiskControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [rules, setRules] = useState<RiskRule[]>([]);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 筛选状态
  const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('all');
  const [eventLevelFilter, setEventLevelFilter] = useState<string>('all');
  const [eventPage, setEventPage] = useState(1);
  const [eventPagination, setEventPagination] = useState<any>({});
  
  // 弹窗状态
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);
  const [showEventDetail, setShowEventDetail] = useState<RiskEvent | null>(null);

  // 表单状态
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    rule_type: 'TRADE_LIMIT',
    rule_config: {} as Record<string, any>,
    action_type: 'WARN',
    action_config: {} as Record<string, any>,
    scope: 'all',
    priority: 100
  });

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchRules();
    } else if (activeTab === 'events') {
      fetchEvents();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, ruleTypeFilter, eventLevelFilter, eventPage]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const type = ruleTypeFilter === 'all' ? undefined : ruleTypeFilter;
      const data = await adminRiskControlService.getRules(type);
      setRules(data);
    } catch (error) {
      console.error('获取规则列表失败:', error);
    }
    setLoading(false);
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = { page: eventPage, page_size: 10 };
      if (eventLevelFilter !== 'all') {
        params.risk_level = eventLevelFilter;
      }
      const { events: data, pagination } = await adminRiskControlService.getEvents(params);
      setEvents(data);
      setEventPagination(pagination);
    } catch (error) {
      console.error('获取事件列表失败:', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await adminRiskControlService.getEventStats();
      setStats(data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
    setLoading(false);
  };

  const handleCreateRule = async () => {
    if (!ruleForm.name) {
      alert('请填写规则名称');
      return;
    }

    try {
      const result = await adminRiskControlService.createRule(ruleForm);
      if (result.success) {
        alert('规则创建成功');
        setShowRuleModal(false);
        resetRuleForm();
        fetchRules();
      } else {
        alert(`创建失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`创建失败: ${error.message}`);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      const result = await adminRiskControlService.updateRule(editingRule.id, ruleForm);
      if (result.success) {
        alert('规则更新成功');
        setShowRuleModal(false);
        setEditingRule(null);
        resetRuleForm();
        fetchRules();
      } else {
        alert(`更新失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`更新失败: ${error.message}`);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const result = await adminRiskControlService.toggleRule(ruleId, !currentStatus);
      if (result.success) {
        fetchRules();
      } else {
        alert(`操作失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`操作失败: ${error.message}`);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm('确定要删除此规则吗？此操作不可恢复。')) {
      return;
    }

    try {
      const result = await adminRiskControlService.deleteRule(ruleId);
      if (result.success) {
        fetchRules();
      } else {
        alert(`删除失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const handleProcessEvent = async (eventId: string, note: string) => {
    try {
      const result = await adminRiskControlService.handleEvent(eventId, note);
      if (result.success) {
        alert('事件已处理');
        setShowEventDetail(null);
        fetchEvents();
      } else {
        alert(`处理失败: ${result.error}`);
      }
    } catch (error: any) {
      alert(`处理失败: ${error.message}`);
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      description: '',
      rule_type: 'TRADE_LIMIT',
      rule_config: {},
      action_type: 'WARN',
      action_config: {},
      scope: 'all',
      priority: 100
    });
  };

  const openEditModal = (rule: RiskRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      rule_config: rule.rule_config,
      action_type: rule.action_type,
      action_config: rule.action_config,
      scope: rule.scope,
      priority: rule.priority
    });
    setShowRuleModal(true);
  };

  // 渲染规则配置表单
  const renderRuleConfigForm = () => {
    const type = ruleForm.rule_type;
    
    switch (type) {
      case 'TRADE_LIMIT':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">单笔交易限额（元）</label>
              <input
                type="number"
                value={ruleForm.rule_config.max_single_amount || ''}
                onChange={(e) => setRuleForm({
                  ...ruleForm,
                  rule_config: { ...ruleForm.rule_config, max_single_amount: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1"
                placeholder="不填则不限制"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">日累计交易限额（元）</label>
              <input
                type="number"
                value={ruleForm.rule_config.max_daily_amount || ''}
                onChange={(e) => setRuleForm({
                  ...ruleForm,
                  rule_config: { ...ruleForm.rule_config, max_daily_amount: Number(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1"
                placeholder="不填则不限制"
              />
            </div>
          </div>
        );
      
      case 'POSITION_CONCENTRATION':
        return (
          <div>
            <label className="text-sm text-gray-600">最大持仓占比（%）</label>
            <input
              type="number"
              value={ruleForm.rule_config.max_position_percent || ''}
              onChange={(e) => setRuleForm({
                ...ruleForm,
                rule_config: { ...ruleForm.rule_config, max_position_percent: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1"
              placeholder="如 30 表示30%"
            />
          </div>
        );
      
      case 'DAILY_LOSS':
        return (
          <div>
            <label className="text-sm text-gray-600">最大日内亏损（%）</label>
            <input
              type="number"
              value={ruleForm.rule_config.max_loss_percent || ''}
              onChange={(e) => setRuleForm({
                ...ruleForm,
                rule_config: { ...ruleForm.rule_config, max_loss_percent: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1"
              placeholder="如 20 表示亏损20%触发"
            />
          </div>
        );
      
      case 'FREQUENCY':
        return (
          <div>
            <label className="text-sm text-gray-600">每分钟最大交易次数</label>
            <input
              type="number"
              value={ruleForm.rule_config.max_trades_per_minute || ''}
              onChange={(e) => setRuleForm({
                ...ruleForm,
                rule_config: { ...ruleForm.rule_config, max_trades_per_minute: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1"
              placeholder="如 10"
            />
          </div>
        );
      
      case 'PRICE_DEVIATION':
        return (
          <div>
            <label className="text-sm text-gray-600">最大价格偏离（%）</label>
            <input
              type="number"
              value={ruleForm.rule_config.max_deviation_percent || ''}
              onChange={(e) => setRuleForm({
                ...ruleForm,
                rule_config: { ...ruleForm.rule_config, max_deviation_percent: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1"
              placeholder="如 5 表示偏离5%触发"
            />
          </div>
        );
      
      default:
        return (
          <div>
            <label className="text-sm text-gray-600">规则配置（JSON格式）</label>
            <textarea
              value={JSON.stringify(ruleForm.rule_config, null, 2)}
              onChange={(e) => {
                try {
                  setRuleForm({ ...ruleForm, rule_config: JSON.parse(e.target.value) });
                } catch {}
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mt-1 font-mono text-sm"
              rows={4}
            />
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      {/* 标签页 */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'rules', label: '风控规则', icon: '📋' },
          { key: 'events', label: '风险事件', icon: '⚠️' },
          { key: 'stats', label: '统计分析', icon: '📊' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-[#E63946] border-b-2 border-[#E63946]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 规则管理 */}
      {activeTab === 'rules' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <select
                value={ruleTypeFilter}
                onChange={(e) => setRuleTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="all">全部类型</option>
                {Object.entries(RULE_TYPES).map(([key, value]) => (
                  <option key={key} value={key}>{value.icon} {value.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                resetRuleForm();
                setEditingRule(null);
                setShowRuleModal(true);
              }}
              className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B] transition-colors flex items-center gap-2"
            >
              <span>➕</span> 创建规则
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">加载中...</p>
            </div>
          ) : rules.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">暂无风控规则</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">规则名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">触发动作</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">适用范围</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">优先级</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{rule.name}</div>
                          {rule.description && (
                            <div className="text-xs text-gray-500">{rule.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {RULE_TYPES[rule.rule_type as keyof typeof RULE_TYPES]?.icon}
                          {' '}
                          {RULE_TYPES[rule.rule_type as keyof typeof RULE_TYPES]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 text-xs rounded-full"
                          style={{
                            backgroundColor: `${ACTION_TYPES[rule.action_type as keyof typeof ACTION_TYPES]?.color}20`,
                            color: ACTION_TYPES[rule.action_type as keyof typeof ACTION_TYPES]?.color
                          }}
                        >
                          {ACTION_TYPES[rule.action_type as keyof typeof ACTION_TYPES]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {SCOPES[rule.scope as keyof typeof SCOPES]?.label}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{rule.priority}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleRule(rule.id, rule.is_enabled)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            rule.is_enabled
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {rule.is_enabled ? '已启用' : '已禁用'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="text-[#0066CC] hover:underline text-sm mr-3"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-500 hover:underline text-sm"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 事件监控 */}
      {activeTab === 'events' && (
        <>
          <div className="flex items-center gap-4 mb-6">
            <select
              value={eventLevelFilter}
              onChange={(e) => {
                setEventLevelFilter(e.target.value);
                setEventPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">全部等级</option>
              {Object.entries(RISK_LEVELS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">加载中...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">暂无风险事件</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setShowEventDetail(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{
                            backgroundColor: RISK_LEVELS[event.risk_level as keyof typeof RISK_LEVELS]?.bgColor,
                            color: RISK_LEVELS[event.risk_level as keyof typeof RISK_LEVELS]?.color
                          }}
                        >
                          {RISK_LEVELS[event.risk_level as keyof typeof RISK_LEVELS]?.label}
                        </span>
                        <span className="text-sm text-gray-600">
                          {RULE_TYPES[event.event_type as keyof typeof RULE_TYPES]?.label || event.event_type}
                        </span>
                        {event.handled_at && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            已处理
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        用户ID: {event.user_id?.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-gray-400">→</div>
                  </div>
                </motion.div>
              ))}
              
              {/* 分页 */}
              {eventPagination.total_pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => setEventPage(eventPage - 1)}
                    disabled={eventPage <= 1}
                    className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    {eventPage} / {eventPagination.total_pages}
                  </span>
                  <button
                    onClick={() => setEventPage(eventPage + 1)}
                    disabled={eventPage >= eventPagination.total_pages}
                    className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 统计分析 */}
      {activeTab === 'stats' && (
        <>
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">加载中...</p>
            </div>
          ) : !stats ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-400">暂无统计数据</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 总览卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: '总事件数', value: stats.total, color: '#0066CC', icon: '📊' },
                  { label: '待处理', value: stats.unhandled, color: '#F97316', icon: '⏳' },
                  { label: '今日新增', value: stats.today, color: '#E63946', icon: '📅' },
                  { label: '本周累计', value: Object.values(stats.by_level || {}).reduce((a: number, b: any) => a + b, 0), color: '#22C55E', icon: '📈' }
                ].map((item, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-3xl font-bold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* 风险等级分布 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">风险等级分布（近7天）</h3>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(RISK_LEVELS).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div
                        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-xl font-bold"
                        style={{ backgroundColor: value.bgColor, color: value.color }}
                      >
                        {stats.by_level?.[key] || 0}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{value.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 事件类型分布 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">事件类型分布（近7天）</h3>
                <div className="space-y-3">
                  {Object.entries(stats.by_type || {}).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {RULE_TYPES[type as keyof typeof RULE_TYPES]?.icon}
                        {' '}
                        {RULE_TYPES[type as keyof typeof RULE_TYPES]?.label || type}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E63946] rounded-full"
                            style={{
                              width: `${Math.min(100, (count / (stats.total || 1)) * 100)}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 创建/编辑规则弹窗 */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingRule ? '编辑规则' : '创建规则'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">规则名称 *</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="输入规则名称"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">规则描述</label>
                <textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  rows={2}
                  placeholder="描述此规则的作用"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">规则类型</label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value, rule_config: {} })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    {Object.entries(RULE_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.icon} {value.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">触发动作</label>
                  <select
                    value={ruleForm.action_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, action_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    {Object.entries(ACTION_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">适用范围</label>
                  <select
                    value={ruleForm.scope}
                    onChange={(e) => setRuleForm({ ...ruleForm, scope: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    {Object.entries(SCOPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">优先级</label>
                  <input
                    type="number"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="数字越小优先级越高"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">规则参数配置</label>
                {renderRuleConfigForm()}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRuleModal(false);
                  setEditingRule(null);
                  resetRuleForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={editingRule ? handleUpdateRule : handleCreateRule}
                className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B]"
              >
                {editingRule ? '保存修改' : '创建规则'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 事件详情弹窗 */}
      {showEventDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">风险事件详情</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 text-sm rounded-full"
                  style={{
                    backgroundColor: RISK_LEVELS[showEventDetail.risk_level as keyof typeof RISK_LEVELS]?.bgColor,
                    color: RISK_LEVELS[showEventDetail.risk_level as keyof typeof RISK_LEVELS]?.color
                  }}
                >
                  {RISK_LEVELS[showEventDetail.risk_level as keyof typeof RISK_LEVELS]?.label}
                </span>
                <span className="text-gray-600">
                  {RULE_TYPES[showEventDetail.event_type as keyof typeof RULE_TYPES]?.label}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">用户ID</p>
                <p className="font-mono text-sm">{showEventDetail.user_id}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">事件数据</p>
                <pre className="font-mono text-xs overflow-auto">
                  {JSON.stringify(showEventDetail.event_data, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">触发时间</p>
                  <p>{new Date(showEventDetail.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">处理状态</p>
                  <p>{showEventDetail.handled_at ? '已处理' : '待处理'}</p>
                </div>
              </div>

              {showEventDetail.handled_at && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-1">处理备注</p>
                  <p className="text-sm">{showEventDetail.handle_note || '无备注'}</p>
                </div>
              )}

              {!showEventDetail.handled_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">处理备注</label>
                  <textarea
                    id="event-note"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    rows={3}
                    placeholder="输入处理说明..."
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEventDetail(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                关闭
              </button>
              {!showEventDetail.handled_at && (
                <button
                  onClick={() => {
                    const note = (document.getElementById('event-note') as HTMLTextAreaElement)?.value;
                    handleProcessEvent(showEventDetail.id, note);
                  }}
                  className="px-4 py-2 bg-[#E63946] text-white rounded-lg hover:bg-[#C62F3B]"
                >
                  标记为已处理
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminRiskControl;
