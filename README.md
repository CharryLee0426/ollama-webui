# Ollama WebUI

## 1. Introduction

Ollama WebUI is a lightweight, local web interface for the [Ollama](https://ollama.com) language model server. It provides a chat-like UI for interacting with your locally hosted LLM, featuring:
  - Real-time streaming responses
  - Optional “thinking” progress display
  - Markdown rendering with syntax highlighting for code blocks
  - Easy copy-to-clipboard for both thinking snippets and final responses

## 2. Tech Stack

- Next.js 13 (App Router)
- React (with Hooks & client components)
- TypeScript
- Tailwind CSS
- next-themes (light/dark/system theming)
- react-markdown & react-syntax-highlighter (Prism)
- Lucide React icons
- Local Ollama server (HTTP API at `http://localhost:11434`)

## 3. App Structure

```
src/
├── app/
│   ├── layout.tsx         Root HTML layout & global ThemeProvider
│   ├── page.tsx           Main chat UI (client component)
│   └── api/chat/route.ts  Server route proxying to local Ollama API
├── components/
│   ├── chat-container.tsx Scrollable chat history with auto-scroll logic
│   ├── input-form.tsx     User input textarea & send button
│   ├── message-item.tsx   Renders messages (Markdown, code, timer, thinking)
│   ├── navbar.tsx         Top bar with model dropdown & theme toggle
│   ├── mode-toggle.tsx    Light/dark/system theme selector
│   └── theme-provider.tsx next-themes wrapper
├── lib/
│   └── api.ts             Client helper for fetching available models
├── types/
│   └── index.ts           Shared TypeScript interfaces
```

## 4. How to Run

1. Clone the repo:
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Ensure Ollama LLM server is running locally on port 11434:
   ```bash
   ollama serve
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser at `http://localhost:3000`.

**Production**:
```bash
npm run build
npm start
```

> The UI assumes a streaming API at `http://localhost:11434/api/chat`. Make sure your local Ollama instance is available before using the chat.
