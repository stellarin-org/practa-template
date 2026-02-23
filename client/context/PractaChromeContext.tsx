import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from "react";

export type HeaderMode = "default" | "minimal" | "none";

export interface PractaChromeConfig {
  headerMode?: HeaderMode;
  title?: string;
  showSettings?: boolean;
  onSettings?: () => void;
  showProgressDots?: boolean;
  rightAction?: ReactNode;
  closeIcon?: string;
  onCloseOverride?: (() => void) | null;
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
  closeIcon: undefined,
  onCloseOverride: undefined,
};

const COMPARE_KEYS: (keyof PractaChromeConfig)[] = [
  "headerMode", "title", "showSettings", "showProgressDots", "closeIcon",
];

function hasScalarChanged(prev: PractaChromeConfig, next: PractaChromeConfig): boolean {
  for (const key of COMPARE_KEYS) {
    if (prev[key] !== next[key]) return true;
  }
  return false;
}

const PractaChromeContext = createContext<PractaChromeContextValue | null>(null);

interface PractaChromeProviderProps {
  children: ReactNode;
}

export function PractaChromeProvider({ children }: PractaChromeProviderProps) {
  const [config, setConfigState] = useState<PractaChromeConfig>(defaultConfig);
  const configRef = useRef(config);
  configRef.current = config;

  const setConfig = useCallback((newConfig: PractaChromeConfig) => {
    const merged = { ...configRef.current, ...newConfig };
    if (hasScalarChanged(configRef.current, merged)) {
      setConfigState(merged);
    } else {
      configRef.current = merged;
    }
  }, []);

  const resetConfig = useCallback(() => {
    if (hasScalarChanged(configRef.current, defaultConfig)) {
      setConfigState(defaultConfig);
    } else {
      configRef.current = defaultConfig;
    }
  }, []);

  const value = useMemo(() => ({ config, setConfig, resetConfig }), [config, setConfig, resetConfig]);

  return (
    <PractaChromeContext.Provider value={value}>
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
