import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { getApiUrl, apiRequest } from "@/lib/query-client";

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface MeditationSession {
  id: string;
  date: string;
  duration: number;
  riceEarned: number;
  completedAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  type: "text" | "audio";
  audioUri?: string;
  audioDuration?: number;
  transcription?: string;
}

export interface TendCompletion {
  id: string;
  date: string;
  cardId: string;
  completedAt: string;
}

export interface FlowCompletion {
  id: string;
  date: string;
  flowId: string;
  completedAt: string;
}

interface MeditationState {
  totalRice: number;
  sessions: MeditationSession[];
  streakDays: string[];
  challengeProgress: number;
  selectedDuration: number;
  journalEntries: JournalEntry[];
  tendCompletions: TendCompletion[];
  flowCompletions: FlowCompletion[];
  isLoading: boolean;
  globalRice: number;
  globalMeditators: number;
}

interface MeditationContextType extends MeditationState {
  setSelectedDuration: (duration: number) => void;
  addSession: (session: MeditationSession) => Promise<void>;
  addJournalEntry: (entry: JournalEntry) => Promise<number>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  addTendCompletion: (cardId: string) => Promise<void>;
  addFlowCompletion: (flowId: string) => Promise<void>;
  hasTendedToday: () => boolean;
  hasJournaledToday: () => boolean;
  hasCompletedFlowToday: (flowId: string) => boolean;
  getTodayStreak: () => boolean;
  getWeekStreaks: () => { day: string; completed: boolean; isToday: boolean }[];
  getWeeklyCompletionPoints: () => number;
  refreshCommunityStats: () => Promise<void>;
}

const STORAGE_KEYS = {
  TOTAL_RICE: "@rice_meditation_total_rice",
  SESSIONS: "@rice_meditation_sessions",
  STREAK_DAYS: "@rice_meditation_streak_days",
  CHALLENGE_PROGRESS: "@rice_meditation_challenge",
  JOURNAL_ENTRIES: "@rice_meditation_journal",
  TEND_COMPLETIONS: "@rice_meditation_tend_completions",
  FLOW_COMPLETIONS: "@rice_meditation_flow_completions",
  SELECTED_DURATION: "@rice_meditation_selected_duration",
};

const MeditationContext = createContext<MeditationContextType | undefined>(undefined);

async function syncRiceToServer(amount: number, source: "meditation" | "journal"): Promise<void> {
  try {
    const deviceId = await getOrCreateDeviceId();
    await apiRequest("POST", "/api/rice/contribute", {
      anonymousId: deviceId,
      amount,
      source,
    });
  } catch (error) {
    console.error("Failed to sync rice to server:", error);
  }
}

export function MeditationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MeditationState>({
    totalRice: 0,
    sessions: [],
    streakDays: [],
    challengeProgress: 0,
    selectedDuration: 300,
    journalEntries: [],
    tendCompletions: [],
    flowCompletions: [],
    isLoading: true,
    globalRice: 0,
    globalMeditators: 0,
  });
  
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadData();
      initializeDevice();
    }
  }, []);

  const initializeDevice = async () => {
    try {
      const deviceId = await getOrCreateDeviceId();
      await apiRequest("POST", "/api/devices/register", { anonymousId: deviceId });
      await fetchCommunityStats();
    } catch (error) {
      console.error("Failed to initialize device:", error);
    }
  };

  const fetchCommunityStats = async () => {
    try {
      const url = new URL("/api/stats/community", getApiUrl());
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          globalRice: data.totalRice,
          globalMeditators: data.totalMeditators,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch community stats:", error);
    }
  };

  const refreshCommunityStats = useCallback(async () => {
    await fetchCommunityStats();
  }, []);

  const loadData = async () => {
    try {
      const [totalRice, sessions, streakDays, challengeProgress, journalEntries, tendCompletions, flowCompletions, selectedDuration] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOTAL_RICE),
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.STREAK_DAYS),
        AsyncStorage.getItem(STORAGE_KEYS.CHALLENGE_PROGRESS),
        AsyncStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES),
        AsyncStorage.getItem(STORAGE_KEYS.TEND_COMPLETIONS),
        AsyncStorage.getItem(STORAGE_KEYS.FLOW_COMPLETIONS),
        AsyncStorage.getItem(STORAGE_KEYS.SELECTED_DURATION),
      ]);

      setState((prev) => ({
        ...prev,
        totalRice: totalRice ? parseInt(totalRice, 10) : 0,
        sessions: sessions ? JSON.parse(sessions) : [],
        streakDays: streakDays ? JSON.parse(streakDays) : [],
        challengeProgress: challengeProgress ? parseInt(challengeProgress, 10) : 0,
        journalEntries: journalEntries ? JSON.parse(journalEntries) : [],
        tendCompletions: tendCompletions ? JSON.parse(tendCompletions) : [],
        flowCompletions: flowCompletions ? JSON.parse(flowCompletions) : [],
        selectedDuration: selectedDuration ? parseInt(selectedDuration, 10) : 180,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Failed to load meditation data:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const setSelectedDuration = useCallback(async (duration: number) => {
    setState((prev) => ({ ...prev, selectedDuration: duration }));
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_DURATION, duration.toString());
    } catch (error) {
      console.error("Failed to save selected duration:", error);
    }
  }, []);

  const addSession = useCallback(async (session: MeditationSession) => {
    try {
      const newTotalRice = state.totalRice + session.riceEarned;
      const newSessions = [session, ...state.sessions];
      
      const today = getLocalDateString();
      const newStreakDays = state.streakDays.includes(today)
        ? state.streakDays
        : [today, ...state.streakDays];
      
      const newChallengeProgress = state.challengeProgress + 1;

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOTAL_RICE, newTotalRice.toString()),
        AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(newSessions)),
        AsyncStorage.setItem(STORAGE_KEYS.STREAK_DAYS, JSON.stringify(newStreakDays)),
        AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, newChallengeProgress.toString()),
      ]);

      setState((prev) => ({
        ...prev,
        totalRice: newTotalRice,
        sessions: newSessions,
        streakDays: newStreakDays,
        challengeProgress: newChallengeProgress,
      }));

      syncRiceToServer(session.riceEarned, "meditation");
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }, [state.totalRice, state.sessions, state.streakDays, state.challengeProgress]);

  const addJournalEntry = useCallback(async (entry: JournalEntry) => {
    try {
      const today = getLocalDateString();
      const hasEntryToday = state.journalEntries.some(e => e.date === today);
      const riceBonus = hasEntryToday ? 0 : 10;
      
      const newEntries = [entry, ...state.journalEntries];
      const newTotalRice = state.totalRice + riceBonus;

      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(newEntries)),
        ...(riceBonus > 0 ? [AsyncStorage.setItem(STORAGE_KEYS.TOTAL_RICE, newTotalRice.toString())] : []),
      ]);

      setState((prev) => ({
        ...prev,
        journalEntries: newEntries,
        totalRice: newTotalRice,
      }));
      
      if (riceBonus > 0) {
        syncRiceToServer(riceBonus, "journal");
      }
      
      return riceBonus;
    } catch (error) {
      console.error("Failed to save journal entry:", error);
      return 0;
    }
  }, [state.journalEntries, state.totalRice]);

  const updateJournalEntry = useCallback(async (id: string, updates: Partial<JournalEntry>) => {
    try {
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES);
      const currentEntries: JournalEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
      
      const newEntries = currentEntries.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      );

      await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(newEntries));

      setState((prev) => ({
        ...prev,
        journalEntries: newEntries,
      }));
    } catch (error) {
      console.error("Failed to update journal entry:", error);
    }
  }, []);

  const deleteJournalEntry = useCallback(async (id: string) => {
    try {
      const storedEntries = await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES);
      const currentEntries: JournalEntry[] = storedEntries ? JSON.parse(storedEntries) : [];
      
      const newEntries = currentEntries.filter(entry => entry.id !== id);

      await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(newEntries));

      setState((prev) => ({
        ...prev,
        journalEntries: newEntries,
      }));
    } catch (error) {
      console.error("Failed to delete journal entry:", error);
    }
  }, []);

  const addTendCompletion = useCallback(async (cardId: string) => {
    try {
      const today = getLocalDateString();
      const newCompletion: TendCompletion = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: today,
        cardId,
        completedAt: new Date().toISOString(),
      };

      const newCompletions = [newCompletion, ...state.tendCompletions];
      await AsyncStorage.setItem(STORAGE_KEYS.TEND_COMPLETIONS, JSON.stringify(newCompletions));

      setState((prev) => ({
        ...prev,
        tendCompletions: newCompletions,
      }));
    } catch (error) {
      console.error("Failed to save tend completion:", error);
    }
  }, [state.tendCompletions]);

  const hasTendedToday = useCallback(() => {
    const today = getLocalDateString();
    return state.tendCompletions.some(c => c.date === today);
  }, [state.tendCompletions]);

  const hasJournaledToday = useCallback(() => {
    const today = getLocalDateString();
    return state.journalEntries.some(e => e.date === today);
  }, [state.journalEntries]);

  const addFlowCompletion = useCallback(async (flowId: string) => {
    try {
      const today = getLocalDateString();
      const newCompletion: FlowCompletion = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: today,
        flowId,
        completedAt: new Date().toISOString(),
      };

      const newCompletions = [newCompletion, ...state.flowCompletions];
      await AsyncStorage.setItem(STORAGE_KEYS.FLOW_COMPLETIONS, JSON.stringify(newCompletions));

      setState((prev) => ({
        ...prev,
        flowCompletions: newCompletions,
      }));
    } catch (error) {
      console.error("Failed to save flow completion:", error);
    }
  }, [state.flowCompletions]);

  const hasCompletedFlowToday = useCallback((flowId: string) => {
    const today = getLocalDateString();
    return state.flowCompletions.some(c => c.date === today && c.flowId === flowId);
  }, [state.flowCompletions]);

  const getTodayStreak = useCallback(() => {
    const today = getLocalDateString();
    return state.streakDays.includes(today);
  }, [state.streakDays]);

  const getWeekStreaks = useCallback(() => {
    const days = ["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"];
    const today = new Date();
    const todayStr = getLocalDateString(today);
    const currentDayIndex = today.getDay();
    const saturdayOffset = currentDayIndex === 6 ? 0 : -(currentDayIndex + 1);
    
    return days.map((day, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + saturdayOffset + index);
      const dateStr = getLocalDateString(date);
      
      return {
        day,
        completed: state.streakDays.includes(dateStr),
        isToday: dateStr === todayStr,
      };
    });
  }, [state.streakDays]);

  const getWeeklyCompletionPoints = useCallback(() => {
    const today = new Date();
    const currentDayIndex = today.getDay();
    const saturdayOffset = currentDayIndex === 6 ? 0 : -(currentDayIndex + 1);
    
    let points = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + saturdayOffset + i);
      const dateStr = getLocalDateString(date);
      
      // Check meditation
      if (state.streakDays.includes(dateStr)) points++;
      // Check journal
      if (state.journalEntries.some(e => e.date === dateStr)) points++;
      // Check tend
      if (state.tendCompletions.some(c => c.date === dateStr)) points++;
    }
    
    return points;
  }, [state.streakDays, state.journalEntries, state.tendCompletions]);

  return (
    <MeditationContext.Provider
      value={{
        ...state,
        setSelectedDuration,
        addSession,
        addJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        addTendCompletion,
        addFlowCompletion,
        hasTendedToday,
        hasJournaledToday,
        hasCompletedFlowToday,
        getTodayStreak,
        getWeekStreaks,
        getWeeklyCompletionPoints,
        refreshCommunityStats,
      }}
    >
      {children}
    </MeditationContext.Provider>
  );
}

export function useMeditation() {
  const context = useContext(MeditationContext);
  if (context === undefined) {
    throw new Error("useMeditation must be used within a MeditationProvider");
  }
  return context;
}
