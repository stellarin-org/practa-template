import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TimelineItem, TimelinePublishPayload, TimelineItemType } from "@/types/timeline";

const STORAGE_KEY = "@stellarin_timeline";

interface TimelineContextType {
  items: TimelineItem[];
  isLoading: boolean;
  publish: (payload: TimelinePublishPayload) => Promise<TimelineItem>;
  deleteItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<TimelineItem>) => Promise<void>;
  getItemsByType: (type: TimelineItemType) => TimelineItem[];
  getItemsByDate: (date: string) => TimelineItem[];
}

const TimelineContext = createContext<TimelineContextType | undefined>(undefined);

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadTimeline();
    }
  }, []);

  const loadTimeline = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load timeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTimeline = async (newItems: TimelineItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (error) {
      console.error("Failed to save timeline:", error);
    }
  };

  const publish = useCallback(async (payload: TimelinePublishPayload): Promise<TimelineItem> => {
    const now = new Date();
    const newItem: TimelineItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: payload.type,
      content: payload.content,
      metadata: {
        source: payload.metadata?.source || "user",
        ...payload.metadata,
      },
      createdAt: now.toISOString(),
      date: now.toISOString().split("T")[0],
    };

    const newItems = [newItem, ...items];
    setItems(newItems);
    await saveTimeline(newItems);
    
    return newItem;
  }, [items]);

  const deleteItem = useCallback(async (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    await saveTimeline(newItems);
  }, [items]);

  const updateItem = useCallback(async (id: string, updates: Partial<TimelineItem>) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    setItems(newItems);
    await saveTimeline(newItems);
  }, [items]);

  const getItemsByType = useCallback((type: TimelineItemType) => {
    return items.filter(item => item.type === type);
  }, [items]);

  const getItemsByDate = useCallback((date: string) => {
    return items.filter(item => item.date === date);
  }, [items]);

  return (
    <TimelineContext.Provider
      value={{
        items,
        isLoading,
        publish,
        deleteItem,
        updateItem,
        getItemsByType,
        getItemsByDate,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const context = useContext(TimelineContext);
  if (context === undefined) {
    throw new Error("useTimeline must be used within a TimelineProvider");
  }
  return context;
}
