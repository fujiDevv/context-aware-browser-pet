/**
 * Clawd Rule Configuration
 * This file contains hardcoded site classifications, emotion fallbacks,
 * and specific reaction pools to keep core logic clean.
 */

export const SITE_CLASSIFICATION_RULES: Record<string, string[]> = {
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
    'shein.com', 'ikea.com', 'apple.com/shop', 'shopee.ph', 'lazada.com.ph',
    'zalora.com.ph'
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

export const EMOTION_FALLBACKS: Record<string, string> = {
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
  gaming: 'happy',
  money: 'happy'
};

export const FOCUS_EMOTIONS = ['working-typing', 'working-thinking', 'studying'];

export const IDLE_CHOICES = [
  'sleeping', 'working-thinking', 'skateboard', 'telescope', 'meditating',
  'working-rubber-duck', 'coffee', 'yawning'
];

export const WORK_EMOTIONS = ['working-thinking', 'working-rubber-duck', 'coffee', 'studying'];

export const SUMMER_CHOICES = ['summer', 'surfing', 'ice-cream'];

export const CODING_EMOTES = ['coding', 'working-building', 'working-typing'];

export const MUSIC_EMOTES = ['music', 'singing', 'dj'];

export const FITNESS_EMOTES = ['flexing', 'lifting', 'yoga'];

export const ALL_EMOTIONS_POOL = [
  'happy', 'sad', 'angry', 'crying', 'waving', 'sleeping', 'working-thinking', 'shrug', 'reading', 'yoga',
  'eating', 'coding', 'working-typing', 'dancing', 'cool', 'love', 'celebrating', 'mindblown', 'ninja',
  'working-wizard', 'astronaut', 'working-debugger', 'working-building', 'rocket', 'pirate', 'working-juggling',
  'gaming', 'battery-low', 'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing',
  'skateboard', 'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification',
  'flexing', 'lifting', 'singing', 'music', 'dj'
];

export const SEASONAL_POOL = ['christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing'];
