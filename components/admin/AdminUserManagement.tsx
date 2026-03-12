import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ICONS } from '@/lib/constants';
import { userService } from '@/services/userService';
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 10;

// 风险等级说明
const RISK_LEVEL_INFO = {
  '保守型': { color: '#22c55e', desc: '适合低风险投资，主要配置债券、货币基金等稳健产品，股票仓位不超过30%' },
  '稳健型': { color: '#3b82f6', desc: '适合中等风险投资，股票仓位30%-60%，平衡配置股票和债券' },
  '积极型': { color: '#ef4444', desc: '适合高风险投资，股票仓位可达60%以上，可参与IPO、打板等高风险操作' }
};

const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    id_card: '',
    real_name: '',
    password: '123456', // 默认密码
    role: 'USER',
    risk_level: '稳健型',
    status: 'ACTIVE'
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

  // 筛选用户列表
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm) ||
      user.real_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;
    const matchesRiskLevel = riskLevelFilter === 'ALL' || user.risk_level === riskLevelFilter;
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRiskLevel && matchesRole;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 当筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, riskLevelFilter, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await userService.createUser({
        ...formData,
        initial_balance: 0 // 新建用户资金固定为0
      });
      alert(`用户创建成功！\n\n登录账号：${formData.phone}\n登录密码：${formData.password}\n\n请妥善保管登录信息！`);
      setIsCreateModalOpen(false);
      setFormData({
        username: '',
        phone: '',
        id_card: '',
        real_name: '',
        password: '123456',
        role: 'USER',
        risk_level: '稳健型',
        status: 'ACTIVE'
      });
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
      await userService.updateUser(selectedUser.id, {
        username: formData.username,
        phone: formData.phone,
        id_card: formData.id_card,
        real_name: formData.real_name,
        risk_level: formData.risk_level,
        role: formData.role,
        status: formData.status
      });
      
      alert('用户信息更新成功！');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`确定要删除用户 "${username}" 吗？\n\n此操作将封禁该用户账户，不可逆！`)) return;
    try {
      await userService.deleteUser(userId);
      alert('用户已封禁');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm('确定要重置该用户的密码吗？\n\n新密码将设置为：123456')) return;
    try {
      await userService.resetPassword(userId);
      alert('密码已重置为：123456');
    } catch (err: any) {
      alert(err.message || '重置失败：' + err.message);
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
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  const toggleUserStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    const action = newStatus === 'BANNED' ? '封禁' : '解封';
    if (!window.confirm(`确定要${action}用户 "${user.username}" 吗？`)) return;
    
    try {
      await userService.updateUserStatus(user.id, newStatus);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '更新状态失败');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px' }}>用户管理</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>管理系统用户账户、权限和资金</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchUsers}
            style={{
              padding: '8px 16px',
              background: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? '⏳' : '🔄'} 刷新
          </button>
          <button 
            onClick={() => {
              setFormData({
                username: '',
                phone: '',
                id_card: '',
                real_name: '',
                password: '123456',
                role: 'USER',
                risk_level: '稳健型',
                status: 'ACTIVE'
              });
              setIsCreateModalOpen(true);
            }}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'var(--color-text-primary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ➕ 新建用户
          </button>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* 搜索框 */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>🔍</span>
            <input
              type="text"
              placeholder="搜索用户名/手机号/姓名/邮箱/ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'var(--color-surface-active)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          
          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              background: 'var(--color-surface-active)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">全部状态</option>
            <option value="ACTIVE">已激活</option>
            <option value="BANNED">已封禁</option>
            <option value="PENDING">待审核</option>
          </select>
          
          {/* 风险等级筛选 */}
          <select
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              background: 'var(--color-surface-active)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">全部风险等级</option>
            <option value="保守型">保守型</option>
            <option value="稳健型">稳健型</option>
            <option value="积极型">积极型</option>
          </select>
          
          {/* 角色筛选 */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              background: 'var(--color-surface-active)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">全部角色</option>
            <option value="USER">普通用户</option>
            <option value="OPERATOR">操作员</option>
            <option value="ADMIN">管理员</option>
          </select>
        </div>
        
        {/* 筛选结果统计 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <span>共 <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{users.length}</span> 个用户</span>
            <span>|</span>
            <span>筛选结果: <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{filteredUsers.length}</span> 个</span>
          </div>
          {(searchTerm || statusFilter !== 'ALL' || riskLevelFilter !== 'ALL' || roleFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setRiskLevelFilter('ALL');
                setRoleFilter('ALL');
              }}
              style={{
                fontSize: '12px',
                color: '#3b82f6',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* 用户列表 */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-active)' }}>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>用户ID</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>登录账号</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>用户信息</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>账户余额</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>总资产</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>状态</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>风险等级</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)' }}>角色</th>
                <th style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--color-border)', textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    加载中...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    {users.length === 0 ? '暂无用户' : '没有匹配的筛选结果'}
                  </td>
                </tr>
              ) : paginatedUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '14px 16px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.id?.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      color: '#22c55e',
                      background: '#22c55e20',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      {user.phone || user.email || '未设置'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{user.username || '未设置'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{user.real_name || '未填写姓名'}</p>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    ¥{Number(user.balance || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    ¥{Number(user.total_asset || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button 
                      onClick={() => toggleUserStatus(user)}
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: user.status === 'ACTIVE' ? '#22c55e20' : '#ef444420',
                        color: user.status === 'ACTIVE' ? '#22c55e' : '#ef4444'
                      }}
                    >
                      {user.status === 'ACTIVE' ? '已激活' : '已封禁'}
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: RISK_LEVEL_INFO[user.risk_level as keyof typeof RISK_LEVEL_INFO]?.color || '#64748b'
                    }}>
                      {user.risk_level}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: user.role === 'ADMIN' ? '#f9731620' : user.role === 'OPERATOR' ? '#3b82f620' : '#64748b20',
                      color: user.role === 'ADMIN' ? '#f97316' : user.role === 'OPERATOR' ? '#3b82f6' : '#94a3b8'
                    }}>
                      {user.role === 'ADMIN' ? '管理员' : user.role === 'OPERATOR' ? '操作员' : '用户'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDetailModalOpen(true);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: 'var(--color-text-muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        查看
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedUser(user);
                          setIsFundModalOpen(true);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#22c55e',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
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
                            password: '',
                            role: user.role || 'USER',
                            risk_level: user.risk_level || '稳健型',
                            status: user.status || 'ACTIVE'
                          });
                          setIsEditModalOpen(true);
                        }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#3b82f6',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        编辑
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#ef4444',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
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
        
        {/* 分页 */}
        {filteredUsers.length > ITEMS_PER_PAGE && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* 查看用户详情弹窗 */}
      {isDetailModalOpen && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>用户详情</h3>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {/* 登录信息 */}
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e', marginBottom: '12px' }}>🔐 登录信息</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>登录账号</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{selectedUser.phone || selectedUser.email || '未设置'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>默认密码</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>123456</p>
                  </div>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '12px' }}>⚠️ 首次登录后请提示用户修改密码</p>
              </div>
              
              {/* 基本信息 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>用户ID</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{selectedUser.id}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>用户名</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{selectedUser.username || '未设置'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>真实姓名</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{selectedUser.real_name || '未填写'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>手机号</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{selectedUser.phone || '未绑定'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>邮箱</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{selectedUser.email || '未绑定'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>身份证号</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>{selectedUser.id_card || '未填写'}</p>
                </div>
              </div>
              
              {/* 资产信息 */}
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '12px' }}>💰 资产信息</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>账户余额</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>¥{Number(selectedUser.balance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>总资产</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>¥{Number(selectedUser.total_asset || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>冻结资金</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#f97316' }}>¥{Number(selectedUser.frozen_balance || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              
              {/* 风险等级说明 */}
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: RISK_LEVEL_INFO[selectedUser.risk_level as keyof typeof RISK_LEVEL_INFO]?.color, marginBottom: '8px' }}>
                  📊 风险等级：{selectedUser.risk_level}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                  {RISK_LEVEL_INFO[selectedUser.risk_level as keyof typeof RISK_LEVEL_INFO]?.desc}
                </p>
              </div>
              
              {/* 状态与角色 */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1, background: 'var(--color-surface-active)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>状态</p>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: selectedUser.status === 'ACTIVE' ? '#22c55e' : '#ef4444'
                  }}>
                    {selectedUser.status === 'ACTIVE' ? '✓ 已激活' : '✕ 已封禁'}
                  </span>
                </div>
                <div style={{ flex: 1, background: 'var(--color-surface-active)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>角色</p>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                    {selectedUser.role === 'ADMIN' ? '管理员' : selectedUser.role === 'OPERATOR' ? '操作员' : '普通用户'}
                  </span>
                </div>
              </div>
              
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                注册时间：{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('zh-CN') : '-'}
              </p>
            </div>
            
            <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleResetPassword(selectedUser.id)}
                style={{
                  padding: '10px 16px',
                  background: '#f97316',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                重置密码
              </button>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsFundModalOpen(true);
                }}
                style={{
                  padding: '10px 16px',
                  background: '#22c55e',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                资金操作
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  padding: '10px 16px',
                  background: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                关闭
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 新建用户弹窗 */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '480px'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>新建用户</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateUser} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#f97316', marginBottom: '4px' }}>⚠️ 重要提示</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>新建用户资金默认为 <span style={{ color: '#22c55e', fontWeight: 'bold' }}>¥0</span>，如需调整请创建后使用"上下分"功能</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>用户名 *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>手机号（登录账号） *</label>
                  <input 
                    required 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    placeholder="将作为登录账号"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>真实姓名</label>
                <input 
                  type="text" 
                  value={formData.real_name} 
                  onChange={e => setFormData({...formData, real_name: e.target.value})} 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-surface-active)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>身份证号</label>
                <input 
                  type="text" 
                  value={formData.id_card} 
                  onChange={e => setFormData({...formData, id_card: e.target.value})} 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-surface-active)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>角色</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="USER">普通用户</option>
                    <option value="OPERATOR">操作员</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>风险等级</label>
                  <select 
                    value={formData.risk_level} 
                    onChange={e => setFormData({...formData, risk_level: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="保守型">保守型</option>
                    <option value="稳健型">稳健型</option>
                    <option value="积极型">积极型</option>
                  </select>
                </div>
              </div>
              
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>初始密码</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>123456</p>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>用户首次登录后请提示修改密码</p>
              </div>

              <button 
                disabled={submitting} 
                type="submit" 
                style={{
                  width: '100%',
                  padding: '12px',
                  background: submitting ? 'var(--color-border)' : '#3b82f6',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? '创建中...' : '确认创建'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '480px'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>编辑用户</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ padding: '20px' }}>
              {/* 登录信息提示 */}
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>🔐 登录账号</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>{selectedUser?.phone || selectedUser?.email || '未设置'}</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>用户名</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>真实姓名</label>
                  <input 
                    type="text" 
                    value={formData.real_name} 
                    onChange={e => setFormData({...formData, real_name: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>手机号</label>
                  <input 
                    required 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>身份证号</label>
                  <input 
                    type="text" 
                    value={formData.id_card} 
                    onChange={e => setFormData({...formData, id_card: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>角色</label>
                  <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="USER">普通用户</option>
                    <option value="OPERATOR">操作员</option>
                    <option value="ADMIN">管理员</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>风险等级</label>
                  <select 
                    value={formData.risk_level} 
                    onChange={e => setFormData({...formData, risk_level: e.target.value})} 
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--color-surface-active)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="保守型">保守型</option>
                    <option value="稳健型">稳健型</option>
                    <option value="积极型">积极型</option>
                  </select>
                </div>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>用户状态</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})} 
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--color-surface-active)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ACTIVE">活跃</option>
                  <option value="BANNED">封禁</option>
                  <option value="PENDING">待审核</option>
                </select>
              </div>

              {/* 当前资产信息 */}
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>💰 当前资产（资金变更请使用"上下分"功能）</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>账户余额</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>¥{Number(selectedUser?.balance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>总资产</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>¥{Number(selectedUser?.total_asset || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>冻结资金</p>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>¥{Number(selectedUser?.frozen_balance || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <button 
                disabled={submitting} 
                type="submit" 
                style={{
                  width: '100%',
                  padding: '12px',
                  background: submitting ? 'var(--color-border)' : '#3b82f6',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? '保存中...' : '确认修改'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* 上下分弹窗 */}
      {isFundModalOpen && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'var(--color-surface)',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              width: '100%',
              maxWidth: '400px'
            }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>资金操作 (上下分)</h3>
              <button onClick={() => setIsFundModalOpen(false)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ background: 'var(--color-surface-active)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>当前用户</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{selectedUser.username || '未设置'}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>ID: {selectedUser.id?.substring(0, 8)}...</p>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>当前余额: </span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e' }}>¥{Number(selectedUser.balance || 0).toLocaleString()}</span>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>操作金额</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="请输入金额"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--color-surface-active)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 'bold' }}>备注信息</label>
                <textarea 
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="请输入操作备注"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--color-surface-active)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    height: '80px',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  onClick={() => handleFundOperation('RECHARGE')}
                  style={{
                    padding: '12px',
                    background: '#22c55e',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ⬆️ 确认上分
                </button>
                <button 
                  onClick={() => handleFundOperation('WITHDRAW')}
                  style={{
                    padding: '12px',
                    background: '#ef4444',
                    color: 'var(--color-text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ⬇️ 确认下分
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
