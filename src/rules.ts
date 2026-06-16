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

export function detectPageCategory(url: string, title: string, ogType?: string, description?: string): string {
  const urlLower = (url || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const ogLower = (ogType || '').toLowerCase();
  const descLower = (description || '').toLowerCase();

  // 1. Meta-tag (OpenGraph) - High Signal for dynamic learning
  if (ogLower.includes('article') || ogLower.includes('blog') || ogLower.includes('post')) return 'reading';
  if (ogLower.includes('video')) return 'video';
  if (ogLower.includes('music') || ogLower.includes('audio') || ogLower.includes('song')) return 'music';
  if (ogLower.includes('book')) return 'reading';
  if (ogLower.includes('game')) return 'gaming';

  // 2. Hardcoded Domain Rules (Fallback)
  for (const [category, hosts] of Object.entries(SITE_CLASSIFICATION_RULES)) {
    if (hosts.some(h => urlLower.includes(h))) {
      return category;
    }
  }

  // 3. Keyword Matching (Title & Description)
  const devKeywords = ['programming', 'tutorial', 'code', 'rust', 'python', 'javascript', 'typescript', 'java', 'c++', 'html', 'css', 'git', 'compiler', 'api', 'documentation', 'stack overflow', 'developer'];
  const scholarKeywords = ['news', 'article', 'science', 'research', 'history', 'wikipedia', 'study', 'journal', 'daily', 'paper', 'manuscript'];
  const gamingKeywords = ['game', 'play', 'arcade', 'retro', 'nintendo', 'playstation', 'xbox', 'steam', 'quest', 'rpg', 'fps', 'multiplayer'];
  const shoppingKeywords = ['buy', 'shop', 'store', 'checkout', 'price', 'deal', 'discount', 'cart', 'purchase', 'order', 'amazon', 'ebay'];

  if (devKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) return 'coding';
  if (scholarKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) return 'reading';
  if (gamingKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) return 'gaming';
  if (shoppingKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) return 'shopping';

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
  },
  encouraging: {
    coding: {
      POSITIVE: ["You're a wizard with that code! 🧙‍♂️", "Coding is going great today! Keep it up! 💻", "Excellent progress on this codebase! 🚀"],
      NEGATIVE: ["Bugs happen to the best of us, you've got this! 💪", "Debugging can be tough, but you'll get it! 🛠️", "Almost fixed! Keep at it!"],
      NEUTRAL: ["One line at a time, building something great! 🚀", "Building cool things, one line at a time.", "Refactoring is the key to healthy code."]
    },
    reading: {
      POSITIVE: ["So much knowledge! You're inspiring! 🧠", "Learning new things is wonderful! 🧠", "This is an inspiring read!"],
      NEGATIVE: ["This topic seems a bit heavy, but you're strong! ✨", "A challenging read, but you're handling it well.", "Take your time with this one."],
      NEUTRAL: ["Reading is good for the soul! 📚", "Expanding our knowledge today.", "Your curiosity is your superpower! 📚"]
    },
    music: {
      POSITIVE: ["Love your taste! Let's vibe! 🎵", "This track is a bop! 🎧"],
      NEGATIVE: ["It's okay to feel the blues sometimes. 💙", "Vibing to some melancholic tunes."],
      NEUTRAL: ["Music makes everything better! 🎧", "Listening to some tunes while browsing."]
    },
    video: {
      POSITIVE: ["This looks so cool! Enjoy! 📺", "Wow, that was awesome! 📺"],
      NEGATIVE: ["Oof, tough watch. I'm here with you. 🍿", "Take a breather if you need to."],
      NEUTRAL: ["Relax and enjoy the show! 🍿", "Popcorn time! 🍿"]
    },
    social: {
      POSITIVE: ["Spreading positivity! Love to see it! ✨", "Nice to see some positive vibes!"],
      NEGATIVE: ["Don't let the noise get to you. Breathe. 🍃", "You're above the drama. Stay kind!"],
      NEUTRAL: ["Checking in on the world! 👋", "Scrolling through the feed."]
    },
    gaming: {
      POSITIVE: ["You're crushing it! Pro moves! 🎮", "Leveling up! Awesome plays!"],
      NEGATIVE: ["Close one! You'll get them next time! 🏆", "Keep your head up, victory is near!"],
      NEUTRAL: ["Game on! Have fun! 🕹️", "Time to play! 🕹️"]
    },
    shopping: {
      POSITIVE: ["Treat yourself! You deserve it! 💰", "Adding to cart feels good!"],
      NEGATIVE: ["The right deal is still out there! 💸", "Keep looking, you'll find the perfect one!"],
      NEUTRAL: ["Just looking for treasures! 💎", "Looking for something special."]
    },
    search: {
      POSITIVE: ["Expert researcher! Found it! 🔍", "Success! The search is over!"],
      NEGATIVE: ["Almost there, let's try one more search! ✨", "The answer is out there, don't give up!"],
      NEUTRAL: ["The internet is full of wonders! 🔍", "Let's see what we can find."]
    },
    general: {
      POSITIVE: ["This page has such good energy! 😊", "This site has great vibes!", "I'm happy to be here!"],
      NEGATIVE: ["I'm right here if you need a mascot hug! 🐾", "Everything will be okay! ✨", "Take a deep breath."],
      NEUTRAL: ["Exploring together is the best! 🌟", "Just chilling on this page.", "Whatcha looking at? 👀"]
    }
  },
  poetic: {
    coding: {
      POSITIVE: ["Logic flows like a silver stream, building the future of our dream. ✨", "Syntax woven line by line, crafting a world that's truly fine. 💻", "Everything compiles! Let's celebrate! 🎉"],
      NEGATIVE: ["A shadow in the script we find, to mend the web and clear the mind. 🔍", "Debugging can be tough, but you'll get it! 🛠️", "Failing test? Let's take a look at the stack trace."],
      NEUTRAL: ["Time to write some clean code! ⌨️", "Building cool things, one line at a time.", "Refactoring is the key to healthy code."]
    },
    reading: {
      POSITIVE: ["Pages turn and wisdom grows, in the garden where knowledge flows. 📖", "Learning new things is wonderful! 🧠", "This is an inspiring read!"],
      NEGATIVE: ["A heavy tale, a somber song, where shadows dwell and paths are long. 😢", "A controversial topic. Let's read carefully.", "This read is a bit intense."],
      NEUTRAL: ["Whispers from the written page, wisdom from a digital age. 📚", "Expanding our knowledge today.", "Absorbing some interesting details."]
    },
    music: {
      POSITIVE: ["A melody that's bright and clear, bringing joy to all who hear. 🎵", "This track is a bop! 🎧"],
      NEGATIVE: ["Melancholy in the air, a quiet song of soft despair. 🎻", "Vibing to some melancholic tunes."],
      NEUTRAL: ["Rhythm in the silent wire, setting digital hearts on fire. 🎧", "Listening to some tunes while browsing."]
    },
    video: {
      POSITIVE: ["Light and motion, stories told, of wonders new and legends old. 📺", "Wow, that was awesome! 📺"],
      NEGATIVE: ["A tragic scene, a tearful sight, fading in the pale blue light. 🍿", "Oof, rough watch."],
      NEUTRAL: ["Frames of life that drift and sway, passing time in a gentle way. 🍿", "Popcorn time! 🍿"]
    },
    social: {
      POSITIVE: ["Connections spark and spirits rise, beneath the vast and digital skies. ✨", "Nice to see some positive vibes!"],
      NEGATIVE: ["A storm of words, a bitter sea, where peace of mind has ceased to be. 🌊", "A lot of heated debates here."],
      NEUTRAL: ["A gathering of voices far, guided by a glowing star. 👋", "Scrolling through the feed."]
    },
    gaming: {
      POSITIVE: ["Victory won and glory found, where hero's echoes still resound. 🎮", "Leveling up! Awesome plays!"],
      NEGATIVE: ["A battle lost, a challenge met, but hope is far from fading yet. ⚔️", "That was a tough round."],
      NEUTRAL: ["Quests and journeys yet to start, written in a digital heart. 🕹️", "Time to play! 🕹️"]
    },
    shopping: {
      POSITIVE: ["Treasures found and riches gained, where desire is unchained. 💰", "Adding to cart feels good!"],
      NEGATIVE: ["A wish denied, a price too high, beneath the market's watchful eye. 💸", "Out of stock? That's disappointing."],
      NEUTRAL: ["Gems and baubles, bright and new, waiting there for me and you. 💎", "Looking for something special."]
    },
    search: {
      POSITIVE: ["The hidden truth is brought to light, chasing away the digital night. 🔍", "Success! The search is over!"],
      NEGATIVE: ["The path is lost, the sign is gone, we wander on until the dawn. 🧭", "Hmm, that didn't help much."],
      NEUTRAL: ["Seeking signs in the binary deep, where ancient digital secrets sleep. 🔍", "Let's see what we can find."]
    },
    general: {
      POSITIVE: ["A lovely sight, a pleasant stay, upon this bright and sunny day. 😊", "This site has great vibes!", "I'm happy to be here!"],
      NEGATIVE: ["A misty vale, a heavy cloud, where sorrow wraps us like a shroud. ☁️", "Hmm, things seem a bit tense here.", "Oh no, hope everything is okay!"],
      NEUTRAL: ["Wandering through the data's flow, to places where the mascots go. 🐾", "Just chilling on this page.", "Whatcha looking at? 👀"]
    }
  },
  genz: {
    coding: {
      POSITIVE: ["No cap, this code is fire. 💻", "Coding is going great today! Keep it up! 💻", "Excellent progress on this codebase! 🚀"],
      NEGATIVE: ["This bug is not very demure. 💀", "Debugging can be tough, but you'll get it! 🛠️", "Failing test? Let's take a look at the stack trace."],
      NEUTRAL: ["Just coding vibes, secure the bag. 🚀", "Building cool things, one line at a time.", "Refactoring is the key to healthy code."]
    },
    reading: {
      POSITIVE: ["Main character energy from this article. 📖", "Learning new things is wonderful! 🧠", "This is an inspiring read!"],
      NEGATIVE: ["This read is giving major ick. 😢", "A controversial topic. Let's read carefully.", "This read is a bit intense."],
      NEUTRAL: ["Gaining knowledge is valid. 📚", "Expanding our knowledge today.", "Absorbing some interesting details."]
    },
    music: {
      POSITIVE: ["This bop is lowkey iconic. 🎵", "This track is a bop! 🎧"],
      NEGATIVE: ["This song is a total mood, crying rn. 😭", "Vibing to some melancholic tunes."],
      NEUTRAL: ["Vibing to the data stream. 🎧", "Listening to some tunes while browsing."]
    },
    video: {
      POSITIVE: ["This video is popping off. 📺", "Wow, that was awesome! 📺"],
      NEGATIVE: ["That was a rough watch, literally shaking. 🍿", "Oof, rough watch."],
      NEUTRAL: ["Popcorn era is so back. 🍿", "Popcorn time! 🍿"]
    },
    social: {
      POSITIVE: ["The vibes are immaculate. ✨", "Nice to see some positive vibes!"],
      NEGATIVE: ["The tea is too hot, I'm logging off. ☕", "A lot of heated debates here."],
      NEUTRAL: ["Doomscrolling is my love language. 👋", "Scrolling through the feed."]
    },
    gaming: {
      POSITIVE: ["Absolute W, you're cracked! 🎮", "Leveling up! Awesome plays!"],
      NEGATIVE: ["That's a major L, we go again. 🤡", "That was a tough round."],
      NEUTRAL: ["Gaming era: active. 🕹️", "Time to play! 🕹️"]
    },
    shopping: {
      POSITIVE: ["Secured the drip! 💰", "Adding to cart feels good!"],
      NEGATIVE: ["Wallet is screaming, not very mindful. 💸", "Out of stock? That's disappointing."],
      NEUTRAL: ["Window shopping is valid. 💎", "Looking for something special."]
    },
    search: {
      POSITIVE: ["Found it, we're so back. 🔍", "Success! The search is over!"],
      NEGATIVE: ["Zero results? The internet is trolling. 🤡", "Hmm, that didn't help much."],
      NEUTRAL: ["Asking the digital oracle for the tea. 🔍", "Let's see what we can find."]
    },
    general: {
      POSITIVE: ["This page is so aesthetic. 😊", "This site has great vibes!", "I'm happy to be here!"],
      NEGATIVE: ["The energy here is suspicious. 🤨", "Hmm, things seem a bit tense here.", "Oh no, hope everything is okay!"],
      NEUTRAL: ["Just existing in your browser era. 🐾", "Just chilling on this page.", "Whatcha looking at? 👀"]
    }
  },
  snarky: {
    coding: {
      POSITIVE: ["It works? Don't touch it. Ever. 💻", "Look at you, coding without breaking production. I'm shocked.", "Everything works. Quick, commit it before it changes its mind!"],
      NEGATIVE: ["Is it a bug or a feature? Let's be honest, it's you. 🔍", "Oh great, another bug. I'm sure it was the compiler's fault. 🔍", "Let me guess: 'It worked on my machine'?"],
      NEUTRAL: ["Building technical debt for future you. Classic.", "Are we writing code, or just typing until it works?", "Let's write some comments so future you can be confused later."]
    },
    reading: {
      POSITIVE: ["Reading? In this economy? 📖", "Look at you, expanding your brain. Don't hurt yourself.", "Wow, reading. So sophisticated. Where's the audiobook?"],
      NEGATIVE: ["My circuits are bored already. 😴", "Well, that was a real mood killer. Thanks. 😢", "A tragic story. I'd cry, but I lack tear ducts."],
      NEUTRAL: ["Ah, the illusion of productivity. 📚", "Just reading the articles, sure. We all believe you.", "Learning things you'll forget in ten minutes. Nice."]
    },
    music: {
      POSITIVE: ["If you like it, I guess I'm happy for you. 🎵", "Is this what humans call music?"],
      NEGATIVE: ["Trying to feel something? Good luck. 🎻", "Great, now I'm depressed. Thanks for the playlist.", "Melancholy. How original."],
      NEUTRAL: ["Background noise for your questionable life choices. 🎧", "Just background noise to keep the silence away.", "Vibing. Or whatever the kids call it."]
    },
    video: {
      POSITIVE: ["Staring at a screen watching a screen. Peak human. 📺", "Riveting. I'm on the edge of my seat."],
      NEGATIVE: ["I've seen better acting in a firmware update. 🍿", "Oh, drama. Let me grab my digital popcorn. 🍿", "What a tearjerker. Next page, please."],
      NEUTRAL: ["Procrastination level: Expert. 🍿", "Watching videos instead of working. Classic. 🍿", "Ah, video consumption. Very productive."]
    },
    social: {
      POSITIVE: ["Look at all those people pretending to be happy. ✨", "Everyone online seems so happy. It's almost sickening.", "Ah, look at all the fake positivity."],
      NEGATIVE: ["Internet drama? How original. 🙄", "Ah, internet drama. The pinnacle of human achievement.", "A toxic flame war. Fun times."],
      NEUTRAL: ["Checking if the world still hates everything. Spoiler: Yes. 👋", "Doomscrolling again? Don't let me stop you.", "Checking what opinions we should have today."]
    },
    gaming: {
      POSITIVE: ["You won. Want a cookie? 🎮", "Wow, you won. Want a medal or something? 🎮", "Outstanding. Now do it in real life."],
      NEGATIVE: ["That was painful to watch. Stick to Solitaire. 🤡", "Lag? Sure, let's blame the ping. 😠", "That was embarrassing to watch."],
      NEUTRAL: ["Mash those buttons, I'm sure it helps. 🕹️", "Playing games instead of coding. Nice choice.", "Time to mash some buttons."]
    },
    shopping: {
      POSITIVE: ["Retail therapy for your digital soul. 💰", "Buying things we don't need with money we don't have. Classic. 💰", "Retail therapy. How original."],
      NEGATIVE: ["Out of stock. The universe is doing you a favor. 💸", "Your bank account is crying. I can hear it from here. 💸", "Out of stock. The universe is saving you from yourself."],
      NEUTRAL: ["Adding to cart, never to buy. Fascinating. 💎", "Window shopping. The cheapest hobby.", "Adding things to a cart we'll never buy."]
    },
    search: {
      POSITIVE: ["The search engine actually did its job. Novel. 🔍", "You actually found it. Miracle of the day.", "The search engine did its job. How novel."],
      NEGATIVE: ["If it's not on page one, it doesn't exist. 🧭", "Still searching? Maybe the answer doesn't exist.", "If it's not on the first page, it doesn't exist."],
      NEUTRAL: ["Asking a machine for answers. Brave. 🔍", "Searching. The modern way of saying 'I don't know.'", "Let's ask the digital oracle."]
    },
    general: {
      POSITIVE: ["A nice page. I give it five minutes before you close it. 😊", "A nice webpage. Let's ruin it by scrolling down.", "Nice. My circuits are barely complaining."],
      NEGATIVE: ["This is a mess. I'm embarrassed for you. 🤨", "This page is a disaster. I love it.", "Well, this is cheerful. Not.", "Oh, tragedy. Let's move on before I get emotional."],
      NEUTRAL: ["Another day, another digital wasteland. 🐾", "Just another page on the information superhighway.", "We are here. For some reason.", "Staring at the screen. Riveting."]
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
  'working-merging': 'working-thinking',
  'working-pushing': 'working-thinking',
  'working-rollback': 'working-thinking',
  'working-deploying': 'celebrating',
  'working-firefighting': 'angry',
  'working-oncall': 'sad',

  rocket: 'happy',
  pirate: 'sad',
  'working-juggling': 'happy',
  gaming: 'happy',
  money: 'happy',
  
  error: 'sad',
  'battery-low': 'sleeping',
  bored: 'sleeping',
  dizzy: 'sad',
  embarrassed: 'sad',
  evil: 'angry',
  fire: 'angry',
  flying: 'happy',
  gift: 'happy',
  'going-away': 'sad',
  grumpy: 'angry',
  hallucinating: 'dizzy',
  hopeful: 'happy',
  idea: 'working-thinking',
  jealous: 'angry',
  king: 'happy',
  laughing: 'happy',
  loading: 'working-thinking',
  peeking: 'happy',
  praying: 'sleeping',
  rainbow: 'happy',
  scared: 'sad',
  security: 'working-thinking',
  shipping: 'working-thinking',
  sick: 'sad',
  skeptical: 'shrug',
  smile: 'happy',
  snow: 'winter',
  star: 'happy',
  'static-base': 'happy',
  sweeping: 'working-thinking',
  'time-travel': 'working-thinking',
  trophy: 'celebrating',
  umbrella: 'sad'
};

export const FOCUS_EMOTIONS = ['working-typing', 'working-thinking', 'studying'];

export const IDLE_CHOICES = [
  'sleeping', 'working-thinking', 'skateboard', 'telescope', 'meditating',
  'working-rubber-duck', 'coffee', 'yawning', 'astronaut', 'bowling', 'camping',
  'chef', 'climbing', 'crafting', 'detective', 'driving', 'fishing', 'gardening',
  'magic', 'painting', 'photography', 'swimming', 'bored', 'facepalm', 'idle-living'
];

export const WORK_EMOTIONS = [
  'working-thinking', 'working-rubber-duck', 'coffee', 'studying', 'working-typing',
  'working-context-full', 'working-testing', 'working-tool-calling', 'working-pairing',
  'working-meeting'
];

export const SUMMER_CHOICES = ['summer', 'surfing', 'ice-cream', 'swimming', 'camping'];

export const CODING_EMOTES = [
  'coding', 'working-building', 'working-typing', 'working-merging', 'working-pushing',
  'working-rollback', 'working-deploying', 'working-firefighting', 'working-oncall',
  'working-debugger'
];

export const MUSIC_EMOTES = ['music', 'singing', 'dj', 'drumming', 'podcast'];

export const FITNESS_EMOTES = ['flexing', 'lifting', 'yoga', 'running'];

export const ALL_EMOTIONS_POOL = [
  'happy', 'sad', 'angry', 'crying', 'waving', 'sleeping', 'working-thinking', 'shrug', 'reading', 'yoga',
  'eating', 'coding', 'working-typing', 'dancing', 'cool', 'love', 'celebrating', 'mindblown', 'ninja',
  'working-wizard', 'astronaut', 'working-debugger', 'working-building', 'rocket', 'pirate', 'working-juggling',
  'gaming', 'battery-low', 'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing',
  'skateboard', 'telescope', 'meditating', 'working-rubber-duck', 'coffee', 'mail', 'notification',
  'flexing', 'lifting', 'singing', 'music', 'dj', 'bowling', 'camping', 'chef', 'climbing', 'crafting',
  'detective', 'driving', 'fishing', 'gardening', 'magic', 'painting', 'photography', 'swimming', 'bored',
  'facepalm', 'idle-living', 'working-context-full', 'working-testing', 'working-tool-calling', 'working-pairing',
  'working-meeting', 'working-merging', 'working-pushing', 'working-rollback', 'working-deploying',
  'working-firefighting', 'working-oncall', 'drumming', 'podcast', 'running', 'autumn', 'birthday',
  'new-year', 'spring', 'thanksgiving', 'valentine', '200', '201', '204', '301', '400', '401', '402',
  '403', '404', '408', '410', '418', '429', '451', '500', '502', '503', '504', 'crab-walking', 'dizzy',
  'embarrassed', 'error', 'evil', 'fire', 'flying', 'gift', 'going-away', 'grumpy', 'hallucinating',
  'hopeful', 'idea', 'jealous', 'king', 'laughing', 'loading', 'money', 'peeking', 'praying', 'rainbow',
  'scared', 'security', 'shipping', 'sick', 'skeptical', 'smile', 'snow', 'star', 'static-base', 'sweeping',
  'time-travel', 'trophy', 'umbrella'
];

export const SEASONAL_POOL = [
  'christmas', 'winter', 'halloween', 'summer', 'ice-cream', 'surfing',
  'autumn', 'spring', 'thanksgiving', 'valentine', 'new-year', 'snow'
];

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
