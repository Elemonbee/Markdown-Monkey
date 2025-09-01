# MarkdownMonkey

A Markdown editor built with Tauri (Rust) + React/TypeScript.

- Live preview with code highlighting
- Split view with draggable ratio
- Outline panel and file tree
- AI helpers (OpenAI-compatible / Claude / DeepSeek / Kimi / OpenRouter / Ollama)
- Local history snapshots and auto save

[中文使用说明](README.zh-CN.md)

> This project is part of the Vibe Coding initiative.

## Badges

- Latest release: ![release](https://img.shields.io/github/v/release/Elemonbee/Markdown-Monkey?display_name=tag)
- Downloads: ![downloads](https://img.shields.io/github/downloads/Elemonbee/Markdown-Monkey/total)

## Dev

```
pnpm install
pnpm tauri dev
```

## Build

```
pnpm tauri build
```

## Features

- Editor: CodeMirror + Markdown extensions
- Preview: marked + DOMPurify + highlight.js
- File: open/save, open folder (recursive), paste image to local dir, file tree & tabs
- Search/Replace: regex, highlight in editor/preview
- AI: right-click actions, chat window (minimize/drag/persist position), provider/model switch, SSE streaming
- Persistence: @tauri-apps/plugin-store

## Usage
- Open file: Click "Open" or drag a `.md` into the window
- Open folder: Click "Open Folder", the file tree lists `.md` files
- Context menu: Select text in editor then right-click to use AI actions
- Outline: Toggle "Show Outline", jump to headers, drag width
- Search/Replace: Toggle panel, supports regex and highlight in editor/preview
- Export: Export HTML or PDF (client-side)

## Screenshots

![editor](assets/screenshot-editor.png)
![ai-chat](assets/screenshot-ai-chat.png)

## Shortcuts
- Ctrl+O: Open file
- Ctrl+S: Save
- Ctrl+P: (planned) Quick open
- Ctrl+Shift+F: (planned) Global search

## Internationalization
Chinese (zh-CN) and English (en-US) strings are prepared in `src/i18n.ts`. The UI reads `ui_language` from settings (persisted in store).

## License
MIT
