# 🐾 Clawd: The Context-Aware Browser Pet — User Guide

> Your context-aware browser pet companion.
> 
> *Mascot SVG assets are adapted from the open-source [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) library by Abderrahim Ghazali, used under the MIT License.*

---

## Table of Contents

1. [What is Clawd?](#what-is-clawd)
2. [Installing the Extension](#installing-the-extension)
3. [Meeting Your Pet](#meeting-your-pet)
4. [Interacting with Clawd](#interacting-with-clawd)
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
9. [Costume Glow Effects](#costume-glow-effects)
10. [Visibility Controls](#visibility-controls)
    - [Hide on This Tab](#hide-on-this-tab)
    - [Hide on This Site](#hide-on-this-site)
11. [Settings & Customization](#settings--customization)
    - [Pet Name](#pet-name)
    - [Pet Size](#pet-size)
    - [Movement Speed](#movement-speed)
    - [Sound Effects & Volume](#sound-effects--volume)
    - [Sound Board](#sound-board)
12. [AI Mood Analysis (Optional)](#ai-mood-analysis-optional)
    - [How It Works](#how-it-works)
    - [Setting Up](#setting-up)
    - [AI Personas](#ai-personas)
13. [Adaptive Habits & Learning](#adaptive-habits--learning)
14. [Cross-Tab Behavior (Hybrid Sync)](#cross-tab-behavior-hybrid-sync)
15. [Security & Privacy](#security--privacy)
16. [Frequently Asked Questions](#frequently-asked-questions)
17. [Contributing](#contributing)

---

## What is Clawd?

Clawd is an open-source, context-aware browser mascot that lives at the bottom of your browser window. He walks around, reacts to what you're doing online, and changes his expression and outfit depending on the website you're visiting, the time of day, and even the season.

He's not just for looks — Clawd is a virtual pet with stats, levels, unlockable costumes, and over **140 unique animations**. Pet him, feed him, play with him, or just let him keep you company while you browse.

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
5. Open **Google Chrome** and go to `chrome://extensions`.
6. Enable **Developer mode** using the toggle in the top-right corner.
7. Click **Load unpacked** in the top-left corner and select the `dist/` folder inside the project directory.
8. Open any regular website (e.g., [github.com](https://github.com)) — Clawd will slide onto the page and say hello! 🐾

---

## Meeting Your Pet

When Clawd first appears on a new page:
- He starts at a random horizontal position along the bottom edge of your browser window.
- He displays a greeting speech bubble: *"Hello! I'm [Pet Name]! Let's browse together! 🐾"* (defaults to *"Hello! I'm Clawd! Let's browse together! 🐾"*).
- A greeting sound effect is played (if sound is enabled).

Clawd will then begin walking back and forth along the bottom of the page, occasionally pausing to rest.

---

## Interacting with Clawd

You can interact with Clawd directly on the webpage to affect his stats, emotions, and experience.

### Petting
- **How**: Left-click on Clawd.
- **Reaction**: Clawd displays the `love` mood ❤️, accompanied by a bouncy squash-and-stretch animation.
- **Effect**: +5 Happiness, +2 Energy, +5 Leisure, and +10 XP. Plays the Petting sound effect.

### Feeding
- **How**: Double-click on Clawd.
- **Reaction**: Clawd celebrates and says *"Yum! That was delicious! 🍖"*, showing the `celebrating` mood.
- **Effect**: +10 Energy, +2 Happiness, and +15 XP. Plays the Feeding sound effect.

### Shooing
- **How**: Right-click on Clawd.
- **Reaction**: Clawd teleports to a random spot along the bottom of the screen, saying *"Okay, okay, moving! 🏃‍♂️"* and showing the `shoo` reaction.
- **Effect**: -10 Happiness, -5 Energy, -5 Leisure, and +5 XP. Plays the Shoo sound effect.

### Dragging & Snapping
- **How**: Click and hold on Clawd, then drag him anywhere on the screen.
- **Reaction**: Clawd follows your mouse. When you release him, he smoothly snaps back to the bottom edge using a physics-based spring animation.
- **Position Sync**: While dragging, Clawd's coordinates sync in real-time across your active tabs.

### Hover Reaction
- **How**: Move your mouse cursor over Clawd.
- **Reaction**: Clawd scales up and rotates slightly to acknowledge your cursor. When you move the mouse away, he springs back to his normal size.

---

## Mascot Stats & Decay

Clawd has five core stats that change based on your interactions, browsing categories, and the passage of time. You can view them anytime in the popup panel.

### Happiness
🫶 How content Clawd is. Increases when you pet him or visit fun sites. Decreases over time and when you shoo him away.

### Energy
🍖 How energized Clawd is. Increases when you feed him. Decreases naturally over time, and during heavy work/development browsing sessions.

### Curiosity
🧐 How intellectually stimulated Clawd is. Increases when you visit developer, documentation, or news sites. Decreases on social media sites.

### Focus
💻 How productive Clawd is feeling. Increases on developer and documentation websites. Decreases when visiting gaming or social media sites.

### Leisure
🍿 How relaxed and entertained Clawd is. Increases on social media and gaming sites. Decreases on work-heavy developer sites.

### Stat Decay Rates
All stats gradually decay in the background. The decay rates (evaluated every 1 minute) are:
- **Happiness Decay**: ~4.0% per hour
- **Energy Decay**: ~6.8% per hour
- **Curiosity Decay**: ~1.8% per hour
- **Focus Decay**: ~5.4% per hour
- **Leisure Decay**: ~5.4% per hour

*Keep interacting with Clawd and browsing diverse sites to keep his stats healthy!*

---

## Leveling Up & XP

Clawd grows stronger as you use your browser. Leveling up unlocks new cosmetic traits, aura costume shaders, and expressive emotions.

### How to Earn XP

| Action | XP Earned |
|--------|-----------|
| Pet Clawd (click) | +10 XP |
| Feed Clawd (double-click) | +15 XP |
| Shoo Clawd (right-click) | +5 XP |
| Visit a coding/dev site | +5 XP |
| Visit a gaming site | +6 XP |
| Visit a documentation site | +4 XP |
| Visit a news site | +3 XP |
| Visit a social/shopping site | +2 XP |

### Level Milestones & Emotion Unlocks

The XP required to level up is `Level × 100 XP` (e.g., Level 1 requires 100 XP to reach Level 2, Level 2 requires 200 XP to reach Level 3, and so on).

When Clawd levels up, a golden achievement banner slides down from the top of your current page to show what was unlocked!

| Level Milestone | Unlocks & Rewards |
|-----------------|-------------------|
| **Level 1** | Basic emotions: `happy`, `sad`, `angry`, `crying`, `waving`, `sleeping`, `working-thinking`, `shrug`, `reading`, `yoga`, `eating` |
| **Level 3** | Advanced emotions: `coding`, `working-typing`, `dancing`, `cool`, `love`, `celebrating`, `mindblown` |
| **Level 5** | Blue Detective Aura + Emotes: `ninja`, `working-wizard`, `astronaut`, `working-debugger`, `working-building` |
| **Level 8** | Emotes: `rocket`, `pirate`, `working-juggling`, `gaming` |
| **Level 10** | Magic Purple Aura + **All emotions unlocked** |
| **Level 15** | Neon Rainbow Shader |

> **Note**: Seasonal, holiday, idle, and custom situational behaviors (like fitness and music) are always allowed to bypass level locks so you can enjoy all the unique SVG animations!

---

## Context-Aware Moods

Clawd changes his expression and animation based on the page context of your active browser tab.

### Website-Specific Reactions

| Website Category | Matches (Domains) | Clawd's Reaction |
|-----------------|-------------------|-------------------|
| **Coding / Dev** | GitHub, StackOverflow, GitLab, npm, etc. | `coding`, `working-building`, `working-typing` |
| **Social Media** | Twitter/X, Instagram, Reddit, TikTok, etc. | `love` ❤️ |
| **Gaming** | Twitch, Steam, itch.io, Roblox | `gaming` 🎮 |
| **News** | BBC, CNN, NYT, Reuters, etc. | `working-thinking` 🤔 |
| **Shopping** | Amazon, eBay, Etsy, Shopify | `money` 💰 |
| **Documentation** | Notion, Google Docs, Wikipedia, etc. | `studying` 📚 |
| **Email** | Gmail, Outlook, Yahoo Mail | `mail` 📬 |
| **Fitness** | Strava, MyFitnessPal, Fitbit, etc. | `flexing` 💪, `lifting` 🏋️, `yoga` 🧘 (rotating) |

### Activity-Based Reactions

- **Heavy Typing**: Displays `working-typing` (or `coding` if on a dev site).
- **Submitting a Form**: Celebrates with the `celebrating` mood 🎉 and says *"Success! Form sent! 🎉"*.
- **Playing a Video/Audio**:
  - YouTube, Netflix, Vimeo: Displays `eating` (watching snacks!).
  - Spotify, SoundCloud, Music: Displays `music` 🎵, `singing` 🎤, or `dj` 🎧 (rotating).
  - Other media: Displays `cool`.

### Time of Day Reactions

- **Late Night (10:00 PM – 6:00 AM)**: Clawd falls asleep (`sleeping` 💤) and slows his movement speed by 50%.
- **Morning (6:00 AM – 9:00 AM)**: Performs morning stretches (`yoga` 🧘).

### Autonomous Mode (Toggle Off)

If you turn off the **Daily Schedule & Triggers** toggle in settings, Clawd enters Autonomous Mode. In this state, he:
- Bypasses all contextual checks (site categories, console errors, HTTP errors, typing, video playing, and sleep schedules).
- Autonomously decides which emotions to express based on a time hash (switching up his mood once per minute).
- Periodically decides to explore different parts of your browser window or chase your cursor.
- Displays custom speech bubbles and commentary about analyzing the pages you browse.

> **Daily Schedule & Triggers Guide**: You can check the full schedule of daily routines (Late Night sleep, Morning yoga, Idle actions, Page diagnostics) anytime inside the **📊 Stats** tab of the popup panel.

### Seasonal & Holiday Themes

Clawd adjusts his appearance automatically based on the calendar month:
- **October**: Halloween outfits (`halloween` 🎃).
- **December**: Christmas cheer (`christmas` 🎄).
- **Summer (June – August)**: Rotates through `summer` ☀️, `surfing` 🏄, and `ice-cream` 🍦.

### Idle Behaviors

If you are inactive (no typing, scrolling, clicking, or mouse movement) for **over 45 seconds**, Clawd will pick a random idle activity to keep himself busy:
- Skateboarding (`skateboard` 🛹)
- Stargazing (`telescope` 🔭)
- Meditating (`meditating` 🧘)
- Playing with a rubber duck (`working-rubber-duck` 🐤)
- Sipping coffee (`coffee` ☕)
- Yawning (`yawning` 🥱)
- Thinking (`working-thinking` 💭)
- Sleeping (`sleeping` 💤)

If you remain idle for **over 5 minutes (300 seconds)**, Clawd will curl up and fall asleep (`sleeping` 💤).

### Cursor Chasing

When you are idle (for at least 10 seconds), Clawd has a 15% chance every 10 seconds to wander over to your mouse cursor's horizontal position, looking up at it and saying things like:
- *"Whatcha doing over there? 👀"*
- *"Let me see! 🧐"*
- *"Watchu looking at? 👁️"*

### HTTP Error Reactions

If the website you are visiting returns a standard HTTP error code, Clawd displays a reaction bubble:
- **404**: *"Whoops! This page doesn't exist (404)!"*
- **403**: *"Stop! Access denied (403)!"*
- **429**: *"Too fast! Calm down (429)!"*
- **500**: *"Ouch! The server is broken (500)!"*

### Console Error Watcher

If a JavaScript runtime error or unhandled promise rejection occurs on the webpage, Clawd immediately enters `working-debugger` mode and looks for the bug, displaying either *"Oh no! Something crashed! 💥"* or *"Found a bug! Let me debug! 🔍"*.

---

## Interactive Toys

Open the popup panel (under the **🐾 Mascot** tab) and drag a toy from the **Interactive Toys** drawer onto the page to play:

- **Ball ⚽**: Clawd chases it, does a happy dance, and says *"Wow! A ball! Roll roll roll! ⚽"*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Fish 🐟**: Clawd chases it and says *"Yum! That fish was delicious! 🐟"*. Acts as a Feeding interaction (+15 XP, +10 Energy, +2 Happiness).
- **Laser 🔴**: Clawd chases it and says *"Got the red dot! Rawr! 🔴"*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Yarn 🧶**: Clawd chases it and says *"Ooh, a ball of yarn! Unraveling time! 🧶"*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Duck 🦆**: Clawd chases it and says *"Squeak squeak! Squeaky toy ducky! 🦆"*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).
- **Box 📦**: Clawd chases it and says *"If it fits, I sits! Best box ever! 📦"*. Acts as a Petting interaction (+10 XP, +5 Happiness, +2 Energy, +5 Leisure).

### Drop Multiple Toys (Queued Play)
You can drop multiple toys onto the webpage at the same time. The toys will drop and rest on the page floor using spring-gravity physics, and Clawd will chase and play with them in the order they were dropped.
- **Dragging Clawd** or clicking **Shoo** in the popup panel will immediately clear all active toys on the screen and empty the queue.

---

## Costume Glow Effects

As Clawd levels up, you unlock special CSS shaders to give him a glowing effect. Enable them under the **Pet Glow Effect** settings in the popup:

| Costume / Shader | Unlock Level | CSS Visual Effect |
|------------------|--------------|-------------------|
| **Blue Detective Aura** | Level 5 | Pulsing blue shadow glow |
| **Magic Purple Aura** | Level 10 | Floating purple shadow glow |
| **Neon Rainbow Shader** | Level 15 | Rainbow hue-rotation cycle |

---

## Visibility Controls

You can control Clawd's visibility directly from the popup panel:

### Hide on This Tab
Temporarily hides Clawd on the active tab. Clawd will reappear if you open a new tab or refresh the page.

### Hide on This Site
Permanently blocks Clawd on the current website domain (e.g. `google.com`). Clawd will not appear on any page under this domain until you toggle it off in the popup.

---

## Settings & Customization

Click the extension icon to open the controls. The controls are organized into three responsive tabs:

### 🐾 Mascot Tab
- **Stats progress bars**: Track happiness, energy, curiosity, focus, and leisure.
- **Interactions**: Pet, Feed, and Shoo buttons.
- **Interactive Toys**: Drag 6 different toys (ball, fish, laser, yarn, duck, box) onto the page.

### 📊 Stats Tab
- **Mascot Analytics**: View total petting and feeding statistics.
- **Browsing Interests**: Check the distribution of websites analyzed.
- **Recent Activity**: Scroll the activity log of events.
- **Daily Schedule & Triggers**: Reference Clawd's reactions schedule.

### ⚙️ Settings Tab
- **Active Emotions**: Toggle check boxes to allow/disallow specific unlocked emotions.
- **Daily Schedule & Triggers**: Toggle off to put Clawd in Autonomous Mode, letting him choose his own emotes, move around, and analyze pages on his own terms.
- **Sound Board**: Click buttons to preview chiptune sounds (greeting, feed, level-up, shoo, etc.).
- **Visibility**: Toggle options to hide Clawd on the current tab or block him entirely on the active domain.
- **Pet Name**: Give your pet a custom name (up to 12 characters).
- **Pet Glow Effect**: Select costume auras unlocked at LVL 5, 10, and 15.
- **Sliders**: Adjust size (48px - 128px), movement speed (0.1x - 5.0x), and volume.
- **AI Mood Analysis**: Input your Anthropic API Key and select your Claude commentary persona.

---

## AI Mood Analysis (Local & Offline)

Clawd features a local, privacy-centric AI layer that reads page context and generates customized comments and expressions completely offline.

### How It Works
When you visit a page, the extension sends the **page title** and **meta description** to a local AI model running inside a hidden **Offscreen Document**. It runs a quantized, highly optimized DistilBERT model to classify the text's sentiment into `POSITIVE`, `NEGATIVE`, or `NEUTRAL`. The pet then maps the classified sentiment and current category to a specific emotional animation and displays a matching dialogue comment from the active persona.

### Setting Up
1. Open the extension popup panel.
2. Under the **⚙️ Settings** tab, toggle on **AI Mood Analysis**.
3. The status badge will change to **Downloading (X%)** as the model weights (~67MB) are downloaded and securely stored locally in your browser's IndexedDB. (This only happens on the first run).
4. Once the status shows **Ready**, the local model is fully operational.
5. Select your preferred **AI Persona** from the dropdown menu to customize the commentary style. No API keys or configurations are needed!

### AI Personas

- **Default (Friendly)**: A sweet, helpful companion.
- **Sarcastic**: Witty, dry, and slightly cynical observations.
- **Encouraging**: Uplifting, positive, and motivating remarks.
- **Poetic**: Whimsical 1-line rhymes about the pages you visit.
- **Snarky**: Sassy, humorous, and sharp remarks.

---

## Adaptive Habits & Learning

Clawd features an adaptive learning system that monitors your web browsing habits over time and shapes his behavior, physics, and speech to match.

### Trait Archetypes
Clawd calculates a **Dominant Trait** based on the categories of websites you visit most frequently (minimum 3 site visits to develop a trait):
* **Developer** (Coding & Docs): Clawd becomes analytical. He defaults to the `working-thinking` idle animation.
* **Gamer** (Gaming & Video Streaming): Clawd becomes playful. He defaults to the `cool` (wearing shades!) idle animation.
* **Scholar** (News & Wikipedia): Clawd becomes studious. He defaults to the `reading` idle animation.
* **Socialite** (Social media & Webmail): Clawd becomes affectionate. He defaults to the `love` idle animation.
* **Normal**: The standard balanced behavior (defaults to `happy` or `waving`).

### Physical Speed Modifiers
Clawd's physical viewport crawling speed scales dynamically based on two factors:
1. **Energy Level**: If Clawd's energy is high, he moves up to `1.2x` faster. If he is exhausted (below 20% energy), he drags his feet and crawls at a slow `0.4x` speed.
2. **Trait Factor**:
   * **Gamer**: clawd is hyperactive and crawls `1.35x` faster.
   * **Developer**: clawd is focused and calm, crawling at `0.85x` speed to prevent distracting you.

### Stat-Sensitive Dialogue & Speech Bubbles
Clawd's chat bubbles change depending on his current stats and trait:
* If energy is under 30%, he will yawn and mention being sleepy (*"I'm running out of energy... 🥱"*).
* If focus is over 80%, he will encourage productivity (*"Focus mode active! 🛡️"*).
* If he is in a default idle state, he will display unique speech bubbles tailored to his trait (e.g. a Developer pet will say *"Compiling DOM structures... 💻"*, while a Scholar says *"Fascinating reading here! 📖"*).

### AI Stat Context (Local)
If local AI Mood Analysis is active, Clawd's current stats (e.g. `Focus: 90%, Energy: 40%`) and Trait are passed to the local classifier. The local sentiment results are combined with these parameters to dynamically alter the commentary's tone and choice of emotion (e.g., sounding sleepier if low energy, geekier if a developer).

### Visualizing Habits in Popup
Open the extension popup to view:
* **Trait Badge**: Displays Clawd's current archetype in his profile header.
* **Adaptive Habits Card**: Summarizes his current Trait, physical speed modifier, and default behavior type.

---

## Performance, Progression & Storage Optimization

Clawd is designed to run 24/7 inside your browser without impacting computer performance, leaking memory, or overflowing local storage.

### 1. Performance & Memory Management (24/7 Execution)
* **Zero-Leak Lifecycles**: All DOM elements and active intervals are cleanly destroyed and reconstructed whenever tabs reload or update, ensuring zero memory leak accumulations.
* **Decoupled Timers**: Tab-specific loops are throttled and only run when the tab is active and visible.
* **Hardware Acceleration**: Sprite rendering and character squash-and-stretch transitions utilize the browser's native **Web Animations API (WAAPI)**, moving physics calculations to the GPU.

### 2. Long-Term Progression & Stat Balance
* **Balanced Decay**: Clawd's stat decay values (Happiness, Energy, Focus, etc.) are calculated once per minute to prevent sudden drop-offs.
* **Linear XP Scaling**: Leveling up requires `Level * 100 XP`, establishing a balanced leveling curve.
* **Unlocked Thresholds**: Outfits and emotions are locked behind level milestones, ensuring long-term interactive progression.

### 3. Storage Optimization & Habit Lifespan
* **Rolling Summaries**: To prevent storage leaks, the extension does not save every website you visit. Instead, it aggregates your visits into a compact rolling summary inside `chrome.storage.local`.
* **Sustained Traits**: Habit tracking updates are throttled and capped to prevent local database growth, keeping the extension's storage footprint under 5KB total.

---

## Cross-Tab Behavior (Hybrid Sync)

Clawd runs on a **hybrid synchronization** system:
- **Physical Coordinates Sync**: Clawd's horizontal position (`x` coordinate), direction, and movement states are synchronized in real-time across all tabs. Clawd is in the exact same spot when you switch between tabs.
- **Emotional States stay Local**: Each tab evaluates its own page context. Clawd will be coding on GitHub, eating popcorn on YouTube, and reading documentation on Wikipedia — maintaining his local context reactions on each tab.

---

## Security & Privacy

Clawd is built with privacy in mind.

### Local Evaluation
All contextual parsing, idle detection, and scrolling evaluations happen entirely on your device. Clawd does not send your web browsing history, active URLs, or keystrokes to any third-party servers.

### AI Mode Privacy
If you opt into the local **AI Mood Analysis** feature:
- Only the **Page Title** and **Meta Description** of your active tab are processed by the local DistilBERT model. 
- The model runs entirely inside your browser's offscreen document WebAssembly thread. **No external network requests, server processing, or API key headers are ever used.**
- 100% of your browsing data remains locally on your physical device.

### Permissions
The extension requests only the permissions necessary to render the pet (`activeTab`), store settings (`storage`), track navigation events (`webNavigation`), and run local AI computations (`offscreen`). No external host permissions are required for the AI layer.

---

## Frequently Asked Questions

**Q: Clawd has disappeared! How do I get him back?**
Open the popup and verify that "Hide on this Tab" and "Hide on this Site" are unchecked. Also, note that Clawd cannot run on internal Chrome pages (like `chrome://` or the Chrome Web Store) or pages that block script injections.

**Q: Does Clawd use a lot of resources?**
No. Clawd's animations are powered by native Web Animations API (WAAPI) and lightweight CSS keyframes. Position updates use high-performance `requestAnimationFrame` loops.

**Q: Is my API key secure?**
Yes. Your Anthropic API key is saved directly in Chrome's local storage on your machine. It is only ever transmitted to Anthropic's secure endpoints and is never uploaded to external servers.

**Q: Why does Clawd keep showing a debugger magnifying glass?**
A JavaScript console error or rejection occurred on the page you are viewing. Once you navigate away or refresh, Clawd will clear his debugger state.

---

## Contributing

For guidelines on how to contribute code, assets, or animations, see [CONTRIBUTING.md](file:///Users/joshuasarmiento/Documents/Github/contextual-pet-extension/context-aware-pet/CONTRIBUTING.md).

---

<p align="center">
  Made with ❤️ by the Joshua Sarmiento
</p>
