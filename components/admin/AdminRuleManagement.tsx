import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { supabase } from '@/lib/supabase';

const AdminRuleManagement: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('trade_rules').select('*').order('rule_type');
    if (!error) setRules(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    if (!editingRule) return;
    if (!window.confirm('确定要修改交易规则吗？修改将实时生效。')) return;

    setSaving(true);
    const { error } = await supabase.functions.invoke('admin-update-trade-rules', {
      body: {
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
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <div className="industrial-card p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">交易规则管控</h3>
            <p className="text-xs text-industrial-400 font-bold mt-1">配置 IPO、大宗交易、衍生品及打板的核心参数</p>
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
              className="p-6 bg-industrial-50 rounded-xl border border-industrial-100 hover:border-industrial-300 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-industrial-900 text-white rounded-lg">
                    <ICONS.Shield size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-industrial-800 uppercase">{rule.rule_type}</h4>
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

              <div className="space-y-2">
                {Object.entries(rule.config).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-industrial-400 uppercase">{key}</span>
                    <span className="text-xs font-black text-industrial-800">{String(value)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-industrial-900/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8"
          >
            <h3 className="text-lg font-black text-industrial-800 uppercase mb-6">编辑 {editingRule.rule_type} 规则</h3>
            
            <div className="space-y-6">
              {Object.entries(editingRule.config).map(([key, value]: [string, any]) => (
                <div key={key}>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">{key}</label>
                  <input 
                    type={typeof value === 'number' ? 'number' : 'text'}
                    value={String(value)}
                    onChange={(e) => {
                      const newConfig = { ...editingRule.config };
                      newConfig[key] = typeof value === 'number' ? Number(e.target.value) : e.target.value;
                      setEditingRule({ ...editingRule, config: newConfig });
                    }}
                    className="industrial-input"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={editingRule.status}
                  onChange={(e) => setEditingRule({ ...editingRule, status: e.target.checked })}
                  className="w-4 h-4 accent-industrial-900"
                />
                <span className="text-xs font-black text-industrial-800 uppercase">启用该规则</span>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingRule(null)}
                  className="flex-1 py-3 rounded-lg border border-industrial-200 text-industrial-400 text-[10px] font-black uppercase tracking-widest hover:bg-industrial-50"
                >
                  取消
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 industrial-button-primary"
                >
                  {saving ? '保存中...' : '保存修改'}
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
