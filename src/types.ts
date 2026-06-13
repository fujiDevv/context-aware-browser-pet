export interface MoodHistoryItem {
  action: string;
  time: string;
}

export interface DailyMoodRecord {
  date: string;
  happiness: number;
  energy: number;
  count: number;
}

export interface PetStats {
  happiness: number;
  energy: number;
  curiosity: number;
  focus: number;
  leisure: number;
  totalPets: number;
  totalFeeds: number;
  level: number;
  xp: number;
  moodHistory: MoodHistoryItem[];
  siteCategoryCounts?: Record<string, number>;
  lastUpdateTime?: number;
  prestige?: number;
  lastHabitDecayTime?: number;
  siteCategoryHistory?: Record<string, Record<string, number>>;
  dailyMoodHistory?: DailyMoodRecord[];
}

export interface DomainReaction {
  id: string;
  domain: string;
  emotion: string;
  dialogue?: string;
  sound?: string;
}

export interface PetSettings {
  size: number;
  speed: number;
  soundEnabled: boolean;
  soundVolume: number;
  aiMode: boolean;
  apiKey: string;
  name?: string;
  costume?: 'none' | 'detective' | 'wizard' | 'party' | 'christmas' | 'halloween' | 'summer';
  persona?: 'default' | 'sarcastic' | 'encouraging' | 'poetic' | 'snarky';
  blockedDomains?: string[];
  disabledEmotions?: string[];
  scheduleEnabled?: boolean;
  seasonalEnabled?: boolean;
  sleepStartHour?: number;
  sleepEndHour?: number;
  workStartHour?: number;
  workEndHour?: number;
  focusActive?: boolean;
  focusStartHour?: number;
  focusEndHour?: number;
  domainReactions?: DomainReaction[];
  sentimentSensitivity?: number;
  commentFrequency?: number;
}

export interface SharedPetState {
  x: number;
  y: number;
  state: string;
  direction: number;
  paused: boolean;
  emotion: string;
}

export interface TriggerSnapshot {
  hostname: string;
  pageTitle: string;
  idleSeconds: number;
  isTypingHeavy: boolean;
  isVideoPlaying: boolean;
  isFormSubmitting: boolean;
  lastHttpError: number | null;
  scrollDepth: number;
  hasConsoleError: boolean;
  mouseX: number;
  isCursorActive: boolean;
}

declare global {
  interface AILanguageModelSession {
    prompt(input: string): Promise<string>;
    destroy(): Promise<void>;
  }

  interface AILanguageModel {
    availability(): Promise<'readily' | 'after-download' | 'no'>;
    create(options?: {
      systemPrompt?: string;
      temperature?: number;
      topK?: number;
    }): Promise<AILanguageModelSession>;
  }

  const ai: {
    languageModel?: AILanguageModel;
    assistant?: AILanguageModel;
  };
}
