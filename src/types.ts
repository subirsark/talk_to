export type Language = 'Hinglish' | 'Hindi' | 'English';

export type VoiceName = 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir';

export type PersonalityVibe = 'Sweet & Caring' | 'Playful & Flirty' | 'Romantic & Deep' | 'Calm & Mindful';

export interface Companion {
  id: string;
  name: string;
  title: string;
  age: number;
  avatarUrl: string;
  personality: PersonalityVibe;
  personalityDescription: string;
  tone: string;
  voiceName: VoiceName;
  bio: string;
  sampleGreetings: {
    Hinglish: string;
    Hindi: string;
    English: string;
  };
  interests: string[];
  tags: string[];
}

export interface UserPreferences {
  userName: string;
  preferredLanguage: Language;
  selectedCompanionId: string;
  voiceName: VoiceName;
  personality: PersonalityVibe;
  autoMemoryConsent: boolean;
  autoDeleteHistory24h: boolean;
  encryptLocalData: boolean;
  audioEchoCancellation: boolean;
  subtitlesEnabled: boolean;
}

export interface Memory {
  id: string;
  text: string;
  category: 'preference' | 'emotion' | 'relationship' | 'goal';
  createdAt: number;
}

export interface CallMessage {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  timestamp: number;
}

export interface CallRecord {
  id: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  companionId: string;
  companionName: string;
  messages: CallMessage[];
}

export type CallStatus =
  | 'idle'
  | 'requesting_permissions'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'interrupted'
  | 'ended'
  | 'error';

export type ScreenType =
  | 'welcome'
  | 'call'
  | 'avatars'
  | 'setup'
  | 'history'
  | 'memories'
  | 'api';
