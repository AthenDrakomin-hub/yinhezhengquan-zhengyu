"use strict";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// 引导步骤类型
interface TourStep {
  id: string;
  target: string; // CSS选择器
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

// 新手引导组件
interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const step = steps[currentStep];

  // 获取目标元素位置
  useEffect(() => {
    if (!isOpen || !step) return;

    const findTarget = () => {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 添加高亮样式
        element.classList.add('tour-highlight');
        return () => element.classList.remove('tour-highlight');
      }
    };

    const cleanup = findTarget();
    
    // 延迟显示动画
    setTimeout(() => setIsVisible(true), 100);
    
    return cleanup;
  }, [isOpen, step]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 200);
    } else {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
      }, 200);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !step || !targetRect) return null;

  // 计算提示框位置
  const position = step.position || 'bottom';
  const padding = 16;
  
  let tooltipStyle: React.CSSProperties = {};
  
  switch (position) {
    case 'top':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top - padding,
        transform: 'translate(-50%, -100%)'
      };
      break;
    case 'bottom':
      tooltipStyle = {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.bottom + padding,
        transform: 'translateX(-50%)'
      };
      break;
    case 'left':
      tooltipStyle = {
        left: targetRect.left - padding,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translate(-100%, -50%)'
      };
      break;
    case 'right':
      tooltipStyle = {
        left: targetRect.right + padding,
        top: targetRect.top + targetRect.height / 2,
        transform: 'translateY(-50%)'
      };
      break;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/60 transition-opacity duration-300"
        style={{ opacity: isVisible ? 1 : 0 }}
      />
      
      {/* 高亮窗口 */}
      <div
        className="absolute rounded-lg shadow-lg transition-all duration-300"
        style={{
          left: targetRect.left - 8,
          top: targetRect.top - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          opacity: isVisible ? 1 : 0,
          border: '3px solid var(--color-primary)',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)'
        }}
      />
      
      {/* 提示框 */}
      <div
        className="absolute max-w-xs bg-[var(--color-surface)] rounded-xl p-4 shadow-2xl transition-all duration-300"
        style={{
          ...tooltipStyle,
          opacity: isVisible ? 1 : 0,
          transform: `${tooltipStyle.transform} scale(${isVisible ? 1 : 0.9})`
        }}
      >
        {/* 标题 */}
        <h4 className="text-base font-bold text-[var(--color-text-primary)] mb-2">
          {step.title}
        </h4>
        
        {/* 内容 */}
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          {step.content}
        </p>
        
        {/* 进度 */}
        <div className="flex items-center gap-1 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep 
                  ? 'w-6 bg-[var(--color-primary)]' 
                  : i < currentStep 
                    ? 'bg-[var(--color-primary)]' 
                    : 'bg-[var(--color-surface-hover)]'
              }`}
            />
          ))}
        </div>
        
        {/* 按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            跳过
          </button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] bg-[var(--color-bg)] rounded-lg hover:opacity-80"
              >
                上一步
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-bold text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90"
            >
              {currentStep === steps.length - 1 ? '完成' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 欢迎弹窗
interface WelcomeModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onStartTour,
  onSkip
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setVisible(true), 50);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className={`bg-[var(--color-surface)] rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-transform duration-300 ${
          visible ? 'scale-100' : 'scale-90'
        }`}
      >
        {/* 图标 */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-2xl flex items-center justify-center">
          <span className="text-3xl">👋</span>
        </div>
        
        {/* 标题 */}
        <h3 className="text-xl font-bold text-center text-[var(--color-text-primary)] mb-2">
          欢迎使用日斗投资单元
        </h3>
        
        {/* 描述 */}
        <p className="text-sm text-center text-[var(--color-text-secondary)] mb-6">
          让我们花1分钟时间，快速了解系统的核心功能
        </p>
        
        {/* 功能列表 */}
        <div className="space-y-3 mb-6">
          {[
            { icon: '📈', text: '沪深行情与自选股管理' },
            { icon: '💹', text: '股票交易与新股申购' },
            { icon: '💰', text: '财富管理与银证转账' },
            { icon: '🤖', text: 'AI智能选股与客服' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm text-[var(--color-text-primary)]">{item.text}</span>
            </div>
          ))}
        </div>
        
        {/* 按钮 */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onStartTour}
            className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            开始引导
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-primary)]"
          >
            跳过，我自己探索
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 引导管理器
export const useOnboarding = (key: string = 'onboarding-completed') => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // 检查是否已完成引导
    const completed = localStorage.getItem(key);
    if (!completed) {
      setShowWelcome(true);
    }
  }, [key]);

  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    setTimeout(() => setShowTour(true), 300);
  }, []);

  const handleSkipTour = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem(key, 'true');
  }, [key]);

  const handleCompleteTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem(key, 'true');
  }, [key]);

  const handleCloseTour = useCallback(() => {
    setShowTour(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(key);
    setShowWelcome(true);
  }, [key]);

  return {
    showWelcome,
    showTour,
    handleStartTour,
    handleSkipTour,
    handleCompleteTour,
    handleCloseTour,
    resetOnboarding
  };
};

// 默认引导步骤 - 匹配客户端底部导航栏
export const defaultTourSteps: TourStep[] = [
  {
    id: 'overview',
    target: '[data-tour="overview-tab"]',
    title: '首页总览',
    content: '查看您的资产概况、持仓统计和今日盈亏情况，快速了解投资状态。还可查看银河观点、市场快讯等资讯。',
    position: 'right'
  },
  {
    id: 'quotes',
    target: '[data-tour="quotes-tab"]',
    title: '实时行情',
    content: '查看沪深A股、港股实时行情，搜索股票、管理自选股列表，掌握市场动态。',
    position: 'right'
  },
  {
    id: 'trade',
    target: '[data-tour="trade-tab"]',
    title: '股票交易',
    content: '进行股票买入和卖出操作，支持条件单、新股申购、大宗交易等高级功能。',
    position: 'right'
  },
  {
    id: 'wealth',
    target: '[data-tour="wealth-tab"]',
    title: '财富中心',
    content: '查看资产分布、资金流水，管理基金、理财产品，进行银证转账等资金操作。',
    position: 'right'
  },
  {
    id: 'profile',
    target: '[data-tour="profile-tab"]',
    title: '个人中心',
    content: '管理个人资料、安全设置、通知偏好，查看交易记录，联系客服等。',
    position: 'bottom'
  }
];

// 添加高亮样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .tour-highlight {
      position: relative;
      z-index: 10000 !important;
    }
  `;
  document.head.appendChild(style);
}

export default OnboardingTour;
