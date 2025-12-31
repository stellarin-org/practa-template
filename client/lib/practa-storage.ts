import { PractaStorage } from "@/types/flow";

export class PractaStorageManager implements PractaStorage {
  private prefix: string;

  constructor(userId: string, practaSlug?: string) {
    this.prefix = practaSlug ? `practa_${userId}_${practaSlug}_` : `practa_${userId}_`;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return null;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {}

  async remove(key: string): Promise<void> {}

  async clear(): Promise<void> {}
}

export function createNoopStorage(): PractaStorage {
  return {
    get: async () => null,
    set: async () => {},
    remove: async () => {},
    clear: async () => {},
  };
}
