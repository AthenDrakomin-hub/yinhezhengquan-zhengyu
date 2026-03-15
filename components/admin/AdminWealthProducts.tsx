/**
 * 管理后台 - 理财产品管理
 * 功能：理财产品CRUD、基金管理、定投配置
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { wealthProductService, WealthProduct, PRODUCT_TYPE_LABELS, RISK_LEVEL_LABELS } from '@/services/wealthProductService';

type TabType = 'products' | 'funds' | 'sip';

const AdminWealthProducts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 理财产品列表
  const [products, setProducts] = useState<WealthProduct[]>([]);
  
  // 筛选条件
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // 编辑弹窗
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WealthProduct | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'deposit' as const,
    issuer: '',
    expected_return: 0,
    return_type: 'fixed' as const,
    min_amount: 1000,
    increment: 1000,
    period_days: 90,
    period_type: 'day' as const,
    risk_level: 1 as const,
    quota: 10000000,
    status: 'active' as const,
    tag: '',
    description: '',
    features: [] as string[],
    is_featured: false,
    vip_only: false,
  });

  useEffect(() => {
    loadData();
  }, [filterType, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    const data = await wealthProductService.getWealthProducts({
      type: filterType !== 'all' ? filterType : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined
    });
    setProducts(data);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      name: '',
      type: 'deposit',
      issuer: '',
      expected_return: 0,
      return_type: 'fixed',
      min_amount: 1000,
      increment: 1000,
      period_days: 90,
      period_type: 'day',
      risk_level: 1,
      quota: 10000000,
      status: 'active',
      tag: '',
      description: '',
      features: [],
      is_featured: false,
      vip_only: false,
    });
    setShowEditModal(true);
  };

  const handleOpenEdit = (product: WealthProduct) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      type: product.type as any,
      issuer: product.issuer || '',
      expected_return: product.expected_return || 0,
      return_type: product.return_type as any,
      min_amount: product.min_amount,
      increment: product.increment,
      period_days: product.period_days || 0,
      period_type: product.period_type as any,
      risk_level: product.risk_level as any,
      quota: product.quota,
      status: product.status as any,
      tag: product.tag || '',
      description: product.description || '',
      features: product.features || [],
      is_featured: product.is_featured,
      vip_only: product.vip_only,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      alert('请填写产品代码和名称');
      return;
    }

    setSaving(true);
    
    if (editingProduct) {
      // 更新
      const result = await wealthProductService.updateWealthProduct(editingProduct.id, formData);
      if (result.success) {
        setShowEditModal(false);
        loadData();
      } else {
        alert(`更新失败: ${result.error}`);
      }
    } else {
      // 创建
      const result = await wealthProductService.createWealthProduct({
        ...formData,
        order: products.length + 1,
        max_quota: null,
        per_user_limit: null,
        start_date: null,
        end_date: null,
        min_vip_level: 0
      } as any);
      if (result.success) {
        setShowEditModal(false);
        loadData();
      } else {
        alert(`创建失败: ${result.error}`);
      }
    }
    
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此产品吗？')) return;
    const result = await wealthProductService.deleteWealthProduct(id);
    if (result.success) {
      loadData();
    } else {
      alert(`删除失败: ${result.error}`);
    }
  };

  const handleToggleStatus = async (id: string, status: string) => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    await wealthProductService.updateWealthProduct(id, { status: newStatus as any });
    loadData();
  };

  const tabs = [
    { id: 'products' as TabType, label: '理财产品', icon: '🏦' },
    { id: 'funds' as TabType, label: '基金产品', icon: '📊' },
    { id: 'sip' as TabType, label: '定投配置', icon: '📅' },
  ];

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">理财产品管理</h3>
          <p className="text-xs text-industrial-400 mt-1">管理理财产品、基金和定投配置</p>
        </div>
        <div className="flex gap-2">
          <button className="industrial-button-secondary" onClick={loadData}>
            {loading ? '⏳' : '🔄'} 刷新
          </button>
          <button className="industrial-button-primary" onClick={handleOpenCreate}>
            + 新增产品
          </button>
        </div>
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

      {/* 理财产品列表 */}
      {activeTab === 'products' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* 筛选 */}
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-xs border rounded"
            >
              <option value="all">全部类型</option>
              {Object.entries(PRODUCT_TYPE_LABELS).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs border rounded"
            >
              <option value="all">全部状态</option>
              <option value="active">在售</option>
              <option value="inactive">停售</option>
              <option value="sold_out">售罄</option>
            </select>
          </div>

          {/* 产品表格 */}
          <div className="industrial-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-industrial-50 border-b border-industrial-200">
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">产品代码</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">产品名称</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">类型</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">收益率</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">期限</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">风险等级</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase">状态</th>
                    <th className="px-4 py-3 text-xs font-black text-industrial-400 uppercase text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-xs text-industrial-400">加载中...</td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-xs text-industrial-400">暂无产品</td>
                    </tr>
                  ) : products.map((product) => (
                    <tr key={product.id} className="hover:bg-industrial-50">
                      <td className="px-4 py-3 text-xs font-mono text-industrial-700">{product.code}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-industrial-700">{product.name}</span>
                          {product.is_featured && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">热门</span>}
                          {product.vip_only && <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded">VIP</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: PRODUCT_TYPE_LABELS[product.type]?.color + '20', color: PRODUCT_TYPE_LABELS[product.type]?.color }}>
                          {PRODUCT_TYPE_LABELS[product.type]?.label || product.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-red-500">
                        {product.expected_return ? `${product.expected_return}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-industrial-600">
                        {product.period_days ? `${product.period_days}天` : '灵活'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded" style={{ color: RISK_LEVEL_LABELS[product.risk_level]?.color }}>
                          R{product.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleStatus(product.id, product.status)}
                          className={`text-xs px-2 py-1 rounded ${
                            product.status === 'active' ? 'bg-green-100 text-green-600' :
                            product.status === 'sold_out' ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-600'
                          }`}
                        >
                          {product.status === 'active' ? '在售' : product.status === 'sold_out' ? '售罄' : '停售'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="text-xs text-blue-500 hover:text-blue-700 mr-2"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
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

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h4 className="text-sm font-bold mb-4">
              {editingProduct ? '编辑产品' : '新增产品'}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-industrial-600 mb-1">产品代码 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded"
                  placeholder="如：YH001"
                />
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">产品名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded"
                  placeholder="如：银河季季盈1号"
                />
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">产品类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm border rounded"
                >
                  {Object.entries(PRODUCT_TYPE_LABELS).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">风险等级</label>
                <select
                  value={formData.risk_level}
                  onChange={(e) => setFormData({ ...formData, risk_level: parseInt(e.target.value) as any })}
                  className="w-full px-3 py-2 text-sm border rounded"
                >
                  {Object.entries(RISK_LEVEL_LABELS).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">预期收益率(%)</label>
                <input
                  type="number"
                  value={formData.expected_return}
                  onChange={(e) => setFormData({ ...formData, expected_return: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border rounded"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">产品期限(天)</label>
                <input
                  type="number"
                  value={formData.period_days}
                  onChange={(e) => setFormData({ ...formData, period_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">起购金额</label>
                <input
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-industrial-600 mb-1">递增金额</label>
                <input
                  type="number"
                  value={formData.increment}
                  onChange={(e) => setFormData({ ...formData, increment: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border rounded"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-industrial-600 mb-1">产品描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded"
                  rows={3}
                />
              </div>
              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  />
                  <span className="text-xs text-industrial-600">设为热门</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.vip_only}
                    onChange={(e) => setFormData({ ...formData, vip_only: e.target.checked })}
                  />
                  <span className="text-xs text-industrial-600">仅VIP可见</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="industrial-button-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="industrial-button-primary"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 基金产品和定投配置（简化展示） */}
      {activeTab === 'funds' && (
        <div className="industrial-card p-6 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h4 className="text-sm font-bold text-industrial-700">基金产品管理</h4>
          <p className="text-xs text-industrial-400 mt-2">基金数据从第三方同步，支持配置展示顺序和热门标签</p>
        </div>
      )}

      {activeTab === 'sip' && (
        <div className="industrial-card p-6 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h4 className="text-sm font-bold text-industrial-700">定投配置管理</h4>
          <p className="text-xs text-industrial-400 mt-2">配置定投频率、金额限制和费率优惠</p>
        </div>
      )}
    </div>
  );
};

export default AdminWealthProducts;
