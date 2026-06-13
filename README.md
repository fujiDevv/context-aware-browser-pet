# Clawd: The Context-Aware Browser Pet

An open-source, interactive, context-aware browser mascot pet companion extension built using the [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) SVG library, migrated to TypeScript. The pet crawls along the edges of your browser viewport, monitors your activity, and updates its expression in response to your browsing context and site errors!

*Mascot SVG assets are adapted from the open-source [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) library by Abderrahim Ghazali, used under the MIT License.*

<p align="center">
  <img src="assets/clawd-cool.svg" alt="Browser Pet Logo" width="128" height="128" />
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Manifest-V3-orange?logo=google-chrome&logoColor=white" alt="Manifest V3" /></a>
  <a href="https://esbuild.github.io/"><img src="https://img.shields.io/badge/Bundler-esbuild-yellow?logo=esbuild&logoColor=black" alt="esbuild" /></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Runtime-Bun-black?logo=bun&logoColor=F9F0E3" alt="Bun" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" /></a>
</p>

---

## Key Features

* **Advanced Edge-Crawling Engine**: 5-state viewport movement tracking (top, bottom, left, right edges) with direction-flipping, 90-degree rotations, throwing physics, and edge snapping powered by a custom zero-dependency spring physics engine.
* **Granular Context Triggers**: Monitors active typing velocity, scroll depth, form submissions, and active HTML5 media play/pause states.
* **Console Error Watcher**: Detects runtime JS errors and unhandled promise rejections, triggering debug animations and panic reactions.
* **Domain-Specific Animations**: Displays custom SVGs mapping to site context (popcorn/eating/music/singing/dj for media, book/reading/studying for docs/Wikipedia, laptop/coding/debugger/building for dev sites, money/gift for shopping, mail/notification for webmail, flexing/lifting/yoga for fitness sites).
* **Virtual Pet Mechanics**: Leveling progression with XP rewards, custom naming, time-decay variables (energy, happiness, curiosity, focus, leisure), and interactive toy drag-and-drop (Ball, Fish, Laser, Yarn, Duck, and Box).
* **Adaptive Habits & Learning System**: Clawd analyzes your browsing categories over time to develop a dominant trait (Developer, Gamer, Scholar, or Socialite). His default idle animations, dialogue bubbles, physical speeds, and stat multipliers dynamically adapt to reflect this learned personality. The system is tightly integrated with the **Local Offline AI**, ensuring stats like Happiness and Focus react to the actual semantic sentiment of a webpage rather than just a rigid domain rule.
* **Local Offline AI Model**: Runs local text sentiment classification inside a secure Offscreen Document using ONNX Runtime Web and a quantized DistilBERT classifier. No external API keys, billing, or network requests required.
* **Performance & Memory Management (24/7 Execution)**: Leak-free, low-overhead background execution. Decouples tab-specific timers, optimizes event listeners, and uses hardware-accelerated Web Animations API (WAAPI) keyframes.
* **Long-Term Progression & Stat Balance**: Balanced virtual pet leveling featuring linear XP scaling (`Level * 100 XP`), minute-based decay calculations, and stat thresholds to ensure balanced progression and long-term mascot longevity.
* **Storage Optimization & Habit Lifespan**: Uses rolling summaries and frequency maps inside `chrome.storage.local` to track personality habits without unbounded storage growth or quota leaks.

---

## Directory Structure

```
context-aware-browser-pet/
├── package.json           # Build scripts and dependency configurations
├── tsconfig.json          # TypeScript compilation settings
├── manifest.json          # Manifest V3 extension configuration
├── background.ts          # Service worker managing offscreen document lifecycles and state sync
├── offscreen.html         # HTML page container hosting the local AI environment
├── offscreen.ts           # Runs local ONNX Runtime Web WebAssembly and DistilBERT model
├── content.ts             # Main content script injected into target web pages
├── src/
│   ├── types.ts           # Shared TypeScript interfaces for settings, stats, and state
│   ├── movement.ts        # Edge-crawling state machine, dragging, and snapping
│   ├── triggers.ts        # User interaction monitors (scroll, typing, video)
│   ├── emotion.ts         # Evaluates context snapshots and determines locks/fallbacks
│   ├── personality.ts     # XP leveling thresholds, stats modifiers, and state saves
│   ├── animate.ts         # Zero-dependency spring physics and WAAPI keyframe helper
│   └── ai.ts              # Connects the content script to the local background worker
├── popup/
│   ├── popup.html         # Controller layout for sliders, badges, and stats
│   ├── popup.ts           # Binds controls, manages input, and updates status bars
│   └── popup.css          # Premium glassmorphic visual stylesheet
├── assets/
│   ├── pet.svg            # Mascot extension icon
│   ├── clawd-cool.svg     # SVG mascot asset
│   └── *.mp3              # Chiptune sound effect assets (greeting, petting, feeding, etc.)
└── dist/                  # Output directory containing the packaged extension
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (recommended) or `npm`

### Installation & Build

1. Navigate to the extension directory:
   ```bash
   cd context-aware-browser-pet
   ```
2. Install the dev dependencies:
   ```bash
   bun install
   ```
3. Type-check the source files:
   ```bash
   bun run type-check
   ```
4. Run the compiler build:
   ```bash
   bun run build
   ```

### Loading the Extension in Chrome

1. Open **Chrome** and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `dist/` directory located inside the `context-aware-browser-pet` folder.
5. Open any webpage (e.g. [github.com](https://github.com)) — your pet will slide onto the page! 🐾

---

## Interactions & Controls

* **Left Click**: "Pet" the mascot to raise its Happiness. Displays the `love` mood.
* **Double Click**: "Feed" the mascot to raise its Energy. Displays the `celebrating` mood.
* **Right Click**: "Shoo" the mascot away. Teleports it to a random coordinate along the bottom screen edge.
* **Click & Drag**: Drag the mascot to reposition it or attach it to a specific wall edge.
* **Drag-and-Drop Toys**: Drag toys (Ball ⚽, Fish 🐟, Laser 🔴, Yarn 🧶, Duck 🦆, Box 📦) out from the popup UI onto the page. Supports dropping multiple toys at once to queue Clawd's play interactions.
* **Settings & Triggers**: Click to switch between Mascot, Stats, and Settings tabs. Customize your pet's name, size, speed, and volume, toggle active emotions/aura shaders, toggle the **Daily Schedule & Triggers** switch (or turn it off to let Clawd enter **Autonomous Mode** to decide his own emotes, exploration paths, and webpage analysis commentary), and check the built-in Daily Schedule & Triggers guide.
* **AI Mood Mode**: Toggle AI Mode in the settings, and the pet will periodically evaluate the webpage description using the local DistilBERT model to select a matching emotional expression and display a custom comment bubble!

---

## Security & Privacy

* **Local Evaluation**: All website context evaluations, DOM parsing, activity tracking, and AI model inference happen entirely locally on your machine.
* **No Telemetry**: Clawd does not collect, track, or transmit your browsing history, AI inputs, or personal data to external servers.
* **100% Offline AI**: Unlike cloud models, the local AI model runs entirely in your browser using local WebAssembly. No API keys are required, and no data ever leaves your device.
* **Minimal Scope**: The local AI only analyzes the webpage `title` and `meta description`. It does *not* read or scan body content or sensitive inputs.

---

## License

This project is licensed under the [MIT License](LICENSE).
