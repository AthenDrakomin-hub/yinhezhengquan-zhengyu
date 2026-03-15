/**
 * 系统权限管理页面
 * 展示和管理应用所需的系统权限
 */

import React, { useState } from 'react';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: string;
  granted: boolean;
  required: boolean;
  usage: string;
}

const PermissionSettings: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'camera',
      name: '相机权限',
      description: '用于扫描二维码、身份证识别等功能',
      icon: '📷',
      granted: true,
      required: false,
      usage: '用于扫描股票代码二维码、身份证认证等功能'
    },
    {
      id: 'storage',
      name: '存储权限',
      description: '用于保存交易记录、账单等数据到本地',
      icon: '💾',
      granted: true,
      required: true,
      usage: '保存交易截图、导出账单、缓存行情数据'
    },
    {
      id: 'location',
      name: '位置权限',
      description: '用于提供附近营业部信息',
      icon: '📍',
      granted: false,
      required: false,
      usage: '查找附近的证券营业部、提供本地化服务'
    },
    {
      id: 'notification',
      name: '通知权限',
      description: '用于接收交易提醒、行情预警等通知',
      icon: '🔔',
      granted: true,
      required: false,
      usage: '交易成交通知、价格预警通知、系统公告推送'
    },
    {
      id: 'phone',
      name: '电话权限',
      description: '用于快速拨打客服热线',
      icon: '📞',
      granted: false,
      required: false,
      usage: '一键拨打客服热线、联系客户经理'
    },
    {
      id: 'biometric',
      name: '生物识别',
      description: '用于指纹/面容登录验证',
      icon: '🔐',
      granted: true,
      required: false,
      usage: '指纹登录、面容识别、交易确认'
    },
  ]);

  // 切换权限
  const togglePermission = (id: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === id ? { ...p, granted: !p.granted } : p
    ));
  };

  // 打开系统设置
  const openSystemSettings = () => {
    alert('请在系统设置中管理应用权限');
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* 说明 */}
      <div className="bg-white px-4 py-3 mb-2">
        <p className="text-sm text-[#666666]">
          为保障您的资金和信息安全，我们会在必要场景申请相应权限。您可随时在系统设置中调整授权。
        </p>
      </div>

      {/* 权限列表 */}
      <div className="bg-white">
        {permissions.map((permission, index) => (
          <div
            key={permission.id}
            className={`px-4 py-4 ${index > 0 ? 'border-t border-[#F0F0F0]' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-2xl">{permission.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-[#333333]">{permission.name}</span>
                    {permission.required && (
                      <span className="text-xs px-1.5 py-0.5 bg-[#FEF2F2] text-[#E63946] rounded">必需</span>
                    )}
                  </div>
                  <p className="text-sm text-[#666666] mt-1">{permission.description}</p>
                </div>
              </div>

              {/* 开关 */}
              <button
                onClick={() => togglePermission(permission.id)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  permission.granted ? 'bg-[#0066CC]' : 'bg-[#E5E5E5]'
                }`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  permission.granted ? 'translate-x-5 right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* 使用说明 */}
            {permission.granted && (
              <div className="mt-2 ml-11">
                <p className="text-xs text-[#999999]">用途：{permission.usage}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 系统设置按钮 */}
      <div className="px-4 mt-4">
        <button
          onClick={openSystemSettings}
          className="w-full py-3 border border-[#0066CC] text-[#0066CC] rounded-lg font-medium"
        >
          打开系统设置
        </button>
      </div>

      {/* 隐私声明 */}
      <div className="px-4 mt-4 mb-4">
        <p className="text-xs text-[#999999] text-center">
          我们严格遵守《个人信息保护法》，仅在您授权的范围内使用权限
        </p>
      </div>
    </div>
  );
};

export default PermissionSettings;
