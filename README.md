# Arcrawls: The Context-Aware Browser Pet

An open-source, interactive, context-aware browser mascot pet companion extension built using the [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) SVG library. The pet crawls along the edges of your browser viewport, monitors your activity, and updates its expression in response to your browsing context and site errors!

*Mascot SVG assets are adapted from the open-source [clawd-pet](https://github.com/abderrahimghazali/clawd-pet) library by Abderrahim Ghazali, used under the MIT License.*

<p align="center">
   <img src="docs/arcrawls-gif2.gif" alt="Arcrawls in Action" width="600" />
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/arcrawls-the-context-aware-browser-pet?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-arcrawls" target="_blank" rel="noopener noreferrer"><img alt="Arcrawls - A context-aware browser mascot with 100% local offline AI | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1174174&amp;theme=light&amp;t=1782133204859"></a>
</p>

<p align="center">
  <a href="https://chrome-stats.com/chrome/trending/trending-week" target="_blank">
    <img src="https://img.shields.io/badge/Chrome_Stats-Top_1_Week_Growth_(49%2C900%25)-C75D3F?logo=googlechrome&logoColor=white&style=for-the-badge" alt="Chrome Stats - Top 1 Week Growth" />
  </a>
</p>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Manifest-V3-orange?logo=google-chrome&logoColor=white" alt="Manifest V3" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Runtime-Bun-black?logo=bun&logoColor=F9F0E3" alt="Bun" /></a>
  <a href="https://polyformproject.org/licenses/noncommercial/1.0.0"><img src="https://img.shields.io/badge/License-PolyForm_Noncommercial-red.svg" alt="License: PolyForm Noncommercial" /></a>
</p>

  ---

  ## Key Features

  * **Gravity-Driven Physics Engine**: Reliable floor/ceiling crawling with a built-in Gravity Engine, spring-physics, and intelligent edge-snapping (no more wall-sticking).
  * **Context-Aware Emotions**: Real-time expressions that react to typing speed, scroll depth, media playback, intent detection, and site errors.
  * **Lite Mode (Default)**: Efficient, rule-based behavior analysis using Regex and meta-tag analysis—zero downloads or API keys required.
  * **Brain Upgrade (Optional AI)**: Privacy-first, high-fidelity sentiment analysis using an on-device DistilBERT model. Features **Gemini Nano** integration to summarize full page DOM bodies natively, specifically targeting semantic `<main>` and `<article>` tags to prevent context-window overflow, complete with an 8-second safety timeout.
  * **Distraction-Free UI**: Schedule **Focus Blocks** to force Arcrawls into a quiet studying animation, or use **Ghost Mode** to automatically fade his opacity down to 30% whenever you are actively typing or scrolling.
  * **Performance Mode**: Halts cross-tab syncing and disables CSS aura shaders to save memory and CPU on low-end machines. Movement now utilizes a single GPU-composited `translate3d` update per frame to eliminate layout thrashing.
  * **Virtual Pet Progression**: Level up your pet through interactions, unlock costumes, and develop unique personality traits based on your browsing habits.
  * **Mascot Milestones**: Track significant growth markers, interaction records, and trait evolutions in a dedicated achievement dashboard.
  * **24-Hour AI Synapse**: Get daily generative reflections on your browsing habits synthesized by Gemini Nano (Brain Upgrade required).
  * **Comprehensive Dashboard**: Track 7-day interest analytics, manage work/sleep schedules, and customize domain-specific reactions.

  ### Install Size

  | Component | Size | When |
  |-----------|------|------|
  | **Chrome Web Store download** | **~6 MB** | Compressed install package |
  | **Installed on disk (Chrome details)** | **~22–25 MB** | Pet assets + bundled ONNX WASM |
  | Lite Mode core (assets + UI) | ~2 MB unpacked | Active by default (Regex rules) |
  | ONNX WASM runtime (bundled) | ~22 MB unpacked | Included; initialized when Brain Upgrade is on |
  | DistilBERT model weights | ~67 MB | Downloaded once from Hugging Face after you opt in |

  Lite Mode works immediately with no network downloads. The optional Brain Upgrade initializes the bundled WASM runtime and adds a one-time ~67 MB model fetch to your browser cache — your browsing text never leaves the device.

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

  ### Available Scripts
  You can run the following scripts using Bun:

  - `bun run dev` - Starts Vite in watch mode for local development.
  - `bun run build` - Builds the extension for Chrome/Chromium to the `dist/` folder.
  - `bun run build:firefox` - Builds the extension for Firefox to the `dist-firefox/` folder.
  - `bun run test` - Runs the Vitest unit test suite.
  - `bun run test:e2e` - Runs Playwright end-to-end browser tests.
  - `bun run verify` - Runs TypeScript type-checking, unit tests, and E2E tests.
  - `bun run all` - Compiles the Chrome build, runs all verifications, and compiles the Firefox build.

  ### Loading the Extension in Chrome

  1. Open **Chrome** and navigate to `chrome://extensions`.
  2. Toggle on **Developer mode** in the top-right corner.
  3. Click the **Load unpacked** button in the top-left corner.
  4. Select the `dist/` directory located inside the `context-aware-pet` folder.
  5. Open any webpage (e.g. [github.com](https://github.com)) — your pet will slide onto the page! 🐾

  ### Loading the Extension in Firefox

  1. Build the Firefox bundle:
   ```bash
   bun run build:firefox
   ```
  2. Open **Firefox** and navigate to `about:debugging#/runtime/this-firefox`.
  3. Click **Load Temporary Add-on...**.
  4. Select `dist-firefox/manifest.json` inside the `context-aware-pet` folder.
  5. Open any normal HTTPS webpage (e.g. [github.com](https://github.com)) to verify that Arcrawls appears.

  Firefox currently runs Arcrawls in Lite Mode. The local Brain Upgrade and centralized offscreen audio paths depend on Chrome offscreen documents, which Firefox does not support yet.

  ---

  ## License

  This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use and monetization are prohibited. Underlying mascot assets are used under the MIT License.

  ---

  ## Star History

  <a href="https://www.star-history.com/?repos=fujiDevv%2Fcontext-aware-browser-pet&type=date&legend=top-left">
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=fujiDevv/context-aware-browser-pet&type=date&theme=dark&legend=top-left" />
     <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=fujiDevv/context-aware-browser-pet&type=date&legend=top-left" />
     <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=fujiDevv/context-aware-browser-pet&type=date&legend=top-left" />
   </picture>
  </a>
