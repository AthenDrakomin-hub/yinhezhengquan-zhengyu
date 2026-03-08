/**
 * 内容管理 - 整合研报、投教、日历、横幅、新股管理
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS } from '@/lib/constants';

// 子菜单配置
const subMenus = [
  { id: 'reports', label: '研报管理', icon: ICONS.Book, path: '/admin/reports' },
  { id: 'education', label: '投教内容', icon: ICONS.Globe, path: '/admin/education' },
  { id: 'calendar', label: '日历事件', icon: ICONS.Calendar, path: '/admin/calendar' },
  { id: 'banners', label: '横幅公告', icon: ICONS.Camera, path: '/admin/banners' },
  { id: 'ipos', label: '新股管理', icon: ICONS.Chart, path: '/admin/ipos' },
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

  // 统计卡片数据
  const stats = [
    { label: '研报总数', value: '12', color: 'bg-blue-500' },
    { label: '投教文章', value: '24', color: 'bg-emerald-500' },
    { label: '日历事件', value: '8', color: 'bg-orange-500' },
    { label: '横幅公告', value: '5', color: 'bg-purple-500' },
    { label: '新股信息', value: '3', color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-black text-industrial-900">内容管理</h1>
        <p className="text-sm text-industrial-600 mt-1">管理研报、投教、日历、横幅、新股等内容</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="industrial-card p-4">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-white text-lg font-bold">{stat.value}</span>
            </div>
            <p className="text-xs font-bold text-industrial-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 子菜单标签 */}
      <div className="bg-white rounded-xl border border-industrial-200 overflow-hidden">
        <div className="flex border-b border-industrial-200">
          {subMenus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => {
                setActiveTab(menu.id);
                navigate(menu.path);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold transition-colors ${
                activeTab === menu.id
                  ? 'bg-accent-red text-white'
                  : 'text-industrial-600 hover:bg-industrial-50'
              }`}
            >
              <menu.icon size={18} />
              {menu.label}
            </button>
          ))}
        </div>

        <div className="p-8 text-center">
          <ICONS.Settings size={48} className="text-industrial-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-industrial-700 mb-2">请选择子功能</h3>
          <p className="text-sm text-industrial-500 mb-4">点击上方标签进入对应的管理页面</p>
          <button
            onClick={() => navigate(`/admin/${activeTab}`)}
            className="px-6 py-2 bg-accent-red text-white rounded-lg text-sm font-bold hover:bg-accent-dark-red transition-colors"
          >
            进入 {subMenus.find(m => m.id === activeTab)?.label}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminContentManagement;
