import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { userService } from '@/services/userService';
import { supabase } from '@/lib/supabase';

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    id_card: '',
    real_name: '',
    role: 'USER',
    risk_level: '稳健型',
    status: 'ACTIVE',
    initial_balance: 500000
  });
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await userService.createUser(formData as any);
      alert('用户创建成功！');
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      // 更新用户基础信息
      await userService.updateUser(selectedUser.id, {
        username: formData.username,
        phone: formData.phone,
        id_card: formData.id_card,
        real_name: formData.real_name,
        risk_level: formData.risk_level,
        role: formData.role,
        status: formData.status
      });
      
      // 更新用户资产信息
      if (selectedUser.balance !== undefined || selectedUser.total_asset !== undefined || selectedUser.frozen_balance !== undefined) {
        // 直接更新资产表
        const { error: assetError } = await supabase
          .from('assets')
          .update({
            available_balance: selectedUser.balance || 0,
            total_asset: selectedUser.total_asset || 0,
            frozen_balance: selectedUser.frozen_balance || 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', selectedUser.id);
          
        if (assetError) throw assetError;
      }
      
      alert('用户信息更新成功！');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确定要删除该用户吗？此操作不可逆。')) return;
    try {
      await userService.deleteUser(userId);
      alert('用户已删除');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('确定要重置该用户的密码吗？新密码将设置为：123456')) return;
    try {
      await userService.resetPassword(userId);
      alert('密码已重置为123456');
    } catch (err: any) {
      alert(err.message || '重置失败');
    }
  };

  const handleFundOperation = async (type: 'RECHARGE' | 'WITHDRAW') => {
    if (!selectedUser || !amount) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('请输入有效金额');

    try {
      await userService.adjustBalance(selectedUser.id, val, type, remark);
      alert(`${type === 'RECHARGE' ? '上分' : '下分'}成功！`);
      setIsFundModalOpen(false);
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
        <div className="flex gap-4">
          <button className="industrial-button-secondary" onClick={fetchUsers}>
            <ICONS.Market size={16} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="industrial-button-primary" onClick={() => {
            setFormData({ username: '', phone: '', id_card: '', real_name: '', role: 'USER', risk_level: '稳健型', status: 'ACTIVE', initial_balance: 500000 });
            setIsCreateModalOpen(true);
          }}>
            <ICONS.Plus size={16} /> 新建用户
          </button>
        </div>
      </div>

      <div className="industrial-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-industrial-50 border-b border-industrial-200">
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">用户信息</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">账户余额</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">总资产</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">冻结资金</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">状态</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">风险等级</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest">角色</th>
                <th className="px-6 py-4 text-[10px] font-black text-industrial-400 uppercase tracking-widest text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-100">
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">加载中...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-xs font-bold text-industrial-400">暂无用户</td></tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-industrial-50 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-industrial-800 truncate max-w-[120px]">{user.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-industrial-700">{user.username || '未设置'}</p>
                    <p className="text-[9px] text-industrial-400 font-mono">{user.real_name || '未填写姓名'}</p>
                    <p className="text-[9px] text-industrial-400 font-mono">{user.phone}</p>
                    <p className="text-[9px] text-industrial-400 font-mono">{user.id_card}</p>
                    <p className="text-[9px] text-industrial-400 font-mono">{user.email || '未设置邮箱'}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{parseFloat(user.balance).toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{parseFloat(user.total_asset).toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-black text-industrial-900">¥{parseFloat(user.frozen_balance).toLocaleString()}</td>
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
                  <td className="px-6 py-4 text-[10px] text-industrial-400 font-bold uppercase">{user.risk_level}</td>
                  <td className="px-6 py-4 text-[10px] text-industrial-400 font-bold uppercase">{user.role}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setIsFundModalOpen(true);
                        }}
                        className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                      >
                        上下分
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({
                            username: user.username || '',
                            phone: user.phone || '',
                            id_card: user.id_card || '',
                            real_name: user.real_name || '',
                            role: user.role || 'USER',
                            risk_level: user.risk_level || '稳健型',
                            status: user.status || 'ACTIVE',

                            initial_balance: 0
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleResetPassword(user.id)}
                        className="text-[10px] font-black text-orange-600 uppercase hover:underline"
                      >
                        重置
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-[10px] font-black text-accent-red uppercase hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建用户</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">用户名</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">手机号</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="industrial-input" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">身份证号</label>
                <input required type="text" value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} className="industrial-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">角色</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="industrial-input">
                    <option value="USER">普通用户</option>
                    <option value="OPERATOR">操作员</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">风险等级</label>
                  <select value={formData.risk_level} onChange={e => setFormData({...formData, risk_level: e.target.value})} className="industrial-input">
                    <option value="保守型">保守型</option>
                    <option value="稳健型">稳健型</option>
                    <option value="积极型">积极型</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">初始资金 (CNY)</label>
                <input type="number" value={formData.initial_balance} onChange={e => setFormData({...formData, initial_balance: Number(e.target.value)})} className="industrial-input" />
              </div>

              <button disabled={submitting} type="submit" className="w-full mt-4 industrial-button-primary">
                {submitting ? '创建中...' : '确认创建'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-lg p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑用户</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">用户名</label>
                  <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">真实姓名</label>
                  <input type="text" value={formData.real_name} onChange={e => setFormData({...formData, real_name: e.target.value})} className="industrial-input" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">手机号</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="industrial-input" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">身份证号</label>
                  <input type="text" value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} className="industrial-input" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">角色</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="industrial-input">
                    <option value="USER">普通用户</option>
                    <option value="OPERATOR">操作员</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">风险等级</label>
                  <select value={formData.risk_level} onChange={e => setFormData({...formData, risk_level: e.target.value})} className="industrial-input">
                    <option value="保守型">保守型</option>
                    <option value="稳健型">稳健型</option>
                    <option value="积极型">积极型</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">用户状态</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="industrial-input">
                    <option value="ACTIVE">活跃</option>
                    <option value="BANNED">封禁</option>
                    <option value="PENDING">待审核</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">账户余额</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={selectedUser?.balance || 0} 
                    onChange={e => {
                      const newBalance = parseFloat(e.target.value) || 0;
                      setSelectedUser((prev: any) => prev ? {...prev, balance: newBalance} : null);
                    }} 
                    className="industrial-input font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">总资产</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={selectedUser?.total_asset || 0} 
                    onChange={e => {
                      const newTotalAsset = parseFloat(e.target.value) || 0;
                      setSelectedUser((prev: any) => prev ? {...prev, total_asset: newTotalAsset} : null);
                    }} 
                    className="industrial-input font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">冻结资金</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={selectedUser?.frozen_balance || 0} 
                    onChange={e => {
                      const newFrozenBalance = parseFloat(e.target.value) || 0;
                      setSelectedUser((prev: any) => prev ? {...prev, frozen_balance: newFrozenBalance} : null);
                    }} 
                    className="industrial-input font-mono" 
                  />
                </div>
              </div>

              <button disabled={submitting} type="submit" className="w-full mt-4 industrial-button-primary">
                {submitting ? '保存中...' : '确认修改'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Fund Operation Modal */}
      {isFundModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-md p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">资金操作 (上下分)</h3>
              <button onClick={() => setIsFundModalOpen(false)} className="text-industrial-400 hover:text-industrial-800">
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
