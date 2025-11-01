# L.O.U. (Look, Outline, Unpack) - Eyes on the web

<p align="center"><img src="/resources/LouIcon.png" width="250" /></p>

LOU is a Chrome Extension designed to help visually impaired users **understand web content more easily** — including **text, images, and visual elements**. It provides smart accessibility features that enhance clarity, comprehension, and comfort while browsing the web.

## ✨ Features
- **Text-to-Speech (TTS)** — Reads out a webpage.
- **Image Description** — Describes images that lack alt text or captions, most relevant that illustrate the main topic of the webpage.
- **Smart Summarizer** — Summarizes long articles or pages into concise, spoken-friendly overviews, understanding and focusing on the main content of the webpage.
- **Automatic translator** — Instantly translates web content and reads it in the user’s preferred language. 
- **Keyboard Activation** — Activate Chrome Extension function using a keyboard shortcut.
- **Per-Tab Independence** — Each browser tab has its own instance, allowing users to replay the description separately from each page.
  
## 🧩 Installation

### Step 1: Enable Gemini Nano and Prompt API

1. Open Chrome and navigate to `chrome://flags/#optimization-guide-on-device-model`
2. Select "Enabled BypassPerfRequirement"
3. Go to `chrome://flags/#prompt-api-for-gemini-nano`
4. Select "Enabled"
5. Go to  `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
6. Select "Enabled"
7. Relaunch Chrome

### Step 2: Install LOU Extension

1. Clone the repository:
   ```bash
   git clone https://github.com/michisco/LOU-Eyes-on-the-web.git
   ```
2. Open Chrome Dev/Canary
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the cloned `LOU` directory
7. The extension should now appear in your Chrome toolbar

## ⚙️ How It Works

LOU uses Chrome's built-in Gemini Nano AI to understand and summarize text and image content, preserving meaning and context. To activate, the extension must use the keyboard shortcut `CTRL+Shift+Y` / `CMD+Shift+Y`. In the extension:
1. Works on any webpage — that includes readable text content (e.g. `body.innertext`) and relevant images like a blog/article page, or email. 
2. When requesting an AI feature, the tab waits for the result before continuing, not interrupted by other tasks or tabs.
3. Each browser tab has an independent response from Gemini Nano AI.
4. Recognizes the language used in the webpage and translates it into the user’s preferred language, automatically.
5. Can possibly replay the AI response speech and stop it anytime using the keyboard shortcut `CTRL+Shift+Y` / `CMD+Shift+Y`.

## 🔒 Privacy & Security

- 100% offline processing using Chrome's built-in Gemini Nano
- No data sent to external servers
- No tracking or data collection
- Complete privacy protection for all users

## 🛠️ Tech Stack

- Prompt API
- Translator API
- Language Detector API
- Web Speech API
