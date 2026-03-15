/**
 * 管理后台 - 功能入口配置
 * 功能：管理首页功能入口的顺序、显示/隐藏
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import { featureConfigService, FeatureEntry, DEFAULT_FEATURE_ENTRIES } from '@/services/featureConfigService';

const AdminFeatureConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mainFeatures, setMainFeatures] = useState<FeatureEntry[]>([]);
  const [moreFeatures, setMoreFeatures] = useState<FeatureEntry[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    setLoading(true);
    const features = await featureConfigService.getFeatureEntries();
    setMainFeatures(features.filter(f => f.group === 'main').sort((a, b) => a.order - b.order));
    setMoreFeatures(features.filter(f => f.group === 'more').sort((a, b) => a.order - b.order));
    setHasChanges(false);
    setLoading(false);
  };

  const handleReorder = useCallback((group: 'main' | 'more', newOrder: FeatureEntry[]) => {
    if (group === 'main') {
      setMainFeatures(newOrder.map((f, i) => ({ ...f, order: i + 1 })));
    } else {
      setMoreFeatures(newOrder.map((f, i) => ({ ...f, order: i + 101 })));
    }
    setHasChanges(true);
  }, []);

  const handleToggleVisibility = useCallback((id: string, group: 'main' | 'more') => {
    if (group === 'main') {
      setMainFeatures(prev => prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f));
    } else {
      setMoreFeatures(prev => prev.map(f => f.id === id ? { ...f, visible: !f.visible } : f));
    }
    setHasChanges(true);
  }, []);

  const handleUpdateBadge = useCallback((id: string, badge: string, group: 'main' | 'more') => {
    if (group === 'main') {
      setMainFeatures(prev => prev.map(f => f.id === id ? { ...f, badge } : f));
    } else {
      setMoreFeatures(prev => prev.map(f => f.id === id ? { ...f, badge } : f));
    }
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const allFeatures = [...mainFeatures, ...moreFeatures];
    
    // 批量更新
    for (const feature of allFeatures) {
      await featureConfigService.updateFeatureEntry(feature.id, {
        order: feature.order,
        visible: feature.visible,
        badge: feature.badge
      });
    }
    
    setSaving(false);
    setHasChanges(false);
    alert('配置保存成功');
  };

  const handleReset = async () => {
    if (!window.confirm('确定要重置为默认配置吗？')) return;
    const result = await featureConfigService.resetToDefault();
    if (result.success) {
      loadFeatures();
      alert('已重置为默认配置');
    } else {
      alert(`重置失败: ${result.error}`);
    }
  };

  // 简单的拖拽列表组件
  const DraggableList: React.FC<{
    items: FeatureEntry[];
    group: 'main' | 'more';
    onReorder: (items: FeatureEntry[]) => void;
  }> = ({ items, group, onReorder }) => {
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
      setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      
      const newItems = [...items];
      const [removed] = newItems.splice(dragIndex, 1);
      newItems.splice(index, 0, removed);
      onReorder(newItems);
      setDragIndex(index);
    };

    const handleDragEnd = () => {
      setDragIndex(null);
    };

    return (
      <div className="space-y-2">
        {items.map((feature, index) => (
          <div
            key={feature.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-4 p-4 bg-white border rounded-lg cursor-move transition-all ${
              dragIndex === index ? 'shadow-lg border-industrial-400' : 'border-industrial-200 hover:border-industrial-300'
            }`}
          >
            {/* 拖拽手柄 */}
            <div className="text-industrial-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>

            {/* 图标 */}
            <div className={`w-10 h-10 rounded-lg ${feature.bgColor} flex items-center justify-center text-white text-lg`}>
              {feature.icon}
            </div>

            {/* 名称和路径 */}
            <div className="flex-1">
              <p className="text-sm font-bold text-industrial-700">{feature.label}</p>
              <p className="text-xs text-industrial-400">{feature.path}</p>
            </div>

            {/* 角标配置 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-industrial-400">角标:</span>
              <input
                type="text"
                value={feature.badge || ''}
                onChange={(e) => handleUpdateBadge(feature.id, e.target.value, group)}
                placeholder="无"
                className="w-16 px-2 py-1 text-xs border rounded"
              />
            </div>

            {/* 排序号 */}
            <div className="w-8 text-center text-xs font-bold text-industrial-400">
              #{index + 1}
            </div>

            {/* 显示开关 */}
            <button
              onClick={() => handleToggleVisibility(feature.id, group)}
              className={`w-12 h-6 rounded-full transition-all ${
                feature.visible ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                feature.visible ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">功能入口配置</h3>
          <p className="text-xs text-industrial-400 mt-1">拖拽调整顺序，开关控制显示/隐藏</p>
        </div>
        <div className="flex gap-2">
          <button className="industrial-button-secondary" onClick={loadFeatures}>
            {loading ? '⏳' : '🔄'} 刷新
          </button>
          <button className="industrial-button-secondary" onClick={handleReset}>
            重置默认
          </button>
          <button
            className="industrial-button-primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-yellow-600">⚠️</span>
          <span className="text-xs text-yellow-700">有未保存的更改</span>
        </div>
      )}

      {/* 主功能区 */}
      <div className="industrial-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-industrial-700">
            主功能区 <span className="text-industrial-400 font-normal">(首页直接显示)</span>
          </h4>
          <span className="text-xs text-industrial-400">共 {mainFeatures.length} 个入口</span>
        </div>
        <DraggableList
          items={mainFeatures}
          group="main"
          onReorder={(items) => handleReorder('main', items)}
        />
      </div>

      {/* 更多功能区 */}
      <div className="industrial-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-industrial-700">
            更多功能区 <span className="text-industrial-400 font-normal">(点击"全部"后显示)</span>
          </h4>
          <span className="text-xs text-industrial-400">共 {moreFeatures.length} 个入口</span>
        </div>
        <DraggableList
          items={moreFeatures}
          group="more"
          onReorder={(items) => handleReorder('more', items)}
        />
      </div>

      {/* 预览区域 */}
      <div className="industrial-card p-4">
        <h4 className="text-sm font-bold text-industrial-700 mb-4">预览效果</h4>
        <div className="bg-[#F5F5F5] rounded-xl p-4">
          <div className="grid grid-cols-5 gap-4">
            {mainFeatures.filter(f => f.visible).slice(0, 10).map((feature) => (
              <div key={feature.id} className="flex flex-col items-center gap-1.5">
                <div className={`relative w-11 h-11 rounded-xl ${feature.bgColor} flex items-center justify-center text-white text-lg shadow-sm`}>
                  {feature.icon}
                  {feature.badge && (
                    <span className="absolute -top-1 -right-1 bg-[#E63946] text-white text-[8px] px-1 rounded font-bold">
                      {feature.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#333333] font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFeatureConfig;
