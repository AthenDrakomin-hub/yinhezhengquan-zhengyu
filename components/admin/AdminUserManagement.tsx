import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/constants';
import { userService } from '@/services/userService';
import { supabase } from '@/lib/supabase';

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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<any>(null);
  
  const [newUser, setNewUser] = useState({
    username: '',
    phone: '',
    id_card: '',
    role: 'user',
    risk_level: 'C3'
  });

  const [editUser, setEditUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  const toggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    try {
      await userService.updateUserStatus(user.id, newStatus);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '更新状态失败');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？此操作不可逆！')) return;
    
    try {
      // 删除用户（通过Supabase Auth删除用户）
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      
      alert('用户删除成功');
      fetchUsers();
    } catch (err: any) {
      alert('删除失败: ' + err.message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.phone) {
      alert('请填写用户名和手机号');
      return;
    }

    try {
      // 创建用户（通过Supabase Auth创建用户）
      const { data, error } = await supabase.auth.admin.createUser({
        email: `${newUser.phone}@temp.com`, // 使用手机号作为邮箱
        phone: newUser.phone,
        password: '123456', // 默认密码
        email_confirm: true
      });

      if (error) throw error;

      // 创建用户资料
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: newUser.username,
          phone: newUser.phone,
          id_card: newUser.id_card,
          role: newUser.role,
          risk_level: newUser.risk_level,
          status: 'ACTIVE'
        });

      if (profileError) throw profileError;

      // 创建用户资产
      const { error: assetError } = await supabase
        .from('assets')
        .insert({
          user_id: data.user.id,
          available_balance: 500000.00,
          total_asset: 500000.00
        });

      if (assetError) throw assetError;

      alert('用户创建成功！默认密码：123456');
      setShowCreateModal(false);
      setNewUser({ username: '', phone: '', id_card: '', role: 'user', risk_level: 'C3' });
      fetchUsers();
    } catch (err: any) {
      alert('创建失败: ' + err.message);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUser.username,
          phone: editUser.phone,
          id_card: editUser.id_card,
          role: editUser.role,
          risk_level: editUser.risk_level,
          status: editUser.status
        })
        .eq('id', editUser.id);

      if (error) throw error;

      alert('用户资料更新成功');
      setShowEditModal(null);
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      alert('更新失败: ' + err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPasswordModal || !newPassword) {
      alert('请输入新密码');
      return;
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(
        showResetPasswordModal.id,
        { password: newPassword }
      );

      if (error) throw error;

      alert('密码重置成功！新密码：' + newPassword);
      setShowResetPasswordModal(null);
      setNewPassword('');
    } catch (err: any) {
      alert('重置失败: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-industrial-800 uppercase tracking-widest">用户列表</h3>
        <div className="flex gap-2">
          <button className="industrial-button-primary" onClick={() => setShowCreateModal(true)}>
            <ICONS.Plus size={16} /> 新建用户
          </button>
          <button className="industrial-button-secondary" onClick={fetchUsers}>
            <ICONS.Refresh size={16} className={loading ? 'animate-spin' : ''} /> 刷新列表
          </button>
        </div>
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
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        上下分
                      </button>
                      <button 
                        onClick={() => {
                          setEditUser({ ...user });
                          setShowEditModal(user);
                        }}
                        className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-[10px] font-black text-accent-red uppercase hover:underline"
                      >
                        删除
                      </button>
                      <button 
                        onClick={() => setShowResetPasswordModal(user)}
                        className="text-[10px] font-black text-purple-600 uppercase hover:underline"
                      >
                        重置密码
                      </button>
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-md p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">新建用户</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">用户名</label>
                <input 
                  type="text" 
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="请输入用户名"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">手机号</label>
                <input 
                  type="tel" 
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="请输入手机号"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">身份证号</label>
                <input 
                  type="text" 
                  value={newUser.id_card}
                  onChange={(e) => setNewUser({...newUser, id_card: e.target.value})}
                  placeholder="请输入身份证号"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">角色</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="industrial-input"
                >
                  <option value="user">普通用户</option>
                  <option value="vip">VIP用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">风险等级</label>
                <select 
                  value={newUser.risk_level}
                  onChange={(e) => setNewUser({...newUser, risk_level: e.target.value})}
                  className="industrial-input"
                >
                  <option value="C1">C1 (保守型)</option>
                  <option value="C2">C2 (稳健型)</option>
                  <option value="C3">C3 (平衡型)</option>
                  <option value="C4">C4 (成长型)</option>
                  <option value="C5">C5 (进取型)</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleCreateUser}
                  className="industrial-button-primary w-full"
                >
                  创建用户
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-md p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">编辑用户资料</h3>
              <button onClick={() => setShowEditModal(null)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">用户名</label>
                <input 
                  type="text" 
                  value={editUser?.username || ''}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  placeholder="请输入用户名"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">手机号</label>
                <input 
                  type="tel" 
                  value={editUser?.phone || ''}
                  onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                  placeholder="请输入手机号"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">身份证号</label>
                <input 
                  type="text" 
                  value={editUser?.id_card || ''}
                  onChange={(e) => setEditUser({...editUser, id_card: e.target.value})}
                  placeholder="请输入身份证号"
                  className="industrial-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">角色</label>
                <select 
                  value={editUser?.role || 'user'}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="industrial-input"
                >
                  <option value="user">普通用户</option>
                  <option value="vip">VIP用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">风险等级</label>
                <select 
                  value={editUser?.risk_level || 'C3'}
                  onChange={(e) => setEditUser({...editUser, risk_level: e.target.value})}
                  className="industrial-input"
                >
                  <option value="C1">C1 (保守型)</option>
                  <option value="C2">C2 (稳健型)</option>
                  <option value="C3">C3 (平衡型)</option>
                  <option value="C4">C4 (成长型)</option>
                  <option value="C5">C5 (进取型)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">状态</label>
                <select 
                  value={editUser?.status || 'ACTIVE'}
                  onChange={(e) => setEditUser({...editUser, status: e.target.value})}
                  className="industrial-input"
                >
                  <option value="ACTIVE">已激活</option>
                  <option value="BANNED">已封禁</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleUpdateUser}
                  className="industrial-button-primary w-full"
                >
                  更新用户资料
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-industrial-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="industrial-card w-full max-w-md p-8 bg-white"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-industrial-800 uppercase tracking-tight">重置密码</h3>
              <button onClick={() => setShowResetPasswordModal(null)} className="text-industrial-400 hover:text-industrial-800">
                <ICONS.Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-industrial-50 rounded-lg border border-industrial-100">
                <p className="text-[10px] font-black text-industrial-400 uppercase mb-1">当前用户</p>
                <p className="text-sm font-black text-industrial-800">{showResetPasswordModal.username || '未设置'} ({showResetPasswordModal.id})</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-industrial-400 uppercase mb-2">新密码</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  className="industrial-input"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleResetPassword}
                  className="industrial-button-primary w-full"
                >
                  重置密码
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
