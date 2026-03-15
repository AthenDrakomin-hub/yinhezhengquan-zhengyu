/**
 * 综合账户页面
 * 管理同名账户之间的资金划转
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Account {
  id: string;
  name: string;
  type: 'stock' | 'fund' | 'futures';
  balance: number;
  status: 'active' | 'inactive';
}

// 默认账户配置
const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'stock', name: '证券账户', type: 'stock', balance: 0, status: 'active' },
  { id: 'fund', name: '基金账户', type: 'fund', balance: 0, status: 'active' },
  { id: 'futures', name: '期货账户', type: 'futures', balance: 0, status: 'active' },
];

const ComprehensiveAccountView: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'accounts' | 'transfer'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [loading, setLoading] = useState(true);
  const [transferAmount, setTransferAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('stock');
  const [toAccount, setToAccount] = useState('fund');
  const [submitting, setSubmitting] = useState(false);

  // 加载账户数据
  useEffect(() => {
    loadAccounts();
  }, [user]);

  const loadAccounts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 获取用户资产数据
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('获取资产数据失败:', error.code);
      }

      if (assets) {
        // 根据资产数据构建账户列表
        const stockBalance = Number(assets.available_cash) || 0;
        const frozenBalance = Number(assets.frozen_balance) || 0;
        
        setAccounts([
          { 
            id: 'stock', 
            name: '证券账户', 
            type: 'stock', 
            balance: stockBalance, 
            status: frozenBalance > stockBalance * 0.8 ? 'inactive' : 'active' 
          },
          { 
            id: 'fund', 
            name: '基金账户', 
            type: 'fund', 
            balance: Number(assets.fund_balance) || 0, 
            status: 'active' 
          },
          { 
            id: 'futures', 
            name: '期货账户', 
            type: 'futures', 
            balance: Number(assets.futures_balance) || 0, 
            status: 'active' 
          },
        ]);
      } else {
        // 没有资产记录，使用默认值
        setAccounts(DEFAULT_ACCOUNTS);
      }
    } catch (error) {
      console.error('加载账户数据失败:', error);
      setAccounts(DEFAULT_ACCOUNTS);
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);
    if (!amount || amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    const fromAccountData = accounts.find(a => a.id === fromAccount);
    if (!fromAccountData || fromAccountData.balance < amount) {
      alert('可用余额不足');
      return;
    }

    try {
      setSubmitting(true);
      
      // 记录转账日志
      const { error } = await supabase
        .from('transfer_logs')
        .insert({
          user_id: user?.id,
          from_account: fromAccount,
          to_account: toAccount,
          amount: amount,
          status: 'COMPLETED'
        });

      if (error) {
        console.warn('转账记录保存失败:', error.code);
      }

      // 更新本地状态
      setAccounts(prev => prev.map(a => {
        if (a.id === fromAccount) {
          return { ...a, balance: a.balance - amount };
        }
        if (a.id === toAccount) {
          return { ...a, balance: a.balance + amount };
        }
        return a;
      }));

      alert(`成功从${fromAccountData.name}转账 ¥${amount.toLocaleString()} 到 ${accounts.find(a => a.id === toAccount)?.name}`);
      setTransferAmount('');
    } catch (error: any) {
      alert(`转账失败: ${error.message || '请稍后重试'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center border-b border-[#F0F0F0]">
        <button onClick={() => navigate('/client/profile')} className="mr-3">
          <svg className="w-6 h-6 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[#333333]">我的综合账户</h1>
      </div>

      {/* 总资产 */}
      <div className="bg-gradient-to-br from-[#0066CC] to-[#004C99] mx-4 mt-4 rounded-xl p-5 text-white">
        <p className="text-white/70 text-sm mb-1">同名账户总资产</p>
        <p className="text-3xl font-bold">¥{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        <p className="text-white/50 text-xs mt-2">共 {accounts.length} 个同名账户</p>
      </div>

      {/* Tab切换 */}
      <div className="flex bg-white mx-4 mt-4 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'accounts' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          账户列表
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'transfer' ? 'bg-[#0066CC] text-white' : 'text-[#666666]'
          }`}
        >
          资金划转
        </button>
      </div>

      {activeTab === 'accounts' ? (
        /* 账户列表 */
        <div className="bg-white mx-4 mt-4 rounded-xl">
          {accounts.map((account, index) => (
            <div
              key={account.id}
              className={`p-4 ${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    account.type === 'stock' ? 'bg-[#E3F2FD]' :
                    account.type === 'fund' ? 'bg-[#E5F9EF]' : 'bg-[#FFF0F0]'
                  }`}>
                    <svg className={`w-5 h-5 ${
                      account.type === 'stock' ? 'text-[#0066CC]' :
                      account.type === 'fund' ? 'text-[#22C55E]' : 'text-[#E63946]'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {account.type === 'stock' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      ) : account.type === 'fund' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#333333]">{account.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      account.status === 'active' ? 'bg-[#E5F9EF] text-[#22C55E]' : 'bg-[#F5F5F5] text-[#999999]'
                    }`}>
                      {account.status === 'active' ? '正常' : '冻结'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold text-[#333333]">
                    ¥{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-[#999999]">可用资金</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 资金划转 */
        <div className="bg-white mx-4 mt-4 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#333333] mb-4">同名账户资金划转</h3>
          
          {/* 转出账户 */}
          <div className="mb-4">
            <label className="text-xs text-[#999999] mb-2 block">转出账户</label>
            <select
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
              className="w-full p-3 border border-[#E5E5E5] rounded-lg text-sm"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name} (¥{a.balance.toLocaleString()})</option>
              ))}
            </select>
          </div>

          {/* 转入账户 */}
          <div className="mb-4">
            <label className="text-xs text-[#999999] mb-2 block">转入账户</label>
            <select
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              className="w-full p-3 border border-[#E5E5E5] rounded-lg text-sm"
            >
              {accounts.filter(a => a.id !== fromAccount).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* 转账金额 */}
          <div className="mb-4">
            <label className="text-xs text-[#999999] mb-2 block">转账金额</label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="请输入金额"
              className="w-full p-3 border border-[#E5E5E5] rounded-lg text-sm"
            />
          </div>

          {/* 确认按钮 */}
          <button
            onClick={handleTransfer}
            className="w-full py-3 bg-[#0066CC] text-white rounded-lg font-medium"
          >
            确认划转
          </button>
        </div>
      )}

      {/* 说明 */}
      <div className="mx-4 mt-4 mb-4 p-3 bg-[#F5F5F5] rounded-lg">
        <p className="text-xs text-[#999999]">
          • 同名账户资金划转实时到账<br/>
          • 划转不收取手续费<br/>
          • 资金划转时间为交易日 9:00-16:00
        </p>
      </div>
    </div>
  );
};

export default ComprehensiveAccountView;
