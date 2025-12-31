import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ChromeConfig {
  showProgressDots: boolean;
  rightAction: ReactNode | null;
}

interface PractaChromeContextValue {
  config: ChromeConfig;
  setShowProgressDots: (show: boolean) => void;
  setRightAction: (action: ReactNode | null) => void;
  resetChrome: () => void;
}

const defaultConfig: ChromeConfig = {
  showProgressDots: true,
  rightAction: null,
};

const PractaChromeContext = createContext<PractaChromeContextValue | undefined>(undefined);

interface PractaChromeProviderProps {
  children: ReactNode;
}

export function PractaChromeProvider({ children }: PractaChromeProviderProps) {
  const [config, setConfig] = useState<ChromeConfig>(defaultConfig);

  const setShowProgressDots = useCallback((show: boolean) => {
    setConfig((prev) => ({ ...prev, showProgressDots: show }));
  }, []);

  const setRightAction = useCallback((action: ReactNode | null) => {
    setConfig((prev) => ({ ...prev, rightAction: action }));
  }, []);

  const resetChrome = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  return (
    <PractaChromeContext.Provider
      value={{
        config,
        setShowProgressDots,
        setRightAction,
        resetChrome,
      }}
    >
      {children}
    </PractaChromeContext.Provider>
  );
}

export function usePractaChrome(): PractaChromeContextValue {
  const context = useContext(PractaChromeContext);
  if (!context) {
    return {
      config: defaultConfig,
      setShowProgressDots: () => {},
      setRightAction: () => {},
      resetChrome: () => {},
    };
  }
  return context;
}
