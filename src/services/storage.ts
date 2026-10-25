import { CallRecord, Companion, Memory, UserPreferences } from '../types';
import { DEFAULT_AVATARS } from '../data/defaultAvatars';

const PREFS_KEY = 'hearttalk_user_preferences_v1';
const MEMORIES_KEY = 'hearttalk_memories_v1';
const CALLS_KEY = 'hearttalk_calls_history_v1';
const CUSTOM_COMPANIONS_KEY = 'hearttalk_custom_companions_v1';

export const DEFAULT_PREFERENCES: UserPreferences = {
  userName: 'Sweetheart',
  preferredLanguage: 'Hinglish',
  selectedCompanionId: 'ananya',
  voiceName: 'Kore',
  personality: 'Sweet & Caring',
  autoMemoryConsent: true,
  autoDeleteHistory24h: false,
  encryptLocalData: false,
  audioEchoCancellation: true,
  subtitlesEnabled: true,
};

export const INITIAL_MEMORIES: Memory[] = [
  {
    id: 'mem-1',
    text: 'Prefers late night talks and relaxing over tea or coffee',
    category: 'preference',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'mem-2',
    text: 'Working hard on daily studies and personal creative goals',
    category: 'goal',
    createdAt: Date.now() - 86400000,
  },
];

export const storage = {
  getPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(PREFS_KEY);
      return data ? { ...DEFAULT_PREFERENCES, ...JSON.parse(data) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  savePreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences to localStorage', e);
    }
  },

  getMemories(): Memory[] {
    try {
      const data = localStorage.getItem(MEMORIES_KEY);
      if (!data) {
        localStorage.setItem(MEMORIES_KEY, JSON.stringify(INITIAL_MEMORIES));
        return INITIAL_MEMORIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_MEMORIES;
    }
  },

  saveMemories(memories: Memory[]): void {
    try {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
    } catch (e) {
      console.error('Failed to save memories', e);
    }
  },

  addMemory(text: string, category: Memory['category'] = 'preference'): Memory {
    const memories = storage.getMemories();
    const newMemory: Memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      category,
      createdAt: Date.now(),
    };
    storage.saveMemories([newMemory, ...memories]);
    return newMemory;
  },

  updateMemory(id: string, text: string): void {
    const memories = storage.getMemories().map((m) =>
      m.id === id ? { ...m, text: text.trim() } : m
    );
    storage.saveMemories(memories);
  },

  deleteMemory(id: string): void {
    const memories = storage.getMemories().filter((m) => m.id !== id);
    storage.saveMemories(memories);
  },

  clearAllMemories(): void {
    storage.saveMemories([]);
  },

  getCallHistory(): CallRecord[] {
    try {
      const data = localStorage.getItem(CALLS_KEY);
      const list: CallRecord[] = data ? JSON.parse(data) : [];
      const prefs = storage.getPreferences();
      if (prefs.autoDeleteHistory24h) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = list.filter((c) => c.startTime > cutoff);
        if (filtered.length !== list.length) {
          localStorage.setItem(CALLS_KEY, JSON.stringify(filtered));
          return filtered;
        }
      }
      return list;
    } catch {
      return [];
    }
  },

  saveCallRecord(record: CallRecord): void {
    try {
      const history = storage.getCallHistory();
      localStorage.setItem(CALLS_KEY, JSON.stringify([record, ...history]));
    } catch (e) {
      console.error('Failed to save call record', e);
    }
  },

  clearCallHistory(): void {
    localStorage.removeItem(CALLS_KEY);
  },

  getCompanions(): Companion[] {
    try {
      const data = localStorage.getItem(CUSTOM_COMPANIONS_KEY);
      if (!data) return DEFAULT_AVATARS;
      const customMap: Record<string, Partial<Companion>> = JSON.parse(data);
      return DEFAULT_AVATARS.map((avatar) => ({
        ...avatar,
        ...(customMap[avatar.id] || {}),
      }));
    } catch {
      return DEFAULT_AVATARS;
    }
  },

  saveCompanionCustomization(companionId: string, updates: Partial<Companion>): void {
    try {
      const data = localStorage.getItem(CUSTOM_COMPANIONS_KEY);
      const customMap: Record<string, Partial<Companion>> = data ? JSON.parse(data) : {};
      customMap[companionId] = { ...(customMap[companionId] || {}), ...updates };
      localStorage.setItem(CUSTOM_COMPANIONS_KEY, JSON.stringify(customMap));
    } catch (e) {
      console.error('Failed to save companion customization', e);
    }
  },

  getActiveCompanion(): Companion {
    const prefs = storage.getPreferences();
    const companions = storage.getCompanions();
    return companions.find((c) => c.id === prefs.selectedCompanionId) || companions[0];
  },
};
