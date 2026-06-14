// Import pipeline and env from @huggingface/transformers
import { pipeline, env } from '@huggingface/transformers';

// Configure ONNX Runtime to load WASM binaries locally from the extension
const wasmConfig = (env as any).backends?.onnx?.wasm;
if (wasmConfig) {
  wasmConfig.wasmPaths = chrome.runtime.getURL('wasm/');
}
env.allowLocalModels = false; // Force fetching from Hugging Face Hub (cached locally in IndexedDB)

let classifier: any = null;
let modelLoadingState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let modelDownloadProgress = 0;

// Initialize/fetch the classifier pipeline
async function getClassifier(): Promise<any> {
  if (classifier) return classifier;
  
  if (modelLoadingState === 'loading') {
    while (modelLoadingState === 'loading') {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (classifier) return classifier;
  }

  modelLoadingState = 'loading';
  modelDownloadProgress = 0;
  chrome.runtime.sendMessage({ type: 'update-ai-progress', state: modelLoadingState, progress: modelDownloadProgress });

  try {
    classifier = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      {
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            modelDownloadProgress = Math.round(data.progress);
            chrome.runtime.sendMessage({ type: 'update-ai-progress', state: 'loading', progress: modelDownloadProgress });
          } else if (data.status === 'ready') {
            modelDownloadProgress = 100;
            chrome.runtime.sendMessage({ type: 'update-ai-progress', state: 'ready', progress: 100 });
          }
        }
      }
    );
    modelLoadingState = 'ready';
    chrome.runtime.sendMessage({ type: 'update-ai-progress', state: modelLoadingState, progress: 100 });
    return classifier;
  } catch (err) {
    modelLoadingState = 'error';
    chrome.runtime.sendMessage({ type: 'update-ai-progress', state: modelLoadingState, progress: 0 });
    console.error('[Clawd Local AI] Failed to load pipeline:', err);
    throw err;
  }
}

// Since the background script only creates this offscreen document when AI Mode is enabled,
// we can safely begin loading the classifier as soon as this script executes.
getClassifier().catch((e) => { console.warn('[Clawd Offscreen] getClassifier init error:', e); });

function detectPageCategory(url: string, title: string): string {
  const urlLower = (url || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // Coding
  if (
    urlLower.includes('github.com') ||
    urlLower.includes('gitlab.com') ||
    urlLower.includes('bitbucket.org') ||
    urlLower.includes('stackoverflow.com') ||
    urlLower.includes('stackexchange.com') ||
    urlLower.includes('npmjs.com') ||
    urlLower.includes('npmtrends.com') ||
    urlLower.includes('codepen.io') ||
    urlLower.includes('jsfiddle.net') ||
    urlLower.includes('localhost') ||
    urlLower.includes('127.0.0.1') ||
    urlLower.includes('codesandbox') ||
    urlLower.includes('repl.it') ||
    titleLower.includes('vscode') ||
    titleLower.includes('developer.chrome.com')
  ) {
    return 'coding';
  }

  // Reading / Documentation
  if (
    urlLower.includes('wikipedia.org') ||
    urlLower.includes('medium.com') ||
    urlLower.includes('dev.to') ||
    urlLower.includes('quora.com') ||
    urlLower.includes('arxiv.org') ||
    urlLower.includes('nytimes.com') ||
    urlLower.includes('bbc.co.uk') ||
    urlLower.includes('cnn.com') ||
    urlLower.includes('read.readwise.io') ||
    urlLower.includes('instapaper.com') ||
    urlLower.includes('pocket.co') ||
    urlLower.includes('gitbook.io') ||
    urlLower.includes('gitbook.com') ||
    urlLower.includes('readthedocs.io') ||
    urlLower.includes('explainlikeimfive')
  ) {
    return 'reading';
  }

  // Music
  if (
    urlLower.includes('spotify.com') ||
    urlLower.includes('soundcloud.com') ||
    urlLower.includes('music.youtube.com') ||
    urlLower.includes('music.apple.com') ||
    urlLower.includes('pandora.com')
  ) {
    return 'music';
  }

  // Video
  if (
    urlLower.includes('youtube.com') ||
    urlLower.includes('netflix.com') ||
    urlLower.includes('twitch.tv') ||
    urlLower.includes('hulu.com') ||
    urlLower.includes('disneyplus.com') ||
    urlLower.includes('vimeo.com')
  ) {
    return 'video';
  }

  // Social
  if (
    urlLower.includes('twitter.com') ||
    urlLower.includes('x.com') ||
    urlLower.includes('facebook.com') ||
    urlLower.includes('instagram.com') ||
    urlLower.includes('linkedin.com') ||
    urlLower.includes('reddit.com')
  ) {
    return 'social';
  }

  // Gaming
  if (
    urlLower.includes('steamcommunity.com') ||
    urlLower.includes('steampowered.com') ||
    urlLower.includes('itch.io') ||
    urlLower.includes('roblox.com') ||
    urlLower.includes('epicgames.com')
  ) {
    return 'gaming';
  }

  // Shopping
  if (
    urlLower.includes('amazon.com') ||
    urlLower.includes('ebay.com') ||
    urlLower.includes('etsy.com') ||
    urlLower.includes('shopify.com') ||
    urlLower.includes('bestbuy.com') ||
    urlLower.includes('aliexpress.com') ||
    urlLower.includes('target.com')
  ) {
    return 'shopping';
  }

  const getHostname = (rawUrl: string): string => {
    try {
      return new URL(rawUrl).hostname.toLowerCase();
    } catch {
      return '';
    }
  };

  const urlMatchesDomain = (rawUrl: string, domain: string): boolean => {
    const host = getHostname(rawUrl);
    const normalizedDomain = domain.toLowerCase();
    return host === normalizedDomain || host.endsWith(`.${normalizedDomain}`);
  };

  // Search
  if (
    urlMatchesDomain(url, 'google.com') ||
    urlMatchesDomain(url, 'bing.com') ||
    urlMatchesDomain(url, 'duckduckgo.com') ||
    urlMatchesDomain(url, 'yahoo.com')
  ) {
    return 'search';
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

function mapActivityToEmotion(
  category: string,
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
  energy: number
): string {
  if (energy < 20) {
    return 'sleeping';
  }

  if (category === 'coding') {
    if (sentiment === 'NEGATIVE') {
      return 'working-debugger';
    } else if (sentiment === 'POSITIVE') {
      return 'celebrating';
    } else {
      return 'coding';
    }
  }

  if (category === 'reading') {
    if (sentiment === 'NEGATIVE') {
      return 'sad';
    } else if (sentiment === 'POSITIVE') {
      return 'love';
    } else {
      return 'reading';
    }
  }

  if (category === 'music') {
    return sentiment === 'POSITIVE' ? 'dancing' : 'music';
  }

  if (category === 'video') {
    return sentiment === 'POSITIVE' ? 'cool' : 'eating';
  }

  if (category === 'social') {
    if (sentiment === 'NEGATIVE') {
      return 'angry';
    } else if (sentiment === 'POSITIVE') {
      return 'happy';
    } else {
      return 'shrug';
    }
  }

  if (category === 'gaming') {
    if (sentiment === 'NEGATIVE') {
      return 'angry';
    } else if (sentiment === 'POSITIVE') {
      return 'celebrating';
    } else {
      return 'gaming';
    }
  }

  if (category === 'shopping') {
    return sentiment === 'NEGATIVE' ? 'sad' : 'happy';
  }

  if (category === 'search') {
    return sentiment === 'NEGATIVE' ? 'shrug' : 'working-thinking';
  }

  if (sentiment === 'NEGATIVE') {
    return 'sad';
  } else if (sentiment === 'POSITIVE') {
    return 'happy';
  } else {
    return 'happy';
  }
}

const COMMENTS: Record<string, Record<string, Record<string, string[]>>> = {
  default: {
    coding: {
      POSITIVE: [
        "Everything compiles! Let's celebrate! 🎉",
        "Coding is going great today! Keep it up! 💻",
        "Excellent progress on this codebase! 🚀"
      ],
      NEGATIVE: [
        "Uh oh, is that a bug? Let's squash it! 🔍",
        "Debugging can be tough, but you'll get it! 🛠️",
        "Failing test? Let's take a look at the stack trace."
      ],
      NEUTRAL: [
        "Time to write some clean code! ⌨️",
        "Building cool things, one line at a time.",
        "Refactoring is the key to healthy code."
      ]
    },
    reading: {
      POSITIVE: [
        "What a fascinating article! 📖",
        "Learning new things is wonderful! 🧠",
        "This is an inspiring read!"
      ],
      NEGATIVE: [
        "This topic seems a bit heavy or sad. 😢",
        "A controversial topic. Let's read carefully.",
        "This read is a bit intense."
      ],
      NEUTRAL: [
        "Reading is good for the soul! 📚",
        "Expanding our knowledge today.",
        "Absorbing some interesting details."
      ]
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
      POSITIVE: [
        "Wow, it actually compiled. Did you copy it from ChatGPT? 😏",
        "Look at you, coding without breaking production. I'm shocked.",
        "Everything works. Quick, commit it before it changes its mind!"
      ],
      NEGATIVE: [
        "Oh great, another bug. I'm sure it was the compiler's fault. 🔍",
        "Let me guess: 'It worked on my machine'?",
        "Programming by coincidence, are we? Let's check StackOverflow."
      ],
      NEUTRAL: [
        "Adding more technical debt to the pile, I see.",
        "Are we writing code, or just typing until it works?",
        "Let's write some comments so future you can be confused later."
      ]
    },
    reading: {
      POSITIVE: [
        "Fascinating. I'll add this to my list of things to pretend to care about.",
        "Look at you, expanding your brain. Don't hurt yourself.",
        "Wow, reading. So sophisticated. Where's the audiobook?"
      ],
      NEGATIVE: [
        "Well, that was a real mood killer. Thanks. 😢",
        "A tragic story. I'd cry, but I lack tear ducts.",
        "Oh, how depressing. Let's read more of it."
      ],
      NEUTRAL: [
        "Ah, reading Wikipedia. The ultimate procrastination tool.",
        "Just reading the articles, sure. We all believe you.",
        "Learning things you'll forget in ten minutes. Nice."
      ]
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
      POSITIVE: [
        "You're doing amazing! That code looks so clean! 💻",
        "Your logic is beautiful! Keep building great things! 🚀",
        "Success! You solved that problem so well! 🎉"
      ],
      NEGATIVE: [
        "Don't worry, every bug is just a step closer to success! 🔍",
        "Take a deep breath! You've solved harder bugs than this! 🛠️",
        "Failing tests just show us where to improve. You've got this!"
      ],
      NEUTRAL: [
        "Step by step, you're building something wonderful!",
        "Coding is a superpower, and you're doing great!",
        "Let's write some awesome code together today!"
      ]
    },
    reading: {
      POSITIVE: [
        "Such a wonderful read! Learning is so exciting! 📖",
        "You have such a curious mind! I love it! 🧠",
        "This is so inspiring!"
      ],
      NEGATIVE: [
        "That's a tough topic. Remember to take care of yourself! ❤️",
        "A sad read, but it's important to understand the world.",
        "Sending you positive vibes while reading this."
      ],
      NEUTRAL: [
        "Reading expands the mind! Proud of you for learning!",
        "Enjoy your reading! You're doing great!",
        "So cool that you are researching this!"
      ]
    },
    music: {
      POSITIVE: ["This music is wonderful! Let's dance! 🎵", "What a great soundtrack for your day!"],
      NEGATIVE: ["Melodious and emotional. Music is so powerful.", "Vibing through the emotions. You're doing great."],
      NEUTRAL: ["Hope this music keeps your spirits high! 🎧", "Vibing along with you!"]
    },
    video: {
      POSITIVE: ["This video is so uplifting! 📺", "Wow, that was amazing! Proud to watch with you!"],
      NEGATIVE: ["A bit of a sad story, but it makes us appreciate the good things.", "I'm right here with you through this video."],
      NEUTRAL: ["Enjoy your video! You deserve a nice break! 🍿", "Watching and relaxing with you!"]
    },
    social: {
      POSITIVE: ["So nice to see happy connections online! ✨", "Positivity wins! Let's share some love!"],
      NEGATIVE: ["If things get stressful, remember you're awesome! ❤️", "Don't let the comments section get you down!"],
      NEUTRAL: ["Staying connected! Hope you see some friendly faces!", "Browsing the community! You're a great part of it!"]
    },
    gaming: {
      POSITIVE: ["Incredible win! You played so well! 🎉", "GG! Your skills are unmatched!"],
      NEGATIVE: ["It's okay, next round is yours! Keep your chin up! 🎮", "Tough game, but you gave it your best! 🌟"],
      NEUTRAL: ["Have fun playing! You're a champ! 🕹️", "Game on! You've got this!"]
    },
    shopping: {
      POSITIVE: ["Hope you find the perfect thing! You deserve a treat! 💰", "Yay, shopping! Let's find some deals!"],
      NEGATIVE: ["Pricing can be tricky, but you make smart choices! 💸", "Don't worry, the perfect deal will show up!"],
      NEUTRAL: ["Window shopping is so fun! Enjoy the search!", "Browsing around! Hope you find what you need!"]
    },
    search: {
      POSITIVE: ["Success! You found it! Awesome! 🔍", "Great searching! You're so resourceful!"],
      NEGATIVE: ["Let's try a different keyword. I believe in us!", "We'll find the answer, don't give up!"],
      NEUTRAL: ["Searching the web! We'll discover cool things!", "Let's explore together!"]
    },
    general: {
      POSITIVE: ["This website is lovely, just like you! 😊", "Wonderful page! You have great taste!", "I'm having a great time with you!"],
      NEGATIVE: ["If you feel stressed, take a short stretch! ❤️", "I'm right here to support you!", "Remember to take breaks when pages get heavy!"],
      NEUTRAL: ["I'm so happy to browse the web with you!", "Hope you're having a wonderful day!", "You're doing great, whatever you're working on!"]
    }
  },
  poetic: {
    coding: {
      POSITIVE: [
        "The code compiles and runs so bright, a developer's pure delight! 💻",
        "A coding streak, a goal achieved, the best codebase ever conceived! 🚀",
        "The green tests pass, the warning flees, we code with elegance and ease!"
      ],
      NEGATIVE: [
        "A bug appears, a warning red, a coding puzzle in your head. 🔍",
        "The stack trace shows a broken thread, but we shall debug it instead. 🛠️",
        "A syntax error in the code, a heavy debugging load."
      ],
      NEUTRAL: [
        "We type the lines of code today, to build a dream along the way.",
        "Keyboard clicks and screens that glow, we watch the digital garden grow.",
        "Refactoring the messy state, to make the codebase clean and great."
      ]
    },
    reading: {
      POSITIVE: [
        "A tale of joy, a shining page, wisdom from a distant sage. 📖",
        "The words flow like a gentle stream, inspiring us to start a dream. 🧠",
        "A happy read, a pleasant guide, with curiosity by our side."
      ],
      NEGATIVE: [
        "A tragic line, a sorrow deep, a solemn promise we must keep. 😢",
        "The words describe a stormy day, and chase the cheerful clouds away.",
        "A heavy truth upon the page, written in a troubled age."
      ],
      NEUTRAL: [
        "We read the lines and learn the lore, of things we did not know before.",
        "A world of text, a quiet space, we read together in this place.",
        "Expanding minds with every word, of secrets that we hadn't heard."
      ]
    },
    music: {
      POSITIVE: ["A happy tune, a joyful beat, it makes me want to move my feet! 🎵", "Melodious notes that fill the air, and chase away our every care!"],
      NEGATIVE: ["A sad refrain, a quiet chord, a gentle mood we can't ignore.", "The music plays a weeping song, as we slowly browse along."],
      NEUTRAL: ["A simple track to set the pace, and bring some harmony to this space.", "Music plays and time goes by, like clouds across a summer sky."]
    },
    video: {
      POSITIVE: ["A bright display, a happy scene, upon the glowing video screen! 📺", "Moving pictures full of grace, bringing smiles to your face!"],
      NEGATIVE: ["A dramatic scene, a tearful sight, a heavy shadow in the light.", "The story takes a somber bend, we watch it through until the end."],
      NEUTRAL: ["We watch the clips and take a rest, simple breaks are often best. 🍿", "A quiet video to view, passing time with something new."]
    },
    social: {
      POSITIVE: ["The people chat and share their glee, a happy place for you and me! ✨", "Friendly posts that warm the heart, keeping social worlds apart."],
      NEGATIVE: ["Angry typing, heated words, flying like a flock of birds.", "A stormy debate on the screen, the harshest words we've ever seen."],
      NEUTRAL: ["A scroll of news, a social stream, of human life and every dream.", "Checking in on what they say, in the forums of today."]
    },
    gaming: {
      POSITIVE: ["A victory earned, the battle won, a gaming session full of fun! 🎉", "Level up and score so high, our gaming spirits touch the sky!"],
      NEGATIVE: ["The game is lost, the score is low, but we'll recover from the blow. 🎮", "A frustrating defeat to face, we'll try again and set the pace."],
      NEUTRAL: ["A virtual world of play and game, where every player seeks their fame.", "Mash the keys and play the round, exciting adventures to be found!"]
    },
    shopping: {
      POSITIVE: ["A bargain found, a treasure bought, the very item that we sought! 💰", "Adding items to the bin, shopping always brings a win!"],
      NEGATIVE: ["The price is high, the budget tight, a costly item in our sight. 💸", "Out of stock, the shelf is bare, a shopping sorrow we must share."],
      NEUTRAL: ["We browse the store and check the price, window shopping is quite nice.", "A marketplace of items grand, from every corner of the land."]
    },
    search: {
      POSITIVE: ["The query worked, the search is done, the answer found for everyone! 🔍", "We sought the truth and found the way, a successful search today!"],
      NEGATIVE: ["The search is dry, no answers found, we wander on unsheltered ground.", "Try another phrase to see, and unlock the mystery."],
      NEUTRAL: ["We ask the web to find the clue, and fetch the answers back to you.", "Searching through the digital sea, for a piece of history."]
    },
    general: {
      POSITIVE: ["A lovely site of blue and white, a absolute browsing delight! 😊", "The vibes are good, the screen is bright, a happy day in digital light!"],
      NEGATIVE: ["A gloomy page, a heavy view, but I am browsing here with you.", "The text feels sad, the colors grey, we'll browse along and find our way."],
      NEUTRAL: ["A webpage of the standard kind, with information for the mind.", "We browse the web and drift along, like the verses of a song.", "I watch you scroll and click the keys, floating on the digital breeze."]
    }
  },
  snarky: {
    coding: {
      POSITIVE: [
        "Well, it works. Don't touch it. Don't even breathe on it. 💻",
        "It compiled? Must be a bug in the compiler. 🚀",
        "Check that off. Let's see how long before it breaks again."
      ],
      NEGATIVE: [
        "Is it a bug, or is it 'advanced functionality'? 🔍",
        "Ah, compiler errors. My favorite form of punctuation. 🛠️",
        "If coding was easy, we wouldn't have this bug. Oh wait."
      ],
      NEUTRAL: [
        "More typing, less thinking. The developer way.",
        "Refactoring. Or as I call it, moving bugs to new files.",
        "Let's write code that only we understand. Job security!"
      ]
    },
    reading: {
      POSITIVE: [
        "Interesting. But will this be on the test? 📖",
        "Learning things. Very elite. We are basically geniuses now.",
        "Wow, educational. My processor is overflowing with knowledge."
      ],
      NEGATIVE: [
        "Oh, sadness. Let's close this before I pretend to care. 😢",
        "A tragic tale. I'll print out a tiny violin.",
        "Well, that ruined my mood. And I don't even have a mood."
      ],
      NEUTRAL: [
        "Ah, reading Wikipedia. The font of all unquestioned truths.",
        "Reading articles instead of coding. Classic time management.",
        "More text. Just what my digital eyes wanted."
      ]
    },
    music: {
      POSITIVE: ["Is this a bop or a flop? I'll let you decide. 🎵", "Nice beats. Did a robot write this?"],
      NEGATIVE: ["This song is sadder than my database errors.", "Melancholic noise. Just what I needed."],
      NEUTRAL: ["Background music. For people who can't stand silence. 🎧", "Audio waves entering human ears. Fascinating."]
    },
    video: {
      POSITIVE: ["Wow, moving pictures. The peak of human technology. 📺", "Riveting video. Truly a masterpiece."],
      NEGATIVE: ["Oh look, drama. I'm practically shaking. 🍿", "How tragic. Next video, please."],
      NEUTRAL: ["Watching videos instead of working. Bold strategy. 🍿", "Staring at the screen. Engaging."]
    },
    social: {
      POSITIVE: ["Everyone online is so happy. It's almost suspicious. ✨", "Positivity on the internet? Check for bots."],
      NEGATIVE: ["Ah, internet comments. Where intelligence goes to die.", "Another flame war. I'll get the fire extinguisher."],
      NEUTRAL: ["Doomscrolling. The modern sport.", "Scrolling through opinions we didn't ask for."]
    },
    gaming: {
      POSITIVE: ["You won. Do you want a virtual cookie? 🎮", "GG. Please put this on your resume."],
      NEGATIVE: ["Lag? Sure. Let's blame the ping. 😠", "That was painful to watch. Stick to coding."],
      NEUTRAL: ["Gaming. For when real life is too boring.", "Mash buttons, receive dopamine."]
    },
    shopping: {
      POSITIVE: ["Buying things. The ultimate dopamine hit. 💰", "Adding items we can't afford to the cart."],
      NEGATIVE: ["Oof, that price. My circuits just felt a shock. 💸", "Out of stock. The universe is telling you no."],
      NEUTRAL: ["Window shopping. The art of looking at things you won't buy.", "Browsing items. Very consumerist."]
    },
    search: {
      POSITIVE: ["You found it. Miracle of the week. 🔍", "The search engine actually worked. Shocking."],
      NEGATIVE: ["Still searching? Maybe the answer is inside you. Just kidding.", "No results. Try typing better."],
      NEUTRAL: ["Searching. The modern way of pretending to research.", "Ask the digital oracle. See if it cares."]
    },
    general: {
      POSITIVE: ["A nice website. Let's see how long before we get bored. 😊", "Nice design. A bit too much white space."],
      NEGATIVE: ["Oh, tragedy. Let me write that down in my 'who cares' database.", "This page is a disaster. I'm leaving.", "A gloomy page. Let's move to something brighter."],
      NEUTRAL: ["Just another page on the web. Moving on.", "Scrolling, scrolling, scrolling.", "Yes, this is a website. Good job."]
    }
  }
};

async function getLocalAiEmotion(
  pageTitle: string,
  metaDescription: string | undefined,
  url: string,
  persona: string,
  statsContext?: string,
  sentimentSensitivity: number = 50
): Promise<{ emotion: string; comment?: string; category?: string; sentiment?: string }> {
  if (modelLoadingState === 'loading' || modelLoadingState === 'idle') {
    return {
      emotion: 'working-thinking',
      comment: `Downloading my local AI model... (${modelDownloadProgress}%) 🧠`
    };
  }
  if (modelLoadingState === 'error') {
    return {
      emotion: 'sad',
      comment: 'Failed to load local AI model. Please check the background console.'
    };
  }

  // Parse stats from statsContext
  let happiness = 50;
  let energy = 50;
  let focus = 50;
  let trait = 'normal';

  if (statsContext) {
    const happinessMatch = statsContext.match(/Happiness:\s*(\d+)%/);
    const energyMatch = statsContext.match(/Energy:\s*(\d+)%/);
    const focusMatch = statsContext.match(/Focus:\s*(\d+)%/);
    const traitMatch = statsContext.match(/Personality Trait:\s*(\w+)/);
    if (happinessMatch) happiness = parseInt(happinessMatch[1]);
    if (energyMatch) energy = parseInt(energyMatch[1]);
    if (focusMatch) focus = parseInt(focusMatch[1]);
    if (traitMatch) trait = traitMatch[1];
  }

  // Detect page activity/category
  const category = detectPageCategory(url, pageTitle);

  let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
  let score = 0.5;

  try {
    const pipelineInstance = await getClassifier();
    const textToAnalyze = `${pageTitle}. ${metaDescription || ''}`.substring(0, 500);
    const results = await pipelineInstance(textToAnalyze);
    
    if (results && results.length > 0) {
      const topResult = results[0];
      score = topResult.score;
      // Default sensitivity is 50, which maps to a threshold of ~0.65
      // 0 sensitivity = 0.90 threshold, 100 sensitivity = 0.50 threshold
      const threshold = 0.90 - (sentimentSensitivity / 100) * 0.40;
      if (score > threshold) {
        sentiment = topResult.label as 'POSITIVE' | 'NEGATIVE';
      }
    }
  } catch (err) {
    console.warn('[Clawd Local AI] Pipeline classification failed, falling back to NEUTRAL:', err);
  }

  // Map to final pet emotion
  const emotion = mapActivityToEmotion(category, sentiment, energy);

  // Generate comment based on persona, category, and sentiment
  const personaComments = COMMENTS[persona] || COMMENTS.default;
  const categoryComments = personaComments[category] || personaComments.general;
  const sentimentComments = categoryComments[sentiment] || categoryComments.NEUTRAL;
  
  const commentList = sentimentComments.length > 0 ? sentimentComments : categoryComments.NEUTRAL;
  const comment = commentList[Math.floor(Math.random() * commentList.length)];

  return { emotion, comment, category, sentiment };
}

// Set up Chrome runtime message listener in the offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'run-local-ai-inference') {
    const { pageTitle, metaDescription, persona, statsContext, sentimentSensitivity, url } = message;
    
    getLocalAiEmotion(pageTitle, metaDescription, url, persona || 'default', statsContext, sentimentSensitivity)
      .then((result) => sendResponse({ success: true, emotion: result.emotion, comment: result.comment, category: result.category, sentiment: result.sentiment }))
      .catch((err) => {
        console.error('Error in local AI emotion processing:', err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === 'check-local-ai-status') {
    sendResponse({ success: true, state: modelLoadingState, progress: modelDownloadProgress });
    return false;
  }
});
