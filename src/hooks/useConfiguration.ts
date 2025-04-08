import { useState, useEffect, useCallback } from 'react';
import { AppConfig } from '../types';
import { getLocalStorage, setLocalStorage } from '../utils/storage';
import { CONFIG_STORAGE_KEY, DEFAULT_REDACTION_PLACEHOLDER, DEFAULT_USE_GITIGNORE } from '../constants';

const defaultConfig: AppConfig = {
  useGitignore: DEFAULT_USE_GITIGNORE,
  redactionPlaceholder: DEFAULT_REDACTION_PLACEHOLDER,
  userPreFilterFolders: [],
};

export function useConfiguration() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const storedConfig = getLocalStorage<Partial<AppConfig>>(CONFIG_STORAGE_KEY); // Load as Partial

    // Create the initial config by starting with defaults and overwriting with stored values
    // This ensures new default properties are added if the stored config is older
    const initialConfig = {
      ...defaultConfig, // Start with current defaults
      ...(storedConfig || {}), // Spread stored values, overwriting defaults if they exist
      // Ensure userPreFilterFolders is always an array, even if storage is corrupted/missing
      userPreFilterFolders: Array.isArray(storedConfig?.userPreFilterFolders)
        ? storedConfig.userPreFilterFolders
        : [],
    };
    return initialConfig;
  });

  useEffect(() => {
    setLocalStorage(CONFIG_STORAGE_KEY, config);
  }, [config]);

  const updateConfig = useCallback((newConfig: Partial<AppConfig>) => {
    setConfig(prev => {
      // Ensure array type for userPreFilterFolders if it's being updated
      const updatedFolders = newConfig.userPreFilterFolders !== undefined
        ? Array.isArray(newConfig.userPreFilterFolders) ? newConfig.userPreFilterFolders : prev.userPreFilterFolders
        : prev.userPreFilterFolders;

      return {
        ...prev,
        ...newConfig,
        userPreFilterFolders: updatedFolders, // Use the potentially validated array
      };
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }, []);

  return { config, updateConfig, resetConfig };
}