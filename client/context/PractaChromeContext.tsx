import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type HeaderMode = "default" | "minimal" | "none";

export interface PractaChromeConfig {
  headerMode?: HeaderMode;
  title?: string;
  showSettings?: boolean;
  onSettings?: () => void;
  showProgressDots?: boolean;
  rightAction?: ReactNode;
}

interface PractaChromeContextValue {
  config: PractaChromeConfig;
  setConfig: (config: PractaChromeConfig) => void;
  resetConfig: () => void;
}

const defaultConfig: PractaChromeConfig = {
  headerMode: undefined,
  title: undefined,
  showSettings: undefined,
  onSettings: undefined,
  showProgressDots: undefined,
  rightAction: undefined,
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
