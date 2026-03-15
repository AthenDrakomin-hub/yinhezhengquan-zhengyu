/**
 * 理财持仓页面
 * 查看持有的理财产品情况
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface WealthProduct {
  id: string;
  code: string;
  name: string;
  type: string;
  holdingAmount: number;
  availableAmount: number;
  expectedReturn: number;
  cumulativeReturn: number;
  purchaseDate: string;
  maturityDate: string;
  status: 'holding' | 'matured' | 'redeeming';
}

const WealthHoldingsView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [products, setProducts] = useState<WealthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'holding' | 'matured'>('all');
  
  // 选中产品赎回
  const [selectedProduct, setSelectedProduct] = useState<WealthProduct | null>(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 加载理财持仓
  useEffect(() => {
    loadHoldings();
  }, [user]);

  const loadHoldings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('wealth_holdings')
        .select('*')
        .eq('user_id', user.id);

      // 如果表不存在，使用模拟数据
      if (error && error.code === 'PGRST205') {
        console.log('wealth_holdings 表不存在，使用模拟数据');
        setProducts([
          {
            id: '1',
            code: 'YH001',
            name: '银河稳健理财1号',
            type: '稳健型',
            holdingAmount: 100000,
            availableAmount: 100000,
            expectedReturn: 3.8,
            cumulativeReturn: 1520.50,
            purchaseDate: '2025-01-10',
            maturityDate: '2025-07-10',
            status: 'holding'
          },
          {
            id: '2',
            code: 'YH002',
            name: '银河季度盈',
            type: '固收型',
            holdingAmount: 50000,
            availableAmount: 50000,
            expectedReturn: 3.2,
            cumulativeReturn: 400.00,
            purchaseDate: '2025-02-15',
            maturityDate: '2025-05-15',
            status: 'matured'
          },
          {
            id: '3',
            code: 'YH003',
            name: '银河进取理财',
            type: '进取型',
            holdingAmount: 200000,
            availableAmount: 200000,
            expectedReturn: 5.5,
            cumulativeReturn: 2850.00,
            purchaseDate: '2025-03-01',
            maturityDate: '2026-03-01',
            status: 'holding'
          }
        ]);
        setLoading(false);
        return;
      }

      if (error) throw error;

      const productList = (data || []).map((p: any) => ({
        id: p.id,
        code: p.product_code,
        name: p.product_name,
        type: p.product_type || '稳健型',
        holdingAmount: Number(p.holding_amount) || 0,
        availableAmount: Number(p.available_amount) || 0,
        expectedReturn: Number(p.expected_return) || 0,
        cumulativeReturn: Number(p.cumulative_return) || 0,
        purchaseDate: p.purchase_date || p.created_at,
        maturityDate: p.maturity_date,
        status: p.status || 'holding'
      }));

      // 如果没有数据，使用模拟数据
      if (productList.length === 0) {
        const today = new Date();
        setProducts([
          {
            id: '1',
            code: 'YH001',
            name: '银河稳健理财1号',
            type: '稳健型',
            holdingAmount: 100000,
            availableAmount: 100000,
            expectedReturn: 3.8,
            cumulativeReturn: 1520.50,
            purchaseDate: '2025-01-10',
            maturityDate: '2025-07-10',
            status: 'holding'
          },
          {
            id: '2',
            code: 'YH002',
            name: '银河季度盈',
            type: '固收型',
            holdingAmount: 50000,
            availableAmount: 50000,
            expectedReturn: 3.2,
            cumulativeReturn: 400.00,
            purchaseDate: '2025-02-15',
            maturityDate: '2025-05-15',
            status: 'matured'
          },
          {
            id: '3',
            code: 'YH003',
            name: '银河进取理财',
            type: '进取型',
            holdingAmount: 200000,
            availableAmount: 200000,
            expectedReturn: 5.5,
            cumulativeReturn: 2850.00,
            purchaseDate: '2025-03-01',
            maturityDate: '2026-03-01',
            status: 'holding'
          }
        ]);
      } else {
        setProducts(productList);
      }
    } catch (error) {
      console.error('加载理财持仓失败:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // 总资产和收益
  const totalAssets = products.reduce((sum, p) => sum + p.holdingAmount, 0);
  const totalReturn = products.reduce((sum, p) => sum + p.cumulativeReturn, 0);

  // 筛选产品
  const filteredProducts = products.filter(p => {
    if (filter === 'holding') return p.status === 'holding';
    if (filter === 'matured') return p.status === 'matured';
    return true;
  });

  // 赎回产品
  const handleRedeem = async () => {
    if (!selectedProduct || !redeemAmount) return;
    
    const amount = parseFloat(redeemAmount);
    
    if (amount <= 0) {
      alert('请输入赎回金额');
      return;
    }
    
    if (amount > selectedProduct.availableAmount) {
      alert('赎回金额超过可用金额');
      return;
    }

    try {
      setSubmitting(true);
      
      // 调用赎回接口
      await supabase.from('wealth_orders').insert({
        user_id: user?.id,
        product_code: selectedProduct.code,
        product_name: selectedProduct.name,
        order_type: 'REDEEM',
        amount: amount,
        status: 'PENDING'
      });

      alert(`赎回申请已提交！\n产品：${selectedProduct.name}\n金额：¥${amount.toFixed(2)}`);
      setShowRedeem(false);
      setSelectedProduct(null);
      loadHoldings();
    } catch (error: any) {
      alert(`赎回失败: ${error.message || '请稍后重试'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    const map: Record<string, { text: string; color: string }> = {
      'holding': { text: '持有中', color: 'bg-[#E5F9EF] text-[#22C55E]' },
      'matured': { text: '已到期', color: 'bg-[#FFF3E5] text-[#F97316]' },
      'redeeming': { text: '赎回中', color: 'bg-[#E5EDFF] text-[#3B82F6]' }
    };
    return map[status] || { text: status, color: 'bg-[#F5F5F5] text-[#666666]' };
  };

  // 计算剩余天数
  const getDaysRemaining = (maturityDate: string) => {
    const today = new Date();
    const maturity = new Date(maturityDate);
    const diff = Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-[#0066CC] px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-semibold flex-1">理财持仓</h1>
      </div>

      {/* 资产汇总 */}
      <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] mx-4 mt-4 rounded-xl p-4 text-white">
        <div className="text-center mb-4">
          <p className="text-white/70 text-xs mb-1">理财总资产</p>
          <p className="text-2xl font-bold">¥{totalAssets.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-white/70 text-xs mb-1">累计收益</p>
            <p className="text-lg font-semibold text-[#E63946]">
              +{totalReturn.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-xs mb-1">持有产品</p>
            <p className="text-lg font-semibold">{products.length}个</p>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-2 px-4 mt-4">
        {[
          { key: 'all', label: '全部' },
          { key: 'holding', label: '持有中' },
          { key: 'matured', label: '已到期' }
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              filter === item.key
                ? 'bg-[#0066CC] text-white'
                : 'bg-white text-[#666666]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 产品列表 */}
      <div className="px-4 mt-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC]"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#999999]">
            <svg className="w-16 h-16 mb-4 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暂无理财持仓</p>
            <button
              onClick={() => navigate('/client/wealth')}
              className="mt-4 px-6 py-2 bg-[#0066CC] text-white rounded-lg text-sm"
            >
              去购买理财
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(product => {
              const statusDisplay = getStatusDisplay(product.status);
              const daysRemaining = getDaysRemaining(product.maturityDate);
              
              return (
                <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#333333]">{product.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${statusDisplay.color}`}>
                          {statusDisplay.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#999999]">{product.code}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-[#F5F5F5] text-[#666666] rounded">{product.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#999999]">七日年化</p>
                      <p className="text-lg font-bold text-[#E63946]">{product.expectedReturn.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 py-3 border-t border-[#F0F0F0]">
                    <div>
                      <p className="text-xs text-[#999999]">持有金额</p>
                      <p className="text-sm text-[#333333]">¥{product.holdingAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#999999]">累计收益</p>
                      <p className="text-sm text-[#E63946]">+{product.cumulativeReturn.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#999999]">到期日</p>
                      <p className="text-sm text-[#333333]">{product.maturityDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F0]">
                    <div className="text-xs text-[#999999]">
                      {product.status === 'holding' ? (
                        <span>剩余 {daysRemaining} 天到期</span>
                      ) : product.status === 'matured' ? (
                        <span className="text-[#F97316]">已到期，可赎回</span>
                      ) : (
                        <span>赎回处理中</span>
                      )}
                    </div>
                    {product.status !== 'redeeming' && (
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setRedeemAmount(product.availableAmount.toString());
                          setShowRedeem(true);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                          product.status === 'matured'
                            ? 'bg-[#E63946] text-white'
                            : 'bg-[#F5F5F5] text-[#666666]'
                        }`}
                      >
                        赎回
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 赎回弹窗 */}
      {showRedeem && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#333333]">赎回理财产品</h3>
              <button onClick={() => setShowRedeem(false)} className="text-[#999999]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-3 border-y border-[#F0F0F0]">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#999999]">产品名称</span>
                <span className="text-sm text-[#333333]">{selectedProduct.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-[#999999]">可用金额</span>
                <span className="text-sm text-[#333333]">¥{selectedProduct.availableAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#999999]">累计收益</span>
                <span className="text-sm text-[#E63946]">+{selectedProduct.cumulativeReturn.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-[#999999] block mb-2">赎回金额</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#333333]">¥</span>
                <input
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder="请输入赎回金额"
                  className="w-full h-12 pl-8 pr-4 border border-[#E5E5E5] rounded-lg text-lg"
                />
              </div>
              <button
                onClick={() => setRedeemAmount(selectedProduct.availableAmount.toString())}
                className="mt-2 text-xs text-[#0066CC]"
              >
                全部赎回
              </button>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowRedeem(false)}
                className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-sm text-[#666666]"
              >
                取消
              </button>
              <button
                onClick={handleRedeem}
                disabled={submitting}
                className="flex-1 py-3 bg-[#E63946] text-white rounded-xl font-medium disabled:opacity-50"
              >
                {submitting ? '提交中...' : '确认赎回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WealthHoldingsView;
