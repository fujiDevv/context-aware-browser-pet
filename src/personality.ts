import { PetStats } from './types';

const DEFAULT_STATS: PetStats = {
  happiness:  50,
  energy:     80,
  curiosity:  60,
  totalPets:  0,
  totalFeeds: 0,
  level:      1,
  xp:         0,
  moodHistory: [],
};

export class PersonalitySystem {
  stats: PetStats;
  onStatsChange?: (stats: PetStats) => void;
  isLoaded: Promise<PetStats>;
  private _decayInterval: any = null;

  constructor(onStatsChange?: (stats: PetStats) => void) {
    this.stats = { ...DEFAULT_STATS };
    this.onStatsChange = onStatsChange;
    this.isLoaded = this._load();

    if (typeof window !== 'undefined') {
      this._decayInterval = setInterval(() => {
        this._periodicDecay();
      }, 60_000); // Check decay every 1 minute
    }
  }

  _applyDecay(): void {
    const lastUpdate = this.stats.lastUpdateTime || Date.now();
    const elapsedMs = Date.now() - lastUpdate;
    const elapsedSeconds = Math.max(0, elapsedMs / 1000);

    // Decay rates per second:
    // Happiness: -4 points per hour (~0.0011/sec)
    // Energy: -7 points per hour (~0.0019/sec)
    // Curiosity: -2 points per hour (~0.0005/sec)
    const happinessDecay = elapsedSeconds * 0.0011;
    const energyDecay = elapsedSeconds * 0.0019;
    const curiosityDecay = elapsedSeconds * 0.0005;

    this.stats.happiness = Math.max(0, Math.round(this.stats.happiness - happinessDecay));
    this.stats.energy = Math.max(0, Math.round(this.stats.energy - energyDecay));
    this.stats.curiosity = Math.max(0, Math.round(this.stats.curiosity - curiosityDecay));
  }

  async _periodicDecay(): Promise<void> {
    await this.isLoaded;
    this._applyDecay();
    await this._save();
  }

  async _load(): Promise<PetStats> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        return this.stats;
      }
      const saved = await chrome.storage.local.get('pet-stats');
      if (saved['pet-stats']) {
        this.stats = { ...DEFAULT_STATS, ...saved['pet-stats'] };
      }
      
      this._applyDecay();
      this.stats.lastUpdateTime = Date.now();
      await this._save();

      return this.stats;
    } catch (e: any) {
      if (e.message && e.message.includes('context invalidated')) {
        return this.stats;
      }
      console.error('Failed to load pet stats:', e);
      return this.stats;
    }
  }

  async _save(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        return;
      }
      this.stats.lastUpdateTime = Date.now();
      await chrome.storage.local.set({ 'pet-stats': this.stats });
      if (this.onStatsChange) {
        this.onStatsChange(this.stats);
      }
    } catch (e: any) {
      if (e.message && e.message.includes('context invalidated')) {
        return;
      }
      console.error('Failed to save pet stats:', e);
    }
  }

  async recordInteraction(type: string): Promise<void> {
    await this.isLoaded;
    if (type === 'pet') {
      this.stats.happiness = Math.min(100, this.stats.happiness + 5);
      this.stats.energy = Math.min(100, this.stats.energy + 2);
      this.stats.totalPets++;
      this._addXp(10);
    } else if (type === 'feed') {
      this.stats.energy = Math.min(100, this.stats.energy + 10);
      this.stats.happiness = Math.min(100, this.stats.happiness + 2);
      this.stats.totalFeeds++;
      this._addXp(15);
    } else if (type === 'shoo') {
      this.stats.happiness = Math.max(0, this.stats.happiness - 10);
      this.stats.energy = Math.max(0, this.stats.energy - 5);
      this._addXp(5);
    }
    this._recordMoodEvent(type);
    await this._save();
  }

  async recordSiteVisit(category: string): Promise<void> {
    await this.isLoaded;
    if (category === 'code') {
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 3);
      this.stats.energy = Math.max(0, this.stats.energy - 1);
      this._addXp(5);
    } else if (category === 'social') {
      this.stats.happiness = Math.min(100, this.stats.happiness + 2);
      this.stats.curiosity = Math.max(0, this.stats.curiosity - 1);
      this._addXp(2);
    } else if (category === 'news') {
      this.stats.happiness = Math.max(0, this.stats.happiness - 2);
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 2);
      this._addXp(3);
    } else if (category === 'gaming') {
      this.stats.happiness = Math.min(100, this.stats.happiness + 5);
      this.stats.energy = Math.min(100, this.stats.energy + 2);
      this._addXp(6);
    } else if (category === 'shopping') {
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 1);
      this._addXp(2);
    } else if (category === 'docs') {
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 2);
      this.stats.energy = Math.max(0, this.stats.energy - 2);
      this._addXp(4);
    }
    await this._save();
  }

  defaultEmotion(): string {
    const happiness = this.stats.happiness;
    if (happiness >= 80) return 'happy';
    if (happiness >= 50) return 'waving';
    if (happiness >= 20) return 'sad';
    return 'crying';
  }

  isEmotionUnlocked(emotion: string): boolean {
    const lvl = this.stats.level;
    
    const level1 = ['happy', 'sad', 'angry', 'crying', 'waving', 'sleeping', 'working-thinking', 'shrug'];
    const level3 = [...level1, 'coding', 'working-typing', 'dancing', 'cool', 'love', 'celebrating', 'mindblown'];
    const level5 = [...level3, 'ninja', 'working-wizard', 'astronaut', 'working-debugger', 'working-building'];
    const level8 = [...level5, 'rocket', 'pirate', 'working-juggling', 'gaming'];
    
    if (lvl >= 10) return true;
    if (lvl >= 8) return level8.includes(emotion);
    if (lvl >= 5) return level5.includes(emotion);
    if (lvl >= 3) return level3.includes(emotion);
    return level1.includes(emotion);
  }

  _addXp(amount: number): void {
    this.stats.xp += amount;
    let xpNeeded = this.stats.level * 100;
    
    while (this.stats.xp >= xpNeeded) {
      this.stats.xp -= xpNeeded;
      this.stats.level++;
      xpNeeded = this.stats.level * 100;
      this._triggerLevelUpNotification();
    }
  }

  _recordMoodEvent(action: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.stats.moodHistory.unshift({ action, time });
    if (this.stats.moodHistory.length > 20) {
      this.stats.moodHistory.pop();
    }
  }

  _triggerLevelUpNotification(): void {
    const event = new CustomEvent('pet-level-up', { detail: { level: this.stats.level } });
    window.dispatchEvent(event);
  }
}
