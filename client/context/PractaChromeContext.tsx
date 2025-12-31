import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface PractaChromeConfig {
  showProgressDots?: boolean;
  rightAction?: ReactNode;
}

interface PractaChromeContextValue {
  config: PractaChromeConfig;
  setConfig: (config: PractaChromeConfig) => void;
  resetConfig: () => void;
}

const defaultConfig: PractaChromeConfig = {
  showProgressDots: true,
  rightAction: null,
};

const PractaChromeContext = createContext<PractaChromeContextValue | null>(null);

interface PractaChromeProviderProps {
  children: ReactNode;
}

export function PractaChromeProvider({ children }: PractaChromeProviderProps) {
  const [config, setConfigState] = useState<PractaChromeConfig>(defaultConfig);

  const setConfig = useCallback((newConfig: PractaChromeConfig) => {
    setConfigState((prev) => ({ ...prev, ...newConfig }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfigState(defaultConfig);
  }, []);

  return (
    <PractaChromeContext.Provider value={{ config, setConfig, resetConfig }}>
      {children}
    </PractaChromeContext.Provider>
  );
}

export function usePractaChrome() {
  const context = useContext(PractaChromeContext);
  if (!context) {
    return {
      config: defaultConfig,
      setConfig: () => {},
      resetConfig: () => {},
    };
  }
  return context;
}
