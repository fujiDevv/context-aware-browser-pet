# Context-Aware Browser Pet Extension

An interactive, context-aware browser mascot pet extension built using the [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) SVG library, migrated to TypeScript. The pet crawls along the edges of your browser viewport, monitors your activity, and updates its expression in response to your browsing context and site errors!

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

* **5-State Movement Engine**: The pet crawls seamlessly along the left, right, top, and bottom edges of the viewport. It flips horizontally depending on direction and rotates 90 degrees on vertical walls.
* **Interactive Mouse Dragging**: Click and drag the pet to throw it anywhere on the page! Upon release, it automatically snaps to the nearest viewport boundary and restarts its crawling loops.
* **Real-time Tab & Window Sync**: Active coordinates and state are coordinated through the background worker. If you switch tabs, the pet snaps to the exact same position, maintaining visual persistence. Side-by-side windows sync coordinates in real-time.
* **Granular Context Triggers**: Reacts dynamically to:
  * Rolling typing velocity ("Heavy Typing" state)
  * Scroll depth percentages
  * Active HTML5 video playback (cool/dancing reactions)
  * Form submissions (celebrating reaction)
  * Main frame HTTP errors (404, 500, 403, 429 status code captures)
* **Personality & Leveling System**: Earn XP points by petting, feeding, and browsing. Leveling up unlocks higher tier mascot status animations (ninja, wizard, astronaut, rocket). Stats are stored securely in `chrome.storage.local`.
* **Glassmorphic UI Control Panel**: A premium dark-theme popup UI offering manual action buttons (Pet, Feed, Shoo), settings sliders (size, speed), and API integrations.
* **Secure Background AI Mode**: Securely routes Anthropic Claude API requests through the background service worker to bypass page Content Security Policies (CSP) and CORS locks on target domains.
* **Context Invalidation Protections**: Prevents console error spam upon extension reloads. Orphaned scripts automatically clear intervals, halt requestAnimationFrame ticks, and remove their DOM elements from the web pages.

---

## Directory Structure

```
context-aware-browser-pet/
├── package.json           # Build scripts and dependency configurations
├── tsconfig.json          # TypeScript compilation settings
├── manifest.json          # Manifest V3 extension configuration
├── background.ts          # Service worker capturing HTTP errors and proxying AI calls
├── content.ts             # Main content script injected into target web pages
├── src/
│   ├── types.ts           # Shared TypeScript interfaces for settings, stats, and state
│   ├── movement.ts        # Edge-crawling state machine, dragging, and snapping
│   ├── triggers.ts        # User interaction monitors (scroll, typing, video)
│   ├── emotion.ts         # Evaluates context snapshots and determines locks/fallbacks
│   ├── personality.ts     # XP leveling thresholds, stats modifiers, and state saves
│   └── ai.ts              # Delegates Claude API queries to the background worker
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
2. Install the dev dependencies (TypeScript compiler, types, and `esbuild`):
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
* **Popup Slider**: Dynamically adjust the size and movement speed. The pet updates instantly without refreshing.
* **AI Mood Mode**: Toggle AI Mode in the settings, input your Anthropic API Key, and the pet will periodically evaluate the webpage description using Claude to select a matching emotional expression!

---

## License

This project is licensed under the [MIT License](LICENSE).
