import React, { createContext, useContext, ReactNode } from "react";

interface MeditationSession {
  id: string;
  practaSlug?: string;
  durationMinutes?: number;
  duration?: number;
  date: string;
  riceEarned?: number;
  completedAt?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  content: string;
}

interface TendCompletion {
  id: string;
  date: string;
}

interface MeditationContextValue {
  sessions: MeditationSession[];
  journalEntries: JournalEntry[];
  tendCompletions: TendCompletion[];
  addSession: (session: Omit<MeditationSession, "id">) => Promise<void>;
  addJournalEntry: (entry: Omit<JournalEntry, "id">) => Promise<number>;
  addFlowCompletion: (flowIdOrData: string | { flowId: string; practaCompleted: string[] }) => void;
}

const MeditationContext = createContext<MeditationContextValue | undefined>(undefined);

export function MeditationProvider({ children }: { children: ReactNode }) {
  return (
    <MeditationContext.Provider
      value={{
        sessions: [],
        journalEntries: [],
        tendCompletions: [],
        addSession: async () => {},
        addJournalEntry: async () => 0,
        addFlowCompletion: () => {},
      }}
    >
      {children}
    </MeditationContext.Provider>
  );
}

export function useMeditation(): MeditationContextValue {
  const context = useContext(MeditationContext);
  if (!context) {
    return {
      sessions: [],
      journalEntries: [],
      tendCompletions: [],
      addSession: async () => {},
      addJournalEntry: async () => 0,
      addFlowCompletion: () => {},
    };
  }
  return context;
}
