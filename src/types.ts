export interface MoodHistoryItem {
  action: string;
  time: string;
}

export interface PetStats {
  happiness: number;
  energy: number;
  curiosity: number;
  totalPets: number;
  totalFeeds: number;
  level: number;
  xp: number;
  moodHistory: MoodHistoryItem[];
}

export interface PetSettings {
  size: number;
  speed: number;
  soundEnabled: boolean;
  soundVolume: number;
  aiMode: boolean;
  apiKey: string;
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
}
