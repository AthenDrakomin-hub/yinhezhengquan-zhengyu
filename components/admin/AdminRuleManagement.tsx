import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { supabase } from '@/lib/supabase';

const RULE_METADATA: Record<string, { label: string; description: string; tip: string; min?: number; max?: number; step?: number }> = {
  // IPO 规则
  win_rate: { label: '中签率', description: '新股申购的中签概率 (0-1)', tip: '0.005 表示 0.5% 的中签概率', min: 0, max: 1, step: 0.001 },
  min_apply_quantity: { label: '最小申购数量', description: '单次申购的最低股数限制', tip: '通常不低于 500 股', min: 0 },
  max_apply_amount: { label: '最大申购金额', description: '单次申购的最高金额限制', tip: '超过此金额将触发人工审核', min: 0 },
  allocation_per_account: { label: '每户配售上限', description: '每个账户最多可中签的数量', tip: '控制单一账户的中签额度', min: 0 },
  lock_period_days: { label: '锁定期(天)', description: '新股上市后的锁定期限制', tip: '防止短期投机行为', min: 0 },
  
  // 大宗交易规则
  min_quantity: { label: '最小成交数量', description: '大宗交易的最低股数要求', tip: '通常 A 股大宗交易要求不低于 100 万股', min: 0 },
  match_window: { label: '撮合窗口期', description: '大宗交易的撮合时间窗口', tip: '例如 "30s", "1m", "5m"', min: 0 },
  need_admin_confirm: { label: '需管理员确认', description: '是否需要管理员人工确认交易', tip: '高风险交易建议开启', min: 0 },
  discount_rate: { label: '折价率', description: '大宗交易相对于市价的折扣 (0-1)', tip: '0.95 表示 95 折成交', min: 0, max: 1, step: 0.01 },
  commission_fee_rate: { label: '佣金费率', description: '大宗交易收取的佣金费率', tip: '0.0003 表示万分之三', min: 0, max: 0.01, step: 0.0001 },
  
  // 涨停打板规则
  order_priority: { label: '订单优先级', description: '打板订单的优先级设定', tip: 'high 表示高优先级', min: 0 },
  trigger_threshold: { label: '触发阈值', description: '涨停板触发的价格阈值 (0-1)', tip: '0.095 表示 9.5% 涨幅时触发', min: 0, max: 1, step: 0.001 },
  max_single_order: { label: '单笔最大限额', description: '单笔打板订单的最大金额限制', tip: '控制单一订单风险', min: 0 },
  frequency_limit_per_minute: { label: '分钟频率限制', description: '每分钟最多下单次数', tip: '防止高频交易风险', min: 0 },
  daily_order_limit: { label: '日订单限制', description: '每日打板订单总数限制', tip: '控制日内交易风险', min: 0 },
  
  // 通用交易规则
  fee_rate: { label: '交易费率', description: '该交易类型收取的额外手续费', tip: '0.001 表示千分之一', min: 0, max: 0.1, step: 0.0001 },
  risk_level_threshold: { label: '风险等级阈值', description: '触发风险控制的阈值', tip: '不同客户风险等级对应不同限制', min: 0, max: 5 },
  daily_loss_limit: { label: '日亏损限制', description: '单日最大亏损金额限制', tip: '达到此限制将暂停交易', min: 0 },
  margin_call_threshold: { label: '追保线', description: '触发追加保证金的资产比例', tip: '0.8 表示总资产跌至80%时追保', min: 0, max: 1, step: 0.01 },
};

const AdminRuleManagement: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('trade_rules').select('*').order('rule_type');
    if (!error) setRules(data || []);
    
    // Fetch logs
    const { data: logData } = await supabase
      .from('admin_operation_logs')
      .select('*')
      .ilike('operate_type', '%RULE%')  // Updated to match new column name
      .order('created_at', { ascending: false })
      .limit(10);
    if (logData) setLogs(logData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    if (!editingRule) return;
    
    // Basic validation
    for (const [key, value] of Object.entries(editingRule.config)) {
      const meta = RULE_METADATA[key];
      if (meta) {
        // Handle boolean values
        if (typeof value === 'boolean') continue;
        
        const num = Number(value);
        if (meta.min !== undefined && num < meta.min) return alert(`${meta.label}不能低于${meta.min}`);
        if (meta.max !== undefined && num > meta.max) return alert(`${meta.label}不能超过${meta.max}`);
      }
    }

    if (!window.confirm('确定要修改交易规则吗？修改将实时生效。')) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('admin-operations', {
        body: { 
          operation: 'update_rules',
          rule_type: editingRule.rule_type,
          config: editingRule.config,
          status: editingRule.status
        }
      });

      if (error) {
        alert('保存失败: ' + error.message);
      } else {
        alert('规则更新成功');
        setEditingRule(null);
        fetchRules();
      }
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
    setSaving(false);
  };

  // Translate rule type to Chinese
  const getRuleTypeLabel = (ruleType: string) => {
    const labels: Record<string, string> = {
      'IPO': '新股申购',
      'BLOCK_TRADE': '大宗交易',
      'LIMIT_UP': '涨停打板',
      'GENERAL': '通用交易'
    };
    return labels[ruleType] || ruleType;
  };

  return (
    <div className="space-y-8">
      <div className="industrial-card p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">交易规则管控</h3>
            <p className="text-xs text-industrial-400 font-bold mt-1">配置股票、IPO、大宗交易及涨停打板的核心参数</p>
          </div>
          <button className="industrial-button-primary" onClick={fetchRules}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新规则
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              layoutId={rule.id}
              className="p-6 bg-industrial-50 rounded-xl border border-industrial-100 hover:border-industrial-300 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-industrial-900 text-white rounded-lg group-hover:bg-accent-red transition-colors">
                    <ICONS.Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-industrial-800 uppercase">{getRuleTypeLabel(rule.rule_type)}</h4>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${rule.status ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {rule.status ? '生效中' : '已禁用'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingRule(JSON.parse(JSON.stringify(rule)))}
                  className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                >
                  编辑规则
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(rule.config).map(([key, value]: [string, any]) => {
                  const meta = RULE_METADATA[key];
                  return (
                    <div key={key} className="flex justify-between items-center border-b border-industrial-100 pb-2 last:border-0">
                      <div>
                        <span className="text-[10px] font-bold text-industrial-400 uppercase block">{meta?.label || key}</span>
                        <span className="text-[9px] text-industrial-300 font-medium">{meta?.description || '暂无说明'}</span>
                      </div>
                      <span className="text-xs font-black text-industrial-800 font-mono">
                        {typeof value === 'boolean' ? (value ? '是' : '否') : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rule Operation Logs */}
      <div className="industrial-card p-8">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest mb-6">规则操作日志</h3>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-xs text-industrial-400 font-bold text-center py-8">暂无修改记录</p>
          ) : logs.map((log) => (
            <div key={log.id} className="p-4 bg-industrial-50 rounded-lg border border-industrial-100 flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-industrial-800 uppercase">规则更新</span>
                  <span className="text-[9px] text-industrial-400 font-bold">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs font-bold text-industrial-600">{JSON.stringify(log.operate_content)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-industrial-400 uppercase">操作人</p>
                <p className="text-xs font-black text-industrial-800">{log.admin_id?.substring(0, 8) || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-industrial-900/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑 {getRuleTypeLabel(editingRule.rule_type)} 规则</h3>
              <button onClick={() => setEditingRule(null)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(editingRule.config).map(([key, value]: [string, any]) => {
                const meta = RULE_METADATA[key];
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <label className="block text-[10px] font-black text-industrial-400 uppercase">{meta?.label || key}</label>
                      <span className="text-[9px] font-bold text-accent-red uppercase">{meta?.tip}</span>
                    </div>
                    <div className="relative group">
                      {typeof value === 'boolean' ? (
                        <div className="flex items-center gap-3 p-4 bg-industrial-50 rounded-lg border border-industrial-100">
                          <input 
                            type="checkbox" 
                            id={key}
                            checked={value}
                            onChange={(e) => {
                              const newConfig = { ...editingRule.config };
                              newConfig[key] = e.target.checked;
                              setEditingRule({ ...editingRule, config: newConfig });
                            }}
                            className="w-4 h-4 accent-industrial-900 rounded cursor-pointer"
                          />
                          <label htmlFor={key} className="text-xs font-black text-industrial-800 uppercase cursor-pointer select-none">
                            启用此设置
                          </label>
                        </div>
                      ) : (
                        <>
                          <input 
                            type={typeof value === 'number' ? 'number' : 'text'}
                            step={meta?.step || 'any'}
                            min={meta?.min}
                            max={meta?.max}
                            value={String(value)}
                            onChange={(e) => {
                              const newConfig = { ...editingRule.config };
                              newConfig[key] = typeof value === 'number' ? Number(e.target.value) : e.target.value;
                              setEditingRule({ ...editingRule, config: newConfig });
                            }}
                            className="industrial-input font-mono focus:ring-2 focus:ring-accent-red/20 transition-all"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                            <ICONS.Zap size={12} className="text-accent-red" />
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-[9px] text-industrial-400 font-medium">{meta?.description}</p>
                  </div>
                );
              })}

              <div className="flex items-center gap-3 p-4 bg-industrial-50 rounded-lg border border-industrial-100">
                <input 
                  type="checkbox" 
                  id="rule-status"
                  checked={editingRule.status}
                  onChange={(e) => setEditingRule({ ...editingRule, status: e.target.checked })}
                  className="w-4 h-4 accent-industrial-900 rounded cursor-pointer"
                />
                <label htmlFor="rule-status" className="text-xs font-black text-industrial-800 uppercase cursor-pointer select-none">
                  启用该规则 (实时生效)
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-8 border-t border-industrial-100 mt-6">
              <button 
                onClick={() => setEditingRule(null)}
                className="flex-1 py-3 rounded-lg border border-industrial-200 text-industrial-400 text-[10px] font-black uppercase tracking-widest hover:bg-industrial-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 industrial-button-primary relative overflow-hidden group"
              >
                <span className={saving ? 'opacity-0' : 'opacity-100'}>保存修改</span>
                {saving && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminRuleManagement;