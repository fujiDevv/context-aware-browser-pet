import { PersonalitySystem } from './personality';
import { TriggerSnapshot } from './types';

export class EmotionEngine {
  personality: PersonalitySystem;
  current: string;

  constructor(personality: PersonalitySystem) {
    this.personality = personality;
    this.current = 'happy';
  }

  async evaluate(ctx: TriggerSnapshot): Promise<string> {
    let emotion = await this._determineEmotion(ctx);

    const isHttpError = ['404', '500', '403', '429'].includes(emotion);

    if (!isHttpError && !this.personality.isEmotionUnlocked(emotion)) {
      emotion = this._getFallback(emotion);
    }

    this.current = emotion;
    return emotion;
  }

  async _determineEmotion(ctx: TriggerSnapshot): Promise<string> {
    if (ctx.lastHttpError === 404) return '404';
    if (ctx.lastHttpError === 500) return '500';
    if (ctx.lastHttpError === 403) return '403';
    if (ctx.lastHttpError === 429) return '429';
    if (ctx.hasConsoleError) return 'working-debugger';

    // 1. Time of day reactions
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) return 'sleeping';
    if (hour >= 6 && hour < 9) return 'yoga';

    // 2. Idle State Dynamic Choices
    if (ctx.idleSeconds > 300) return 'sleeping';
    if (ctx.idleSeconds > 45) {
      // Pick a random entertaining idle action instead of just staring
      const idleChoices = ['sleeping', 'working-thinking', 'skateboard', 'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'yawning'];
      const hash = Math.floor((ctx.idleSeconds + new Date().getMinutes()) % idleChoices.length);
      return idleChoices[hash];
    }

    // 3. Seasonal / Calendar Events
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    if (month === 9) return 'halloween'; // October
    if (month === 11) return 'christmas'; // December
    if (month >= 5 && month <= 7) {
      // Summer months
      const summerChoices = ['summer', 'surfing', 'ice-cream'];
      return summerChoices[Math.floor(new Date().getMinutes() % summerChoices.length)];
    }

    // 4. Activity Indicators
    if (ctx.isVideoPlaying) return this._mediaEmotion(ctx);
    if (ctx.isTypingHeavy) return 'working-typing';
    if (ctx.isFormSubmitting) return 'celebrating';

    // 5. Site Classification Custom Matches
    const category = this._classifySite(ctx.hostname);
    if (category === 'code') return this._codeEmotion(ctx);
    if (category === 'social') return 'love';
    if (category === 'gaming') return 'gaming';
    if (category === 'news') return 'working-thinking';
    if (category === 'shopping') return 'money';
    if (category === 'docs') return 'studying';
    if (category === 'mail') return 'mail';
    if (category === 'fitness') {
      const fitChoices = ['flexing', 'lifting', 'yoga'];
      return fitChoices[Math.floor(new Date().getMinutes() % fitChoices.length)];
    }

    return this.personality.defaultEmotion();
  }

  _classifySite(hostname: string): string {
    const rules: Record<string, string[]> = {
      code: ['github.com', 'stackoverflow.com', 'codepen.io', 'replit.com', 'gitlab.com', 'bitbucket.org', 'npmjs.com'],
      social: ['twitter.com', 'x.com', 'instagram.com', 'reddit.com', 'facebook.com', 'tiktok.com', 'threads.net'],
      gaming: ['twitch.tv', 'store.steampowered.com', 'itch.io', 'roblox.com'],
      news: ['bbc.com', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com', 'apnews.com'],
      shopping: ['amazon.com', 'ebay.com', 'shopify.com', 'etsy.com'],
      docs: ['notion.so', 'confluence.atlassian.com', 'docs.google.com', 'obsidian.md', 'wikipedia.org'],
      mail: ['mail.google.com', 'outlook.live.com', 'mail.yahoo.com'],
      fitness: ['strava.com', 'bodybuilding.com', 'fitbit.com', 'myfitnesspal.com']
    };

    for (const [category, hosts] of Object.entries(rules)) {
      if (hosts.some(h => hostname.endsWith(h) || hostname.includes('.' + h + '.') || hostname === h)) {
        return category;
      }
    }
    return 'default';
  }

  _codeEmotion(ctx: TriggerSnapshot): string {
    const titleLower = (ctx.pageTitle || '').toLowerCase();
    if (titleLower.includes('error') || titleLower.includes('fail') || titleLower.includes('bug')) {
      return 'working-debugger';
    }
    if (ctx.isTypingHeavy) return 'coding';
    // Randomly show coding tasks
    const codingEmotes = ['coding', 'working-building', 'working-typing'];
    return codingEmotes[Math.floor(new Date().getMinutes() % codingEmotes.length)];
  }

  _mediaEmotion(ctx: TriggerSnapshot): string {
    const host = ctx.hostname.toLowerCase();
    if (host.includes('youtube') || host.includes('netflix') || host.includes('vimeo')) {
      return 'eating';
    }
    if (host.includes('spotify') || host.includes('soundcloud') || host.includes('music')) {
      // Rotate music emotions
      const musicEmotes = ['music', 'singing', 'dj'];
      return musicEmotes[Math.floor(new Date().getMinutes() % musicEmotes.length)];
    }
    return 'cool';
  }

  _getFallback(emotion: string): string {
    const fallbacks: Record<string, string> = {
      coding: 'working-thinking',
      'working-typing': 'working-thinking',
      dancing: 'happy',
      cool: 'happy',
      love: 'happy',
      celebrating: 'happy',
      mindblown: 'working-thinking',
      eating: 'happy',
      reading: 'working-thinking',
      yoga: 'happy',

      ninja: 'happy',
      'working-wizard': 'working-thinking',
      astronaut: 'sleeping',
      'working-debugger': 'angry',
      'working-building': 'working-thinking',

      rocket: 'happy',
      pirate: 'sad',
      'working-juggling': 'happy',
      gaming: 'happy'
    };

    return fallbacks[emotion] || this.personality.defaultEmotion();
  }
}
