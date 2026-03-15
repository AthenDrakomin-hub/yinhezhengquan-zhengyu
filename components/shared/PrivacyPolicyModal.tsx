/**
 * 隐私政策弹窗组件
 * 按银河证券官方App截图还原
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onDisagree: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onAgree,
  onDisagree,
}) => {
  if (!isOpen) return null;

  return (
    <div className="galaxy-overlay animate-fade-in">
      <div className="galaxy-modal animate-scale-in">
        {/* 弹窗头部 */}
        <div className="galaxy-modal-header">
          <h2 className="galaxy-modal-title">隐私政策</h2>
        </div>

        {/* 弹窗内容 */}
        <div className="galaxy-modal-body text-sm text-[--color-text-primary] leading-relaxed">
          <p className="mb-3">
            欢迎使用中国银河证券App。为了更好地保障您的个人信息安全，我们需要向您说明个人信息收集、使用、存储、共享的情况：
          </p>
          
          <div className="mb-3">
            <p className="mb-1">一、我们如何收集和使用您的个人信息</p>
            <p className="text-[--color-text-secondary] text-sm pl-4">
              我们会遵循合法、正当、必要的原则，基于以下目的收集和使用您的个人信息：
            </p>
            <ul className="text-[--color-text-secondary] text-sm pl-6 list-disc space-y-1 mt-1">
              <li>为您开立证券账户及提供交易服务</li>
              <li>完成身份认证及风险测评</li>
              <li>提供行情资讯及投资顾问服务</li>
              <li>保障交易安全及系统运行</li>
            </ul>
          </div>

          <div className="mb-3">
            <p className="mb-1">二、我们如何使用Cookies和同类技术</p>
            <p className="text-[--color-text-secondary] text-sm pl-4">
              为确保网站正常运转，我们会在您的计算机或移动设备上存储Cookies、Flash Cookies或浏览器提供的其他本地存储。
            </p>
          </div>

          <div className="mb-3">
            <p className="mb-1">三、我们如何共享、转让、公开披露您的个人信息</p>
            <p className="text-[--color-text-secondary] text-sm pl-4">
              我们不会向第三方共享、转让您的个人信息，除非获得您的明确同意或法律法规另有规定。
            </p>
          </div>

          <div className="mb-3">
            <p className="mb-1">四、您的权利</p>
            <p className="text-[--color-text-secondary] text-sm pl-4">
              您对您的个人信息享有知情权、选择权、更正权、删除权等权利。
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-[--color-text-secondary]">
              完整的隐私政策内容请查看
            </p>
            <a 
              href="#" 
              className="galaxy-link text-sm font-medium"
              onClick={(e) => {
                e.preventDefault();
                // TODO: 打开完整隐私政策页面
              }}
            >
              《中国银河证券隐私政策》
            </a>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="galaxy-modal-footer">
          <button
            className="galaxy-modal-btn galaxy-modal-btn-secondary"
            onClick={onDisagree}
          >
            不同意
          </button>
          <button
            className="galaxy-modal-btn galaxy-modal-btn-primary"
            onClick={onAgree}
          >
            我同意
          </button>
        </div>
      </div>

      {/* 底部品牌区 */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {/* 银河证券Logo */}
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#E63946"/>
            <path d="M20 8L24 16H16L20 8Z" fill="white"/>
            <path d="M12 20L20 24L28 20L20 32L12 20Z" fill="white"/>
          </svg>
          <span className="text-sm font-medium text-white">中国银河证券 | CGS</span>
        </div>
        <span className="galaxy-tag galaxy-tag-ipv6 text-[10px]">IPv6</span>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
