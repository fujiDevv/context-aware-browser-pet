# Privacy Policy for Arcrawls

**Effective Date:** June 14, 2026

## 1. Overview
Arcrawls ("the Extension") is an open-source, interactive browser mascot companion. We are committed to protecting your privacy. Our core principle is: **Your data never leaves your device.**

## 2. Data Access & Usage
To provide interactive and context-aware mascot behavior, the Extension accesses the following information locally within your browser:

*   **Web History & Website Content:** The Extension reads the current tab’s URL, Page Title, Meta Description, and lightweight semantic tags (such as `<main>`, `<article>`, headers, and paragraphs). This is used solely to categorize the site type and perform local sentiment analysis so the mascot can react emotionally to the page context.
*   **User Activity:** The Extension monitors local signals such as scroll depth, typing velocity, and mouse clicks. These signals are used to trigger real-time mascot animations (e.g., a "typing" animation when you are writing).

## 3. Local Processing (No Cloud AI)
All data analysis, including Machine Learning inference for sentiment classification, is performed **strictly on-device** using WebAssembly (ONNX Runtime) and Chrome's built-in local Gemini Nano model (via the experimental Prompt API). 
*   We **do not** use remote servers, cloud APIs, or external Large Language Models (LLMs) to process your browsing data.
*   Your browsing history and page content are never transmitted to us or any third party.

## 4. Data Storage
The Extension utilizes `chrome.storage.local` and `chrome.storage.session` to store:
*   Virtual pet statistics (Level, XP, Happiness, Energy).
*   User-customized settings (Pet name, size, movement speed, and selected persona).
*   Historical browsing category distributions for the "Analytics" dashboard.
*   Cross-tab synchronization states (stored ephemerally in session storage).

This data is stored locally on your computer (or in temporary session memory) and is not synchronized with any external database or cloud storage.

## 5. Data Sharing & Third Parties
*   **No Sale of Data:** We do not sell, trade, or rent user data to anyone.
*   **No Tracking:** The Extension does not contain any telemetry, analytics scripts (like Google Analytics), or tracking pixels.
*   **Model Downloads:** Upon first use of AI mode, the Extension downloads pre-trained model weights from Hugging Face. This is a standard file download; no personal data is sent during this process.

## 6. User Control & Data Deletion
You have complete control over your data:
1.  **Reset:** You can wipe all statistics and history using the "Hard Wipe All Storage" button in the Profile Admin tab within the Extension settings.
2.  **Uninstall:** Uninstalling the Extension will automatically remove all locally stored data associated with it from your browser.

## 7. Changes to This Policy
We may update this policy from time to time to reflect changes in our practices. Any changes will be updated on this page.

## 8. Contact
If you have any questions regarding this privacy policy or the Extension's data practices, please open an issue on our GitHub repository:
[https://github.com/joshuasarmiento/contextual-pet-extension/issues](https://github.com/joshuasarmiento/contextual-pet-extension/issues)
