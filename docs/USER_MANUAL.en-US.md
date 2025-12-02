# MarkdownMonkey User Manual

> Version: 0.3.0  
> Updated: 2025-12-02

---

## 📖 Table of Contents

1. [Quick Start](#quick-start)
2. [Editing Features](#editing-features)
3. [Navigation & Organization](#navigation--organization)
4. [Search](#search)
5. [AI Features](#ai-features)
6. [Export](#export)
7. [Shortcuts](#shortcuts)
8. [Advanced Features](#advanced-features)
9. [FAQ](#faq)

---

## Quick Start

### Installation & Launch

1. Download and install MarkdownMonkey.
2. Double-click to run.
3. Start editing your Markdown documents.

### Interface Layout

```
┌─────────────────────────────────────────────────┐
│  [Menu]  New Open Save Export AI Settings ...   │
├──────────┬──────────────────────┬───────────────┤
│          │                      │               │
│ Sidebar  │    ✏️ Editor         │  👁️ Preview   │
│ Outline/ │    (CodeMirror 6)   │  (Live Render)│
│ FileTree │                      │               │
│ [Resize] │                      │               │
│          │                      │               │
└──────────┴──────────────────────┴───────────────┘
│  [Status]  Words: 1234  Chars: 5678  Reading... │
└─────────────────────────────────────────────────┘
```

### Three Ways to Start

1. **Single File**: Click `New` or `Open`.
2. **Drag & Drop**: Drag a `.md` file into the window.
3. **Open Folder**: Click `Open Folder` to browse files in sidebar.

---

## Editing Features

### ✍️ CodeMirror 6 Editor

- **Syntax Highlighting**: Full Markdown support.
- **Performance**: Optimized for large files.
- **Cross-platform**: Consistent experience on Windows/macOS/Linux.

### 📝 Markdown Support

Supports standard Markdown syntax:

- **Bold** (`**text**`), _Italic_ (`*text*`), ~~Strikethrough~~
- Headers (`# H1` to `###### H6`)
- Lists (ordered/unordered), Blockquotes
- Links, Images, Code Blocks, Tables
- Mermaid Diagrams

### 🎨 Editor Enhancements

- **Zoom**: `Ctrl+=` / `Ctrl+-` / `Ctrl+0`
- **Word Wrap**: `Alt+Z`
- **Line Numbers**: `Ctrl+Shift+L`
- **Focus Mode**: `F11` (Hide sidebar)

### 🖼️ Image Manager (New in v0.3.0)

- **Unified Management**: View all images in the document.
- **Grid View**: Thumbnails for easy browsing.
- **Compression**: Compress local images with one click (Low/Medium/High quality).
- **Access**: Click `🖼️ Images` in the toolbar.

### 📊 Table Editor (New in v0.3.0)

- **Visual Editing**: Excel-style interface.
- **Easy Actions**: Add/Delete rows and columns.
- **Auto-formatting**: Automatically aligns Markdown tables on save.
- **Access**: Place cursor inside a table and click `📊 Table`.

### 📱 Responsive Layout (New in v0.3.0)

- **Desktop**: 3-column layout (Sidebar + Editor + Preview).
- **Tablet**: Compact 2-column layout.
- **Mobile**: Single column with bottom switcher (Editor/Preview).

---

## Navigation & Organization

### 📑 Tabs

- **Multi-tab**: Open multiple files.
- **Switch**: Click tab or use `Ctrl+Tab`.
- **Close**: Click `×` or `Ctrl+W`.
- **Context Menu**: Close Others, Close Right, Copy Path.

### 📂 Outline

- Auto-generated TOC from headers.
- Click to jump to section.
- Resizable sidebar.

### 🌳 File Tree

- Browse workspace files.
- Create/Rename/Delete files.
- Drag & Drop support.

---

## Search

### 🔍 In-Document

- `Ctrl+F` to open.
- Support Regex, Case-insensitive.
- Highlight matches in Editor and Preview.
- Replace / Replace All.

### 🌐 Global Search

- `Ctrl+Shift+F` to open.
- Scan all Markdown files in the current workspace.

---

## AI Features

### 🤖 Supported Providers

1. **OpenAI Compatible**: OpenAI, DeepSeek, Kimi, Qwen, etc.
2. **Claude**: Anthropic models.
3. **Ollama**: Local offline models (Free).

### 💬 AI Chat

- **Open**: Click `AI Chat` in toolbar.
- **Features**: Streaming response, context-aware, export chat.
- **Window**: Minimize, drag, persist position.

### ⚡ Context Actions

- Select text -> Right click.
- **Continue**: AI continues writing.
- **Rewrite**: Improve style or grammar.
- **Translate**: Translate to target language.
- **Summarize**: Summarize selected text.

---

## Export

### 📤 Export HTML

- Converts Markdown to HTML with styles and highlighting.
- Includes Mermaid diagrams.

### 📄 Export PDF

- High-quality PDF generation.
- Preserves layout and syntax highlighting.

---

## Shortcuts

| Action          | Shortcut            |
| --------------- | ------------------- |
| New File        | `Ctrl+N`            |
| Open File       | `Ctrl+O`            |
| Save            | `Ctrl+S`            |
| Find            | `Ctrl+F`            |
| Global Search   | `Ctrl+Shift+F`      |
| Command Palette | `Ctrl+Shift+P`      |
| Focus Mode      | `F11`               |
| Word Wrap       | `Alt+Z`             |
| Zoom In/Out     | `Ctrl+=` / `Ctrl+-` |
| Bold            | `Ctrl+B`            |
| Italic          | `Ctrl+I`            |
| Inline Code     | `Ctrl+\``           |

> Tip: Click `⌨️ Shortcuts` in the toolbar for a full list.

---

## Advanced Features

### ⚡ Performance

- **Debounce**: Optimized auto-save (2s) and preview updates (300ms).
- **Large File Detection**: Warnings for files > 5MB; Confirmation for > 10MB.

### 🔐 Security

- API Keys stored in OS Keyring.
- Sandbox file access (Home/Desktop).

### 🌍 Internationalization

- Support English (`en-US`) and Chinese (`zh-CN`).
- Switch in Settings.

---

## FAQ

**Q: Is it free?**
A: Yes, MarkdownMonkey is free and open source. AI API costs depend on the provider.

**Q: Where are my settings saved?**
A: Settings are persisted locally using `@tauri-apps/plugin-store`.

**Q: Can I use offline AI?**
A: Yes, configure Ollama in Settings.

---

**Happy Writing with MarkdownMonkey!** 🐵✨
