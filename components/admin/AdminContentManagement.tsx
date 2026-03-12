/**
 * 内容管理 - 整合研报、投教、日历、横幅、新股管理
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '@/lib/constants';

// 子菜单配置
const subMenus = [
  { id: 'reports', label: '研报管理', icon: '📊', path: '/admin/reports', desc: '管理研究报告' },
  { id: 'education', label: '投教内容', icon: '📚', path: '/admin/education', desc: '投资者教育内容' },
  { id: 'calendar', label: '日历事件', icon: '📅', path: '/admin/calendar', desc: '重要日期事件' },
  { id: 'banners', label: '横幅公告', icon: '📢', path: '/admin/banners', desc: '首页横幅和公告' },
  { id: 'ipos', label: '新股管理', icon: '🆕', path: '/admin/ipos', desc: '新股申购信息' },
];

const AdminContentManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('reports');

  // 检测当前激活的子菜单
  React.useEffect(() => {
    const currentPath = location.pathname;
    const activeMenu = subMenus.find(m => currentPath.includes(m.id));
    if (activeMenu) {
      setActiveTab(activeMenu.id);
    }
  }, [location.pathname]);

  // 统计卡片数据（示例）
  const stats = [
    { label: '研报总数', value: '12', color: '#3b82f6' },
    { label: '投教文章', value: '24', color: '#22c55e' },
    { label: '日历事件', value: '8', color: '#f97316' },
    { label: '横幅公告', value: '5', color: '#a855f7' },
    { label: '新股信息', value: '3', color: '#ec4899' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 标题 */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>内容管理</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8' }}>管理研报、投教、日历、横幅、新股等内容</p>
      </div>

      {/* 统计概览 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {stats.map((stat, index) => (
          <div 
            key={index} 
            style={{
              background: '#1e293b',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #334155'
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: stat.color + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: stat.color }}>{stat.value}</span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 子菜单标签 */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
          {subMenus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                setActiveTab(menu.id);
                navigate(menu.path);
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '16px',
                fontSize: '13px',
                fontWeight: 'bold',
                background: activeTab === menu.id ? '#ef4444' : 'transparent',
                color: activeTab === menu.id ? 'white' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span>{menu.icon}</span>
              {menu.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            background: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <span style={{ fontSize: '28px' }}>⚙️</span>
          </div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
            请选择子功能
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            点击上方标签进入对应的管理页面
          </p>
          <button
            onClick={() => navigate(`/admin/${activeTab}`)}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            进入 {subMenus.find(m => m.id === activeTab)?.label}
          </button>
        </div>
      </div>

      {/* 功能说明卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {subMenus.map((menu) => (
          <div
            key={menu.id}
            onClick={() => navigate(menu.path)}
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #334155',
              cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#334155'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{menu.icon}</span>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{menu.label}</h4>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b' }}>{menu.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminContentManagement;
