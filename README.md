# Clawd: The Context-Aware Browser Pet

An open-source, interactive, context-aware browser mascot pet companion extension built using the [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) SVG library. The pet crawls along the edges of your browser viewport, monitors your activity, and updates its expression in response to your browsing context and site errors!

*Mascot SVG assets are adapted from the open-source [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) library by Abderrahim Ghazali, used under the MIT License.*

<p align="center">
   <img src="assets/clawd-gif2.gif" alt="Clawd in Action" width="600" />
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

* **Edge-Crawling Physics Engine**: Realistic 5-state viewport movement with throwing physics and edge-snapping.
* **Context-Aware Emotions**: Real-time expressions that react to typing speed, scroll depth, media playback, and site errors.
* **Local Offline AI**: Privacy-first sentiment analysis using an on-device DistilBERT model (no API keys required).
* **Virtual Pet Progression**: Level up your pet through interactions, unlock costumes, and develop unique personality traits based on your browsing habits.
* **Comprehensive Dashboard**: Track 7-day interest analytics, manage work/sleep schedules, and customize domain-specific reactions.

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

* **Pet (Left Click)**: Boost Happiness and see the 'love' mood.
* **Feed (Double Click)**: Restore Energy and celebrate.
* **Shoo (Right Click)**: Relocate the pet to a random spot.
* **Play (Drag-and-Drop Toys)**: Drop items like Balls, Yarn, or Ducks from the popup to play.
* **Settings**: Customize names, sizes, speeds, and personas in the dashboard.
* **AI Vibe Check**: Enable AI Mode to let Clawd analyze page sentiment and comment on your browsing.

---

## Security & Privacy

* **Local Evaluation**: All website context evaluations, DOM parsing, activity tracking, and AI model inference happen entirely locally on your machine.
* **No Telemetry**: Clawd does not collect, track, or transmit your browsing history, AI inputs, or personal data to external servers.
* **100% Offline AI**: Unlike cloud models, the local AI model runs entirely in your browser using local WebAssembly. No API keys are required, and no data ever leaves your device.
* **Minimal Scope**: The local AI only analyzes the webpage `title` and `meta description`. It does *not* read or scan body content or sensitive inputs.

---

## License

This project is licensed under the [MIT License](LICENSE).
