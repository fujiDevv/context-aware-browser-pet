import { PetStats } from './types';

const DEFAULT_STATS: PetStats = {
  happiness: 50,
  energy: 80,
  curiosity: 60,
  focus: 50,
  leisure: 50,
  totalPets: 0,
  totalFeeds: 0,
  level: 1,
  xp: 0,
  moodHistory: [],
  siteCategoryCounts: {},
  prestige: 0,
  lastHabitDecayTime: 0
};

export class PersonalitySystem {
  stats: PetStats;
  onStatsChange?: (stats: PetStats) => void;
  isLoaded: Promise<PetStats>;
  disabledEmotions: string[] = [];
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

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        if (changes['pet-stats']) {
          const newVal = changes['pet-stats'].newValue;
          if (newVal) {
            this.stats = newVal;
          }
        }
      });
    }
  }

  _applyDecay(): void {
    const lastUpdate = this.stats.lastUpdateTime || Date.now();
    const elapsedMs = Date.now() - lastUpdate;
    // Limit offline decay calculation to max 24 hours (86,400 seconds)
    const elapsedSeconds = Math.max(0, Math.min(86400, elapsedMs / 1000));

    // Decay rates per second
    const happinessDecay = elapsedSeconds * 0.0011;
    const energyDecay = elapsedSeconds * 0.0019;
    const curiosityDecay = elapsedSeconds * 0.0005;
    const focusDecay = elapsedSeconds * 0.0015;
    const leisureDecay = elapsedSeconds * 0.0015;

    // Clamp stats at 15% floor so Clawd is never fully depleted/unusable offline
    this.stats.happiness = Math.max(15, Math.round(this.stats.happiness - happinessDecay));
    this.stats.energy = Math.max(15, Math.round(this.stats.energy - energyDecay));
    this.stats.curiosity = Math.max(15, Math.round(this.stats.curiosity - curiosityDecay));
    this.stats.focus = Math.max(15, Math.round(this.stats.focus - focusDecay));
    this.stats.leisure = Math.max(15, Math.round(this.stats.leisure - leisureDecay));
  }

  _applyHabitDecay(): void {
    const now = Date.now();
    if (!this.stats.lastHabitDecayTime) {
      this.stats.lastHabitDecayTime = now;
      return;
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const elapsed = now - this.stats.lastHabitDecayTime;

    if (elapsed >= sevenDaysMs) {
      const weeksElapsed = Math.floor(elapsed / sevenDaysMs);
      
      if (this.stats.siteCategoryCounts) {
        const decayFactor = Math.pow(0.95, weeksElapsed);
        
        for (const category in this.stats.siteCategoryCounts) {
          if (Object.prototype.hasOwnProperty.call(this.stats.siteCategoryCounts, category)) {
            const decayedVal = this.stats.siteCategoryCounts[category] * decayFactor;
            if (decayedVal < 0.1) {
              delete this.stats.siteCategoryCounts[category];
            } else {
              this.stats.siteCategoryCounts[category] = decayedVal;
            }
          }
        }
      }
      
      this.stats.lastHabitDecayTime += weeksElapsed * sevenDaysMs;
    }
  }

  async _periodicDecay(): Promise<void> {
    await this.isLoaded;
    this._applyDecay();
    this._applyHabitDecay();
    this._recordDailyMood();
    await this._save();
  }

  _recordDailyMood(): void {
    const today = new Date().toISOString().split('T')[0];
    if (!this.stats.dailyMoodHistory) {
      this.stats.dailyMoodHistory = [];
    }
    
    let record = this.stats.dailyMoodHistory.find(r => r.date === today);
    if (!record) {
      record = { 
        date: today, 
        happiness: this.stats.happiness, 
        energy: this.stats.energy, 
        curiosity: this.stats.curiosity,
        focus: this.stats.focus,
        leisure: this.stats.leisure,
        count: 1 
      };
      this.stats.dailyMoodHistory.push(record);
    } else {
      record.happiness = Math.round((record.happiness * record.count + this.stats.happiness) / (record.count + 1));
      record.energy = Math.round((record.energy * record.count + this.stats.energy) / (record.count + 1));
      record.curiosity = Math.round(((record.curiosity || 0) * record.count + (this.stats.curiosity || 60)) / (record.count + 1));
      record.focus = Math.round(((record.focus || 0) * record.count + (this.stats.focus || 50)) / (record.count + 1));
      record.leisure = Math.round(((record.leisure || 0) * record.count + (this.stats.leisure || 50)) / (record.count + 1));
      record.count++;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
    this.stats.dailyMoodHistory = this.stats.dailyMoodHistory.filter(r => r.date >= cutoffDate);
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
      this._applyHabitDecay();
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
      this.stats.leisure = Math.min(100, this.stats.leisure + 5);
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
      this.stats.leisure = Math.max(0, this.stats.leisure - 5);
      this._addXp(5);
    }
    this._recordMoodEvent(type);
    await this._save();
  }

  async recordSiteVisit(category: string, sentiment?: string): Promise<void> {
    await this.isLoaded;

    // Apply Local AI Sentiment Modifiers
    if (sentiment === 'POSITIVE') {
      this.stats.happiness = Math.min(100, this.stats.happiness + 2);
      this.stats.energy = Math.min(100, this.stats.energy + 1);
      this._addXp(2);
    } else if (sentiment === 'NEGATIVE') {
      if (category === 'code' || category === 'coding' || category === 'docs') {
        this.stats.happiness = Math.max(0, this.stats.happiness - 2);
        this.stats.focus = Math.min(100, this.stats.focus + 2);
      } else if (category === 'social') {
        this.stats.happiness = Math.max(0, this.stats.happiness - 5);
        this.stats.energy = Math.max(0, this.stats.energy - 2);
      } else {
        this.stats.happiness = Math.max(0, this.stats.happiness - 1);
        this.stats.energy = Math.max(0, this.stats.energy - 1);
      }
    }

    if (category === 'code' || category === 'coding') {
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 3);
      this.stats.focus = Math.min(100, this.stats.focus + 6);
      this.stats.leisure = Math.max(0, this.stats.leisure - 2);
      this.stats.energy = Math.max(0, this.stats.energy - 1);
      this._addXp(5);
    } else if (category === 'social') {
      this.stats.happiness = Math.min(100, this.stats.happiness + 2);
      this.stats.leisure = Math.min(100, this.stats.leisure + 4);
      this.stats.focus = Math.max(0, this.stats.focus - 2);
      this.stats.curiosity = Math.max(0, this.stats.curiosity - 1);
      this._addXp(2);
    } else if (category === 'news') {
      this.stats.happiness = Math.max(0, this.stats.happiness - 2);
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 2);
      this.stats.focus = Math.min(100, this.stats.focus + 1);
      this._addXp(3);
    } else if (category === 'gaming') {
      this.stats.happiness = Math.min(100, this.stats.happiness + 5);
      this.stats.leisure = Math.min(100, this.stats.leisure + 8);
      this.stats.focus = Math.max(0, this.stats.focus - 5);
      this.stats.energy = Math.min(100, this.stats.energy + 2);
      this._addXp(6);
    } else if (category === 'shopping') {
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 1);
      this.stats.leisure = Math.min(100, this.stats.leisure + 2);
      this._addXp(2);
    } else if (category === 'docs') {
      this.stats.curiosity = Math.min(100, this.stats.curiosity + 2);
      this.stats.focus = Math.min(100, this.stats.focus + 4);
      this.stats.energy = Math.max(0, this.stats.energy - 2);
      this._addXp(4);
    }

    // Record category analytics
    if (!this.stats.siteCategoryCounts) {
      this.stats.siteCategoryCounts = {};
    }
    this.stats.siteCategoryCounts[category] = (this.stats.siteCategoryCounts[category] || 0) + 1;
    
    // Record 7-day history
    if (!this.stats.siteCategoryHistory) {
      this.stats.siteCategoryHistory = {};
    }
    const today = new Date().toISOString().split('T')[0];
    if (!this.stats.siteCategoryHistory[today]) {
      this.stats.siteCategoryHistory[today] = {};
    }
    this.stats.siteCategoryHistory[today][category] = (this.stats.siteCategoryHistory[today][category] || 0) + 1;
    
    // Prune history older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
    for (const dateKey in this.stats.siteCategoryHistory) {
      if (dateKey < cutoffDate) {
        delete this.stats.siteCategoryHistory[dateKey];
      }
    }

    this._recordMoodEvent('visit-' + category);

    await this._save();
  }

  getDominantTrait(): 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal' {
    const counts = this.stats.siteCategoryCounts || {};
    
    const developerScore = (counts['code'] || 0) + (counts['coding'] || 0) + (counts['docs'] || 0);
    const gamerScore = (counts['gaming'] || 0) + (counts['streaming'] || 0);
    const scholarScore = counts['news'] || 0;
    const socialiteScore = (counts['social'] || 0) + (counts['mail'] || 0);
    
    const scores = {
      developer: developerScore,
      gamer: gamerScore,
      scholar: scholarScore,
      socialite: socialiteScore
    };
    
    let maxTrait: 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal' = 'normal';
    let maxScore = 3;
    
    for (const [trait, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        maxTrait = trait as any;
      }
    }
    
    return maxTrait;
  }

  defaultEmotion(): string {
    const happiness = this.stats.happiness;
    const energy = this.stats.energy;

    if (energy < 20) return 'battery-low';
    if (happiness < 25) return 'crying';
    if (happiness < 50) return 'sad';

    const trait = this.getDominantTrait();
    if (trait === 'developer') return 'working-thinking';
    if (trait === 'gamer') return 'cool';
    if (trait === 'socialite') return 'love';
    if (trait === 'scholar') return 'reading';

    if (happiness >= 80) return 'happy';
    return 'waving';
  }

  isEmotionUnlocked(emotion: string): boolean {
    if (this.disabledEmotions && this.disabledEmotions.includes(emotion)) {
      return false;
    }
    const lvl = this.stats.level;
    const hasPrestige = this.stats.prestige && this.stats.prestige > 0;
    if (hasPrestige) return true; // Rebirth permanently unlocks all emotes!

    // Allow cosmetic/seasonal/situational custom actions to be loaded always so user can enjoy all SVGs
    const freePassEmotions = [
      'battery-low', 'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing', 'skateboard',
      'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification', 'flexing',
      'lifting', 'singing', 'music', 'dj', 'eating', 'studying', 'crying', 'sad', 'happy', 'waving', 'sleeping',
      'money'
    ];
    if (freePassEmotions.includes(emotion)) return true;

    const level1 = ['happy', 'sad', 'angry', 'crying', 'waving', 'sleeping', 'working-thinking', 'shrug', 'reading', 'yoga', 'eating'];
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
    let xpNeeded = Math.floor(Math.pow(this.stats.level, 1.5) * 150);

    while (this.stats.xp >= xpNeeded) {
      this.stats.xp -= xpNeeded;
      this.stats.level++;
      xpNeeded = Math.floor(Math.pow(this.stats.level, 1.5) * 150);
    }
  }

  _recordMoodEvent(action: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.stats.moodHistory.unshift({ action, time });
    if (this.stats.moodHistory.length > 20) {
      this.stats.moodHistory.pop();
    }
  }
}
