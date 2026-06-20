export interface MoodHistoryItem {
  action: string;
  time: number | string;
}

export interface DailyMoodRecord {
  date: string;
  happiness: number;
  energy: number;
  curiosity?: number;
  focus?: number;
  leisure?: number;
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
  aiInsight?: {
    lastGeneratedTimestamp: number;
    content: string;
    isNew: boolean;
  };
}

export interface DomainReaction {
  id?: string;
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
  advancedAiEnabled?: boolean; // "Brain Upgrade" - DistilBERT ONNX
  apiKey: string;
  name?: string;
  costume?: 'none' | 'detective' | 'wizard' | 'party' | 'christmas' | 'halloween' | 'summer';
  persona?: 'default' | 'sarcastic' | 'encouraging' | 'poetic' | 'snarky' | 'genz' | 'kid';
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
  flightSpeed?: number;
  customColor?: string;
  chatVoice?: string;
}

export interface SharedPetState {
  x: number;
  y: number;
  state: string;
  direction: number;
  paused: boolean;
  emotion: string;
}

export interface OriginPetState {
  emotion: string;
  dialogue?: string;
  lastUpdateTime: number;
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

export interface PetMessage {
  type: string;
  [key: string]: any;
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
