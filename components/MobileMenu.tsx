import React, { useState } from 'react';
import { ICONS } from '../constants';

interface MobileMenuProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  userRole: string;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ activeTab, onNavigate, userRole }) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: '首页', icon: ICONS.Home },
    { id: 'market', label: '行情', icon: ICONS.TrendingUp },
    { id: 'trade', label: '交易', icon: ICONS.DollarSign },
    { id: 'profile', label: '我的', icon: ICONS.User },
  ];

  if (userRole === 'admin') {
    menuItems.push({ id: 'admin', label: '管理', icon: ICONS.Settings });
  }

  return (
    <>
      {/* 移动端底部导航 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="flex justify-around items-center h-16">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-[#00D4AA]' : 'text-slate-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1 font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 移动端汉堡菜单 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-slate-800 rounded-lg"
      >
        {isOpen ? <ICONS.X size={24} /> : <ICONS.Menu size={24} />}
      </button>

      {/* 移动端侧边栏 */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-64 bg-slate-900 z-50 p-6 overflow-y-auto">
            <div className="space-y-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#00D4AA]/20 text-[#00D4AA]'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MobileMenu;
