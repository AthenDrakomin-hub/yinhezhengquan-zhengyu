/**
 * 管理端功能开关控制页面
 */
import React, { useState, useEffect } from 'react';
import { ICONS } from '../../lib/constants';
import {
  getAllFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  type FeatureFlag,
} from '../../services/featureFlagService';

// 功能模块定义
const featureModules = [
  { key: 'market', name: '行情中心', description: '实时行情、股票查询、市场监控', category: 'MARKET' as const },
  { key: 'trade', name: '交易下单', description: '买入卖出、撤单、条件单', category: 'TRADING' as const },
  { key: 'ipo', name: '新股申购', description: 'IPO申购、批量申购、中签查询', category: 'TRADING' as const },
  { key: 'block_trade', name: '大宗交易', description: '大宗交易、盘后交易', category: 'TRADING' as const },
  { key: 'analysis', name: '资产分析', description: '持仓分析、收益统计、风险评估', category: 'GENERAL' as const },
  { key: 'reports', name: '研报中心', description: '证裕研报、市场分析、策略研究', category: 'CONTENT' as const },
  { key: 'calendar', name: '投资日历', description: '重要事件、交易日历、节假日提醒', category: 'CONTENT' as const },
  { key: 'education', name: '投教中心', description: '投资者教育、知识库、视频课程', category: 'CONTENT' as const },
  { key: 'compliance', name: '合规中心', description: '合规查询、风控提示、交易限制', category: 'ADMIN' as const },
  { key: 'support', name: '服务支持', description: '在线客服、工单系统、帮助中心', category: 'GENERAL' as const },
];

const AdminFeatureFlags: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 获取功能开关列表
  const fetchFlags = async () => {
    setLoading(true);
    try {
      const data = await getAllFeatureFlags();
      setFlags(data);
    } catch (err) {
      console.error('获取功能开关失败:', err);
      setFlags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  // 切换功能开关
  const handleToggle = async (flag: FeatureFlag) => {
    setSaving(flag.id);
    try {
      await updateFeatureFlag(flag.id, { is_enabled: !flag.is_enabled });
      await fetchFlags();
    } catch (err) {
      console.error('切换功能开关失败:', err);
      alert('操作失败，请重试');
    } finally {
      setSaving(null);
    }
  };

  // 更新功能开关配置
  const handleUpdate = async (flag: FeatureFlag, updates: Partial<{
    is_enabled: boolean;
    config: Record<string, any>;
    description: string;
  }>) => {
    setSaving(flag.id);
    try {
      await updateFeatureFlag(flag.id, updates);
      await fetchFlags();
    } catch (err) {
      console.error('更新功能开关失败:', err);
      alert('操作失败，请重试');
    } finally {
      setSaving(null);
    }
  };

  // 初始化功能开关（如果不存在则创建）
  const initFlags = async () => {
    setSaving('init');
    try {
      for (const module of featureModules) {
        const exists = flags.find(f => f.feature_key === module.key);
        if (!exists) {
          await createFeatureFlag({
            feature_key: module.key,
            feature_name: module.name,
            description: module.description,
            is_enabled: true,
            category: module.category,
          });
        }
      }
      await fetchFlags();
    } catch (err) {
      console.error('初始化功能开关失败:', err);
      alert('初始化失败，请重试');
    } finally {
      setSaving(null);
    }
  };

  // 获取模块状态
  const getModuleStatus = (key: string) => {
    return flags.find(f => f.feature_key === key);
  };

  // 过滤模块
  const filteredModules = featureModules.filter(
    m => m.name.includes(searchTerm) || m.description.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-slide-up">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-[var(--color-text-primary)] uppercase tracking-widest">
            功能开关控制
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            管理客户端功能模块的开启与关闭
          </p>
        </div>
        <button
          onClick={initFlags}
          disabled={saving === 'init'}
          className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm font-bold hover:bg-[var(--color-surface-hover)] transition-all disabled:opacity-50"
        >
          {saving === 'init' ? '初始化中...' : '初始化模块'}
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <ICONS.Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <input
          type="text"
          placeholder="搜索功能模块..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:border-[#00D4AA]"
        />
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-[var(--color-text-primary)]">{flags.length}</p>
          <p className="text-xs text-[var(--color-text-muted)]">总功能数</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-[#00D4AA]">{flags.filter(f => f.is_enabled).length}</p>
          <p className="text-xs text-[var(--color-text-muted)]">已开启</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-[#FF6B6B]">{flags.filter(f => !f.is_enabled).length}</p>
          <p className="text-xs text-[var(--color-text-muted)]">已关闭</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-black text-blue-500">{flags.filter(f => f.category === 'TRADING').length}</p>
          <p className="text-xs text-[var(--color-text-muted)]">交易类</p>
        </div>
      </div>

      {/* 功能模块列表 */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-text-muted)]">加载中...</div>
      ) : (
        <div className="space-y-4">
          {filteredModules.map((module) => {
            const flag = getModuleStatus(module.key);
            const isLoading = saving === flag?.id;

            return (
              <div
                key={module.key}
                className={`glass-card p-5 border transition-all ${
                  flag?.is_enabled ? 'border-[#00D4AA]/30' : 'border-[var(--color-border)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        flag?.is_enabled
                          ? 'bg-[#00D4AA]/10 text-[#00D4AA]'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      <ICONS.Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[var(--color-text-primary)]">
                        {module.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)]">{module.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {flag && (
                      <>
                        {/* 分类标签 */}
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                          flag.category === 'TRADING' ? 'bg-blue-500/10 text-blue-500' :
                          flag.category === 'MARKET' ? 'bg-green-500/10 text-green-500' :
                          flag.category === 'CONTENT' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {flag.category}
                        </span>

                        {/* 主开关 */}
                        <button
                          onClick={() => handleToggle(flag)}
                          disabled={isLoading}
                          className={`relative w-14 h-7 rounded-full transition-all ${
                            flag.is_enabled ? 'bg-[#00D4AA]' : 'bg-[var(--color-surface)]'
                          } ${isLoading ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                              flag.is_enabled ? 'left-8' : 'left-1'
                            }`}
                          />
                        </button>
                      </>
                    )}

                    {!flag && (
                      <button
                        onClick={initFlags}
                        className="px-3 py-1 text-xs font-bold text-[#00D4AA] border border-[#00D4AA]/30 rounded-lg hover:bg-[#00D4AA]/10 transition-all"
                      >
                        初始化
                      </button>
                    )}
                  </div>
                </div>

                {/* 扩展信息 */}
                {flag && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center gap-6 text-xs text-[var(--color-text-muted)]">
                    <span>标识: {flag.feature_key}</span>
                    <span>
                      更新时间:{' '}
                      {flag.updated_at
                        ? new Date(flag.updated_at).toLocaleString('zh-CN')
                        : '-'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminFeatureFlags;
