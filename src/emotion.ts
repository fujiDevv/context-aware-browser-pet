import { PersonalitySystem } from './personality';
import { TriggerSnapshot } from './types';

export class EmotionEngine {
  personality: PersonalitySystem;
  current: string;

  constructor(personality: PersonalitySystem) {
    this.personality = personality;
    this.current = 'happy';
  }

  async evaluate(ctx: TriggerSnapshot, scheduleEnabled: boolean = true, seasonalEnabled: boolean = true): Promise<string> {
    let emotion = await this._determineEmotion(ctx, scheduleEnabled, seasonalEnabled);

    const isHttpError = ['404', '500', '403', '429'].includes(emotion);

    if (!isHttpError && !this.personality.isEmotionUnlocked(emotion)) {
      emotion = this._getFallback(emotion);
    }

    this.current = emotion;
    return emotion;
  }

  async _determineEmotion(ctx: TriggerSnapshot, scheduleEnabled: boolean = true, seasonalEnabled: boolean = true): Promise<string> {
    if (!scheduleEnabled) {
      let allEmotions = [
        'happy', 'sad', 'angry', 'crying', 'waving', 'sleeping', 'working-thinking', 'shrug', 'reading', 'yoga',
        'eating', 'coding', 'working-typing', 'dancing', 'cool', 'love', 'celebrating', 'mindblown', 'ninja',
        'working-wizard', 'astronaut', 'working-debugger', 'working-building', 'rocket', 'pirate', 'working-juggling',
        'gaming', 'battery-low', 'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing',
        'skateboard', 'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification',
        'flexing', 'lifting', 'singing', 'music', 'dj'
      ];

      if (!seasonalEnabled) {
        const seasonalPool = ['christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing'];
        allEmotions = allEmotions.filter(e => !seasonalPool.includes(e));
      }

      const unlocked = allEmotions.filter(e => this.personality.isEmotionUnlocked(e));
      if (unlocked.length > 0) {
        const timeHash = Math.floor(Date.now() / 60000);
        const index = timeHash % unlocked.length;
        return unlocked[index];
      }
      return this.personality.defaultEmotion();
    }

    if (ctx.lastHttpError === 404) return '404';
    if (ctx.lastHttpError === 500) return '500';
    if (ctx.lastHttpError === 403) return '403';
    if (ctx.lastHttpError === 429) return '429';
    if (ctx.hasConsoleError) return 'working-debugger';

    // 1. High Priority Activity Indicators
    if (ctx.isVideoPlaying) return this._mediaEmotion(ctx);
    if (ctx.isTypingHeavy) return 'working-typing';
    if (ctx.isFormSubmitting) return 'celebrating';

    // 2. Site Classification Custom Matches
    const category = this._classifySite(ctx.hostname);
    if (category === 'code') return this._codeEmotion(ctx);
    if (category === 'social') return 'love';
    if (category === 'gaming') return 'gaming';
    if (category === 'news') return 'working-thinking';
    if (category === 'shopping') return 'money';
    if (category === 'docs') return 'studying';
    if (category === 'mail') return 'mail';
    if (category === 'ai') return 'mindblown';
    if (category === 'streaming') return 'eating';
    if (category === 'finance') return 'money';
    if (category === 'fitness') {
      const fitChoices = ['flexing', 'lifting', 'yoga'];
      return fitChoices[Math.floor(new Date().getMinutes() % fitChoices.length)];
    }

    // 3. Idle State Dynamic Choices
    if (ctx.idleSeconds > 300) return 'sleeping';
    if (ctx.idleSeconds > 45) {
      const idleChoices = ['sleeping', 'working-thinking', 'skateboard', 'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'yawning'];
      const hash = Math.floor((ctx.idleSeconds + new Date().getMinutes()) % idleChoices.length);
      return idleChoices[hash];
    }

    // 4. Time of day reactions
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) return 'sleeping';
    if (hour >= 6 && hour < 9) return 'yoga';

    // 5. Seasonal / Calendar Events (Low Priority Fallback)
    if (seasonalEnabled) {
      const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
      if (month === 9) return 'halloween'; // October
      if (month === 11) return 'christmas'; // December
      if (month >= 5 && month <= 7) {
        // Summer months
        const summerChoices = ['summer', 'surfing', 'ice-cream'];
        return summerChoices[Math.floor(new Date().getMinutes() % summerChoices.length)];
      }
    }

    return this.personality.defaultEmotion();
  }

  _classifySite(hostname: string): string {
    const rules: Record<string, string[]> = {
      code: [
        'github.com', 'stackoverflow.com', 'codepen.io', 'replit.com', 'gitlab.com',
        'bitbucket.org', 'npmjs.com', 'leetcode.com', 'hackerrank.com', 'w3schools.com',
        'developer.mozilla.org', 'dev.to', 'medium.com', 'hashnode.dev', 'gist.github.com'
      ],
      social: [
        'twitter.com', 'x.com', 'instagram.com', 'reddit.com', 'facebook.com',
        'tiktok.com', 'threads.net', 'linkedin.com', 'pinterest.com', 'tumblr.com',
        'snapchat.com', 'discord.com', 'whatsapp.com', 't.me', 'telegram.org'
      ],
      gaming: [
        'twitch.tv', 'store.steampowered.com', 'itch.io', 'roblox.com', 'epicgames.com',
        'gog.com', 'ign.com', 'gamespot.com', 'nexusmods.com', 'discordapp.com',
        'playstation.com', 'xbox.com', 'nintendo.com', 'minecraft.net'
      ],
      news: [
        'bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'theguardian.com', 'reuters.com',
        'apnews.com', 'bloomberg.com', 'forbes.com', 'wsj.com', 'ft.com', 'cnbc.com',
        'huffpost.com', 'aljazeera.com', 'techcrunch.com', 'theverge.com', 'wired.com'
      ],
      shopping: [
        'amazon.com', 'ebay.com', 'shopify.com', 'etsy.com', 'aliexpress.com',
        'target.com', 'walmart.com', 'bestbuy.com', 'craigslist.org', 'temu.com',
        'shein.com', 'ikea.com', 'apple.com/shop'
      ],
      docs: [
        'notion.so', 'confluence.atlassian.com', 'docs.google.com', 'obsidian.md',
        'wikipedia.org', 'miro.com', 'figma.com', 'clickup.com', 'monday.com',
        'asana.com', 'trello.com', 'linear.app', 'airtable.com'
      ],
      mail: [
        'mail.google.com', 'outlook.live.com', 'mail.yahoo.com', 'proton.me',
        'protonmail.com', 'icloud.com', 'zoho.com/mail'
      ],
      fitness: [
        'strava.com', 'bodybuilding.com', 'fitbit.com', 'myfitnesspal.com',
        'garmin.com', 'nike.com', 'trainingpeaks.com', 'alltrails.com', 'peloton.com'
      ],
      ai: [
        'chatgpt.com', 'openai.com', 'claude.ai', 'anthropic.com', 'gemini.google.com',
        'perplexity.ai', 'huggingface.co', 'midjourney.com', 'v0.dev'
      ],
      streaming: [
        'youtube.com', 'youtu.be', 'netflix.com', 'spotify.com', 'hulu.com',
        'disneyplus.com', 'hbo.com', 'max.com', 'vimeo.com', 'soundcloud.com'
      ],
      finance: [
        'stripe.com', 'paypal.com', 'chase.com', 'bankofamerica.com', 'wellsfargo.com',
        'coinbase.com', 'binance.com', 'fidelity.com', 'vanguard.com', 'mint.com'
      ]
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
