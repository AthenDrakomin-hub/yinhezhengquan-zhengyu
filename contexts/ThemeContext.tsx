import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * 主题类型
 */
type ThemeMode = 'light' | 'dark';

/**
 * 各区域的默认主题配置
 * 公共区域默认浅色，客户端支持用户自定义
 */
const DEFAULT_THEME_BY_AREA: Record<string, ThemeMode> = {
  public: 'light',   // 公共页面 - 浅色
  auth: 'light',     // 认证页面 - 浅色
  client: 'light',   // 客户端 - 浅色默认（用户可切换）
  admin: 'light',    // 管理端 - 浅色
};

/**
 * 主题上下文类型
 */
interface ThemeContextType {
  /** 当前主题 */
  theme: ThemeMode;
  /** 是否深色模式 */
  isDarkMode: boolean;
  /** 当前区域 */
  area: string;
  /** 切换主题 */
  toggleTheme: () => void;
  /** 设置主题 */
  setTheme: (theme: ThemeMode) => void;
  /** 设置区域（路由切换时调用） */
  setArea: (area: keyof typeof DEFAULT_THEME_BY_AREA) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDarkMode: false,
  area: 'public',
  toggleTheme: () => {},
  setTheme: () => {},
  setArea: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * 主题提供者
 * 支持深色/浅色模式切换，通过 CSS 变量实现主题切换
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [area, setAreaState] = useState<string>('public');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // 初始化时从 localStorage 读取用户偏好
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      // 检查系统偏好
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  /**
   * 应用主题到 DOM
   * 通过在 body 上添加/移除 dark-mode 类来控制主题
   */
  const applyTheme = useCallback((newTheme: ThemeMode) => {
    if (newTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  /**
   * 设置区域
   * 根据区域应用对应的默认主题（公共区域强制浅色）
   */
  const setArea = useCallback((newArea: keyof typeof DEFAULT_THEME_BY_AREA) => {
    setAreaState(newArea);
    
    // 公共区域和认证页面强制使用浅色主题
    if (newArea === 'public' || newArea === 'auth') {
      setThemeState('light');
      applyTheme('light');
    } else if (newArea === 'client') {
      // 客户端：读取用户保存的偏好，或使用默认浅色
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        setThemeState('light');
        applyTheme('light');
      }
    } else {
      // 其他区域使用默认主题
      const defaultTheme = DEFAULT_THEME_BY_AREA[newArea];
      setThemeState(defaultTheme);
      applyTheme(defaultTheme);
    }
  }, [applyTheme]);

  /**
   * 设置主题
   */
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    // 保存用户偏好到 localStorage
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  /**
   * 切换主题
   */
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  /**
   * 初始化：应用保存的主题偏好
   */
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const value: ThemeContextType = {
    theme,
    isDarkMode: theme === 'dark',
    area,
    toggleTheme,
    setTheme,
    setArea,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * 路由级别的主题钩子
 * 在路由组件中使用，自动应用对应区域的默认主题
 * 
 * @example
 * // 在路由组件中
 * useRouteTheme('client'); // 自动应用客户端默认主题
 */
export const useRouteTheme = (area: keyof typeof DEFAULT_THEME_BY_AREA) => {
  const { setArea } = useTheme();
  
  useEffect(() => {
    setArea(area);
  }, [area, setArea]);
};

export default ThemeContext;
