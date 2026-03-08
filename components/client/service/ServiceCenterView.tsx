"use strict";

import React, { useState, useCallback, memo } from 'react';
import { 
  Download, 
  Clock, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle,
  ArrowLeft,
  History
} from 'lucide-react';

interface DownloadPackage {
  id: string;
  platform: 'windows' | 'mac' | 'android' | 'ios';
  name: string;
  version: string;
  size: string;
  updateDate: string;
  downloadUrl: string;
  description: string;
  features: string[];
  requirements: string;
  icon: React.ReactNode;
}

interface ServiceCenterViewProps {
  onBack?: () => void;
}

const downloadPackages: DownloadPackage[] = [
  {
    id: 'windows',
    platform: 'windows',
    name: 'Windows 客户端',
    version: 'v1.0.0',
    size: '76.2 MB',
    updateDate: '2025-03-09',
    downloadUrl: 'https://github.com/AthenDrakomin-hub/yinhezhengquan-zhengyu/releases/download/%E9%93%B6%E6%B2%B3%E8%AF%81%E5%88%B8%C2%B7%E8%AF%81%E8%A3%95%E4%BA%A4%E6%98%93%E5%8D%95%E5%85%83_Setup_1.0.0.exe/_Setup_1.0.0.exe',
    description: '适用于 Windows 10/11 操作系统，提供完整的交易功能和专业分析工具',
    features: ['实时行情推送', '多窗口交易', '专业K线分析', '条件单管理', '资产分析报告'],
    requirements: 'Windows 10 或更高版本，4GB RAM，500MB 可用空间',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
      </svg>
    ),
  },
  {
    id: 'mac',
    platform: 'mac',
    name: 'macOS 客户端',
    version: 'v2.5.1',
    size: '156 MB',
    updateDate: '2024-03-08',
    downloadUrl: '/downloads/zhengyu-2.5.1.dmg',
    description: '专为 macOS 设计，原生体验，支持 M1/M2 芯片',
    features: ['原生 macOS 体验', 'Touch Bar 支持', '通知中心集成', '深色模式', '快捷键支持'],
    requirements: 'macOS 11.0 或更高版本，4GB RAM，500MB 可用空间',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    id: 'android',
    platform: 'android',
    name: 'Android 客户端',
    version: 'v2.5.0',
    size: '45 MB',
    updateDate: '2024-03-06',
    downloadUrl: '/downloads/zhengyu-2.5.0.apk',
    description: '支持 Android 8.0 及以上系统，随时随地掌控投资',
    features: ['指纹/面容登录', '实时行情提醒', '快捷交易', '资产全景', '智能选股'],
    requirements: 'Android 8.0 或更高版本，100MB 可用空间',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.4-.59-2.94-.92-4.47-.92s-3.07.33-4.47.92L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
      </svg>
    ),
  },
  {
    id: 'ios',
    platform: 'ios',
    name: 'iOS 客户端',
    version: 'v2.5.0',
    size: '52 MB',
    updateDate: '2024-03-06',
    downloadUrl: 'https://apps.apple.com/app/zhengyu',
    description: '支持 iOS 13.0 及以上系统，App Store 下载',
    features: ['Face ID / Touch ID', '小组件支持', 'Siri 快捷指令', '深色模式', 'iPad 适配'],
    requirements: 'iOS 13.0 或更高版本，150MB 可用空间',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
];

const platformColors: Record<string, { bg: string; text: string; border: string }> = {
  windows: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  mac: { bg: 'bg-gray-500/20', text: 'text-gray-300', border: 'border-gray-500/30' },
  android: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  ios: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
};

const ServiceCenterView: React.FC<ServiceCenterViewProps> = ({ onBack }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const handleDownload = async (pkg: DownloadPackage) => {
    setDownloading(pkg.id);
    
    // iOS 跳转 App Store
    if (pkg.platform === 'ios') {
      window.open(pkg.downloadUrl, '_blank');
      setDownloading(null);
      return;
    }
    
    // Windows 客户端使用 fetch + blob 方式下载（解决跨域）
    if (pkg.platform === 'windows') {
      try {
        const response = await fetch(pkg.downloadUrl);
        if (!response.ok) {
          throw new Error(`下载失败: ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = '银河证券·证裕交易单元_Setup_1.0.0.exe';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('下载失败:', error);
        alert('下载失败，请稍后重试');
      }
      setDownloading(null);
      return;
    }
    
    // 其他平台直接下载
    const link = document.createElement('a');
    link.href = pkg.downloadUrl;
    link.download = pkg.downloadUrl.split('/').pop() || '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setDownloading(null);
  };

  return (
    <div className="min-h-full animate-slide-up">
      {/* 头部 */}
      <div className="glass-card m-4 mb-0 p-6 border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="text-xl font-black text-[var(--color-text-primary)]">服务中心</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">下载银河证券证裕交易客户端</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Clock size={14} />
            <span>更新时间：2024-03-08</span>
          </div>
        </div>
      </div>

      {/* 下载卡片列表 */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {downloadPackages.map((pkg) => {
          const colors = platformColors[pkg.platform];
          const isDownloading = downloading === pkg.id;
          
          return (
            <div
              key={pkg.id}
              className={`glass-card border-[var(--color-border)] overflow-hidden transition-all duration-300 hover:border-[var(--color-primary)]/30 ${
                selectedPlatform === pkg.id ? 'ring-2 ring-[var(--color-primary)]/50' : ''
              }`}
            >
              {/* 卡片头部 */}
              <div className={`p-4 ${colors.bg} border-b border-[var(--color-border)]`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center border ${colors.border}`}>
                      {pkg.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{pkg.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs font-medium ${colors.text}`}>{pkg.version}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{pkg.size}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{pkg.updateDate}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(pkg)}
                    disabled={isDownloading}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                      isDownloading
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed'
                        : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        下载中...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        立即下载
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 卡片内容 */}
              <div className="p-4 space-y-4">
                {/* 描述 */}
                <p className="text-sm text-[var(--color-text-secondary)]">{pkg.description}</p>

                {/* 功能特点 */}
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">主要功能</h4>
                  <div className="flex flex-wrap gap-2">
                    {pkg.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-medium bg-white/5 text-[var(--color-text-secondary)] rounded-lg border border-white/10"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 系统要求 */}
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">系统要求</h4>
                  <p className="text-xs text-[var(--color-text-muted)]">{pkg.requirements}</p>
                </div>

                {/* 展开/收起按钮 */}
                <button
                  onClick={() => setSelectedPlatform(selectedPlatform === pkg.id ? null : pkg.id)}
                  className="w-full py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors flex items-center justify-center gap-1"
                >
                  {selectedPlatform === pkg.id ? (
                    <>
                      收起详情
                      <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      查看详情
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 帮助说明 */}
      <div className="p-4">
        <div className="glass-card border-[var(--color-border)] p-6">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <HelpCircle size={20} className="text-[var(--color-primary)]" />
            安装帮助
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">Windows 安装步骤</h4>
              <ol className="text-sm text-[var(--color-text-secondary)] space-y-1 list-decimal list-inside">
                <li>点击"立即下载"按钮下载安装包</li>
                <li>双击运行 zhengyu-setup.exe</li>
                <li>按照安装向导完成安装</li>
                <li>启动客户端并登录账户</li>
              </ol>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">Android 安装步骤</h4>
              <ol className="text-sm text-[var(--color-text-secondary)] space-y-1 list-decimal list-inside">
                <li>下载 APK 安装包</li>
                <li>允许安装未知来源应用</li>
                <li>点击安装包进行安装</li>
                <li>打开应用并登录账户</li>
              </ol>
            </div>
          </div>

          {/* 联系支持 */}
          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--color-text-secondary)]">
                如遇安装问题，请联系客服获取帮助
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-white/10 transition-colors">
                <MessageCircle size={16} />
                联系客服
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 版本历史 */}
      <div className="p-4 pt-0">
        <div className="glass-card border-[var(--color-border)] p-6">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <History size={20} className="text-[var(--color-primary)]" />
            更新日志
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                <div className="w-0.5 h-full bg-[var(--color-border)]" />
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">v2.5.1</span>
                  <span className="text-xs text-[var(--color-text-muted)]">2024-03-08</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  新增涨停打板功能，优化交易性能，修复已知问题
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-border)]" />
                <div className="w-0.5 h-full bg-[var(--color-border)]" />
              </div>
              <div className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">v2.5.0</span>
                  <span className="text-xs text-[var(--color-text-muted)]">2024-03-01</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  全新UI设计，新增条件单功能，支持多账户切换
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-border)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">v2.4.0</span>
                  <span className="text-xs text-[var(--color-text-muted)]">2024-02-15</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  新增IPO申购功能，优化行情推送，提升稳定性
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCenterView;
