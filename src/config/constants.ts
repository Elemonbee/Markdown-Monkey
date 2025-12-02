/**
 * 应用常量配置 / Application constants configuration
 */

// 文件大小限制 / File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILE_SIZE_WARNING = 5 * 1024 * 1024 // 5MB 警告阈值 / 5MB warning threshold

// 内存限制 / Memory limits
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024 // 单个文档 5MB / Single document 5MB
export const MAX_TOTAL_MEMORY = 20 * 1024 * 1024 // 总内存 20MB / Total memory 20MB

// 自动保存 / Auto save
export const AUTO_SAVE_DELAY = 3000 // 3秒 / 3 seconds
export const HISTORY_INTERVAL = 60000 // 60秒 / 60 seconds
export const MAX_HISTORY_COUNT = 20

// 性能优化 / Performance optimization
export const SCROLL_THROTTLE = 16 // ~60fps
export const SEARCH_DEBOUNCE = 300 // 300ms
export const MERMAID_CACHE_SIZE = 50
export const MERMAID_CACHE_AGE = 5 * 60 * 1000 // 5分钟 / 5 minutes

// UI 配置 / UI configuration
export const DEFAULT_EDITOR_FONT_SIZE = 16
export const DEFAULT_PREVIEW_FONT_SIZE = 16
export const MIN_FONT_SIZE = 10
export const MAX_FONT_SIZE = 28
export const DEFAULT_OUTLINE_WIDTH = 280
export const MIN_OUTLINE_WIDTH = 200
export const MAX_OUTLINE_WIDTH = 500

// AI 配置 / AI configuration
export const DEFAULT_TEMPERATURE = 0.7
export const MIN_TEMPERATURE = 0
export const MAX_TEMPERATURE = 2
export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant for markdown writing.'

// 提供商默认配置 / Provider default configuration
export const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: 'https://api.openai.com',
    model: 'gpt-4o-mini',
  },
  claude: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-latest',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  kimi: {
    baseUrl: 'https://api.moonshot.cn',
    model: 'moonshot-v1-8k',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o',
  },
  ollama: {
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3',
  },
}

// 欢迎文本 / Welcome text
export const INTRO_ZH = `# MarkdownMonkey 使用说明

欢迎使用 MarkdownMonkey！这是一个基于 Tauri + React/TypeScript 的轻量级 Markdown 桌面编辑器。

## 功能概览
- 左侧编辑，右侧预览（同步滚动）
- 代码高亮与 XSS 过滤
- 大纲面板与文件树（多标签）
- 搜索/替换（正则、编辑区/预览高亮）
- AI 助手：右键动作、对话窗口（可最小化/拖拽/记忆位置），支持多 Provider/Model 与流式输出
- 自动保存与本地历史快照
- 导出 HTML / PDF

## 快速开始
- 打开文件：点击顶部"打开"或拖拽 .md 文件到窗口
- 打开文件夹：点击"打开文件夹"，左侧列出该目录内的 Markdown 文件
- 显示大纲：点击"显示大纲"按钮，可从标题快速跳转
- 搜索替换：点击"搜索/替换"，支持正则与高亮
- 使用 AI：选中编辑区文本后右键，选择需要的 AI 动作；或点击"AI 对话"与 AI 交互
- 导出：点击"导出HTML/导出PDF"

祝你写作愉快！`

export const INTRO_EN = `# MarkdownMonkey Quick Guide

Welcome to MarkdownMonkey — a lightweight desktop Markdown editor built with Tauri + React/TypeScript.

## Highlights
- Edit on the left, live preview on the right (synced scrolling)
- Code highlighting & XSS sanitization
- Outline & file tree (multi‑tabs)
- Search/Replace (regex; highlight in editor & preview)
- AI Assistant: context actions and chat (minimize/drag/persist), multi providers/models with streaming
- Auto‑save & local history snapshots
- Export to HTML / PDF

## Quick Start
- Open file: Top "Open" or drag a .md file into the window
- Open folder: "Open Folder" to list Markdown files on the left
- Outline: toggle "Show Outline" and jump by headings
- Search/Replace: open the toolbar; regex & highlights supported
- Use AI: select text and right‑click actions; or open "AI Chat"
- Export: "Export HTML / Export PDF"

Happy writing!`

// 快捷键配置 / Keyboard shortcuts configuration
export const SHORTCUTS = {
  NEW_FILE: 'Ctrl+N',
  OPEN_FILE: 'Ctrl+O',
  SAVE_FILE: 'Ctrl+S',
  SEARCH: 'Ctrl+F',
  GLOBAL_SEARCH: 'Ctrl+Shift+F',
  COMMAND_PALETTE: 'Ctrl+Shift+P',
  QUICK_OPEN: 'Ctrl+P',
  FOCUS_MODE: 'F11',
  TOGGLE_WRAP: 'Alt+Z',
  ZOOM_IN: 'Ctrl+=',
  ZOOM_OUT: 'Ctrl+-',
  ZOOM_RESET: 'Ctrl+0',
  BOLD: 'Ctrl+B',
  ITALIC: 'Ctrl+I',
  INLINE_CODE: 'Ctrl+`',
  TOGGLE_LINE_NUMBERS: 'Ctrl+Shift+L',
}
