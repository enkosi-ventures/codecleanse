import { useState, useEffect, useCallback } from 'react';
import { AppConfig } from '../types';
import { getLocalStorage, setLocalStorage } from '../utils/storage';

const CONFIG_STORAGE_KEY = 'codecleanse_config';

const defaultConfig: AppConfig = {
  useGitignore: true,
  redactionPlaceholder: '[REDACTED]',
};

export function useConfiguration() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const storedConfig = getLocalStorage<AppConfig>(CONFIG_STORAGE_KEY);
    return storedConfig ? { ...defaultConfig, ...storedConfig } : defaultConfig;
  });

  useEffect(() => {
    setLocalStorage(CONFIG_STORAGE_KEY, config);
  }, [config]);

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }, []);

  return { config, updateConfig, resetConfig };
}