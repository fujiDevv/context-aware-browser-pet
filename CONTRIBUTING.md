# Contributing to Browser Pet Extension

Thank you for your interest in contributing to the Browser Pet Extension! We welcome contributions to make this context-aware companion even better.

## How to Contribute

### 1. Setup Your Local Environment
Make sure you have the following prerequisites installed:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Bun](https://bun.sh/) (recommended package manager/runtime)

To get started:
1. Clone the repository.
2. Navigate to the extension folder:
   ```bash
   cd context-aware-browser-pet
   ```
3. Install dependencies:
   ```bash
   bun install
   ```

### 2. Local Development & Watching
We use `esbuild` to compile and bundle all TypeScript modules into JavaScript targets inside the `dist/` directory. You can run the bundler in watch mode to automatically rebuild on changes:
```bash
bun run watch
```

### 3. Type Checking & Verification
Before building or committing changes, verify that there are no TypeScript compile or type errors in the source code:
```bash
bun run type-check
```

### 4. Build & Packaging
Verify the extension builds correctly:
```bash
bun run build
```
This bundles the scripts, copies the assets and popup files, and prepares the final `dist/` directory.

### 5. Load & Test in Browser
1. Open Chrome and head to `chrome://extensions`.
2. Toggle on **Developer Mode** (top-right).
3. Click **Load unpacked** (top-left) and select the `context-aware-browser-pet/dist` folder.
4. Open any website page to see the pet crawling!

## Naming & Style Conventions
* **Language:** Write code in TypeScript using ES6+ syntax. Avoid using `any` types where possible.
* **Variables & Functions:** `camelCase` (e.g., `currentSettings`, `safeSendMessage`)
* **Classes:** `PascalCase` (e.g., `MovementEngine`, `TriggerDetector`)
* **File Names:** Lowercase with hyphens or underscores (e.g., `personality.ts`, `popup.css`)

## Pull Request Guidelines
1. Fork the repo and create your branch: `git checkout -b feature/your-feature-name`.
2. Keep commits atomic and descriptive.
3. Verify that your changes compile and load without console or type errors (`bun run type-check` must pass).
4. Submit a Pull Request.
