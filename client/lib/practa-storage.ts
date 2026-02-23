import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "practa";
const MAX_VALUE_SIZE = 10 * 1024;
const MAX_TOTAL_SIZE = 100 * 1024;
const QUOTA_KEY_SUFFIX = "__quota__";

export interface PractaStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllData?(): Promise<Record<string, unknown>>;
}

export class PractaStorageManager implements PractaStorage {
  private prefix: string;
  private quotaKey: string;

  constructor(userId: string, slug: string) {
    this.prefix = `${STORAGE_PREFIX}:${userId}:${slug}:`;
    this.quotaKey = `${this.prefix}${QUOTA_KEY_SUFFIX}`;
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private async getUsedBytes(): Promise<number> {
    try {
      const quota = await AsyncStorage.getItem(this.quotaKey);
      return quota ? parseInt(quota, 10) : 0;
    } catch {
      return 0;
    }
  }

  private async updateUsedBytes(delta: number): Promise<void> {
    const current = await this.getUsedBytes();
    const newTotal = Math.max(0, current + delta);
    await AsyncStorage.setItem(this.quotaKey, String(newTotal));
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(this.getFullKey(key));
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(`PractaStorage: Failed to parse key "${key}"`, error);
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch {
      throw new Error("Value is not serializable");
    }

    const valueSize = serialized.length;

    if (valueSize > MAX_VALUE_SIZE) {
      throw new Error(`Value exceeds maximum size of ${MAX_VALUE_SIZE} bytes`);
    }

    const fullKey = this.getFullKey(key);
    const existingValue = await AsyncStorage.getItem(fullKey);
    const existingSize = existingValue ? existingValue.length : 0;
    const usedBytes = await this.getUsedBytes();
    const newTotal = usedBytes - existingSize + valueSize;

    if (newTotal > MAX_TOTAL_SIZE) {
      throw new Error(`Storage quota exceeded (${MAX_TOTAL_SIZE} bytes)`);
    }

    await AsyncStorage.setItem(fullKey, serialized);
    await this.updateUsedBytes(valueSize - existingSize);
  }

  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    try {
      const existingValue = await AsyncStorage.getItem(fullKey);
      const existingSize = existingValue ? existingValue.length : 0;
      await AsyncStorage.removeItem(fullKey);
      if (existingSize > 0) {
        await this.updateUsedBytes(-existingSize);
      }
    } catch (error) {
      console.warn(`PractaStorage: Failed to remove key "${key}"`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const practaKeys = allKeys.filter((k) => k.startsWith(this.prefix));
      if (practaKeys.length > 0) {
        await AsyncStorage.multiRemove(practaKeys);
      }
      await AsyncStorage.setItem(this.quotaKey, "0");
    } catch (error) {
      console.warn("PractaStorage: Failed to clear storage", error);
    }
  }

  async getAllData(): Promise<Record<string, unknown>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const practaKeys = allKeys.filter(
        (k) => k.startsWith(this.prefix) && !k.endsWith(QUOTA_KEY_SUFFIX)
      );
      if (practaKeys.length === 0) return {};

      const pairs = await AsyncStorage.multiGet(practaKeys);
      const data: Record<string, unknown> = {};
      for (const [fullKey, value] of pairs) {
        const shortKey = fullKey.slice(this.prefix.length);
        if (value !== null) {
          try {
            data[shortKey] = JSON.parse(value);
          } catch {
            data[shortKey] = value;
          }
        }
      }
      return data;
    } catch (error) {
      console.warn("PractaStorage: Failed to get all data", error);
      return {};
    }
  }
}

const NOOP_STORAGE: PractaStorage = {
  async get() {
    return null;
  },
  async set() {},
  async remove() {},
  async clear() {},
};

export function createNoopStorage(): PractaStorage {
  return NOOP_STORAGE;
}
