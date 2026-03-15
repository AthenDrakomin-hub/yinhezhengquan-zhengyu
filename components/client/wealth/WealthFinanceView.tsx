/**
 * 稳健理财页面
 * 展示低风险的理财产品，适合稳健型投资者
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { 
  getWealthProducts, 
  WealthProduct, 
  WEALTH_TYPES, 
  RISK_LEVELS 
} from '../../../services/wealthService';

// 风险等级颜色
const RISK_COLORS: Record<number, string> = {
  1: 'bg-[#10B981]',
  2: 'bg-[#3B82F6]',
  3: 'bg-[#F59E0B]',
  4: 'bg-[#F97316]',
  5: 'bg-[#E63946]'
};

// 风险等级文字
const RISK_LABELS: Record<number, string> = {
  1: '低风险',
  2: '中低风险',
  3: '中风险',
  4: '中高风险',
  5: '高风险'
};

interface WealthFinanceViewProps {
  onBack?: () => void;
}

const WealthFinanceView: React.FC<WealthFinanceViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('all');
  const [products, setProducts] = useState<WealthProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<WealthProduct | null>(null);

  // 加载理财产品数据
  useEffect(() => {
    loadProducts();
  }, [activeType]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await getWealthProducts(activeType);
      setProducts(data);
    } catch (error) {
      console.error('加载理财产品失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤产品
  const filteredProducts = products.filter(
    product => activeType === 'all' || product.type === activeType
  );

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(0)}亿`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}万`;
    }
    return amount.toString();
  };

  // 购买产品
  const handleBuy = async (product: WealthProduct) => {
    const minAmount = product.min_amount || 1000;
    try {
      const amountStr = prompt(
        `购买 ${product.name}\n` +
        `预期收益: ${product.expected_return ? product.expected_return + '%' : '浮动收益'}\n` +
        `起购金额: ¥${minAmount.toLocaleString()}\n` +
        `投资期限: ${product.period_days ? product.period_days + '天' : '灵活'}\n\n` +
        `请输入购买金额:`,
        minAmount.toString()
      );
      
      if (!amountStr) return;
      
      const amount = parseFloat(amountStr);
      if (isNaN(amount) || amount < minAmount) {
        alert(`购买金额不能低于 ¥${minAmount.toLocaleString()}`);
        return;
      }

      // 调用购买接口
      const { data, error } = await supabase.functions.invoke('purchase-wealth-product', {
        body: {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          amount
        }
      });

      if (error) throw new Error(error.message);
      
      if (data?.success) {
        alert(`购买成功！\n产品: ${product.name}\n金额: ¥${amount.toLocaleString()}`);
        setSelectedProduct(null);
        loadProducts();
      } else {
        alert(`购买失败: ${data?.error || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('购买失败:', error);
      alert(`购买失败: ${error.message || '未知错误'}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F5]">
      {/* 顶部标题栏 */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onBack?.() || navigate(-1)}
            className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-[#333333]">稳健理财</h1>
        </div>
      </header>

      {/* 分类标签 */}
      <section className="bg-white mx-4 mt-3 rounded-xl shadow-sm">
        <div className="flex items-center overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveType('all')}
            className={`px-4 py-3 text-sm whitespace-nowrap ${
              activeType === 'all' 
                ? 'text-[#3B82F6] font-medium border-b-2 border-[#3B82F6]' 
                : 'text-[#666666]'
            }`}
          >
            全部
          </button>
          {Object.entries(WEALTH_TYPES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveType(key)}
              className={`px-4 py-3 text-sm whitespace-nowrap ${
                activeType === key 
                  ? 'text-[#3B82F6] font-medium border-b-2 border-[#3B82F6]' 
                  : 'text-[#666666]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 推荐产品 */}
      <section className="mx-4 mt-3">
        <div className="bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">精选推荐</span>
          </div>
          <h3 className="text-lg font-semibold">银河稳健理财1号</h3>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-bold">3.2</span>
            <span className="text-lg mb-1">%</span>
            <span className="text-sm opacity-80 mb-1">预期年化</span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span>起购 ¥1,000</span>
            <span>期限 90天</span>
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">低风险</span>
          </div>
          <button 
            onClick={() => {
              const recommendedProduct = products.find(p => p.code === 'YH001');
              if (recommendedProduct) handleBuy(recommendedProduct);
            }}
            className="mt-4 w-full py-2 bg-white text-[#3B82F6] rounded-lg font-medium"
          >
            立即购买
          </button>
        </div>
      </section>

      {/* 产品列表 */}
      <section className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3B82F6]"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div 
                key={product.id}
                className="bg-white rounded-xl shadow-sm p-4"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-[#333333]">{product.name}</h3>
                      {product.tag && (
                        <span className="text-[10px] bg-[#E63946] text-white px-1.5 py-0.5 rounded">
                          {product.tag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-2 h-2 rounded-full ${RISK_COLORS[product.risk_level || 2]}`} />
                      <span className="text-xs text-[#666666]">{RISK_LABELS[product.risk_level || 2]}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#E63946]">
                      {product.expected_return ? `${product.expected_return}%` : '浮动'}
                    </p>
                    <p className="text-xs text-[#999999]">预期年化</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between text-xs text-[#666666]">
                  <span>起购 ¥{(product.min_amount || 1000).toLocaleString()}</span>
                  <span>期限 {product.period_days ? `${product.period_days}天` : '灵活'}</span>
                  <span>剩余额度 {formatAmount(product.quota || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 产品详情弹窗 */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-t-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="p-4 border-b border-[#E5E5E5]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#333333]">{selectedProduct.name}</h3>
                  {selectedProduct.tag && (
                    <span className="text-[10px] bg-[#E63946] text-white px-1.5 py-0.5 rounded">
                      {selectedProduct.tag}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 收益信息 */}
            <div className="p-4 bg-[#F9FAFB]">
              <div className="text-center">
                <p className="text-4xl font-bold text-[#E63946]">
                  {selectedProduct.expected_return ? `${selectedProduct.expected_return}%` : '浮动'}
                </p>
                <p className="text-sm text-[#666666] mt-1">预期年化收益率</p>
              </div>
            </div>
            
            {/* 产品信息 */}
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">产品类型</span>
                <span className="text-sm text-[#333333]">
                  {WEALTH_TYPES[selectedProduct.type] || '其他'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">起购金额</span>
                <span className="text-sm text-[#333333]">¥{(selectedProduct.min_amount || 1000).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">投资期限</span>
                <span className="text-sm text-[#333333]">
                  {selectedProduct.period_days ? `${selectedProduct.period_days}天` : '灵活'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">风险等级</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${RISK_COLORS[selectedProduct.risk_level || 2]}`} />
                  <span className="text-sm text-[#333333]">{RISK_LABELS[selectedProduct.risk_level || 2]}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#666666]">剩余额度</span>
                <span className="text-sm text-[#333333]">¥{formatAmount(selectedProduct.quota || 0)}</span>
              </div>
              {selectedProduct.description && (
                <div className="pt-2 border-t border-[#E5E5E5]">
                  <span className="text-sm text-[#666666]">产品说明</span>
                  <p className="text-sm text-[#333333] mt-1">{selectedProduct.description}</p>
                </div>
              )}
            </div>
            
            {/* 购买按钮 */}
            <div className="p-4">
              <button 
                onClick={() => handleBuy(selectedProduct)}
                className="w-full py-3 bg-[#3B82F6] text-white rounded-lg font-medium"
              >
                立即购买
              </button>
            </div>
            
            {/* 风险提示 */}
            <div className="px-4 pb-4">
              <p className="text-xs text-[#999999] text-center">
                理财非存款，产品有风险，投资需谨慎
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WealthFinanceView;
