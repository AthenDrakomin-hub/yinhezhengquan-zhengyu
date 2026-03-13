"use strict";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { soundLibrary } from '../lib/sound';
import { TradingSettings, PersonalSettings, OrderStrategy } from '../lib/types';

interface UserSettings {
  trading: TradingSettings;
  personal: PersonalSettings;
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange?: string;
  };
}

interface UserSettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  updateTradingSettings: (updates: Partial<TradingSettings>) => Promise<void>;
  updatePersonalSettings: (updates: Partial<PersonalSettings>) => Promise<void>;
  updateSecuritySettings: (updates: Partial<{ twoFactorEnabled: boolean }>) => Promise<void>;
  // 便捷方法
  isFastOrderMode: boolean;
  isAutoStopLoss: boolean;
  isSoundEnabled: boolean;
  isHapticEnabled: boolean;
  is2FAEnabled: boolean;
  getDefaultStrategy: () => OrderStrategy;
  getDefaultLeverage: () => number;
}

const defaultSettings: UserSettings = {
  trading: {
    fastOrderMode: true,
    defaultStrategy: OrderStrategy.NORMAL,
    defaultLeverage: 10,
    autoStopLoss: false
  },
  personal: {
    language: 'zh-CN',
    fontSize: 'standard',
    hapticFeedback: true,
    soundEffects: true,
    theme: 'light'
  },
  security: {
    twoFactorEnabled: true
  }
};

const UserSettingsContext = createContext<UserSettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  updateTradingSettings: async () => {},
  updatePersonalSettings: async () => {},
  updateSecuritySettings: async () => {},
  isFastOrderMode: true,
  isAutoStopLoss: false,
  isSoundEnabled: true,
  isHapticEnabled: true,
  is2FAEnabled: true,
  getDefaultStrategy: () => OrderStrategy.NORMAL,
  getDefaultLeverage: () => 10
});

export const useUserSettings = () => useContext(UserSettingsContext);

// 触感反馈工具函数
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 50;
    navigator.vibrate(duration);
  }
};

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // 加载用户设置
  useEffect(() => {
    loadSettings();
  }, []);

  // 应用音效设置
  useEffect(() => {
    soundLibrary.setEnabled(settings.personal.soundEffects);
  }, [settings.personal.soundEffects]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 并行加载所有设置
      const [tradingResult, personalResult, securityResult] = await Promise.all([
        supabase
          .from('user_configs')
          .select('config_value')
          .eq('user_id', user.id)
          .eq('config_type', 'trading_preferences')
          .single(),
        supabase
          .from('user_configs')
          .select('config_value')
          .eq('user_id', user.id)
          .eq('config_type', 'personal_preferences')
          .single(),
        supabase
          .from('user_configs')
          .select('config_value')
          .eq('user_id', user.id)
          .eq('config_type', 'security_settings')
          .single()
      ]);

      setSettings({
        trading: tradingResult.data?.config_value || defaultSettings.trading,
        personal: personalResult.data?.config_value || defaultSettings.personal,
        security: securityResult.data?.config_value || defaultSettings.security
      });
    } catch (error) {
      console.error('加载用户设置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTradingSettings = useCallback(async (updates: Partial<TradingSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSettings = { ...settings.trading, ...updates };
    
    // 乐观更新
    setSettings(prev => ({ ...prev, trading: newSettings }));

    try {
      await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          config_type: 'trading_preferences',
          config_value: newSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,config_type' });
    } catch (error) {
      console.error('保存交易设置失败:', error);
      // 回滚
      setSettings(prev => ({ ...prev, trading: settings.trading }));
    }
  }, [settings.trading]);

  const updatePersonalSettings = useCallback(async (updates: Partial<PersonalSettings>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSettings = { ...settings.personal, ...updates };
    
    // 乐观更新
    setSettings(prev => ({ ...prev, personal: newSettings }));

    try {
      await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          config_type: 'personal_preferences',
          config_value: newSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,config_type' });
    } catch (error) {
      console.error('保存个性化设置失败:', error);
      setSettings(prev => ({ ...prev, personal: settings.personal }));
    }
  }, [settings.personal]);

  const updateSecuritySettings = useCallback(async (updates: Partial<{ twoFactorEnabled: boolean }>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSettings = { ...settings.security, ...updates };
    
    setSettings(prev => ({ ...prev, security: newSettings }));

    try {
      await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          config_type: 'security_settings',
          config_value: newSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,config_type' });
    } catch (error) {
      console.error('保存安全设置失败:', error);
      setSettings(prev => ({ ...prev, security: settings.security }));
    }
  }, [settings.security]);

  const value: UserSettingsContextType = {
    settings,
    isLoading,
    updateTradingSettings,
    updatePersonalSettings,
    updateSecuritySettings,
    // 便捷方法
    isFastOrderMode: settings.trading.fastOrderMode,
    isAutoStopLoss: settings.trading.autoStopLoss,
    isSoundEnabled: settings.personal.soundEffects,
    isHapticEnabled: settings.personal.hapticFeedback,
    is2FAEnabled: settings.security.twoFactorEnabled,
    getDefaultStrategy: () => settings.trading.defaultStrategy,
    getDefaultLeverage: () => settings.trading.defaultLeverage
  };

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export default UserSettingsContext;
