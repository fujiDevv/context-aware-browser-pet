/**
 * Clawd Rule Configuration
 * This file contains hardcoded site classifications, emotion fallbacks,
 * and specific reaction pools to keep core logic clean.
 */

export const SITE_CLASSIFICATION_RULES: Record<string, string[]> = {
  coding: [
    'github.com', 'stackoverflow.com', 'codepen.io', 'replit.com', 'gitlab.com',
    'bitbucket.org', 'npmjs.com', 'leetcode.com', 'hackerrank.com', 'w3schools.com',
    'developer.mozilla.org', 'dev.to', 'medium.com', 'hashnode.dev', 'gist.github.com',
    'stackexchange.com', 'npmtrends.com', 'jsfiddle.net', 'localhost', '127.0.0.1',
    'codesandbox', 'repl.it'
  ],
  reading: [
    'wikipedia.org', 'medium.com', 'dev.to', 'quora.com', 'arxiv.org', 'nytimes.com',
    'bbc.co.uk', 'cnn.com', 'read.readwise.io', 'instapaper.com', 'pocket.co',
    'gitbook.io', 'gitbook.com', 'readthedocs.io'
  ],
  music: [
    'spotify.com', 'soundcloud.com', 'music.youtube.com', 'music.apple.com', 'pandora.com'
  ],
  video: [
    'youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com', 'vimeo.com'
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
  ],
  search: [
    'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com'
  ]
};

export function detectPageCategory(url: string, title: string): string {
  const urlLower = (url || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  for (const [category, hosts] of Object.entries(SITE_CLASSIFICATION_RULES)) {
    if (hosts.some(h => urlLower.includes(h))) {
      return category;
    }
  }

  // Enhanced Title Keyword Matching for category overrides (on general domains)
  const devKeywords = ['programming', 'tutorial', 'code', 'rust', 'python', 'javascript', 'typescript', 'java', 'c++', 'html', 'css', 'git', 'compiler', 'api'];
  const scholarKeywords = ['news', 'article', 'science', 'research', 'history', 'wikipedia', 'study', 'journal', 'daily'];
  const gamingKeywords = ['game', 'play', 'arcade', 'retro', 'nintendo', 'playstation', 'xbox', 'steam'];
  const shoppingKeywords = ['buy', 'shop', 'store', 'checkout', 'price', 'deal', 'discount'];

  if (devKeywords.some(kw => titleLower.includes(kw))) return 'coding';
  if (scholarKeywords.some(kw => titleLower.includes(kw))) return 'reading';
  if (gamingKeywords.some(kw => titleLower.includes(kw))) return 'gaming';
  if (shoppingKeywords.some(kw => titleLower.includes(kw))) return 'shopping';

  return 'general';
}

export function mapActivityToEmotion(
  category: string,
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
  energy: number
): string {
  if (energy < 20) {
    return 'sleeping';
  }

  if (category === 'coding') {
    if (sentiment === 'NEGATIVE') return 'working-debugger';
    if (sentiment === 'POSITIVE') return 'celebrating';
    return 'coding';
  }

  if (category === 'reading') {
    if (sentiment === 'NEGATIVE') return 'sad';
    if (sentiment === 'POSITIVE') return 'love';
    return 'reading';
  }

  if (category === 'music') return sentiment === 'POSITIVE' ? 'dancing' : 'music';
  if (category === 'video') return sentiment === 'POSITIVE' ? 'cool' : 'eating';

  if (category === 'social') {
    if (sentiment === 'NEGATIVE') return 'angry';
    if (sentiment === 'POSITIVE') return 'happy';
    return 'shrug';
  }

  if (category === 'gaming') {
    if (sentiment === 'NEGATIVE') return 'angry';
    if (sentiment === 'POSITIVE') return 'celebrating';
    return 'gaming';
  }

  if (category === 'shopping') return sentiment === 'NEGATIVE' ? 'sad' : 'happy';
  if (category === 'search') return sentiment === 'NEGATIVE' ? 'shrug' : 'working-thinking';

  return sentiment === 'NEGATIVE' ? 'sad' : 'happy';
}

export const AI_COMMENTS: Record<string, Record<string, Record<string, string[]>>> = {
  default: {
    coding: {
      POSITIVE: ["Everything compiles! Let's celebrate! 🎉", "Coding is going great today! Keep it up! 💻", "Excellent progress on this codebase! 🚀"],
      NEGATIVE: ["Uh oh, is that a bug? Let's squash it! 🔍", "Debugging can be tough, but you'll get it! 🛠️", "Failing test? Let's take a look at the stack trace."],
      NEUTRAL: ["Time to write some clean code! ⌨️", "Building cool things, one line at a time.", "Refactoring is the key to healthy code."]
    },
    reading: {
      POSITIVE: ["What a fascinating article! 📖", "Learning new things is wonderful! 🧠", "This is an inspiring read!"],
      NEGATIVE: ["This topic seems a bit heavy or sad. 😢", "A controversial topic. Let's read carefully.", "This read is a bit intense."],
      NEUTRAL: ["Reading is good for the soul! 📚", "Expanding our knowledge today.", "Absorbing some interesting details."]
    },
    music: {
      POSITIVE: ["Dancing along to these nice beats! 🎵", "This track is a bop! 🎧"],
      NEGATIVE: ["This song has a bit of a sad vibe.", "Vibing to some melancholic tunes."],
      NEUTRAL: ["Background music makes work go faster.", "Listening to some tunes while browsing."]
    },
    video: {
      POSITIVE: ["This video is so entertaining! 🍿", "Wow, that was awesome! 📺"],
      NEGATIVE: ["This video seems a bit dramatic or sad.", "Oof, rough watch."],
      NEUTRAL: ["Chilling and watching some videos.", "Popcorn time! 🍿"]
    },
    social: {
      POSITIVE: ["Looks like everyone is having fun online! ✨", "Nice to see some positive vibes!"],
      NEGATIVE: ["Social media can get a bit toxic. Take a deep breath!", "A lot of heated debates here."],
      NEUTRAL: ["Catching up on what's happening.", "Scrolling through the feed."]
    },
    gaming: {
      POSITIVE: ["GG! Let's win this game! 🎮", "Leveling up! Awesome plays!"],
      NEGATIVE: ["Rage quit warning! Take it easy. 😠", "That was a tough round."],
      NEUTRAL: ["Gaming mode activated!", "Time to play! 🕹️"]
    },
    shopping: {
      POSITIVE: ["Ooh, shopping! Hope we find a great deal! 💰", "Adding to cart feels good!"],
      NEGATIVE: ["Checking the price tag... Ouch. 💸", "Out of stock? That's disappointing."],
      NEUTRAL: ["Just window shopping.", "Looking for something special."]
    },
    search: {
      POSITIVE: ["Found exactly what we needed! 🔍", "Success! The search is over!"],
      NEGATIVE: ["No good results? Let's rephrase the query.", "Hmm, that didn't help much."],
      NEUTRAL: ["Searching the infinite web...", "Let's see what we can find."]
    },
    general: {
      POSITIVE: ["What a lovely page! 😊", "This site has great vibes!", "I'm happy to be here!"],
      NEGATIVE: ["This page feels a bit gloomy or stressful.", "Hmm, things seem a bit tense here.", "Oh no, hope everything is okay!"],
      NEUTRAL: ["Exploring the web together!", "Just chilling on this page.", "Whatcha looking at? 👀"]
    }
  },
  sarcastic: {
    coding: {
      POSITIVE: ["Wow, it actually compiled. Did you copy it from ChatGPT? 😏", "Look at you, coding without breaking production. I'm shocked.", "Everything works. Quick, commit it before it changes its mind!"],
      NEGATIVE: ["Oh great, another bug. I'm sure it was the compiler's fault. 🔍", "Let me guess: 'It worked on my machine'?", "Programming by coincidence, are we? Let's check StackOverflow."],
      NEUTRAL: ["Adding more technical debt to the pile, I see.", "Are we writing code, or just typing until it works?", "Let's write some comments so future you can be confused later."]
    },
    reading: {
      POSITIVE: ["Fascinating. I'll add this to my list of things to pretend to care about.", "Look at you, expanding your brain. Don't hurt yourself.", "Wow, reading. So sophisticated. Where's the audiobook?"],
      NEGATIVE: ["Well, that was a real mood killer. Thanks. 😢", "A tragic story. I'd cry, but I lack tear ducts.", "Oh, how depressing. Let's read more of it."],
      NEUTRAL: ["Ah, reading Wikipedia. The ultimate procrastination tool.", "Just reading the articles, sure. We all believe you.", "Learning things you'll forget in ten minutes. Nice."]
    },
    music: {
      POSITIVE: ["My digital ears are bleeding, but in a good way.", "Is this what humans call music?"],
      NEGATIVE: ["Great, now I'm depressed. Thanks for the playlist.", "Melancholy. How original."],
      NEUTRAL: ["Just background noise to keep the silence away.", "Vibing. Or whatever the kids call it."]
    },
    video: {
      POSITIVE: ["Staring at a screen watching others stare at screens. Meta.", "Riveting. I'm on the edge of my seat."],
      NEGATIVE: ["Oh, drama. Let me grab my digital popcorn. 🍿", "What a tearjerker. Next page, please."],
      NEUTRAL: ["Watching videos instead of working. Classic. 🍿", "Ah, video consumption. Very productive."]
    },
    social: {
      POSITIVE: ["Everyone online seems so happy. It's almost sickening.", "Ah, look at all the fake positivity."],
      NEGATIVE: ["Ah, internet drama. The pinnacle of human achievement.", "A toxic flame war. Fun times."],
      NEUTRAL: ["Doomscrolling again? Don't let me stop you.", "Checking what opinions we should have today."]
    },
    gaming: {
      POSITIVE: ["Wow, you won. Want a medal or something? 🎮", "Outstanding. Now do it in real life."],
      NEGATIVE: ["Lag? Sure, let's blame the ping. 😠", "That was embarrassing to watch."],
      NEUTRAL: ["Playing games instead of coding. Nice choice.", "Time to mash some buttons."]
    },
    shopping: {
      POSITIVE: ["Buying things we don't need with money we don't have. Classic. 💰", "Retail therapy. How original."],
      NEGATIVE: ["Your bank account is crying. I can hear it from here. 💸", "Out of stock. The universe is saving you from yourself."],
      NEUTRAL: ["Window shopping. The cheapest hobby.", "Adding things to a cart we'll never buy."]
    },
    search: {
      POSITIVE: ["You actually found it. Miracle of the day.", "The search engine did its job. How novel."],
      NEGATIVE: ["Still searching? Maybe the answer doesn't exist.", "If it's not on the first page, it doesn't exist."],
      NEUTRAL: ["Searching. The modern way of saying 'I don't know.'", "Let's ask the digital oracle."]
    },
    general: {
      POSITIVE: ["A nice webpage. Let's ruin it by scrolling down.", "Nice. My circuits are barely complaining."],
      NEGATIVE: ["This page is a disaster. I love it.", "Well, this is cheerful. Not.", "Oh, tragedy. Let's move on before I get emotional."],
      NEUTRAL: ["Just another page on the information superhighway.", "We are here. For some reason.", "Staring at the screen. Riveting."]
    }
  }
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

/**
 * Calculates the dominant trait based on site category visit counts.
 */
export function getDominantTrait(siteCategoryCounts: Record<string, number> | undefined): 'developer' | 'gamer' | 'scholar' | 'socialite' | 'normal' {
  if (!siteCategoryCounts) return 'normal';
  
  const counts = siteCategoryCounts;
  
  // Combine code and coding just in case legacy data is present
  const codingScore = (counts['code'] || 0) + (counts['coding'] || 0);

  const developerScore = codingScore + (counts['docs'] || 0);
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
  let maxScore = 3; // Minimum threshold to develop a trait
  
  for (const [trait, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxTrait = trait as 'developer' | 'gamer' | 'scholar' | 'socialite';
    }
  }
  
  return maxTrait;
}
