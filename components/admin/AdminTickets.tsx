import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '@/lib/constants';
import { chatService } from '@/services/chatService';
import { supabase } from '@/lib/supabase';
import Pagination from '@/components/shared/Pagination';

const ITEMS_PER_PAGE = 10;

// 工单类型配置
const TICKET_TYPES = [
  { id: 'ACCOUNT', label: '账户问题', color: '#3b82f6' },
  { id: 'TRADE', label: '交易问题', color: '#ef4444' },
  { id: 'WITHDRAW', label: '资金问题', color: '#22c55e' },
  { id: 'TECHNICAL', label: '技术问题', color: '#f97316' },
  { id: 'COMPLAINT', label: '投诉建议', color: '#a855f7' },
  { id: 'OTHER', label: '其他问题', color: '#64748b' }
];

interface TicketWithUser {
  id: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  lastUpdate: string;
  userId: string;
  username: string;
  email: string;
  lastMessageAt: string;
  unreadCountUser: number;
  unreadCountAdmin: number;
  messageCount: number;
  queueStatus?: 'WAITING' | 'PROCESSING' | 'COMPLETED';
  guestName?: string;
  guestPhone?: string;
  ticket_type?: string;
  assigned_admin_id?: string;
  assigned_admin_name?: string;
}

interface AdminUser {
  id: string;
  username: string;
  real_name?: string;
}

const AdminTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUser | null>(null);
  const [assignToAdminId, setAssignToAdminId] = useState<string>('');

  // 获取当前管理员ID和管理员列表
  useEffect(() => {
    const getAdminInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentAdminId(user.id);

      // 获取所有管理员
      const { data: adminData } = await supabase
        .from('profiles')
        .select('id, username, real_name')
        .in('role', ['ADMIN', 'SUPER_ADMIN']);
      
      if (adminData) setAdmins(adminData as AdminUser[]);
    };
    getAdminInfo();
  }, []);

  // 加载工单列表
  useEffect(() => {
    loadTickets();
    
    const unsubscribe = chatService.subscribeToTickets(() => {
      loadTickets();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await chatService.getAllTicketsForAdmin();
      setTickets(data);
    } catch (error) {
      console.error('加载工单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤工单
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.guestPhone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || 
      ticket.status === statusFilter || 
      ticket.queueStatus === statusFilter;
    
    const matchesType = typeFilter === 'ALL' || ticket.ticket_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 接取工单
  const handleClaimTicket = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentAdminId) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          queue_status: 'PROCESSING',
          assigned_admin_id: currentAdminId,
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      
      await supabase.from('messages').insert({
        ticket_id: ticketId,
        sender_id: 'system',
        sender_type: 'system',
        content: '客服专员已接入会话，请问有什么可以帮助您？',
        is_read: false,
      });

      loadTickets();
      navigate(`/admin/tickets/${ticketId}`);
    } catch (err) {
      console.error('接取工单失败:', err);
      alert('接取工单失败，请重试');
    }
  };

  // 分配工单
  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignToAdminId) return;
    
    try {
      const admin = admins.find(a => a.id === assignToAdminId);
      
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_admin_id: assignToAdminId,
          assigned_admin_name: admin?.real_name || admin?.username,
          queue_status: 'PROCESSING',
          status: 'IN_PROGRESS',
          started_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      // 发送系统消息
      await supabase.from('messages').insert({
        ticket_id: selectedTicket.id,
        sender_id: 'system',
        sender_type: 'system',
        content: `工单已分配给 ${admin?.real_name || admin?.username}，请耐心等待回复。`,
        is_read: false,
      });

      alert('工单分配成功');
      setAssignModalOpen(false);
      setSelectedTicket(null);
      setAssignToAdminId('');
      loadTickets();
    } catch (err) {
      console.error('分配工单失败:', err);
      alert('分配工单失败，请重试');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取状态信息
  const getStatusInfo = (status: string, queueStatus?: string) => {
    if (queueStatus === 'WAITING') return { text: '排队中', color: '#f97316', bg: '#f9731620' };
    if (queueStatus === 'PROCESSING') return { text: '服务中', color: '#22c55e', bg: '#22c55e20' };
    switch (status) {
      case 'OPEN': return { text: '待处理', color: '#3b82f6', bg: '#3b82f620' };
      case 'IN_PROGRESS': return { text: '处理中', color: '#eab308', bg: '#eab30820' };
      case 'CLOSED': return { text: '已关闭', color: '#64748b', bg: '#64748b20' };
      default: return { text: status, color: '#64748b', bg: '#64748b20' };
    }
  };

  // 获取工单类型信息
  const getTypeInfo = (type?: string) => {
    const found = TICKET_TYPES.find(t => t.id === type);
    return found || { label: '未分类', color: '#64748b' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 标题和统计 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>工单管理</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>管理用户提交的客服工单和对话</p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>总工单数</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{tickets.length}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>排队中</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>
              {tickets.filter(t => t.queueStatus === 'WAITING').length}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>待处理</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
              {tickets.filter(t => t.status === 'OPEN' && !t.queueStatus).length}
            </p>
          </div>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* 搜索框 */}
          <div style={{ gridColumn: 'span 2', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>🔍</span>
            <input
              type="text"
              placeholder="搜索工单ID/主题/用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: 'white',
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
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">全部状态</option>
            <option value="WAITING">排队中</option>
            <option value="PROCESSING">服务中</option>
            <option value="OPEN">待处理</option>
            <option value="CLOSED">已关闭</option>
          </select>
          
          {/* 类型筛选 */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">全部类型</option>
            {TICKET_TYPES.map(type => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
          筛选结果: <span style={{ color: 'white', fontWeight: 'bold' }}>{filteredTickets.length}</span> 条工单
        </div>
      </div>

      {/* 工单列表 */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '13px' }}>加载中...</p>
          </div>
        ) : paginatedTickets.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '13px' }}>暂无工单</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {paginatedTickets.map((ticket) => {
              const statusInfo = getStatusInfo(ticket.status, ticket.queueStatus);
              const typeInfo = getTypeInfo(ticket.ticket_type);
              
              return (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #334155',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#0f172a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: typeInfo.color + '20',
                          color: typeInfo.color
                        }}>
                          {typeInfo.label}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: statusInfo.bg,
                          color: statusInfo.color
                        }}>
                          {statusInfo.text}
                        </span>
                        {ticket.unreadCountUser > 0 && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            background: '#ef4444',
                            color: 'white'
                          }}>
                            {ticket.unreadCountUser}条新消息
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                        {ticket.subject || '无主题'}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {ticket.guestName ? `访客: ${ticket.guestName}` : ticket.username} · {ticket.email || ticket.guestPhone || ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{formatTime(ticket.lastMessageAt)}</p>
                      <p style={{ fontSize: '10px', color: '#64748b' }}>{ticket.messageCount}条消息</p>
                      {ticket.assigned_admin_name && (
                        <p style={{ fontSize: '10px', color: '#22c55e', marginTop: '4px' }}>
                          负责人: {ticket.assigned_admin_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {!ticket.assigned_admin_id && ticket.queueStatus === 'WAITING' && (
                      <button
                        onClick={(e) => handleClaimTicket(ticket.id, e)}
                        style={{
                          padding: '6px 12px',
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        接取工单
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicket(ticket);
                        setAssignToAdminId(ticket.assigned_admin_id || '');
                        setAssignModalOpen(true);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      分配工单
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/tickets/${ticket.id}`);
                      }}
                      style={{
                        padding: '6px 12px',
                        background: '#334155',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {filteredTickets.length > ITEMS_PER_PAGE && (
          <div style={{ padding: '16px', borderTop: '1px solid #334155' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTickets.length}
              pageSize={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* 分配工单弹窗 */}
      {assignModalOpen && selectedTicket && (
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
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            width: '100%',
            maxWidth: '400px'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>分配工单</h3>
              <button onClick={() => setAssignModalOpen(false)} style={{ color: '#64748b', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>工单主题</p>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{selectedTicket.subject || '无主题'}</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                  分配给管理员
                </label>
                <select
                  value={assignToAdminId}
                  onChange={(e) => setAssignToAdminId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  <option value="">请选择管理员</option>
                  {admins.map(admin => (
                    <option key={admin.id} value={admin.id}>
                      {admin.real_name || admin.username}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setAssignModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleAssignTicket}
                  disabled={!assignToAdminId}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: assignToAdminId ? '#3b82f6' : '#334155',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: assignToAdminId ? 'pointer' : 'not-allowed'
                  }}
                >
                  确认分配
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
