import React, { createContext, useContext, ReactNode } from "react";

interface TimelineItem {
  id: string;
  type: string;
  date?: string;
  data?: unknown;
  content?: unknown;
  metadata?: unknown;
}

interface TimelineContextValue {
  items: TimelineItem[];
  publish: (item: Omit<TimelineItem, "id">) => void;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

export function TimelineProvider({ children }: { children: ReactNode }) {
  return (
    <TimelineContext.Provider
      value={{
        items: [],
        publish: () => {},
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) {
    return {
      items: [],
      publish: () => {},
    };
  }
  return context;
}
