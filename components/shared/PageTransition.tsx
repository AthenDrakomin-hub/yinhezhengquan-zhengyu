/**
 * 页面切换动画组件
 * 使用 Framer Motion 实现流畅的页面过渡效果
 */

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// 动画配置类型
export type AnimationPreset = 'fade' | 'slide' | 'slideUp' | 'scale' | 'none';

interface PageTransitionProps {
  children: ReactNode;
  /** 动画预设 */
  preset?: AnimationPreset;
  /** 动画持续时间（秒） */
  duration?: number;
  /** 是否启用动画 */
  enabled?: boolean;
}

// 预设动画变体
const variants = {
  // 淡入淡出
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  // 左右滑动
  slide: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  // 上下滑动
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  // 缩放
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  // 无动画
  none: {
    initial: {},
    animate: {},
    exit: {},
  },
};

/**
 * 页面切换动画包装组件
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  preset = 'fade',
  duration = 0.2,
  enabled = true,
}) => {
  if (!enabled) {
    return <>{children}</>;
  }

  const variant = variants[preset];

  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      exit={variant.exit}
      transition={{
        duration,
        ease: [0.4, 0, 0.2, 1], // ease-out
      }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
};

/**
 * 带路由监听的页面切换动画
 * 自动根据路由变化触发动画
 */
interface AnimatedRoutesProps {
  children: ReactNode;
  preset?: AnimationPreset;
  duration?: number;
}

export const AnimatedRoutes: React.FC<AnimatedRoutesProps> = ({
  children,
  preset = 'fade',
  duration = 0.2,
}) => {
  const location = useLocation();
  const variant = variants[preset];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={{
          duration,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Tab 切换动画组件
 */
interface TabTransitionProps {
  children: ReactNode;
  activeKey: string | number;
  preset?: AnimationPreset;
}

export const TabTransition: React.FC<TabTransitionProps> = ({
  children,
  activeKey,
  preset = 'fade',
}) => {
  const variant = variants[preset];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={{
          duration: 0.15,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * 列表项动画组件
 */
interface ListItemMotionProps {
  children: ReactNode;
  index?: number;
  delay?: number;
}

export const ListItemMotion: React.FC<ListItemMotionProps> = ({
  children,
  index = 0,
  delay = 0.05,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * 悬浮动画组件
 */
interface HoverScaleProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export const HoverScale: React.FC<HoverScaleProps> = ({
  children,
  scale = 1.02,
  className = '',
}) => {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 弹出动画组件
 */
interface PopInProps {
  children: ReactNode;
  visible: boolean;
  className?: string;
}

export const PopIn: React.FC<PopInProps> = ({
  children,
  visible,
  className = '',
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageTransition;
