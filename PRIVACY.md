# Privacy & Security Disclosure for Arcrawls

**Effective Date:** July 25, 2026  
**License:** [PolyForm Noncommercial License 1.0.0](LICENSE)

---

## 1. Core Commitment: 100% On-Device & Zero Cloud Transmission

Arcrawls ("the Extension") is designed with a **privacy-first, local-only architecture**. All mascot animations, activity tracking, sentiment analysis, and generative reflections run **100% locally on your computer**. 

- **Zero Cloud Servers**: Your browsing history, page contents, and pet progression are never sent to external servers or third-party cloud APIs.
- **Zero Telemetry / Zero Analytics**: We do not use Google Analytics, Mixpanel, tracking pixels, or phone-home telemetry scripts.

---

## 2. Host Permissions & Data Access Breakdown

Arcrawls requests host permissions (`<all_urls>` and `activeTab`) solely to render the mascot sprite overlay on top of web pages and evaluate local context signals:

### A. What Elements Are Read (In Browser Memory Only)
To make Arcrawls react dynamically to your browsing context, the extension reads top-level, non-sensitive page metadata in browser RAM:
- `document.title` & `<meta name="description">`
- Top-level semantic headings (`<h1>`, `<h2>`) and main content containers (`<main>`, `<article>`)
- Local interaction signals: Scroll depth percentage, typing velocity, mouse click counts.

### B. What Elements Are STRICTLY EXCLUDED (Never Read)
Arcrawls **NEVER** inspects, reads, parses, or logs any of the following:
- ❌ **Password Fields** (`<input type="password">`)
- ❌ **Form Inputs & Credit Card Fields** (`<input type="card">`, credit card / SSN / address forms)
- ❌ **Third-Party iFrames & Shadow DOMs**
- ❌ **Cookies, Session Tokens, Authentication Headers, or LocalStorage of Websites**

---

## 3. Private Page & Site Exclusions

Arcrawls enforces strict automatic exclusions where mascot observation is **permanently disabled**:

1. **System & Internal Browser Pages**:  
   Arcrawls never spawns or reads content on `chrome://`, `chrome-extension://`, `about:`, or `moz-extension://` pages.
2. **Web Extension Stores**:  
   Automatically disabled on Chrome Web Store (`chromewebstore.google.com`) and Mozilla Add-ons (`addons.mozilla.org`).
3. **Sensitive Banking & Financial Domains**:  
   Pre-configured regex blocklist disables observation on financial, payment, and checkout domains (`*bank*`, `*checkout*`, `*paypal*`, `*stripe*`, `*account*`).
4. **Incognito & Private Browsing**:  
   Arcrawls is disabled in Incognito mode by default unless explicitly granted permission by the user in Chrome Extension settings.
5. **Per-Site User Allowlist / Blocklist**:  
   Users can disable Arcrawls on any specific domain with a single click via the Popup or Options **Site Blocklist**.

---

## 4. Local Model Download & Verification

Arcrawls operates in two distinct intelligence modes:

- **Lite Mode (Default)**:  
  Uses local Regex rules and semantic heuristics. Requires **zero network downloads**, zero API keys, and zero external requests.
- **Brain Upgrade (Optional AI)**:  
  When explicitly enabled by the user in Settings:
  - **DistilBERT ONNX Weights (~67 MB)**: Downloaded **once** directly from Hugging Face CDN (`https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-sst-2-english`) into your browser's local IndexedDB cache. This is a static asset download; no browsing data or user info is transmitted during the request.
  - **Gemini Nano**: Uses Chrome's built-in, local on-device Prompt API. All prompts are generated locally inside your browser process.

---

## 5. Storage & Retention Policy

| Data Type | Storage Location | Retention Period |
| :--- | :--- | :--- |
| Virtual Pet Stats (XP, Level, Mood) | `chrome.storage.local` | Retained locally until wiped |
| Browsing Category Distribution | `chrome.storage.local` | 7-day rolling window in local memory |
| User Settings & Site Blocklist | `chrome.storage.local` | Retained locally until uninstalled |
| Cross-Tab Synchronization | `chrome.storage.session` | Ephemeral (cleared when browser closes) |

---

## 6. User Consent Controls & Data Reset

1. **Global Pause Observation**: Click the **Pause Mascot Observation** toggle in the Popup to halt all mascot context reading instantly across all tabs.
2. **Per-Site Disable**: Toggle "Hide on this Site" in the Popup to add the domain to your custom blocklist.
3. **1-Click Hard Reset**: Use the **Hard Wipe All Storage** button in Profile Admin (`options.html`) to delete all local pet data, logs, and settings immediately.
4. **Complete Erasure**: Uninstalling the extension completely purges all associated local storage data from your machine.

---

## 7. Open Source & License Transparency

Arcrawls is published under the **[PolyForm Noncommercial License 1.0.0](LICENSE)**. 
- Permitted uses include personal study, hobby projects, public research, and educational use without commercial application.
- Commercial distribution, paid licensing, or monetization requires explicit permission from the author.

---

## 8. Contact & Verification

If you have questions regarding host permissions or data practices, inspect our source code on GitHub:  
`https://github.com/fujiDevv/context-aware-browser-pet`
