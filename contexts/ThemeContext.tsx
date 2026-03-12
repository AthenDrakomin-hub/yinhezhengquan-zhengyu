import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * 主题类型
 */
type ThemeMode = 'light' | 'dark';

/**
 * 各区域的默认主题配置
 * 当前强制所有区域使用浅色主题，为深色主题预留切换能力
 */
const DEFAULT_THEME_BY_AREA: Record<string, ThemeMode> = {
  public: 'light',   // 公共页面 - 浅色
  auth: 'light',     // 认证页面 - 浅色
  client: 'light',   // 客户端 - 浅色（用户可切换，但当前强制浅色）
  admin: 'light',    // 管理端 - 浅色（原为深色，现统一为浅色基准）
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
  /** 切换主题（保留功能，后续启用深色主题时使用） */
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
 * 当前强制浅色主题，但保留切换逻辑以备后续启用深色主题
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [area, setAreaState] = useState<string>('public');
  const [theme, setThemeState] = useState<ThemeMode>('light');

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
   * 根据区域自动应用对应的默认主题
   */
  const setArea = useCallback((newArea: keyof typeof DEFAULT_THEME_BY_AREA) => {
    setAreaState(newArea);
    // 当前强制使用浅色主题，忽略 localStorage 中保存的旧偏好
    const defaultTheme = DEFAULT_THEME_BY_AREA[newArea];
    setThemeState(defaultTheme);
    applyTheme(defaultTheme);
  }, [applyTheme]);

  /**
   * 设置主题（保留功能，后续启用深色主题时使用）
   */
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    // 保存用户偏好到 localStorage（仅在客户端区域）
    if (area === 'client') {
      localStorage.setItem('theme', newTheme);
    }
    applyTheme(newTheme);
  }, [area, applyTheme]);

  /**
   * 切换主题（保留功能，后续启用深色主题时使用）
   */
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  /**
   * 初始化：清除旧的深色主题偏好
   * 确保所有用户从浅色主题开始
   */
  useEffect(() => {
    // 清除可能存在的旧主题偏好
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      // 清除旧的深色偏好，强制浅色
      localStorage.setItem('theme', 'light');
    }
    // 确保初始状态为浅色主题
    document.body.classList.remove('dark-mode');
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
