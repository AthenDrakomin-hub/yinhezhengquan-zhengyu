import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';

// 规则元数据 - 中文说明
const RULE_METADATA: Record<string, { label: string; description: string; tip: string; unit?: string; min?: number; max?: number; step?: number }> = {
  // IPO 规则
  win_rate: { label: '中签率', description: '新股申购的中签概率', tip: '范围0.1%-100%，如0.005表示0.5%中签率', unit: '', min: 0.001, max: 1, step: 0.001 },
  min_apply_quantity: { label: '最小申购数量', description: '单次申购最低股数', tip: '通常不低于500股', unit: '股', min: 0 },
  max_apply_amount: { label: '最大申购金额', description: '单次申购最高金额', tip: '超过此金额需人工审核', unit: '元', min: 0 },
  allocation_per_account: { label: '每户配售上限', description: '每账户最多中签数量', tip: '控制单一账户中签额度', unit: '股', min: 0 },
  lock_period_days: { label: '锁定期', description: '新股上市后锁定期', tip: '防止短期投机', unit: '天', min: 0 },
  
  // 大宗交易规则
  min_quantity: { label: '最小成交数量', description: '大宗交易最低股数', tip: 'A股通常不低于100万股', unit: '股', min: 0 },
  match_window: { label: '撮合窗口期', description: '撮合时间窗口', tip: '如30s、1m、5m', unit: '', min: 0 },
  need_admin_confirm: { label: '需管理员确认', description: '是否需要人工确认', tip: '高风险交易建议开启', unit: '' },
  discount_rate: { label: '折价率', description: '相对市价的折扣', tip: '0.95表示95折', unit: '', min: 0, max: 1, step: 0.01 },
  commission_fee_rate: { label: '佣金费率', description: '交易佣金比例', tip: '0.0003表示万分之三', unit: '', min: 0, max: 0.01, step: 0.0001 },
  
  // 涨停打板规则
  order_priority: { label: '订单优先级', description: '打板订单优先级', tip: 'high/medium/low', unit: '' },
  trigger_threshold: { label: '触发阈值', description: '涨停触发涨幅', tip: '0.095表示涨幅9.5%时触发', unit: '', min: 0, max: 1, step: 0.001 },
  max_single_order: { label: '单笔最大限额', description: '单笔打板最大金额', tip: '控制单一订单风险', unit: '元', min: 0 },
  frequency_limit_per_minute: { label: '分钟频率限制', description: '每分钟最多下单次数', tip: '防止高频交易风险', unit: '次', min: 0 },
  daily_order_limit: { label: '日订单限制', description: '每日打板订单上限', tip: '控制日内风险', unit: '次', min: 0 },
  
  // 通用交易规则
  fee_rate: { label: '交易费率', description: '额外手续费', tip: '0.001表示千分之一', unit: '', min: 0, max: 0.1, step: 0.0001 },
  risk_level_threshold: { label: '风险等级阈值', description: '风控触发阈值', tip: '不同客户等级对应限制', unit: '', min: 0, max: 5 },
  daily_loss_limit: { label: '日亏损限制', description: '单日最大亏损', tip: '达到限制暂停交易', unit: '元', min: 0 },
  margin_call_threshold: { label: '追保线', description: '追保资产比例', tip: '0.8表示资产跌至80%时追保', unit: '', min: 0, max: 1, step: 0.01 },
};

// 规则类型说明
const RULE_TYPE_INFO: Record<string, { label: string; desc: string; color: string }> = {
  'IPO': { label: '新股申购', desc: '控制新股申购的中签率、配售数量等', color: '#3b82f6' },
  'BLOCK_TRADE': { label: '大宗交易', desc: '大宗交易的撮合规则和费用设置', color: '#a855f7' },
  'LIMIT_UP': { label: '涨停打板', desc: '涨停板买入的风险控制规则', color: '#f97316' },
  'GENERAL': { label: '通用交易', desc: '普通买卖交易的通用规则', color: '#22c55e' }
};

const AdminRuleManagement: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('trade_rules').select('*').order('rule_type');
      if (error) {
        console.warn('获取规则失败:', error.message);
        setRules([]);
      } else {
        setRules(data || []);
      }
    } catch (err) {
      console.warn('获取规则异常:', err);
      setRules([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    if (!editingRule) return;

    if (!window.confirm('确定要修改交易规则吗？修改将实时生效。')) return;

    setSaving(true);
    try {
      // 直接更新数据库
      const { error } = await supabase
        .from('trade_rules')
        .update({
          config: editingRule.config,
          status: editingRule.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingRule.id);

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

  // 格式化规则值显示
  const formatValue = (key: string, value: any): string => {
    const meta = RULE_METADATA[key];
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (meta?.unit && typeof value === 'number') {
      return `${value.toLocaleString()} ${meta.unit}`;
    }
    return String(value);
  };

  const getRuleTypeInfo = (ruleType: string) => {
    return RULE_TYPE_INFO[ruleType] || { label: ruleType, desc: '', color: 'var(--color-text-muted)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px' }}>交易规则管控</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>配置股票、IPO、大宗交易及涨停打板的核心参数</p>
        </div>
        <button
          onClick={fetchRules}
          style={{
            padding: '8px 16px',
            background: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {loading ? '⏳' : '🔄'} 刷新规则
        </button>
      </div>

      {/* 规则类型说明 */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid var(--color-border)'
      }}>
        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '12px' }}>📋 规则类型说明</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {Object.entries(RULE_TYPE_INFO).map(([key, info]) => (
            <div key={key} style={{
              background: 'var(--color-surface-active)',
              borderRadius: '8px',
              padding: '12px',
              borderLeft: `3px solid ${info.color}`
            }}>
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: info.color, marginBottom: '4px' }}>{info.label}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{info.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 规则列表 */}
      {loading ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid var(--color-border)'
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>加载中...</p>
        </div>
      ) : rules.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid var(--color-border)'
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>暂无规则配置</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '16px' }}>
          {rules.map((rule) => {
            const typeInfo = getRuleTypeInfo(rule.rule_type);
            const isExpanded = expandedRule === rule.id;
            const configEntries = Object.entries(rule.config || {}).slice(0, isExpanded ? undefined : 3);
            
            return (
              <motion.div
                key={rule.id}
                layoutId={rule.id}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  overflow: 'hidden'
                }}
              >
                {/* 规则头部 */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: typeInfo.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ICONS.Shield size={20} style={{ color: typeInfo.color }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{typeInfo.label}</h4>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: rule.status ? '#22c55e20' : '#ef444420',
                        color: rule.status ? '#22c55e' : '#ef4444'
                      }}>
                        {rule.status ? '生效中' : '已禁用'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingRule(JSON.parse(JSON.stringify(rule)))}
                    style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#3b82f6',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    编辑
                  </button>
                </div>

                {/* 规则内容 */}
                <div style={{ padding: '16px' }}>
                  {configEntries.map(([key, value]: [string, any]) => {
                    const meta = RULE_METADATA[key];
                    return (
                      <div key={key} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--color-border)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                            {meta?.label || key}
                          </p>
                          {meta?.description && (
                            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{meta.description}</p>
                          )}
                        </div>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: typeInfo.color,
                          fontFamily: 'monospace',
                          marginLeft: '12px'
                        }}>
                          {formatValue(key, value)}
                        </span>
                      </div>
                    );
                  })}

                  {/* 展开/收起按钮 */}
                  {Object.keys(rule.config || {}).length > 3 && (
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '12px',
                        background: 'var(--color-surface-active)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'var(--color-text-muted)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {isExpanded ? '收起 ▲' : `展开全部 (${Object.keys(rule.config).length}项) ▼`}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 编辑规则弹窗 */}
      {editingRule && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                编辑规则 - {getRuleTypeInfo(editingRule.rule_type).label}
              </h3>
              <button onClick={() => setEditingRule(null)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* 状态切换 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingRule.status}
                    onChange={(e) => setEditingRule({ ...editingRule, status: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>规则生效</span>
                </label>
              </div>

              {/* 规则配置 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(editingRule.config || {}).map(([key, value]: [string, any]) => {
                  const meta = RULE_METADATA[key];
                  const isBoolean = typeof value === 'boolean';
                  
                  return (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                        {meta?.label || key}
                      </label>
                      {meta?.description && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>{meta.description}</p>
                      )}
                      {meta?.tip && (
                        <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>💡 {meta.tip}</p>
                      )}
                      
                      {isBoolean ? (
                        <select
                          value={value ? 'true' : 'false'}
                          onChange={(e) => setEditingRule({
                            ...editingRule,
                            config: { ...editingRule.config, [key]: e.target.value === 'true' }
                          })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'var(--color-surface-active)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            color: 'var(--color-text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        >
                          <option value="true">是</option>
                          <option value="false">否</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setEditingRule({
                            ...editingRule,
                            config: { ...editingRule.config, [key]: parseFloat(e.target.value) || 0 }
                          })}
                          min={meta?.min}
                          max={meta?.max}
                          step={meta?.step || 1}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'var(--color-surface-active)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            color: 'var(--color-text-primary)',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  onClick={() => setEditingRule(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--color-border)',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#ef4444',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? '保存中...' : '保存规则'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminRuleManagement;
