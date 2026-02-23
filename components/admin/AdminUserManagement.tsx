import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { userService } from '@/services/userService';

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('获取用户列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFundOperation = async (type: 'RECHARGE' | 'WITHDRAW') => {
    if (!selectedUser || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('请输入有效金额');

    try {
      await userService.adjustBalance(selectedUser.id, val, type);
      alert(`${type === 'RECHARGE' ? '上分' : '下分'}成功！`);
      setSelectedUser(null);
      setAmount('');
      setRemark('');
      fetchUsers(); // 刷新列表
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const toggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    try {
      await userService.updateUserStatus(user.id, newStatus);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '更新状态失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">用户列表</h3>
        <button className="industrial-button-primary" onClick={fetchUsers}>
          <ICONS.Plus size={16} className={loading ? 'animate-spin' : ''} /> 刷新列表
        </button>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户名</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">账户余额</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">角色</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无用户</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-industrial-800 truncate max-w-[120px]">{user.id}</td>
                  <td className="px-6 py-4 text-xs font-bold text-industrial-700">{user.username || '未设置'}</td>
                  <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{parseFloat(user.balance).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleUserStatus(user)}
                      className={`text-[9px] font-black px-2 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80 ${
                        user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {user.status === 'ACTIVE' ? '已激活' : '已封禁'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-[10px] text-industrial-400 font-bold uppercase">{user.role}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        上下分
                      </button>
                      <button className="text-[10px] font-black text-industrial-400 uppercase hover:underline">详情</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fund Operation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-md p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">资金操作 (上下分)</h3>
              <button onClick={() => setSelectedUser(null)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-industrial-50 rounded-lg border border-industrial-100">
                <p className="text-[10px] font-black text-industrial-400 uppercase mb-1">当前用户</p>
                <p className="text-sm font-black text-industrial-800">{selectedUser.username || '未设置'} ({selectedUser.id})</p>
                <p className="text-xs font-bold text-industrial-600 mt-1">当前余额: ¥{parseFloat(selectedUser.balance).toLocaleString()}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">操作金额</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="请输入金额"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">备注信息</label>
                <textarea 
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请输入操作备注"
                  className="industrial-input h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => handleFundOperation('RECHARGE')}
                  className="industrial-button-primary bg-emerald-600 hover:bg-emerald-700"
                >
                  确认上分
                </button>
                <button 
                  onClick={() => handleFundOperation('WITHDRAW')}
                  className="industrial-button-primary bg-accent-red hover:bg-accent-dark-red"
                >
                  确认下分
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
