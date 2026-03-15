/**
 * 银证转账页面
 * 实现银行账户和证券账户之间的资金划转
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { bankTransferService, BankAccount } from '../../../services/bankTransferService';

const BankTransferView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 转账方向
  const [transferType, setTransferType] = useState<'in' | 'out'>('in');
  
  // 资金信息
  const [bankBalance, setBankBalance] = useState(0);
  const [stockBalance, setStockBalance] = useState(0);
  
  // 银行卡列表
  const [bankCards, setBankCards] = useState<BankAccount[]>([]);
  const [selectedCard, setSelectedCard] = useState<BankAccount | null>(null);
  
  // 转账金额
  const [amount, setAmount] = useState('');
  
  // 密码
  const [password, setPassword] = useState('');
  
  // 状态
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 加载银行卡和余额
  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // 获取证券账户余额
      const { data: assets } = await supabase
        .from('assets')
        .select('available_cash')
        .eq('user_id', user.id)
        .single();
      
      if (assets) {
        setStockBalance(Number(assets.available_cash) || 0);
      }

      // 获取银行卡列表（真实数据）
      const accounts = await bankTransferService.getBankAccounts();
      setBankCards(accounts);
      
      if (accounts.length > 0) {
        const defaultCard = accounts.find(c => c.is_default) || accounts[0];
        setSelectedCard(defaultCard);
        setBankBalance(defaultCard.balance);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  // 快捷金额
  const quickAmounts = [10000, 50000, 100000, 200000, 500000];

  // 最大可转金额
  const maxAmount = transferType === 'in' ? bankBalance : stockBalance;

  // 提交转账
  const handleSubmit = async () => {
    const transferAmount = parseFloat(amount);
    
    if (!selectedCard) {
      alert('请选择银行卡');
      return;
    }
    
    if (!amount || transferAmount <= 0) {
      alert('请输入转账金额');
      return;
    }
    
    if (transferAmount > maxAmount) {
      alert('转账金额超过可用余额');
      return;
    }
    
    if (!password || password.length !== 6) {
      alert('请输入6位资金密码');
      return;
    }

    try {
      setLoading(true);
      
      // 调用真实转账接口
      await bankTransferService.transfer({
        transfer_type: transferType === 'in' ? 'IN' : 'OUT',
        amount: transferAmount,
        bank_account_id: selectedCard.id
      });

      // 更新余额显示
      if (transferType === 'in') {
        setBankBalance(prev => prev - transferAmount);
        setStockBalance(prev => prev + transferAmount);
      } else {
        setStockBalance(prev => prev - transferAmount);
        setBankBalance(prev => prev + transferAmount);
      }

      setShowSuccess(true);
      setAmount('');
      setPassword('');
    } catch (error: any) {
      alert(`转账失败: ${error.message || '请稍后重试'}`);
    } finally {
      setLoading(false);
    }
  };

  // 银行图标
  const getBankIcon = (bankCode: string) => {
    const icons: Record<string, string> = {
      'ICBC': '🔴',
      'CCB': '🔵',
      'ABC': '🟢',
      'BOC': '🔴',
      'COMM': '🔵',
      'CMB': '🔴',
      'CITIC': '🔴',
      'CEB': '🟡'
    };
    return icons[bankCode] || '🏦';
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
        <h1 className="text-white text-lg font-semibold flex-1">银证转账</h1>
      </div>

      {/* 转账方向切换 */}
      <div className="bg-white mx-4 mt-4 rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-[#E5E5E5]">
          <button
            onClick={() => setTransferType('in')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              transferType === 'in'
                ? 'text-[#E63946] bg-[#FFE5E5]'
                : 'text-[#666666]'
            }`}
          >
            银行转证券
          </button>
          <button
            onClick={() => setTransferType('out')}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              transferType === 'out'
                ? 'text-[#3B82F6] bg-[#E5EDFF]'
                : 'text-[#666666]'
            }`}
          >
            证券转银行
          </button>
        </div>

        <div className="p-4">
          {/* 资金展示 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-[#F5F5F5] rounded-lg">
              <p className="text-xs text-[#999999] mb-1">银行可用</p>
              <p className="text-lg font-bold text-[#333333]">
                ¥{bankBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center p-3 bg-[#F5F5F5] rounded-lg">
              <p className="text-xs text-[#999999] mb-1">证券可用</p>
              <p className="text-lg font-bold text-[#333333]">
                ¥{stockBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* 转账流程图 */}
          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#E5EDFF] rounded-full flex items-center justify-center text-2xl mx-auto">
                🏦
              </div>
              <p className="text-xs text-[#666666] mt-2">
                {transferType === 'in' ? '转出银行' : '转入银行'}
              </p>
            </div>
            
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0066CC]"></div>
                <div className="w-16 h-0.5 bg-[#0066CC]"></div>
                <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FFE5E5] rounded-full flex items-center justify-center text-2xl mx-auto">
                📈
              </div>
              <p className="text-xs text-[#666666] mt-2">
                {transferType === 'in' ? '转入证券' : '转出证券'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 选择银行卡 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <p className="text-sm text-[#333333] font-medium mb-3">选择银行卡</p>
        <div className="space-y-2">
          {bankCards.map(card => (
            <button
              key={card.id}
              onClick={() => {
                setSelectedCard(card);
                setBankBalance(card.balance);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                selectedCard?.id === card.id
                  ? 'border-[#0066CC] bg-[#E3F2FD]'
                  : 'border-[#E5E5E5]'
              }`}
            >
              <span className="text-2xl">{getBankIcon(card.bank_code)}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[#333333]">{card.bank_name}</p>
                <p className="text-xs text-[#999999]">{card.account_no}</p>
              </div>
              {card.is_default && (
                <span className="text-xs px-1.5 py-0.5 bg-[#E5F9EF] text-[#22C55E] rounded">默认</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 转账金额 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <p className="text-sm text-[#333333] font-medium mb-3">转账金额</p>
        <div className="relative mb-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#333333]">¥</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="请输入金额"
            className="w-full h-12 pl-8 pr-4 border border-[#E5E5E5] rounded-lg text-lg text-[#333333]"
          />
        </div>
        
        {/* 快捷金额 */}
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map(amt => (
            <button
              key={amt}
              onClick={() => setAmount(amt.toString())}
              className="px-3 py-1.5 bg-[#F5F5F5] rounded-lg text-sm text-[#666666]"
            >
              {amt >= 10000 ? `${amt / 10000}万` : amt}
            </button>
          ))}
          <button
            onClick={() => setAmount(maxAmount.toString())}
            className="px-3 py-1.5 bg-[#0066CC] text-white rounded-lg text-sm"
          >
            全部
          </button>
        </div>

        <p className="text-xs text-[#999999] mt-3">
          最大可转: ¥{maxAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* 资金密码 */}
      <div className="bg-white mx-4 mt-3 rounded-xl shadow-sm p-4">
        <p className="text-sm text-[#333333] font-medium mb-3">资金密码</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="请输入6位资金密码"
          maxLength={6}
          className="w-full h-12 px-4 border border-[#E5E5E5] rounded-lg text-lg text-[#333333] tracking-widest"
        />
      </div>

      {/* 提交按钮 */}
      <div className="px-4 mt-6">
        <button
          onClick={handleSubmit}
          disabled={loading || !amount || !password}
          className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all ${
            transferType === 'in'
              ? 'bg-[#E63946] hover:bg-[#C62836]'
              : 'bg-[#3B82F6] hover:bg-[#2563EB]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? '处理中...' : '确认转账'}
        </button>
      </div>

      {/* 提示 */}
      <div className="px-4 mt-4 mb-20">
        <p className="text-xs text-[#999999] text-center">
          转账时间：交易日 9:00-16:00，资金实时到账
        </p>
      </div>

      {/* 成功弹窗 */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-[#E5F9EF] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#333333] mb-2">转账成功</h3>
            <p className="text-sm text-[#666666] mb-4">
              已成功{transferType === 'in' ? '转入' : '转出'}¥{parseFloat(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 bg-[#0066CC] text-white rounded-xl font-medium"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTransferView;
