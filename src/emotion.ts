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

    // Time of day reactions
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) return 'sleeping';
    if (hour >= 6 && hour < 9) return 'yoga';

    if (ctx.idleSeconds > 300) return 'sleeping';
    if (ctx.idleSeconds > 60) return 'working-thinking';
    if (ctx.isVideoPlaying) return this._mediaEmotion(ctx);
    if (ctx.isTypingHeavy) return 'working-typing';
    if (ctx.isFormSubmitting) return 'celebrating';

    const category = this._classifySite(ctx.hostname);
    if (category === 'code') return this._codeEmotion(ctx);
    if (category === 'social') return 'love';
    if (category === 'gaming') return 'gaming';
    if (category === 'news') return 'working-thinking';
    if (category === 'shopping') return 'mindblown';
    if (category === 'docs') return 'reading';

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
    return 'coding';
  }

  _mediaEmotion(ctx: TriggerSnapshot): string {
    const host = ctx.hostname.toLowerCase();
    if (host.includes('youtube') || host.includes('netflix') || host.includes('vimeo')) {
      return 'eating';
    }
    if (host.includes('spotify') || host.includes('soundcloud') || host.includes('music')) {
      return 'dancing';
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
