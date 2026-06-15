import { PersonalitySystem } from './personality';
import { TriggerSnapshot } from './types';
import { 
  detectPageCategory,
  EMOTION_FALLBACKS, 
  FOCUS_EMOTIONS, 
  IDLE_CHOICES, 
  WORK_EMOTIONS, 
  SUMMER_CHOICES, 
  CODING_EMOTES, 
  MUSIC_EMOTES, 
  FITNESS_EMOTES, 
  ALL_EMOTIONS_POOL, 
  SEASONAL_POOL 
} from './rules';

export class EmotionEngine {
  personality: PersonalitySystem;
  current: string;

  constructor(personality: PersonalitySystem) {
    this.personality = personality;
    this.current = 'happy';
  }

  async evaluate(
    ctx: TriggerSnapshot,
    scheduleEnabled: boolean = true,
    seasonalEnabled: boolean = true,
    customPlanner?: {
      sleepStartHour?: number;
      sleepEndHour?: number;
      workStartHour?: number;
      workEndHour?: number;
      focusActive?: boolean;
      focusStartHour?: number;
      focusEndHour?: number;
    }
  ): Promise<string> {
    let emotion = await this._determineEmotion(ctx, scheduleEnabled, seasonalEnabled, customPlanner);

    const isHttpError = ['404', '500', '403', '429'].includes(emotion);

    if (!isHttpError && !this.personality.isEmotionUnlocked(emotion)) {
      emotion = this._getFallback(emotion);
    }

    this.current = emotion;
    return emotion;
  }

  async _determineEmotion(
    ctx: TriggerSnapshot,
    scheduleEnabled: boolean = true,
    seasonalEnabled: boolean = true,
    customPlanner?: {
      sleepStartHour?: number;
      sleepEndHour?: number;
      workStartHour?: number;
      workEndHour?: number;
      focusActive?: boolean;
      focusStartHour?: number;
      focusEndHour?: number;
    }
  ): Promise<string> {
    if (ctx.lastHttpError === 404) return '404';
    if (ctx.lastHttpError === 500) return '500';
    if (ctx.lastHttpError === 403) return '403';
    if (ctx.lastHttpError === 429) return '429';
    if (ctx.hasConsoleError) return 'working-debugger';

    // Focus Blocks Override (Manual Toggle or Scheduled Hours)
    let isFocusActive = customPlanner?.focusActive || false;
    const hour = new Date().getHours();
    
    if (!isFocusActive && customPlanner?.focusStartHour !== undefined && customPlanner?.focusEndHour !== undefined) {
      const start = customPlanner.focusStartHour;
      const end = customPlanner.focusEndHour;
      if (start < end) {
        isFocusActive = hour >= start && hour < end;
      } else {
        isFocusActive = hour >= start || hour < end;
      }
    }

    if (isFocusActive) {
      const index = Math.floor(new Date().getMinutes() / 10) % FOCUS_EMOTIONS.length;
      return FOCUS_EMOTIONS[index];
    }

    if (!scheduleEnabled) {
      let pool = [...ALL_EMOTIONS_POOL];

      if (!seasonalEnabled) {
        pool = pool.filter(e => !SEASONAL_POOL.includes(e));
      }

      const unlocked = pool.filter(e => this.personality.isEmotionUnlocked(e));
      if (unlocked.length > 0) {
        const timeHash = Math.floor(Date.now() / 60000);
        const index = timeHash % unlocked.length;
        return unlocked[index];
      }
      return this.personality.defaultEmotion();
    }

    // 1. High Priority Activity Indicators
    if (ctx.isVideoPlaying) return this._mediaEmotion(ctx);
    if (ctx.isTypingHeavy) return 'working-typing';
    if (ctx.isFormSubmitting) return 'celebrating';

    // 2. Site Classification Custom Matches
    const category = detectPageCategory(ctx.hostname, ctx.pageTitle);
    if (category === 'coding') return this._codeEmotion(ctx);
    if (category === 'social') return 'love';
    if (category === 'gaming') return 'gaming';
    if (category === 'news') return 'working-thinking';
    if (category === 'shopping') return 'money';
    if (category === 'docs') return 'studying';
    if (category === 'mail') return 'mail';
    if (category === 'ai') return 'mindblown';
    if (category === 'streaming') return 'eating';
    if (category === 'finance') return 'money';
    if (category === 'search') return 'working-thinking';
    if (category === 'fitness') {
      return FITNESS_EMOTES[Math.floor(new Date().getMinutes() % FITNESS_EMOTES.length)];
    }

    // 3. Idle State Dynamic Choices
    if (ctx.idleSeconds > 300) return 'sleeping';
    if (ctx.idleSeconds > 45) {
      const hash = Math.floor((ctx.idleSeconds + new Date().getMinutes()) % IDLE_CHOICES.length);
      return IDLE_CHOICES[hash];
    }

    // 4. Custom Sleep planner
    const sleepStart = customPlanner?.sleepStartHour !== undefined ? customPlanner.sleepStartHour : 22;
    const sleepEnd = customPlanner?.sleepEndHour !== undefined ? customPlanner.sleepEndHour : 6;
    let isSleeping = false;
    if (sleepStart < sleepEnd) {
      isSleeping = hour >= sleepStart && hour < sleepEnd;
    } else {
      isSleeping = hour >= sleepStart || hour < sleepEnd;
    }
    if (isSleeping) return 'sleeping';

    // 4.1 Yoga check right after waking up
    if (hour === sleepEnd) return 'yoga';

    // 4.2 Custom Active Work Hours
    const workStart = customPlanner?.workStartHour !== undefined ? customPlanner.workStartHour : 9;
    const workEnd = customPlanner?.workEndHour !== undefined ? customPlanner.workEndHour : 17;
    let isWorking = false;
    if (workStart < workEnd) {
      isWorking = hour >= workStart && hour < workEnd;
    } else {
      isWorking = hour >= workStart || hour < workEnd;
    }
    if (isWorking) {
      const index = Math.floor(new Date().getMinutes() / 15) % WORK_EMOTIONS.length;
      return WORK_EMOTIONS[index];
    }

    // 5. Seasonal / Calendar Events (Low Priority Fallback)
    if (seasonalEnabled) {
      const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
      if (month === 9) return 'halloween'; // October
      if (month === 11) return 'christmas'; // December
      if (month >= 5 && month <= 7) {
        // Summer months
        return SUMMER_CHOICES[Math.floor(new Date().getMinutes() % SUMMER_CHOICES.length)];
      }
    }

    return this.personality.defaultEmotion();
  }

  _codeEmotion(ctx: TriggerSnapshot): string {
    const titleLower = (ctx.pageTitle || '').toLowerCase();
    if (titleLower.includes('error') || titleLower.includes('fail') || titleLower.includes('bug')) {
      return 'working-debugger';
    }
    if (ctx.isTypingHeavy) return 'coding';
    // Randomly show coding tasks
    return CODING_EMOTES[Math.floor(new Date().getMinutes() % CODING_EMOTES.length)];
  }

  _mediaEmotion(ctx: TriggerSnapshot): string {
    const host = ctx.hostname.toLowerCase();
    if (host.includes('youtube') || host.includes('netflix') || host.includes('vimeo')) {
      return 'eating';
    }
    if (host.includes('spotify') || host.includes('soundcloud') || host.includes('music')) {
      // Rotate music emotions
      return MUSIC_EMOTES[Math.floor(new Date().getMinutes() % MUSIC_EMOTES.length)];
    }
    return 'cool';
  }

  _getFallback(emotion: string): string {
    return EMOTION_FALLBACKS[emotion] || this.personality.defaultEmotion();
  }
}

