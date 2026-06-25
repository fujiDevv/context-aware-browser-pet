# Arcrawls: The Context-Aware Browser Pet — User Guide

> Your context-aware browser pet companion.
> 
> *Mascot SVG assets are adapted from the open-source [arcrawls-pet](https://github.com/abderrahimghazali/arcrawls-pet) library by Abderrahim Ghazali, used under the MIT License.*

---

## Table of Contents

1. [What is Arcrawls?](#what-is-arcrawls)
2. [Installing the Extension](#installing-the-extension)
3. [Meeting Your Pet](#meeting-your-pet)
4. [Interacting with Arcrawls](#interacting-with-arcrawls)
 - [Petting](#petting)
 - [Feeding](#feeding)
 - [Shooing](#shooing)
 - [Dragging & Snapping](#dragging--snapping)
 - [Hover Reaction](#hover-reaction)
5. [Mascot Stats & Decay](#mascot-stats--decay)
 - [Happiness](#happiness)
 - [Energy](#energy)
 - [Curiosity](#curiosity)
 - [Focus](#focus)
 - [Leisure](#leisure)
 - [Stat Decay Rates](#stat-decay-rates)
6. [Leveling Up & XP](#leveling-up--xp)
 - [How to Earn XP](#how-to-earn-xp)
 - [Level Milestones & Emotion Unlocks](#level-milestones--emotion-unlocks)
 - [Mascot Milestones Dashboard](#mascot-milestones--dashboard)
7. [Context-Aware Moods](#context-aware-moods)
 - [Website-Specific Reactions](#website-specific-reactions)
 - [Activity-Based Reactions](#activity-based-reactions)
 - [Time of Day Reactions](#time-of-day-reactions)
 - [Seasonal & Holiday Themes](#seasonal--holiday-themes)
 - [Idle Behaviors](#idle-behaviors)
 - [Cursor Chasing](#cursor-chasing)
 - [HTTP Error Reactions](#http-error-reactions)
 - [Console Error Watcher](#console-error-watcher)
8. [Interactive Toys](#interactive-toys)
9. [Wardrobe, Costumes & Glow Effects](#wardrobe-costumes--glow-effects)
10. [Visibility Controls](#visibility-controls)
 - [Hide on This Tab](#hide-on-this-tab)
 - [Hide on This Site](#hide-on-this-site)
11. [Settings & Customization](#settings--customization)
 - [Pet Name](#pet-name)
 - [Pet Size](#pet-size)
 - [Movement Speed](#movement-speed)
 - [Sound Effects & Volume](#sound-effects--volume)
 - [Sound Board](#sound-board)
 - [Interactive Schedule Planner](#interactive-schedule-planner)
 - [Website & Domain Triggers](#website--domain-triggers)
 - [Local AI Fine-Tuning](#local-ai-fine-tuning)
 - [Expanded Analytics & Charts](#expanded-analytics--charts)
12. [Brain Upgrade (Local AI) — Optional](#brain-upgrade-local-ai--optional)
 - [How It Works](#how-it-works)
 - [Setting Up](#setting-up)
 - [AI Personas](#ai-personas)
 - [24-Hour AI Synapse](#24-hour-ai-synapse)
13. [Adaptive Habits & Learning](#adaptive-habits--learning)
14. [Cross-Tab Behavior (Hybrid Sync)](#cross-tab-behavior-hybrid-sync)
15. [Security & Privacy](#security--privacy)
16. [Frequently Asked Questions](#frequently-asked-questions)
17. [Contributing](#contributing)

---

## What is Arcrawls?

Arcrawls is an open-source, context-aware browser mascot that lives along the edges of your browser window. He walks around, reacts to what you're doing online, and changes his expression and outfit depending on the website you're visiting, the time of day, and even the season.

He's not just for looks — Arcrawls is a virtual pet with stats, levels, unlockable costumes, and over **140 unique animations**. Pet him, feed him, play with him, or just let him keep you company while you browse.

---

## Installing the Extension

To install and build the extension:

1. Open your terminal and navigate to the project directory:
 ```bash
 cd context-aware-browser-pet
 ```
2. Install the developer dependencies:
 ```bash
 bun install
 ```
3. Type-check the source files to ensure no errors:
 ```bash
 bun run type-check
 ```
4. Run the production build command:
 ```bash
 bun run build
 ```
5. **For Google Chrome:**
   - Go to `chrome://extensions`.
   - Enable **Developer mode** using the toggle in the top-right corner.
   - Click **Load unpacked** and select the `dist/` folder inside the project directory.
6. **For Mozilla Firefox:**
   - Go to `about:debugging#/runtime/this-firefox`.
   - Click **Load Temporary Add-on...**
   - Select the `manifest.json` file inside the `dist/` folder.
7. Open any regular website (e.g., [github.com](https://github.com)) — Arcrawls will slide onto the page and say hello!

---

## Meeting Your Pet

When Arcrawls first appears on a new page:
- He has a **60% chance to start on the ground** and a **40% chance to start on the ceiling**.
- He displays a greeting speech bubble: *"Hello! I'm [Pet Name]! Let's browse together! 👋"* (defaults to *"Hello! I'm Arcrawls! Let's browse together! 👋"*).
- A greeting sound effect is played (if sound is enabled).

Arcrawls will then begin walking back and forth exclusively along the **floor** or **ceiling** of the page, occasionally pausing to rest. If he reaches a side edge, he will flip direction or drop down to the floor using his built-in **Gravity Engine**. Sometimes, he might even trigger his **Rocket Thrusters** to blast off! This realistic flight sequence includes a 1-second engine charging phase (with crouch and shake visuals) followed by a smooth, heavy vertical ascent and a final 180° landing flip to dock with the ceiling.

---

## Interacting with Arcrawls

You can interact with Arcrawls directly on the webpage to affect his stats, emotions, and experience.

### Petting
- **How**: This is now mapped to specific interactive toys (like the Ball or Yarn).
- **Reaction**: Arcrawls displays the `love` mood , accompanied by a bouncy squash-and-stretch animation.
- **Effect**: +5 Happiness, +2 Energy, +5 Leisure, and +10 XP. Plays the Petting sound effect.

### Feeding
- **How**: Double-click on Arcrawls.
- **Reaction**: Arcrawls celebrates and says *"Yum! That was delicious! "*, showing the `celebrating` mood.
- **Effect**: +10 Energy, +2 Happiness, and +15 XP. Plays the Feeding sound effect.

### Shooing
- **How**: Right-click on Arcrawls.
- **Reaction**: Arcrawls dash-runs, flies, or uses his **rocket** to move to a random spot on the **top or bottom** viewport edges, displaying a temporary `running`, `flying`, or `rocket` animation for physical feedback.
- **Effect**: -10 Happiness, -5 Energy, -5 Leisure, and +5 XP. Plays the Shoo sound effect.

### Dragging & Snapping
- **How**: Click and hold on Arcrawls, then drag him anywhere on the screen.
- **Reaction**: Arcrawls follows your mouse. When you release him, he intelligently snaps to the **closest floor or ceiling edge** using a physics-based spring animation. He no longer sticks to vertical walls.
- **Position Sync**: While dragging, Arcrawls's coordinates and edge-state sync in real-time across your active tabs.


### Chatting with Arcrawls
- **How**: Left-click on Arcrawls, click the **Chat** button in the popup panel, press `Ctrl + Shift + C` on any active page, or visit the **Chat with Arcrawls** tab in the Options Dashboard.
- **Reaction**: Opens a sleek, interactive chat interface where you can have full conversations with Arcrawls based on his current active Persona and stats!
- **Features**: Animated typing indicators, context-aware responses, **Rich Markdown Rendering** (bold, italic, code blocks), and a **Hybrid Memory System**: 
  - **Webpage Tabs**: Conversations are isolated per-tab using `sessionStorage` so Arcrawls stays focused on the current page's context.
  - **Options Dashboard**: Your "Sanctuary" memory is persistently saved across browser restarts using `chrome.storage.local`.

### Hover Reaction
- **How**: Move your mouse cursor over Arcrawls.
- **Reaction**: Arcrawls scales up and rotates slightly to acknowledge your cursor. When you move the mouse away, he springs back to his normal size.

---

## Mascot Stats & Decay

Arcrawls has five core stats that change based on your interactions, browsing categories, and the passage of time. You can view them anytime in the popup panel.

### Happiness
 How content Arcrawls is. Increases when you pet him or visit fun sites. Decreases over time and when you shoo him away.

### Energy
 How energized Arcrawls is. Increases when you feed him. Decreases naturally over time, and during heavy work/development browsing sessions.

### Curiosity
 How intellectually stimulated Arcrawls is. Increases when you visit developer, documentation, or news sites. Decreases on social media sites.

### Focus
 How productive Arcrawls is feeling. Increases on developer and documentation websites. Decreases when visiting gaming or social media sites.

### Leisure
 How relaxed and entertained Arcrawls is. Increases on social media and gaming sites. Decreases on work-heavy developer sites.

### Stat Decay Rates
All stats gradually decay in the background. The decay rates (evaluated every 1 minute) are:
- **Happiness Decay**: ~4.0% per hour
- **Energy Decay**: ~6.8% per hour
- **Curiosity Decay**: ~1.8% per hour
- **Focus Decay**: ~5.4% per hour
- **Leisure Decay**: ~5.4% per hour

*Keep interacting with Arcrawls and browsing diverse sites to keep his stats healthy!*

---

## Leveling Up & XP

Arcrawls grows stronger as you use your browser. Leveling up unlocks new cosmetic traits, aura costume shaders, and expressive emotions.

### How to Earn XP

| Action | XP Earned |
|--------|-----------|
| Pet Arcrawls (click) | +10 XP |
| Feed Arcrawls (double-click) | +15 XP |
| Shoo Arcrawls (right-click) | +5 XP |
| Visit a coding/dev site | +5 XP |
| Visit a gaming site | +6 XP |
| Visit a documentation site | +4 XP |
| Visit a news site | +3 XP |
| Visit a social/shopping site | +2 XP |

### Level Milestones & Emotion Unlocks

The XP required to level up follows an exponential curve: `Math.floor(Math.pow(Level, 1.5) * 150)` (e.g., Level 1 requires 150 XP to reach Level 2, Level 2 requires 424 XP to reach Level 3, and so on).

When Arcrawls levels up, a golden achievement banner slides down from the top of your current page to show what was unlocked!

| Level Milestone | Unlocks & Rewards |
|-----------------|-------------------|
| **Level 1** | Basic emotions: `happy`, `sad`, `angry`, `crying`, `waving`, `sleeping`, `working-thinking`, `shrug`, `reading`, `yoga`, `eating` |
| **Level 3** | Advanced emotions: `coding`, `working-typing`, `dancing`, `cool`, `love`, `celebrating`, `mindblown` |
| **Level 5** | Blue Detective Aura + Emotes: `ninja`, `working-wizard`, `astronaut`, `working-debugger`, `working-building` |
| **Level 8** | Emotes: `rocket`, `pirate`, `working-juggling`, `gaming` |
| **Level 10** | Magic Purple Aura + **All standard emotions, hobbies, and situational states unlocked (100+ dynamic animations)** |
| **Level 15** | Neon Rainbow Shader + **Custom Mascot Color Picker** |

### Mascot Milestones Dashboard

Track significant growth markers and achievements beyond just numerical levels. Located in the **History Timeline** tab of the Options Dashboard, the Milestones grid commemorates:
- **Major Level Thresholds:** Celebrates reaching Levels 1, 3, 5, 10, 15, and 50.
- **Interaction Achievements:** Recognizes high levels of care, such as "Well Loved" (10+ pets) or "Gourmet Eater" (100+ feeds).
- **Trait Evolutions:** Commemorates when Arcrawls permanently develops a dominant personality trait like "Code Architect" or "Social Butterfly".
- **Ethereal Rebirths:** Marks every time you trigger a Prestige Rebirth.
- **AI Enlightenment:** Tracks daily 24-hour behavioral synapse generations.

> **Note**: Seasonal, holiday, idle, and custom situational behaviors (like fitness and music) are always allowed to bypass level locks so you can enjoy all the unique SVG animations!

---

## Context-Aware Moods

Arcrawls changes his expression and animation based on the page context of your active browser tab.

### Website-Specific Reactions

| Website Category | Matches (Domains) | Arcrawls's Reaction |
|-----------------|-------------------|-------------------|
| **Coding / Dev** | GitHub, StackOverflow, GitLab, npm, etc. | Cycles `coding`, `working-building`, `working-typing`. Shows `working-merging`/`working-pushing`/`working-rollback` on Git PRs/commits. Shows `working-deploying` on Vercel/Netlify. Shows `working-rubber-duck` on StackOverflow. |
| **Social Media** | Twitter/X, Instagram, Reddit, TikTok, etc. | `love` ❤️ |
| **Gaming** | Twitch, Steam, itch.io, Roblox | `gaming` 🎮 |
| **News** | BBC, CNN, NYT, Reuters, etc. | `working-thinking` 🧐 |
| **Shopping** | Amazon, eBay, Etsy, Shopify | `money` 💰 |
| **Documentation** | Notion, Google Docs, Wikipedia, etc. | `studying` 📚 |
| **Email** | Gmail, Outlook, Yahoo Mail | `mail` 📧 |
| **Fitness** | Strava, MyFitnessPal, Fitbit, etc. | `flexing`, `lifting`, `yoga`, `running` (rotating) 🏃‍♂️ |
| **AI Assistant** | ChatGPT, Claude, Gemini, HF | `mindblown` 🤯 |
| **Streaming** | Netflix, YouTube, Hulu | `eating` 🍿 |
| **Finance** | Stripe, PayPal, Banking | `money` 💸 |
| **Music/Audio** | Spotify, SoundCloud, Music | `music`, `singing`, `dj`, `drumming`, `podcast` (rotating) 🎵 |

### Activity-Based Reactions

- **Heavy Typing**: Displays `working-typing` (or `coding` if on a dev site).
- **Submitting a Form**: Celebrates with the `celebrating` mood and says *"Success! Form sent! "*.
- **Playing a Video/Audio**:
 - YouTube, Netflix, Vimeo: Displays `eating` (watching snacks!).
 - Spotify, SoundCloud, Music: Displays `music` �, `singing` , or `dj` (rotating).
 - Other media: Displays `cool`.

### Time of Day Reactions

- **Late Night (10:00 PM – 6:00 AM)**: Arcrawls falls asleep (`sleeping` ) and slows his movement speed by 50%.
- **Morning (6:00 AM – 9:00 AM)**: Performs morning stretches (`yoga` ).

### Autonomous Mode (Toggle Off)

If you turn off the **Daily Schedule & Triggers** toggle in settings, Arcrawls enters Autonomous Mode. In this state, he:
- Bypasses all contextual checks (site categories, console errors, HTTP errors, typing, video playing, and sleep schedules).
- Autonomously decides which emotions to express based on a time hash (switching up his mood once per minute).
- Periodically decides to explore different parts of your browser window or chase your cursor.
- Displays custom speech bubbles and commentary about analyzing the pages you browse.

> **Daily Schedule & Triggers Guide**: You can check the full schedule of daily routines (Late Night sleep, Morning yoga, Idle actions, Page diagnostics) anytime inside the **� Stats** tab of the popup panel.

### Seasonal & Holiday Themes

Arcrawls adjusts his appearance automatically based on the calendar month and day:
- **New Year (Jan 1)**: Party hats and confetti (`new-year`).
- **Valentine's Day (Feb 14)**: Floating hearts (`valentine`).
- **Spring (Mar - May)**: Flowers and butterflies (`spring`).
- **Summer (Jun – Aug)**: Rotates through `summer`, `surfing`, `camping`, `swimming`, and `ice-cream`.
- **Autumn (Sep - Nov)**: Falling leaves and scarves (`autumn`).
- **Halloween (Oct 31)**: Spooky pumpkin mask (`halloween`).
- **Thanksgiving (Late Nov)**: Pumpkin pie (`thanksgiving`).
- **Winter / Christmas (Dec)**: Santa hats and snow (`christmas`, `winter`, `snow`).

### Idle Behaviors

If you are inactive (no typing, scrolling, clicking, or mouse movement) for **over 45 seconds**, Arcrawls will pick a random idle activity from a massive pool of hobbies to keep himself busy:
- **Outdoor & Active:** `skateboard`, `swimming`, `fishing`, `climbing`, `driving`, `camping`
- **Arts & Crafts:** `painting`, `photography`, `magic`, `crafting`, `gardening`, `chef`
- **Relaxing:** `telescope`, `meditating`, `yawning`, `coffee`, `reading`, `idle-living`
- **Quirky:** `astronaut`, `detective`, `bowling`, `working-rubber-duck`

If you remain idle for **over 5 minutes (300 seconds)**, Arcrawls will curl up and fall asleep (`sleeping` ).

### Cursor Chasing

When you are idle (for at least 10 seconds), Arcrawls has a 15% chance every 10 seconds to wander over to your mouse cursor's horizontal position, looking up at it and saying things like:
- *"Whatcha doing over there? "*
- *"Let me see! "*
- *"Watchu looking at? "*

### HTTP Error Reactions

If the website you are visiting returns a standard HTTP error code, Arcrawls displays a custom animated SVG specific to that exact error alongside a reaction bubble. 
Supported error states include: **200, 201, 204, 301, 400, 401, 402, 403, 404, 408, 410, 418, 429, 451, 500, 502, 503, 504**.

### Smart Download & Lite Mode Fallback
Arcrawls will notify you via a speech bubble while he's *"downloading his high-tech brain"* on the first run. If the AI model is still loading, unavailable, or the connection is metered/slow, Arcrawls automatically falls back to **Lite Mode**, using backup instincts to stay reactive.

### Console Error Watcher

If a JavaScript runtime error or unhandled promise rejection occurs on the webpage, Arcrawls immediately enters `working-debugger` mode and looks for the bug, displaying either *"Oh no! Something crashed! "* or *"Found a bug! Let me debug! "*.

---

## Interactive Toys

Open the popup panel (under the ** Mascot** tab) and drag a toy from the **Interactive Toys** drawer onto the page to play:

- **Ball **: Arcrawls chases it, does a happy dance, and says *"Wow! A ball! Roll roll roll! "*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Fish **: Arcrawls chases it and says *"Yum! That fish was delicious! "*. Acts as a Feeding interaction (+15 XP, +10 Energy, +2 Happiness).
- **Laser **: Arcrawls chases it and says *"Got the red dot! Rawr! "*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Yarn **: Arcrawls chases it and says *"Ooh, a ball of yarn! Unraveling time! "*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Duck **: Arcrawls chases it and says *"Squeak squeak! Squeaky toy ducky! "*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Box **: Arcrawls chases it and says *"If it fits, I sits! Best box ever! "*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).

### Drop Multiple Toys (Queued Play)
You can drop multiple toys onto the webpage at the same time. The toys will drop and rest on the page floor using spring-gravity physics, and Arcrawls will chase and play with them in the order they were dropped.
- **Dragging Arcrawls** or clicking **Shoo** in the popup panel will immediately clear all active toys on the screen and empty the queue.

---

## Wardrobe, Costumes & Glow Effects

### Visual Costume Wardrobe
Arcrawls features a customizable wardrobe. Open the Options Dashboard to view a visual grid displaying all unlocked and locked seasonal costumes (such as the Santa Hat, Spooky Pumpkin, and Summer Sunglasses).
* Click the **"Try On"** button on any unlocked costume to instantly equip it on Arcrawls.
* Locked seasonal costumes will display a lock icon and hint at how/when they can be unlocked.

### Costume Glow Effects
As Arcrawls levels up, you unlock special CSS shaders to give him a glowing effect. Enable them under the **Pet Glow Effect** settings in the popup or dashboard:

| Costume / Shader | Unlock Level | CSS Visual Effect |
|------------------|--------------|-------------------|
| **Blue Detective Aura** | Level 5 | Pulsing blue shadow glow |
| **Magic Purple Aura** | Level 10 | Floating purple shadow glow |
| **Neon Rainbow Shader** | Level 15 | Rainbow hue-rotation cycle |

---

## Visibility Controls

You can control Arcrawls's visibility directly from the popup panel:

### Hide on This Tab
Temporarily hides Arcrawls on the active tab. Arcrawls will reappear if you open a new tab or refresh the page.

### Hide on This Site
Permanently blocks Arcrawls on the current website domain (e.g. `google.com`). Arcrawls will not appear on any page under this domain until you toggle it off in the popup.

---

## Settings & Customization

Click the extension icon or open the Options Dashboard to access comprehensive controls. The controls are organized as follows:

### Mascot Tab
- **Stats progress bars**: Track happiness, energy, curiosity, focus, and leisure.
- **Interactions**: Pet, Feed, and Shoo buttons.
- **Interactive Toys**: Drag 6 different toys (ball, fish, laser, yarn, duck, box) onto the page.

### � Stats Tab
- **Mascot Analytics**: View total petting and feeding statistics.
- **Browsing Interests**: Check the distribution of websites analyzed.
- **Recent Activity**: Scroll the activity log of events.
- **Daily Schedule & Triggers**: Reference Arcrawls's reactions schedule.

### ⚙ Settings Tab
- **Active Emotions**: Toggle check boxes to allow/disallow specific unlocked emotions.
- **Daily Schedule & Triggers**: Toggle off to put Arcrawls in Autonomous Mode, letting him choose his own emotes, move around, and analyze pages on his own terms.
- **Sound Board**: Click buttons to preview chiptune sounds (greeting, feed, level-up, shoo, etc.).
- **Visibility**: Toggle options to hide Arcrawls on the current tab or block him entirely on the active domain.
- **Ghost Mode**: Dims opacity to 30% dynamically when you are actively typing or scrolling to prevent distraction without completely hiding the pet. (Note: **Focus Blocks** suppresses autonomous behavior and sounds while keeping 100% opacity, whereas **Ghost Mode** simply fades visual footprint dynamically).
- **Performance Mode**: Halts cross-tab syncing, caps physics to 30fps, and disables CSS aura shaders for low-end machines or battery saving.
- **Pet Name**: Give your pet a custom name (up to 12 characters).
- **Pet Glow Effect**: Select costume auras unlocked at LVL 5, 10, and 15.
- **Custom Mascot Color**: Pick a specific body color for your mascot (unlocked at LVL 15).
- **Sliders**: Adjust size (48px - 256px), walking speed (0.1x - 3.0x), rocket flight speed (0.5x - 5.0x), and volume.
- **AI Mood Analysis**: Toggle local sentiment evaluation and choose AI commentary persona.

### 📅 Interactive Schedule Planner
Take control of Arcrawls's daily routine:
- **Mascot Sleep/Wake Planner**: A time-block scheduler allowing you to custom-define Arcrawls's sleeping, waking, and working hours (e.g. setting sleep mode to trigger during your bedtime).
- **Focus Blocks vs. Ghost Mode**: 
  - **Focus Blocks**: Time-based (e.g. 9 AM - 5 PM). Suppresses autonomous reactions, mutes sounds, and keeps Arcrawls in a quiet "working" animation loop at 100% opacity.
  - **Ghost Mode**: Interaction-based. When you are actively typing or scrolling, Arcrawls's opacity instantly drops to 30% so he doesn't physically block the text you are reading or forms you are filling out.

### 🎭 Website & Domain Triggers
Configure how Arcrawls reacts to specific websites:
- **Domain Reaction Dictionary**: A mapping table where you can bind site domains to Arcrawls's animations or comments. For example:
  - `stackoverflow.com` $\rightarrow$ Enter study mood + speak coding quotes.
  - `youtube.com` $\rightarrow$ Enter movie-watching animation with popcorn.
  - `duolingo.com` $\rightarrow$ Play encouraging chiptune track.

### 🎛 Local AI Fine-Tuning
Fine-tune Arcrawls's offline sentiment classifier:
- **Sentiment Sensitivity Threshold**: Adjust how easily the Local AI registers page sentiment to trigger positive or negative mood shifts.
- **Comment Frequency**: A rate-limiting slider to control how often Arcrawls makes AI-derived observations (adjustable from once every 30 seconds to once every 5 minutes).

### 📈 Expanded Analytics & Charts
Dive into your browsing and pet metrics:
- **Interests History Chart**: A clean bar chart visualizer breaking down site categories visited over the last 7 days (e.g. Development, Social, Leisure, Reading).
- **Mood Over Time Tracker**: A dynamic line chart showing Arcrawls's average daily levels for all five core stats (Happiness, Energy, Curiosity, Focus, and Leisure).

---

## Brain Upgrade (Local AI) — Optional

Arcrawls features a local, privacy-centric AI layer that reads page context and generates customized comments and expressions completely offline. By default, Arcrawls runs in **Lite Mode**, which uses efficient Regex rules to determine site categories and emotions with zero downloads.

### How It Works

1. **Context Extraction:** When you visit a tab, Arcrawls collects the page's `<title>` and `<meta name="description">`, truncating it to a maximum of 500 characters to optimize processing speeds.
2. **Gemini Nano Summarization & Dialogue:** If available (via Chrome's built-in Prompt API), Arcrawls extracts lightweight text directly from semantic tags (`h1`, `h2`, `p`, `article`) instead of scanning the full `<body>`. This prevents expensive CSS layout thrashing on heavy social media sites while generating a condensed semantic summary. Furthermore, Arcrawls leverages Gemini Nano to dynamically generate **100% unique, highly-contextual dialogue bubbles** on the fly! This is powered by a **Dedicated Knowledge Base**, enforcing strict identity constraints so Arcrawls always stays in character as your virtual pet. If Gemini Nano is unavailable, it gracefully degrades to a robust hardcoded persona dictionary. *(Note: Gemini Nano and the ONNX Brain Upgrade are currently exclusive to Chromium browsers due to offscreen document API requirements. On Firefox, Arcrawls operates exclusively in the fast, rule-based Lite Mode).*
3. **Offscreen WebAssembly Pipeline:** This text is piped to an **Offscreen Document** (Chrome-only) hosting `@huggingface/transformers` linked to a local WebAssembly-compiled ONNX Runtime (`ort-wasm.wasm`).
4. **Local Sentiment Model:** The WebAssembly runtime evaluates the text using a quantized version of the **DistilBERT** model (`Xenova/distilbert-base-uncased-finetuned-sst-2-english`).
5. **Dynamic Sentiment Threshold Mapping:**
 To classify a page as `POSITIVE` or `NEGATIVE`, the classification probability score must exceed a dynamic confidence threshold. This threshold is calculated from the user's **Sentiment Sensitivity Slider** (ranging from `0` to `100`) using the formula:
 $$\text{threshold} = 0.90 - \left(\frac{\text{sensitivity}}{100}\right) \times 0.40$$
 * At **0 sensitivity**, the threshold is a strict **0.90** (requires extremely high confidence to shift mood).
 * At **50 sensitivity**, the threshold is **0.70**.
 * At **100 sensitivity**, the threshold drops to **0.50** (easily triggers mood shifts).
 * If the model's confidence does not exceed the calculated threshold, the sentiment defaults to `NEUTRAL`.
5. **Contextual Mapping Matrix:**
 The output sentiment, tab category, and Arcrawls's active energy level are cross-referenced to trigger a matching physical animation and persona-specific speech bubbles.

### Setting Up
1. Open the extension **Options Dashboard**.
2. Under the **AI & Scheduling** tab, locate the **Brain Upgrade (Local AI)** toggle.
3. Once enabled, the status badge will change to **Downloading (X%)** as the model weights (~67MB) are downloaded and securely stored locally in your browser's IndexedDB. **Note: This only happens once.**
4. Once the status shows **Ready**, the local model is fully operational.
5. Select your preferred **AI Persona** from the dropdown menu to customize the commentary style. No API keys or cloud accounts are needed!

### AI Personas

- **Default (Friendly)**: A sweet, helpful companion.
- **Sarcastic**: Witty, dry, and slightly cynical observations.
- **Encouraging**: Uplifting, positive, and motivating remarks.
- **Poetic**: Whimsical 1-line rhymes about the pages you visit.
- **Snarky**: Sassy, humorous, and sharp remarks.
- **Gen Z Slang**: Vibe-checks your sites with brain rot, main character energy, and no cap.
- **Kid / Gamified**: High-energy gaming slang (W, L, OP, HP) that feels like a co-op buddy.

### 24-Hour AI Synapse

The **24-Hour AI Synapse** is an advanced generative feature that uses **Gemini Nano** to provide a daily reflection on your browsing journey.

1. **The Charging State:** In the Sanctuary Playground, you'll see a progress bar titled "Gathering Memories." This bar fills up over 24 hours as Arcrawls observes your site categories and interactions.
2. **Generative Reflection:** Once the bar hits 100%, the Synapse is fully charged. Arcrawls synthesizes your top categories, interaction counts, and mood history into a unique 1-2 sentence reflection.
3. **Persona Integration:** The reflection is written in the voice of your currently active **Dialogue Persona**.
4. **Privacy:** Like all other AI features in Arcrawls, the data synthesis is performed locally on your device. The AI only sees categorized totals, not your raw browsing history or URLs.

---

## Adaptive Habits & Learning

Arcrawls features an adaptive learning system that monitors your web browsing habits over time and shapes his behavior, physics, and speech to match.

### Trait Archetypes
Arcrawls calculates a **Dominant Trait** based on the categories of websites you visit most frequently (minimum 3 site visits to develop a trait):
* **Developer** (Coding & Docs): Arcrawls becomes analytical. He defaults to the `working-thinking` idle animation.
* **Gamer** (Gaming & Video Streaming): Arcrawls becomes playful. He defaults to the `cool` (wearing shades!) idle animation.
* **Scholar** (News & Wikipedia): Arcrawls becomes studious. He defaults to the `reading` idle animation.
* **Socialite** (Social media & Webmail): Arcrawls becomes affectionate. He defaults to the `love` idle animation.
* **Normal**: The standard balanced behavior (defaults to `happy` or `waving`).

### Physical Speed Modifiers
Arcrawls's physical viewport crawling speed scales dynamically based on two factors:
1. **Energy Level**: If Arcrawls's energy is high, he moves up to `1.2x` faster. If he is exhausted (below 20% energy), he drags his feet and crawls at a slow `0.4x` speed.
2. **Trait Factor**:
 * **Gamer**: arcrawls is hyperactive and crawls `1.35x` faster.
 * **Developer**: arcrawls is focused and calm, crawling at `0.85x` speed to prevent distracting you.

### Stat-Sensitive Dialogue & Speech Bubbles
Arcrawls's chat bubbles change depending on his current stats and trait:
* If energy is under 30%, he will yawn and mention being sleepy (*"I'm running out of energy... 🥱"*).
* If focus is over 80%, he will encourage productivity (*"Focus mode active! 🛡️"*).
* If he is in a default idle state, he will display unique speech bubbles tailored to his trait (e.g. a Developer pet will say *"Compiling DOM structures... 💻"*, while a Scholar says *"Fascinating reading here! 📖"*).

### Ambient Observations
Arcrawls is now more perceptive than ever. Even when his mood is stable, he has a chance to share **ambient observations** or "inner thoughts" about your browsing session. This ensures he feels like a living companion rather than a static sprite, periodically checking in or commenting on the page even if you stay on one site for a long time.


### AI Stat Context (Local)
If local **Brain Upgrade (Local AI)** is active, Arcrawls's current stats (e.g. `Focus: 90%, Energy: 40%`) and Trait are passed to the local classifier. The local sentiment results are combined with these parameters to dynamically alter the commentary's tone and choice of emotion (e.g., sounding sleepier if low energy, geekier if a developer).

### AI Semantic Stat Modifiers
When **Brain Upgrade (Local AI)** is enabled, Arcrawls's stats react to the semantic meaning and sentiment of the webpage rather than just the domain name:
* **Positive Sites**: Grant bonus Happiness (+2) and Energy (+1) with extra XP.
* **Negative Code/Docs**: Represent deep or frustrating debugging sessions. They drain Happiness (-2) but boost Focus (+2).
* **Negative Social**: Heavily drain Happiness (-5) and Energy (-2), encouraging you to step away.

### Visualizing Habits in Popup
Open the extension popup to view:
* **Trait Badge**: Displays Arcrawls's current archetype in his profile header.
* **Adaptive Habits Card**: Summarizes his current Trait, physical speed modifier, and default behavior type.

---

## Performance, Progression & Storage Optimization

Arcrawls is designed to run 24/7 inside your browser without impacting computer performance, leaking memory, or overflowing local storage.

### 1. Performance & Memory Management (24/7 Execution)
* **Zero-Leak Lifecycles**: All DOM elements and active intervals are cleanly destroyed and reconstructed whenever tabs reload or update, ensuring zero memory leak accumulations.
* **Decoupled Timers**: Tab-specific loops are throttled and only run when the tab is active and visible.
* **Hardware Acceleration**: Sprite rendering and character squash-and-stretch transitions utilize the browser's native **Web Animations API (WAAPI)**, moving physics calculations to the GPU.
* **Zero-CPU Idle & Physics Halting**: The `requestAnimationFrame` physics loop completely pauses when Arcrawls is sleeping or when you switch to another tab. This drastically extends laptop battery life by minimizing background CPU usage.
* **Throttled Activity Listeners**: Idle-tracking events (`mousemove` and `scroll`) are throttled to `100ms`, cutting JavaScript execution payload by over 90% without losing responsiveness.
* **Layout Thrashing Prevention**: On infinite-scrolling social media sites, Arcrawls uses lightweight `textContent` extraction on specific semantic tags instead of `innerText`. This bypasses expensive CSS layout recalculations and prevents main-thread lag when generating AI dialogues.

> [!NOTE]
> **Can an average laptop handle 15+ tabs with Arcrawls? Yes.** 
> Thanks to the **Zero-CPU Idle** optimization, background tabs are completely frozen and use 0% CPU. Furthermore, the AI models are centralized: the ONNX model runs in a single shared offscreen document, and Gemini Nano is built into the browser itself, meaning 15 tabs does **not** mean 15 AI models running at once. Only the single active tab uses resources. For older, low-spec laptops, **Performance Mode** can be enabled in the dashboard to cap physics at 30fps and disable CSS shaders.

### 2. Long-Term Progression & Stat Balance
* **Balanced Decay**: Arcrawls's stat decay values (Happiness, Energy, Focus, etc.) are calculated once per minute to prevent sudden drop-offs.
* **Linear XP Scaling**: Leveling up requires `Level * 100 XP`, establishing a balanced leveling curve.
* **Unlocked Thresholds**: Outfits and emotions are locked behind level milestones, ensuring long-term interactive progression.

### 3. Storage Optimization & Habit Lifespan
* **Rolling Summaries**: To prevent storage leaks, the extension does not save every website you visit. Instead, it aggregates your visits into a compact rolling summary inside `chrome.storage.local`.
* **Sustained Traits**: Habit tracking updates are throttled and capped to prevent local database growth, keeping the extension's storage footprint under 5KB total.

---

## Cross-Tab Behavior (Unified Consciousness)

Arcrawls features a sophisticated **Unified Consciousness** synchronization system to ensure a seamless experience across multiple browser tabs:

- **Global Physical Sync**: Arcrawls's horizontal position (`x` coordinate), direction, and physical movement states are synchronized in real-time across **all open tabs**. If you drag Arcrawls to the right on one tab, he will be in that exact spot when you switch to any other tab.
- **Origin-Specific Emotional Sync**: While physical location is shared everywhere, Arcrawls maintains a "unified mind" across tabs sharing the same **Domain/Origin** (e.g., all your open GitHub tabs). If Arcrawls enters a "coding" mood or displays a specific speech bubble on one GitHub page, all other GitHub pages will instantly reflect that same emotion and dialogue.
- **Local Context Awareness**: Tabs on different domains (e.g., GitHub vs. YouTube) maintain their own local context reactions. Arcrawls will be "coding" on GitHub and "eating popcorn" on YouTube, ensuring his reactions remain relevant to the specific content you are viewing while still sharing a unified physical presence.

---

## Security & Privacy

Arcrawls is built with privacy in mind.

### Local Evaluation
All contextual parsing, idle detection, and scrolling evaluations happen entirely on your device. Arcrawls does not send your web browsing history, active URLs, or keystrokes to any third-party servers.

### AI Mode Privacy
If you opt into the local **AI Mood Analysis** feature:
- The **Page Title**, **Meta Description**, and **semantic tags** (`h1`, `h2`, `p`, `article`) of your active tab are processed by the local models. 
- The model runs entirely inside your browser's offscreen document WebAssembly thread. **No external network requests, server processing, or API key headers are ever used.**
- 100% of your browsing data remains locally on your physical device.

### Security Audits & Performance Updates
- **DOM Injection Safety:** All dynamic text (such as custom pet names and unlocking notifications) is injected securely using `textContent` instead of `innerHTML`, entirely preventing DOM-based Universal Cross-Site Scripting (UXSS) vulnerabilities.
- **CPU Throttling:** Background state synchronization and interactions are strictly throttled. Arcrawls will not unnecessarily broadcast update events or stack overlapping animation frames, keeping CPU overhead extremely low even with dozens of tabs open.

### Permissions
The extension requests only the permissions necessary to render the pet (`activeTab`), store settings (`storage`), track navigation events (`webNavigation`), and run local AI computations (`offscreen`). No external host permissions are required for the AI layer.

---

## Frequently Asked Questions

**Q: Arcrawls has disappeared! How do I get him back?**
Open the popup and verify that "Hide on this Tab" and "Hide on this Site" are unchecked. Also, note that Arcrawls cannot run on internal browser pages (like `chrome://`, `about:`, or the Chrome Web Store / Firefox Add-ons site) or pages that block script injections.

**Q: Does Arcrawls use a lot of resources?**
No. Arcrawls's animations are powered by native Web Animations API (WAAPI) and lightweight CSS keyframes. Position updates use high-performance `requestAnimationFrame` loops.

**Q: Do I need to pay for an API key or hosting?**
No. Arcrawls does not use any cloud servers, external databases, or third-party APIs like OpenAI or Anthropic. All text analysis is performed locally in your browser. By default, Arcrawls uses **Lite Mode** (Regex-based), which requires no downloads. If you enable the **Brain Upgrade**, he uses quantized local models and WebAssembly. It is 100% free to run forever.

**Q: Why does Arcrawls keep showing a debugger magnifying glass?**
A JavaScript console error or rejection occurred on the page you are viewing. Once you navigate away or refresh, Arcrawls will clear his debugger state.

---

## Contributing

For guidelines on how to contribute code, assets, or animations, see [CONTRIBUTING.md](file:///Users/joshuasarmiento/Documents/Github/contextual-pet-extension/context-aware-pet/CONTRIBUTING.md).

---

<p align="center">
 Made by Joshua Sarmiento
</p>
