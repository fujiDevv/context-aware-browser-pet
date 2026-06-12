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

* **Advanced Edge-Crawling Engine**: 5-state viewport movement tracking (top, bottom, left, right edges) with direction-flipping, 90-degree rotations, throwing physics, and edge snapping powered by a custom zero-dependency spring physics engine.
* **Granular Context Triggers**: Monitors active typing velocity, scroll depth, form submissions, and active HTML5 media play/pause states.
* **Console Error Watcher**: Detects runtime JS errors and unhandled promise rejections, triggering debug animations and panic reactions.
* **Domain-Specific Animations**: Displays custom SVGs mapping to site context (popcorn/eating/music/singing/dj for media, book/reading/studying for docs/Wikipedia, laptop/coding/debugger/building for dev sites, money/gift for shopping, mail/notification for webmail, flexing/lifting/yoga for fitness sites).
* **Virtual Pet Mechanics**: Leveling progression with XP rewards, custom naming, time-decay variables (energy, happiness, curiosity, focus, leisure), and interactive toy drag-and-drop.
* **Milestone Shader Upgrades**: Unlocks hardware-accelerated CSS shader glows (Detective Blue, Magic Purple, Rainbow Neon) based on pet level milestones.
* **Seasonal & Calendar Themes**: Automatically changes pet outfits and behaviors for seasonal periods (Halloween pumpkins in October, Christmas wear in December, surfing in Summer).
* **Cross-Tab Synchronization**: Syncs pet coordinates and current emotional states across background-managed tabs and side-by-side windows.
* **CSP-Bypassing AI Service**: Service-worker proxy for Anthropic API calls ensuring compliance with page CSP and CORS headers.
* **Clean Context Lifecycles**: Automatic cleanup of orphaned DOM elements and active loop intervals upon extension updates or reloads.

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
│   ├── animate.ts         # Zero-dependency spring physics and WAAPI keyframe helper
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
* **Drag-and-Drop Toys**: Drag toys (Ball ⚽, Fish 🐟, Laser 🔴) out from popup UI onto the page.
* **Settings Panel**: Name your pet, adjust speed and size sliders, select costume shader rewards (unlocked at Level 5/10/15), and toggle chiptune audio volume.
* **AI Mood Mode**: Toggle AI Mode in the settings, input your Anthropic API Key, and the pet will periodically evaluate the webpage description using Claude to select a matching emotional expression!

---

## License

This project is licensed under the [MIT License](LICENSE).
