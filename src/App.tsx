import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type React from 'react'
import './App.css'

// 扩展 window 类型定义 / Extend window type definitions
declare global {
  interface Window {
    __preview_cleanup?: Map<string, () => void>
  }
}
import { t } from './i18n'
import mermaid from 'mermaid'
import hljs from 'highlight.js'
import { getVersion as tauriGetVersion } from '@tauri-apps/api/app'
import 'highlight.js/styles/github-dark.css'
import { Store } from '@tauri-apps/plugin-store'
const monkeyIcon = new URL('../assets/icon.svg', import.meta.url).href
import { open, save, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import { listen } from '@tauri-apps/api/event'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { EditorSelection, RangeSetBuilder, StateField } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import Settings_modal from './components/SettingsModal'
import Context_menu from './components/ContextMenu'
import Ai_result_modal from './components/AiResultModal'
// import Outline_modal from './components/outline_modal' / Import statement for Outline component (currently commented)
import Ai_chat_modal from './components/AiChatModal'
import { usePreviewManager } from './hooks/usePreviewManager'
import CommandPalette from './components/CommandPalette'
import PreviewArea from './components/PreviewArea'
import { TabBar } from './components/TabBar'
import { ImageManager } from './components/ImageManager'
import { useImageManager } from './hooks/useImageManager'
import { TableEditor } from './components/TableEditor'
import { detectTableAtCursor } from './utils/tableParser'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'

// 性能优化常量 / Performance optimization constants
const PERF_CONSTANTS = {
  AUTO_SAVE_DELAY: 2000, // 自动保存延迟 (ms) / Auto-save delay
  PREVIEW_UPDATE_DELAY: 300, // 预览更新延迟 (ms) / Preview update delay
  LARGE_FILE_WARNING_SIZE: 5 * 1024 * 1024, // 5MB
  LARGE_FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
} as const

/**
 * App
 * 应用主组件：左侧 Markdown 编辑，右侧 HTML 预览（含代码高亮与 XSS 清理）
 * Main component: Markdown editor on left, HTML preview on the right (with syntax highlighting and XSS sanitization)
 */
const INTRO_ZH = `# MarkdownMonkey 使用说明

欢迎使用 MarkdownMonkey！这是一个基于 Tauri + React/TypeScript 的轻量级 Markdown 桌面编辑器。

## 功能概览
- 左侧编辑，右侧预览（同步滚动）
- 代码高亮与 XSS 过滤
- 大纲面板与文件树（多标签）
- 搜索/替换（正则、编辑区/预览高亮）
- AI 助手：右键动作、对话窗口（可最小化/拖拽/记忆位置），支持多 Provider/Model 与流式输出
- 📊 **表格编辑器**：光标在表格内时可视化编辑，支持添加/删除行列
- 🖼️ **图片管理器**：统一管理文档内的所有图片
- 📱 **响应式布局**：支持移动端/平板/桌面多种屏幕尺寸
- 自动保存与本地历史快照（优化后 2 秒延迟）
- 导出 HTML / PDF

## 快速开始
- 打开文件：点击顶部"打开"或拖拽 .md 文件到窗口
- 打开文件夹：点击"打开文件夹"，左侧列出该目录内的 Markdown 文件
- 显示大纲：点击"显示大纲"按钮，可从标题快速跳转
- 搜索替换：点击"搜索/替换"，支持正则与高亮
- 使用 AI：选中编辑区文本后右键，选择需要的 AI 动作；或点击"AI 对话"与 AI 交互
- 编辑表格：将光标放在表格内，点击"📊 表格"按钮
- 管理图片：点击"🖼️ 图片"查看文档中的所有图片
- 导出：点击"导出HTML/导出PDF"

祝你写作愉快！`

const INTRO_EN = `# MarkdownMonkey Quick Guide

Welcome to MarkdownMonkey — a lightweight desktop Markdown editor built with Tauri + React/TypeScript.

## Highlights
- Edit on the left, live preview on the right (synced scrolling)
- Code highlighting & XSS sanitization
- Outline & file tree (multi‑tabs)
- Search/Replace (regex; highlight in editor & preview)
- AI Assistant: context actions and chat (minimize/drag/persist), multi providers/models with streaming
- 📊 **Table Editor**: Visual table editing with add/delete rows/columns
- 🖼️ **Image Manager**: Manage all images in your document
- 📱 **Responsive Layout**: Optimized for mobile/tablet/desktop
- Auto‑save & local history snapshots (optimized 2s delay)
- Export to HTML / PDF

## Quick Start
- Open file: Top "Open" or drag a .md file into the window
- Open folder: "Open Folder" to list Markdown files on the left
- Outline: toggle "Show Outline" and jump by headings
- Search/Replace: open the toolbar; regex & highlights supported
- Use AI: select text and right‑click actions; or open "AI Chat"
- Edit tables: Place cursor in table and click "📊 Table" button
- Manage images: Click "🖼️ Images" to view all document images
- Export: "Export HTML / Export PDF"

Happy writing!`

function App() {
  const [markdown_text, set_markdown_text] = useState<string>('')
  const preview_ref = useRef<HTMLDivElement | null>(null)
  const store_ref = useRef<Store | null>(null)
  const [api_base_url, set_api_base_url] = useState<string>('https://api.openai.com')
  const [api_key, set_api_key] = useState<string>('')
  const [current_file_path, set_current_file_path] = useState<string>('')
  const [provider, set_provider] = useState<string>('openai')
  const [model, set_model] = useState<string>('gpt-4o-mini')
  const [system_prompt, set_system_prompt] = useState<string>(
    'You are a helpful assistant for markdown writing.'
  )
  const [temperature, set_temperature] = useState<number>(0.7)

  // Preview manager hook (replaces rendered_html state and compute_rendered_html function) / 预览管理钩子（替换 rendered_html 状态和 compute_rendered_html 函数）
  const { rendered_html, render_markdown, block_map } = usePreviewManager()
  const [show_settings, set_show_settings] = useState<boolean>(false)
  const [split_ratio, set_split_ratio] = useState<number>(0.5)
  const container_ref = useRef<HTMLDivElement | null>(null)
  const is_dragging_ref = useRef<boolean>(false)
  const [editor_font_size, set_editor_font_size] = useState<number>(16)
  const [preview_font_size, set_preview_font_size] = useState<number>(16)
  const [ui_theme, set_ui_theme] = useState<'dark' | 'light' | 'system'>('dark')
  const [ui_language, set_ui_language] = useState<string>('zh-CN')
  const media_query_ref = useRef<MediaQueryList | null>(null)
  const [ai_enabled, set_ai_enabled] = useState<boolean>(false)
  // 是否启用编辑区与预览区的同步滚动 / Whether to enable synchronized scrolling between editor and preview
  const [sync_scroll, set_sync_scroll] = useState<boolean>(true)
  const [status_stats, set_status_stats] = useState<{
    chars: number
    words: number
    minutes: number
  }>({ chars: 0, words: 0, minutes: 0 })
  const [ai_last_scope, set_ai_last_scope] = useState<'selection' | 'document' | 'unknown'>(
    'unknown'
  )
  const [show_ai_result, set_show_ai_result] = useState<boolean>(false)
  const [ai_loading, set_ai_loading] = useState<boolean>(false)
  const [ai_title, set_ai_title] = useState<string>('AI Result')
  const [ai_result_text, set_ai_result_text] = useState<string>('')
  const [ai_elapsed_ms, set_ai_elapsed_ms] = useState<number>(0)
  const abort_ref = useRef<boolean>(false)
  const unsubscribe_ref = useRef<() => void>(() => {})
  const last_prompt_ref = useRef<string>('')
  const autosave_timer_ref = useRef<ReturnType<typeof setInterval> | null>(null)
  const [history_enabled] = useState<boolean>(true)
  const [history_interval_ms] = useState<number>(15000)
  const [show_outline, set_show_outline] = useState<boolean>(false)
  const [outline_items, set_outline_items] = useState<
    Array<{ level: number; text: string; line: number }>
  >([])
  const [outline_width, set_outline_width] = useState<number>(280)
  const [ai_actions_enabled, set_ai_actions_enabled] = useState<string[]>([
    'continue_selection',
    'continue_document',
    'rewrite_selection',
    'translate_zh_selection',
    'translate_en_selection',
    'summary_selection',
    'summary_document',
  ])
  const [ai_custom_templates, set_ai_custom_templates] = useState<
    Array<{
      id: string
      title: string
      body: string
      scope: 'selection' | 'document'
      enabled: boolean
      vars?: { lang?: string; style?: string }
    }>
  >([])
  const [ctx_open, set_ctx_open] = useState<boolean>(false)
  const [ctx_pos, set_ctx_pos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const cm_view_ref = useRef<EditorView | null>(null)
  const [ctx_has_selection, set_ctx_has_selection] = useState<boolean>(false)
  const [recent_files, set_recent_files] = useState<string[]>([])
  const [recent_ai_actions, set_recent_ai_actions] = useState<Array<{ id: string; title: string }>>(
    []
  )
  const [show_ai_chat, set_show_ai_chat] = useState<boolean>(false)
  const [chat_reset_tick, set_chat_reset_tick] = useState<number>(0)
  const [save_status, set_save_status] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [last_saved_time, set_last_saved_time] = useState<Date | null>(null)
  const [show_command_palette, set_show_command_palette] = useState<boolean>(false)
  const [show_shortcuts, set_show_shortcuts] = useState<boolean>(false)
  const [focus_mode, set_focus_mode] = useState<boolean>(false)
  const [show_focus_hint, set_show_focus_hint] = useState<boolean>(false)
  const [show_search, set_show_search] = useState<boolean>(false)
  const [search_query, set_search_query] = useState<string>('')
  const [replace_query, set_replace_query] = useState<string>('')
  const [search_regex, set_search_regex] = useState<boolean>(false)
  const [search_case_i, set_search_case_i] = useState<boolean>(true)
  const [search_idx, set_search_idx] = useState<number>(-1)
  const [search_total, set_search_total] = useState<number>(0)
  const [side_tab, set_side_tab] = useState<'outline' | 'files'>('outline')
  const [workspace_root, set_workspace_root] = useState<string>('')
  const [file_list, set_file_list] = useState<string[]>([])
  const [file_tree_fold, set_file_tree_fold] = useState<Record<string, boolean>>({})
  const [open_tabs, set_open_tabs] = useState<string[]>([])
  const [tab_ctx_open, set_tab_ctx_open] = useState<boolean>(false)
  const [tab_ctx_pos, set_tab_ctx_pos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [tab_ctx_path, set_tab_ctx_path] = useState<string>('')
  const [untitled_counter, set_untitled_counter] = useState<number>(1) // 用于生成未命名文档的编号 / Counter for generating untitled document IDs
  const [untitled_docs, set_untitled_docs] = useState<Record<string, string>>({}) // 保存未命名文档的内容 / Store untitled documents content
  // 是否启用编辑器自动换行 / Whether to enable automatic line wrapping in the editor
  const [wrap_enabled, set_wrap_enabled] = useState<boolean>(false)
  // 是否显示行号 / Whether to display line numbers
  const [line_numbers_enabled, set_line_numbers_enabled] = useState<boolean>(true)
  // 预览滚动同步的块映射（按 marked 顶层块）已由 usePreviewManager 管理 / Block mapping for preview scroll sync (by marked top-level blocks) is now managed by usePreviewManager
  // 每个组件实例的唯一ID / Unique ID for each component instance
  const instance_id = useRef(Math.random().toString(36).substr(2, 9))
  // 滚动同步的实例级锁与令牌，避免两个方向相互触发导致抖动 / Instance-level lock and token for scroll sync to prevent bidirectional triggering causing jitter
  const scroll_lock_ref = useRef<{ active: boolean; token: number }>({ active: false, token: 0 })
  // 保持最新状态的引用，避免重复创建扩展导致串扰 / Reference to latest state to avoid interference from repeatedly created extensions
  const sync_scroll_ref = useRef<boolean>(true)
  useEffect(() => {
    sync_scroll_ref.current = !!sync_scroll
  }, [sync_scroll])
  const current_path_ref = useRef<string>('')
  useEffect(() => {
    current_path_ref.current = current_file_path || ''
  }, [current_file_path])
  // 各文件的滚动状态（按比例保存，避免高度变化） / Scroll state for each file (saved as ratios to avoid height changes)
  const scroll_state_ref = useRef<Record<string, { editorRatio: number; previewRatio: number }>>({})
  // 当前标签页的预览容器引用 / Reference to the preview container of the current tab
  const local_preview_ref = useRef<HTMLDivElement | null>(null)
  // 预览外层容器引用（用于监听滚动事件） / Reference to the outer preview container (used for listening to scroll events)
  const preview_pane_ref = useRef<HTMLDivElement | null>(null)
  // 全局搜索（跨文件）状态
  const [show_global_search, set_show_global_search] = useState<boolean>(false)
  const [global_query, set_global_query] = useState<string>('')
  const [global_regex, set_global_regex] = useState<boolean>(false)
  const [global_case_i, set_global_case_i] = useState<boolean>(true)
  const [global_searching, set_global_searching] = useState<boolean>(false)
  const [global_results, set_global_results] = useState<
    Array<{ path: string; lineNo: number; from: number; to: number; preview: string }>
  >([])
  // const auto_refresh_timer_ref = useRef<any>(null) / Auto refresh timer reference (currently unused)

  // 响应式布局状态 / Responsive layout state
  const [is_mobile, set_is_mobile] = useState<boolean>(false)
  const [mobile_view, set_mobile_view] = useState<'editor' | 'preview'>('editor')
  const [show_mobile_sidebar, set_show_mobile_sidebar] = useState<boolean>(false)
  const [show_image_manager, set_show_image_manager] = useState<boolean>(false)
  const [show_table_editor, set_show_table_editor] = useState<boolean>(false)
  const [editing_table_text, set_editing_table_text] = useState<string>('')
  const [editing_table_range, set_editing_table_range] = useState<{
    startLine: number
    endLine: number
  } | null>(null)

  // 图片管理器 / Image manager
  const imageManager = useImageManager(markdown_text, current_file_path)

  useEffect(() => {
    const checkMobile = () => {
      set_is_mobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 应用版本号 / Application version number
  const [app_version, set_app_version] = useState<string>('')
  useEffect(() => {
    ;(async () => {
      try {
        const v = await tauriGetVersion()
        set_app_version(v)
      } catch {
        set_app_version('dev')
      }
    })()
  }, [])

  /**
   * file_display_name
   * 从完整路径中提取显示名称（文件名）。
   */
  function file_display_name(p: string): string {
    if (!p) return ''
    // 处理未命名文档 / Handle untitled documents
    if (p.startsWith('untitled:')) {
      const num = p.replace('untitled:', '')
      return `Untitled-${num}`
    }
    // 先尝试以 / 或 \\ 分割 / Try to split by / or \\ first
    const seg = p.split(/[/\\]/)
    const tail = seg[seg.length - 1]
    if (tail) return tail
    // 兜底：用正则去掉前缀目录 / Fallback: use regex to remove prefix directory
    return p.replace(/^[\s\S]*[\\/]/, '')
  }

  // 确保当前打开文件总在标签栏里，且避免把工作区路径误当作标签 / Ensure current file is always in tab bar and avoid mistaking workspace path as a tab
  useEffect(() => {
    // 如果是真实文件路径 / If it's a real file path
    if (current_file_path && /\.(md|markdown)$/i.test(current_file_path)) {
      set_open_tabs((prev) => {
        const cleaned = prev.filter((t) => t && t !== workspace_root)
        if (cleaned.includes(current_file_path)) return cleaned
        return [...cleaned, current_file_path]
      })
    }
    // 如果是未命名文档（以 untitled: 开头） / If it's an untitled document (starting with untitled:)
    else if (current_file_path && current_file_path.startsWith('untitled:')) {
      set_open_tabs((prev) => {
        if (prev.includes(current_file_path)) return prev
        return [...prev, current_file_path]
      })
    }
  }, [current_file_path, workspace_root])

  // 全局快捷键：标签切换和关闭 / Global keyboard shortcuts for tab navigation and closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Tab: 切换到下一个标签 / Ctrl+Tab: Switch to next tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        const currentIndex = open_tabs.indexOf(current_file_path)
        if (currentIndex >= 0 && open_tabs.length > 1) {
          const nextIndex = (currentIndex + 1) % open_tabs.length
          switch_to_tab(open_tabs[nextIndex])
        }
      }

      // Ctrl+Shift+Tab: 切换到上一个标签 / Ctrl+Shift+Tab: Switch to previous tab
      if (e.ctrlKey && e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        const currentIndex = open_tabs.indexOf(current_file_path)
        if (currentIndex >= 0 && open_tabs.length > 1) {
          const prevIndex = (currentIndex - 1 + open_tabs.length) % open_tabs.length
          switch_to_tab(open_tabs[prevIndex])
        }
      }

      // Ctrl+W: 关闭当前标签 / Ctrl+W: Close current tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        if (current_file_path) {
          close_tab(current_file_path)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open_tabs, current_file_path])

  /**
   * switch_to_tab
   * 切换到指定标签（文件路径）。若已是当前文件则不重复读取。
   */
  async function switch_to_tab(path: string) {
    if (!path) return
    if (current_file_path === path) return

    // 保存当前文件的滚动位置 / Save the scroll position of the current file
    if (current_file_path) {
      const v = cm_view_ref.current
      const pc = preview_pane_ref.current
      if (v && pc) {
        const s = v.scrollDOM
        const editorRatio = s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight)
        const previewRatio = pc.scrollTop / Math.max(1, pc.scrollHeight - pc.clientHeight)
        const key = current_file_path
        scroll_state_ref.current[key] = { editorRatio, previewRatio }
      }
    }

    // 保存当前未命名文档的内容 / Save the content of the current untitled document
    if (current_file_path && current_file_path.startsWith('untitled:')) {
      set_untitled_docs((prev) => ({
        ...prev,
        [current_file_path]: markdown_text,
      }))
    }

    // 如果是未命名文档，从内存中读取 / If it's an untitled document, read from memory
    if (path.startsWith('untitled:')) {
      const content = untitled_docs[path] || ''
      set_markdown_text(content)
      set_current_file_path(path)
      set_save_status('unsaved')
      set_last_saved_time(null)

      // 恢复滚动位置 / Restore scroll position
      requestAnimationFrame(() => {
        setTimeout(() => {
          const v = cm_view_ref.current
          const pc = preview_pane_ref.current
          if (!v || !pc) return

          const state = scroll_state_ref.current[path]
          if (state) {
            scroll_lock_ref.current.active = true
            const s = v.scrollDOM
            s.scrollTop = (state.editorRatio || 0) * (s.scrollHeight - s.clientHeight)
            pc.scrollTop = (state.previewRatio || 0) * (pc.scrollHeight - pc.clientHeight)
            setTimeout(() => {
              scroll_lock_ref.current.active = false
            }, 50)
          }
        }, 200)
      })
    } else {
      try {
        const content = await readTextFile(path)
        set_markdown_text(content)
        set_current_file_path(path)
        set_save_status('saved')
        set_last_saved_time(new Date())

        // 恢复滚动位置 / Restore scroll position
        requestAnimationFrame(() => {
          setTimeout(() => {
            const v = cm_view_ref.current
            const pc = preview_pane_ref.current
            if (!v || !pc) return

            const state = scroll_state_ref.current[path]
            if (state) {
              scroll_lock_ref.current.active = true
              const s = v.scrollDOM
              s.scrollTop = (state.editorRatio || 0) * (s.scrollHeight - s.clientHeight)
              pc.scrollTop = (state.previewRatio || 0) * (pc.scrollHeight - pc.clientHeight)
              setTimeout(() => {
                scroll_lock_ref.current.active = false
              }, 50)
            }
          }, 200)
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  /**
   * close_tab
   * 关闭标签；若关闭的是当前标签，则切换到相邻一个标签或清空。
   */
  async function close_tab(path: string) {
    // 如果是未命名文档，清理内存中的内容 / If it's an untitled document, clean up its content in memory
    if (path.startsWith('untitled:')) {
      set_untitled_docs((prev) => {
        const next = { ...prev }
        delete next[path]
        return next
      })
    }

    set_open_tabs((prev) => {
      const idx = prev.indexOf(path)
      const nextTabs = prev.filter((p) => p !== path)
      // 若关闭的是当前标签，切换到相邻一个标签 / If closing the current tab, switch to an adjacent one
      if (current_file_path === path) {
        const fallback =
          idx > 0 ? nextTabs[idx - 1] : nextTabs[idx] || nextTabs[nextTabs.length - 1]
        if (fallback) {
          // 切到 fallback / Switch to fallback
          switch_to_tab(fallback)
        } else {
          // 没有标签了，清空状态 / No tabs left, clear state
          set_current_file_path('')
          set_markdown_text('')
        }
      }
      return nextTabs
    })
  }

  /**
   * apply_theme
   * 根据 ui_theme 应用主题到 html[data-theme]
   */
  function apply_theme(theme: 'dark' | 'light' | 'system') {
    if (theme === 'system') {
      if (!media_query_ref.current) {
        media_query_ref.current = window.matchMedia('(prefers-color-scheme: dark)')
      }
      const is_dark = media_query_ref.current.matches
      document.documentElement.setAttribute('data-theme', is_dark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  /**
   * apply_provider_defaults
   * 根据提供商设置默认 base_url 与 model
   */
  function apply_provider_defaults(p: string) {
    if (p === 'ollama') {
      if (!api_base_url || api_base_url.startsWith('https://'))
        set_api_base_url('http://127.0.0.1:11434')
      if (!model || model === 'gpt-4o-mini') set_model('llama3')
      return
    }
    if (p === 'openai') {
      set_api_base_url('https://api.openai.com')
      if (!model || model === 'llama3') set_model('gpt-4o-mini')
      return
    }
    if (p === 'claude') {
      set_api_base_url('https://api.anthropic.com')
      if (!model) set_model('claude-3-5-sonnet-latest')
      return
    }
  }

  async function open_file_at(path: string) {
    try {
      // 检查文件大小 / Check file size
      try {
        const { stat } = await import('@tauri-apps/plugin-fs')
        const fileInfo = await stat(path)
        const fileSize = fileInfo.size

        const LARGE_FILE_MAX_SIZE = 10 * 1024 * 1024 // 10MB
        const LARGE_FILE_WARNING_SIZE = 5 * 1024 * 1024 // 5MB

        // 大文件警告 / Large file warning
        if (fileSize > LARGE_FILE_MAX_SIZE) {
          const confirmOpen = confirm(
            ui_language === 'en-US'
              ? `This file is ${(fileSize / 1024 / 1024).toFixed(1)}MB. Opening very large files may cause performance issues. Continue?`
              : `该文件大小为 ${(fileSize / 1024 / 1024).toFixed(1)}MB，可能影响性能。是否继续打开？`
          )
          if (!confirmOpen) return
        } else if (fileSize > LARGE_FILE_WARNING_SIZE) {
          console.warn(
            `Large file detected: ${(fileSize / 1024 / 1024).toFixed(1)}MB. Performance may be affected.`
          )
        }
      } catch (error) {
        // 如果文件大小检测失败，继续打开文件
        console.warn('Failed to check file size:', error)
      }

      const content = await readTextFile(path)
      set_markdown_text(content)
      set_current_file_path(path)
      set_open_tabs((prev) => (prev.includes(path) ? prev : [...prev, path]))
      set_save_status('saved')
      set_last_saved_time(new Date())
      // 恢复该文件的滚动位置（按比例） / Restore the scroll position for this file (by ratio)
      requestAnimationFrame(() => {
        setTimeout(() => {
          const v = cm_view_ref.current
          const pc = preview_pane_ref.current
          if (!v || !pc) return

          const key = path
          const state = scroll_state_ref.current[key]
          if (state && (state.editorRatio > 0 || state.previewRatio > 0)) {
            // 暂时禁用滚动同步以避免触发事件 / Temporarily disable scroll sync to avoid triggering events
            scroll_lock_ref.current.active = true

            const s = v.scrollDOM
            const editorScrollTop = (state.editorRatio || 0) * (s.scrollHeight - s.clientHeight)
            const previewScrollTop = (state.previewRatio || 0) * (pc.scrollHeight - pc.clientHeight)

            s.scrollTop = editorScrollTop
            pc.scrollTop = previewScrollTop

            // 恢复锁状态 / Restore lock state
            setTimeout(() => {
              scroll_lock_ref.current.active = false
            }, 50)
          }
        }, 200) // 增加延迟确保 DOM 和内容完全更新 / Increased delay to ensure DOM and content are fully updated
      })
    } catch (e) {
      console.error(e)
    }
  }

  async function handle_open_folder() {
    const opts: OpenDialogOptions = { directory: true, defaultPath: workspace_root || undefined }
    const dir = await open(opts)
    if (typeof dir !== 'string') return
    set_workspace_root(dir)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const paths = await invoke<string[]>('list_md_files', { dir })
      const unique = Array.from(new Set(paths))
      set_file_list(unique.sort())
      if (unique.length === 0)
        console.warn('[handle_open_folder] no markdown files found or access denied in:', dir)
    } catch (e) {
      console.error(e)
      set_file_list([])
    }
    set_side_tab('files')
    set_show_outline(true)
    // 启动自动刷新：每 3s 拉取一次（简单轮询） / Start auto refresh: pull every 3s (simple polling)
    // 切换为文件系统监听：告知后端开始 watch / Switch to file system monitoring: tell backend to start watch
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('watch_start', { dir })
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    render_markdown(markdown_text)
    // 更准确的中英文混排统计： / More accurate statistics for mixed Chinese/English text:
    // 字符：排除空白符 / Characters: exclude whitespace
    const chars = markdown_text.replace(/\s+/g, '').length
    // 词数： / Word count:
    // - 英文按单词分割 / English words are split by word boundaries
    // - 中文/日文/韩文等东亚表意文按字符统计 / Chinese/Japanese/Korean and other East Asian ideographic characters are counted by character
    const englishWords = (markdown_text.match(/[A-Za-z0-9_]+(?:'[A-Za-z0-9_]+)?/g) || []).length
    const cjkChars = (
      markdown_text.match(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g) || []
    ).length
    const words = englishWords + cjkChars
    const minutes = Math.max(1, Math.round(words / 200))
    set_status_stats({ chars, words, minutes })
  }, [markdown_text])

  // 监听后端 fs 事件 → 刷新文件列表 / Listen to backend fs events → refresh file list
  useEffect(() => {
    let unlisten: (() => void) | null = null
    ;(async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event')
        unlisten = await listen('fs:changed', async () => {
          if (!workspace_root) return
          try {
            const { invoke } = await import('@tauri-apps/api/core')
            const paths = await invoke<string[]>('list_md_files', { dir: workspace_root })
            set_file_list(Array.from(new Set(paths)).sort())
          } catch {
            // Ignore error when closing window
          }
        })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      try {
        if (unlisten) unlisten()
      } catch {
        /* ignore */
      }
    }
  }, [workspace_root])

  // 预览命中高亮 / Preview hit highlighting
  useEffect(() => {
    const root = preview_ref.current
    if (!root) return
    // 先清理旧的高亮 / First clean up old highlights
    const olds = root.querySelectorAll('span.mmk-search-hit')
    olds.forEach((el) => {
      const text = document.createTextNode((el as HTMLElement).innerText)
      el.parentNode?.replaceChild(text, el)
    })
    const q = search_query
    if (!q) return
    const isRegex = !!search_regex
    let re: RegExp | null = null
    if (isRegex) {
      try {
        re = new RegExp(q, search_case_i ? 'gi' : 'g')
      } catch {
        re = null
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const hits: Array<Text> = []
    let node: Node | null
    while ((node = walker.nextNode())) {
      const t = node as Text
      if (!t.nodeValue || !t.nodeValue.trim()) continue
      hits.push(t)
    }
    hits.forEach((textNode) => {
      const text = textNode.nodeValue || ''
      const container = document.createDocumentFragment()
      if (re) {
        let last = 0
        let m: RegExpExecArray | null
        re!.lastIndex = 0
        while ((m = re!.exec(text))) {
          const start = m.index
          const end = m.index + m[0].length
          if (start > last) container.appendChild(document.createTextNode(text.slice(last, start)))
          const span = document.createElement('span')
          span.className = 'mmk-search-hit'
          span.textContent = text.slice(start, end)
          container.appendChild(span)
          last = end
          if (m[0].length === 0) re!.lastIndex++
        }
        if (last < text.length) container.appendChild(document.createTextNode(text.slice(last)))
      } else {
        const hay = search_case_i ? text.toLowerCase() : text
        const needle = search_case_i ? q.toLowerCase() : q
        let idx = 0
        while (true) {
          const i = hay.indexOf(needle, idx)
          if (i === -1) break
          if (i > idx) container.appendChild(document.createTextNode(text.slice(idx, i)))
          const span = document.createElement('span')
          span.className = 'mmk-search-hit'
          span.textContent = text.slice(i, i + needle.length)
          container.appendChild(span)
          idx = i + Math.max(1, needle.length)
        }
        if (idx < text.length) container.appendChild(document.createTextNode(text.slice(idx)))
      }
      textNode.parentNode?.replaceChild(container, textNode)
    })
  }, [rendered_html, search_query, search_regex, search_case_i])

  // 解析大纲（支持行首 0-3 空格、尾部可选 #） / Parse outline (supports 0-3 spaces at line start, optional # at end)
  useEffect(() => {
    const lines = markdown_text.split('\n')
    const items: Array<{ level: number; text: string; line: number }> = []
    lines.forEach((line, idx) => {
      const m = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/)
      if (m) {
        items.push({ level: m[1].length, text: m[2].trim(), line: idx })
      }
    })
    set_outline_items(items)
  }, [markdown_text])

  // 自动保存 & 历史快照
  useEffect(() => {
    if (!history_enabled) return
    if (autosave_timer_ref.current) clearInterval(autosave_timer_ref.current)
    autosave_timer_ref.current = setInterval(async () => {
      try {
        if (!store_ref.current) return
        const ts = Date.now()
        const key = `history_${ts}`
        await store_ref.current.set(key, {
          path: current_file_path || '',
          content: markdown_text,
          model,
          provider,
          ts,
        })
        // 仅保留最近 20 条
        const all = await store_ref.current.keys()
        const histories = all.filter(
          (k) => typeof k === 'string' && (k as string).startsWith('history_')
        ) as string[]
        if (histories.length > 20) {
          const sorted = histories.sort()
          const toDelete = sorted.slice(0, histories.length - 20)
          for (const k of toDelete) await store_ref.current.delete(k)
        }
        await store_ref.current.save()
      } catch (e) {
        console.error(e)
      }
    }, history_interval_ms)
    return () => {
      if (autosave_timer_ref.current) clearInterval(autosave_timer_ref.current)
    }
  }, [history_enabled, history_interval_ms, markdown_text, current_file_path, model, provider])

  // 自动保存到文件
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (markdown_text && current_file_path && save_status === 'unsaved') {
        set_save_status('saving')
        try {
          await writeTextFile(current_file_path, markdown_text)
          set_save_status('saved')
          set_last_saved_time(new Date())
        } catch (error) {
          console.error('Auto-save failed:', error)
          set_save_status('unsaved')
        }
      }
    }, PERF_CONSTANTS.AUTO_SAVE_DELAY)

    return () => clearTimeout(timer)
  }, [markdown_text, current_file_path, save_status])

  // 粘贴图片 -> 保存并插入
  useEffect(() => {
    async function on_paste(ev: ClipboardEvent) {
      try {
        if (!current_file_path) return
        const files = ev.clipboardData?.files
        if (!files || files.length === 0) return
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          if (!f.type || !f.type.startsWith('image/')) continue
          const arr = await f.arrayBuffer()
          const { writeFile: writeFsFile, mkdir } = await import('@tauri-apps/plugin-fs')
          const pathSep = current_file_path.includes('\\') ? '\\' : '/'
          const dir = current_file_path.split(/[/\\]/).slice(0, -1).join(pathSep)
          const imagesDir = dir + pathSep + 'images'
          try {
            await mkdir(imagesDir, { recursive: true })
          } catch {
            // Ignore error when creating directory
          }
          const nameSafe = `pasted_${Date.now()}.png`
          const target = imagesDir + pathSep + nameSafe
          await writeFsFile(target, new Uint8Array(arr))
          const rel = `./images/${nameSafe}`
          const md = `![image](${rel})`
          const view = cm_view_ref.current
          if (view) {
            const sel = view.state.selection.main
            view.dispatch({
              changes: { from: sel.from, to: sel.to, insert: md },
              scrollIntoView: true,
            })
          }
        }
      } catch {
        // Ignore error when writing file
      }
    }
    window.addEventListener('paste', on_paste as unknown as EventListener)
    return () => window.removeEventListener('paste', on_paste as unknown as EventListener)
  }, [current_file_path])

  const find_all_matches = useCallback(
    (docText: string): Array<{ from: number; to: number }> => {
      if (!search_query) return []
      try {
        if (search_regex) {
          const flags = search_case_i ? 'gi' : 'g'
          const re = new RegExp(search_query, flags)
          const out: Array<{ from: number; to: number }> = []
          let m: RegExpExecArray | null
          while ((m = re.exec(docText))) {
            out.push({ from: m.index, to: m.index + m[0].length })
            if (m[0].length === 0) re.lastIndex++
          }
          return out
        } else {
          const q = search_case_i ? search_query.toLowerCase() : search_query
          const src = search_case_i ? docText.toLowerCase() : docText
          const out: Array<{ from: number; to: number }> = []
          let idx = 0
          while (true) {
            const i = src.indexOf(q, idx)
            if (i === -1) break
            out.push({ from: i, to: i + q.length })
            idx = i + Math.max(1, q.length)
          }
          return out
        }
      } catch {
        return []
      }
    },
    [search_query, search_regex, search_case_i]
  )

  // 高亮命中：构建装饰
  const searchDecorations: DecorationSet | null = useMemo(() => {
    const view = cm_view_ref.current
    if (!view || !search_query) return null
    const matches = find_all_matches(view.state.doc.toString())
    const builder = new RangeSetBuilder<Decoration>()
    const deco = Decoration.mark({ class: 'mmk-search-hit' })
    matches.forEach((r) => builder.add(r.from, r.to, deco))
    return builder.finish()
  }, [find_all_matches, search_query])

  const searchHighlightField: StateField<DecorationSet> | null = useMemo(() => {
    if (!searchDecorations) return null
    return StateField.define<DecorationSet>({
      create() {
        return searchDecorations
      },
      update(_value) {
        return searchDecorations
      },
      provide: (f) => EditorView.decorations.from(f),
    })
  }, [searchDecorations])

  // 从编辑器滚动 -> 预览滚动（使用 CodeMirror DOM 事件扩展，避免跨实例串扰）
  const editorScrollSyncExt = useMemo(
    () =>
      EditorView.domEventHandlers({
        scroll: (_e, v) => {
          // 检查是否是当前实例的编辑器
          if (!sync_scroll_ref.current) return
          if (v !== cm_view_ref.current) return
          if (scroll_lock_ref.current.active) return

          const myToken = Date.now()
          scroll_lock_ref.current = { active: true, token: myToken }

          // 直接同步，不延迟
          const pc = preview_pane_ref.current
          if (!pc) {
            scroll_lock_ref.current.active = false
            return
          }

          const s = v.scrollDOM
          const ratio = s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight)

          // 保存当前文件的编辑器滚动比例
          const key = current_path_ref.current || `untitled:${untitled_counter}`
          const prevState = scroll_state_ref.current[key] || { editorRatio: 0, previewRatio: 0 }
          scroll_state_ref.current[key] = {
            editorRatio: ratio,
            previewRatio: prevState.previewRatio,
          }

          // 可选：结合块映射做微调
          let targetTop = ratio
          try {
            const cur = v.state.selection.main.from
            const blocks = block_map
            if (blocks && blocks.length) {
              let nearest = blocks[0]
              let mind = Math.abs(cur - nearest.start)
              for (const b of blocks) {
                const d = Math.abs(cur - b.start)
                if (d < mind) {
                  mind = d
                  nearest = b
                }
              }
              const idxRatio = nearest.idx / Math.max(1, blocks.length - 1)
              if (isFinite(idxRatio)) targetTop = targetTop * 0.5 + idxRatio * 0.5
            }
          } catch {
            // Ignore error when finding block map
          }

          pc.scrollTop = targetTop * (pc.scrollHeight - pc.clientHeight)

          // 释放锁
          setTimeout(() => {
            if (scroll_lock_ref.current.token === myToken) {
              scroll_lock_ref.current.active = false
            }
          }, 10)
        },
      }),
    []
  )

  // 根据开关为内容节点设置浏览器原生拼写检查与语言
  // 已移除拼写检查扩展（依赖系统词典，不稳定）。

  function update_search_state(selectFirst: boolean) {
    const view = cm_view_ref.current
    if (!view) return
    const docText = view.state.doc.toString()
    const matches = find_all_matches(docText)
    set_search_total(matches.length)
    if (matches.length === 0) {
      set_search_idx(-1)
      return
    }
    let idx = search_idx
    if (selectFirst || idx < 0 || idx >= matches.length) idx = 0
    const r = matches[idx]
    view.dispatch({ selection: EditorSelection.range(r.from, r.to), scrollIntoView: true })
    set_search_idx(idx)
  }

  function search_next() {
    const view = cm_view_ref.current
    if (!view) return
    const docText = view.state.doc.toString()
    const matches = find_all_matches(docText)
    if (matches.length === 0) {
      set_search_idx(-1)
      set_search_total(0)
      return
    }
    const next = (search_idx + 1 + matches.length) % matches.length
    const r = matches[next]
    view.dispatch({ selection: EditorSelection.range(r.from, r.to), scrollIntoView: true })
    set_search_idx(next)
    set_search_total(matches.length)
  }

  function search_prev() {
    const view = cm_view_ref.current
    if (!view) return
    const docText = view.state.doc.toString()
    const matches = find_all_matches(docText)
    if (matches.length === 0) {
      set_search_idx(-1)
      set_search_total(0)
      return
    }
    const prev = (search_idx - 1 + matches.length) % matches.length
    const r = matches[prev]
    view.dispatch({ selection: EditorSelection.range(r.from, r.to), scrollIntoView: true })
    set_search_idx(prev)
    set_search_total(matches.length)
  }

  function replace_current() {
    const view = cm_view_ref.current
    if (!view) return
    const sel = view.state.selection.main
    const tr = view.state.update({ changes: { from: sel.from, to: sel.to, insert: replace_query } })
    view.dispatch(tr)
    set_markdown_text(view.state.doc.toString())
    update_search_state(false)
  }

  function replace_all() {
    const view = cm_view_ref.current
    if (!view || !search_query) return
    const docText = view.state.doc.toString()
    const matches = find_all_matches(docText)
    if (matches.length === 0) return
    const changes = matches.map((r) => ({ from: r.from, to: r.to, insert: replace_query }))
    const tr = view.state.update({ changes })
    view.dispatch(tr)
    set_markdown_text(view.state.doc.toString())
    set_search_idx(-1)
    set_search_total(0)
  }

  /**
   * 双向同步滚动（编辑器 <-> 预览）
   * - 通过 ratio 保持两边滚动位置相近
   * - 使用 ref 锁避免递归触发
   */
  useEffect(() => {
    // 预览 -> 编辑器 的同步
    if (!sync_scroll) return

    // 使用实例ID作为清理键的一部分
    const instanceKey = `${instance_id.current}_${current_file_path || untitled_counter}`

    // 延迟设置监听器
    const timer = setTimeout(() => {
      const view = cm_view_ref.current as EditorView | null
      const previewContainer = preview_pane_ref.current
      if (!view || !previewContainer) return

      let isScrolling = false

      function syncEditorFromPreview(): void {
        // 检查是否是当前实例
        const currentView = cm_view_ref.current
        const currentPreview = preview_pane_ref.current
        if (!currentView || !currentPreview) return
        if (!sync_scroll_ref.current) return
        if (isScrolling || scroll_lock_ref.current.active) return

        isScrolling = true
        const myToken = Date.now()
        scroll_lock_ref.current = { active: true, token: myToken }

        const s = currentView.scrollDOM
        const pc = currentPreview as HTMLElement
        const ratio = pc.scrollTop / Math.max(1, pc.scrollHeight - pc.clientHeight)

        // 保存当前文件预览滚动比例
        const key = current_path_ref.current || `untitled:${untitled_counter}`
        const prevState = scroll_state_ref.current[key] || { editorRatio: 0, previewRatio: 0 }
        scroll_state_ref.current[key] = { editorRatio: prevState.editorRatio, previewRatio: ratio }

        s.scrollTop = ratio * (s.scrollHeight - s.clientHeight)

        setTimeout(() => {
          isScrolling = false
          if (scroll_lock_ref.current.token === myToken) {
            scroll_lock_ref.current.active = false
          }
        }, 10)
      }

      previewContainer.addEventListener('scroll', syncEditorFromPreview)

      // 保存清理函数
      if (!window.__preview_cleanup) window.__preview_cleanup = new Map()
      const oldCleanup = window.__preview_cleanup.get(instanceKey)
      if (oldCleanup) oldCleanup()

      const cleanup = () => {
        if (preview_pane_ref.current) {
          preview_pane_ref.current.removeEventListener('scroll', syncEditorFromPreview)
        }
      }
      window.__preview_cleanup.set(instanceKey, cleanup)
    }, 100) // 增加延迟以确保 DOM 完全准备好

    return () => {
      clearTimeout(timer)
      // 清理事件监听器
      if (window.__preview_cleanup) {
        const cleanup = window.__preview_cleanup.get(instanceKey)
        if (cleanup) {
          cleanup()
          window.__preview_cleanup.delete(instanceKey)
        }
      }
    }
  }, [rendered_html, current_file_path, sync_scroll, untitled_counter])

  // 监听从命令行参数打开文件的事件
  useEffect(() => {
    const unlisten = listen<string>('open-file', async (event) => {
      const filePath = event.payload
      if (filePath && (filePath.endsWith('.md') || filePath.endsWith('.markdown'))) {
        try {
          // 规范化路径（将反斜杠转换为正斜杠）
          const normalizedPath = filePath.replace(/\\/g, '/')

          const content = await readTextFile(normalizedPath)

          // 如果当前是未命名文档且内容为空，直接替换；否则添加新标签
          if (current_file_path && current_file_path.startsWith('untitled:') && !markdown_text) {
            // 替换当前的空白未命名文档
            set_markdown_text(content)
            set_current_file_path(normalizedPath)
            set_save_status('saved')
            set_last_saved_time(new Date())
            // 更新标签栏
            set_open_tabs((prev) => {
              const idx = prev.indexOf(current_file_path)
              if (idx >= 0) {
                const next = [...prev]
                next[idx] = normalizedPath
                return next
              }
              return [...prev, normalizedPath]
            })
          } else {
            // 添加新标签
            set_markdown_text(content)
            set_current_file_path(normalizedPath)
            set_save_status('saved')
            set_last_saved_time(new Date())
            set_open_tabs((prev) => {
              if (prev.includes(normalizedPath)) return prev
              return [...prev, normalizedPath]
            })
          }
        } catch {
          // 尝试使用原始路径作为备选
          try {
            const content = await readTextFile(filePath)
            set_markdown_text(content)
            set_current_file_path(filePath)
            set_save_status('saved')
            set_last_saved_time(new Date())
            set_open_tabs((prev) => {
              if (prev.includes(filePath)) return prev
              return [...prev, filePath]
            })
          } catch {
            // 文件无法读取，静默处理
          }
        }
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [current_file_path, markdown_text, handle_open_file, handle_save_file, untitled_counter])

  // 外部文件变更检测：当当前打开的真实文件被外部修改时，提示重新加载
  useEffect(() => {
    if (!current_file_path || current_file_path.startsWith('untitled:')) return
    let timer: number | null = null
    let lastContent = markdown_text
    const path = current_file_path
    async function poll() {
      try {
        const content = await readTextFile(path)
        if (content !== lastContent && save_status !== 'saving') {
          const reload = window.confirm(
            ui_language === 'en-US'
              ? 'File changed on disk. Reload?'
              : '检测到磁盘中文件已更改，是否重新载入？'
          )
          if (reload) {
            set_markdown_text(content)
            set_save_status('saved')
            set_last_saved_time(new Date())
            lastContent = content
          } else {
            lastContent = content // 避免重复弹窗
          }
        }
      } catch {
        /* ignore */
      }
    }
    timer = setInterval(poll, 3000) as unknown as number
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [current_file_path, markdown_text, save_status, ui_language])

  // 初始化 store
  // 仅初始化一次，读取并应用持久化设置
  // 初始化 Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: ui_theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'monospace',
    })
  }, [ui_theme])

  useEffect(() => {
    // 初始/切换语言时的默认介绍：
    // - 若当前为空，则填入对应语言
    // - 若当前内容正是另一种默认介绍，则替换为目标语言
    set_markdown_text((prev) => {
      const prevTrim = (prev || '').trim()
      const zh = INTRO_ZH.trim()
      const en = INTRO_EN.trim()
      const target = ui_language === 'en-US' ? en : zh
      if (!prevTrim) return target
      if (prevTrim === zh || prevTrim === en) return target
      return prev
    })
  }, [ui_language])

  useEffect(() => {
    async function init_store() {
      const s = await Store.load('settings.json')
      store_ref.current = s
      const saved_base = (await s.get<string>('api_base_url')) || 'https://api.openai.com'
      // 从系统 Keyring 读取 API Key（不再从 Store 读取明文）
      let saved_key = ''
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const v = await invoke<string | null>('secret_get', {
          service: 'MarkdownMonkey',
          key: 'api_key',
        })
        saved_key = (v || '') as string
      } catch {
        // Ignore error when getting API key
      }
      const saved_provider = (await s.get<string>('provider')) || 'openai'
      const saved_model = (await s.get<string>('model')) || 'gpt-4o-mini'
      const saved_system =
        (await s.get<string>('system_prompt')) ||
        'You are a helpful assistant for markdown writing.'
      const saved_temp = (await s.get<number>('temperature')) || 0.7
      const saved_split = (await s.get<number>('split_ratio')) || 0.5
      const saved_editor_fs = (await s.get<number>('editor_font_size')) || 16
      const saved_preview_fs = (await s.get<number>('preview_font_size')) || 16
      const saved_ai_enabled = await s.get<boolean>('ai_enabled')
      const saved_actions = await s.get<string[]>('ai_actions_enabled')
      const saved_custom = await s.get<
        Array<{
          id: string
          title: string
          body: string
          scope: 'selection' | 'document'
          enabled: boolean
          vars?: { lang?: string; style?: string }
        }>
      >('ai_custom_templates')
      const saved_recent = (await s.get<string[]>('recent_files')) || []
      set_api_base_url(saved_base)
      set_api_key(saved_key)
      set_provider(saved_provider)
      set_model(saved_model)
      set_system_prompt(saved_system)
      set_temperature(saved_temp)
      set_split_ratio(saved_split)
      set_editor_font_size(saved_editor_fs)
      set_preview_font_size(saved_preview_fs)
      if (typeof saved_ai_enabled === 'boolean') set_ai_enabled(saved_ai_enabled)
      if (Array.isArray(saved_actions)) set_ai_actions_enabled(saved_actions)
      if (Array.isArray(saved_custom)) set_ai_custom_templates(saved_custom)
      set_recent_files(saved_recent)
      const saved_outline_shown = await s.get<boolean>('outline_shown')
      const saved_outline_width = await s.get<number>('outline_width')
      if (typeof saved_outline_shown === 'boolean') set_show_outline(saved_outline_shown)
      if (typeof saved_outline_width === 'number') set_outline_width(saved_outline_width)
      const saved_theme = (await s.get<'dark' | 'light' | 'system'>('ui_theme')) || 'dark'
      const saved_lang = (await s.get<string>('ui_language')) || 'zh-CN'
      const saved_recent_ai =
        (await s.get<Array<{ id: string; title: string }>>('recent_ai_actions')) || []
      const saved_wrap = await s.get<boolean>('wrap_enabled')
      const saved_line_numbers = await s.get<boolean>('line_numbers_enabled')
      set_ui_theme(saved_theme)
      set_ui_language(saved_lang)
      set_recent_ai_actions(saved_recent_ai)
      if (typeof saved_wrap === 'boolean') set_wrap_enabled(saved_wrap)
      if (typeof saved_line_numbers === 'boolean') set_line_numbers_enabled(saved_line_numbers)
      apply_theme(saved_theme)
    }
    init_store()
  }, [])

  /**
   * handle_save_settings
   * 保存 API 设置
   */
  async function handle_save_settings() {
    if (!store_ref.current) return
    await store_ref.current.set('api_base_url', api_base_url)
    await store_ref.current.set('provider', provider)
    await store_ref.current.set('model', model)
    await store_ref.current.set('system_prompt', system_prompt)
    await store_ref.current.set('temperature', temperature)
    await store_ref.current.set('editor_font_size', editor_font_size)
    await store_ref.current.set('preview_font_size', preview_font_size)
    await store_ref.current.set('ui_theme', ui_theme)
    await store_ref.current.set('ui_language', ui_language)
    await store_ref.current.set('ai_enabled', ai_enabled)
    await store_ref.current.set('ai_actions_enabled', ai_actions_enabled)
    await store_ref.current.set('ai_custom_templates', ai_custom_templates)
    await store_ref.current.set('outline_shown', show_outline)
    await store_ref.current.set('outline_width', outline_width)
    await store_ref.current.set('recent_ai_actions', recent_ai_actions)
    await store_ref.current.set('wrap_enabled', wrap_enabled)
    await store_ref.current.set('line_numbers_enabled', line_numbers_enabled)
    await store_ref.current.save()
    // 将 API Key 写入/删除系统 Keyring
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const k = (api_key || '').trim()
      if (k) {
        await invoke('secret_set', { service: 'MarkdownMonkey', key: 'api_key', value: k })
      } else {
        await invoke('secret_delete', { service: 'MarkdownMonkey', key: 'api_key' })
      }
    } catch {
      // Ignore error when deleting API key
    }
    set_show_settings(false)
    apply_theme(ui_theme)
  }

  // 当选择系统主题时，监听系统切换
  useEffect(() => {
    if (ui_theme === 'system') {
      media_query_ref.current = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => apply_theme('system')
      media_query_ref.current.addEventListener('change', listener)
      apply_theme('system')
      return () => {
        if (media_query_ref.current) {
          media_query_ref.current.removeEventListener('change', listener)
        }
      }
    }
    apply_theme(ui_theme)
  }, [ui_theme])

  // 快捷键监听
  useEffect(() => {
    const handle_keydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handle_save_file()
      } else if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        handle_open_file()
      } else if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        // 新建文档
        const untitled_name = `untitled:${untitled_counter}`
        set_untitled_counter((prev) => prev + 1)
        set_markdown_text('')
        set_current_file_path(untitled_name)
        set_save_status('unsaved')
        set_last_saved_time(null)
        const view = cm_view_ref.current
        if (view) {
          view.focus()
        }
      } else if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        set_show_command_palette(true)
      } else if (e.ctrlKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        set_show_command_palette(true)
      } else if (e.key === 'F11') {
        e.preventDefault()
        set_focus_mode(!focus_mode)
      } else if (e.key === 'Escape' && focus_mode) {
        e.preventDefault()
        set_focus_mode(false)
      } else if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        const next = !wrap_enabled
        set_wrap_enabled(next)
        if (store_ref.current) {
          ;(async () => {
            try {
              await store_ref.current!.set('wrap_enabled', next)
              await store_ref.current!.save()
            } catch {
              // Ignore error when saving wrap_enabled setting
            }
          })()
        }
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault()
        const next = !line_numbers_enabled
        set_line_numbers_enabled(next)
        if (store_ref.current) {
          ;(async () => {
            try {
              await store_ref.current!.set('line_numbers_enabled', next)
              await store_ref.current!.save()
            } catch {
              // Ignore error when saving line_numbers_enabled setting
            }
          })()
        }
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        increase_editor_font_size()
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault()
        decrease_editor_font_size()
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault()
        reset_editor_font_size()
      } else if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault()
        toggle_inline_format('**')
      } else if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault()
        toggle_inline_format('*')
      } else if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        toggle_inline_format('`')
      } else if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        set_show_global_search(true)
      }
    }
    window.addEventListener('keydown', handle_keydown)
    return () => window.removeEventListener('keydown', handle_keydown)
  }, [current_file_path, markdown_text, focus_mode])

  // 专注模式提示
  useEffect(() => {
    if (focus_mode) {
      set_show_focus_hint(true)
      const timer = setTimeout(() => set_show_focus_hint(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [focus_mode])

  // 当文件路径或内容改变时，重新应用滚动条样式
  useEffect(() => {
    // 延迟执行以确保 DOM 更新完成
    const timer = setTimeout(() => {
      if (cm_view_ref.current) {
        const scroller = cm_view_ref.current.dom.querySelector('.cm-scroller')
        if (scroller) {
          const scrollerEl = scroller as HTMLElement

          // 先移除样式，强制重新计算
          scrollerEl.removeAttribute('style')

          // 强制重排
          void scrollerEl.offsetHeight

          // 重新应用滚动条样式
          scrollerEl.style.cssText = `
            overflow: auto !important;
            overflow-y: auto !important;
            overflow-x: auto !important;
            height: 100% !important;
            width: 100% !important;
            scrollbar-width: auto !important;
            scrollbar-color: #888 #2a2a2a !important;
          `

          // 滚动条样式已应用
        }
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [current_file_path, markdown_text])

  /**
   * handle_open_file
   * 打开 Markdown 文件
   */
  async function handle_open_file() {
    const selected = await open({ filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }] })
    if (typeof selected !== 'string') return
    await open_file_at(selected)
    // 若打开的单文件不属于当前工作区，则清空文件树并切回"大纲"
    try {
      const filePathNorm = selected.replace(/\\/g, '/').toLowerCase()
      const ws = (workspace_root || '').replace(/\\/g, '/').toLowerCase()
      const wsPrefix = ws && (ws.endsWith('/') ? ws : ws + '/')
      const isInWorkspace = wsPrefix ? filePathNorm.startsWith(wsPrefix) : false
      if (!isInWorkspace) {
        set_workspace_root('')
        set_file_list([])
        set_side_tab('outline')
      }
    } catch {
      // Ignore error when listing files
    }
    // 记录最近文件
    set_recent_files((prev) => {
      const next = [selected, ...prev.filter((p) => p !== selected)].slice(0, 20)
      return next
    })
    if (store_ref.current) {
      const next = [selected, ...recent_files.filter((p) => p !== selected)].slice(0, 20)
      await store_ref.current.set('recent_files', next)
      await store_ref.current.save()
    }
  }

  /**
   * handle_save_file
   * 保存到当前文件（如无则等同另存为）
   */
  async function handle_save_file() {
    // 如果是未命名文档，转为另存为
    if (!current_file_path || current_file_path.startsWith('untitled:')) {
      await handle_save_as()
      return
    }
    set_save_status('saving')
    try {
      await writeTextFile(current_file_path, markdown_text)
      set_save_status('saved')
      set_last_saved_time(new Date())
    } catch (error) {
      console.error('Save failed:', error)
      set_save_status('unsaved')
    }
  }

  /**
   * handle_save_as
   * 另存为文件
   */
  async function handle_save_as() {
    const target = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath:
        current_file_path && !current_file_path.startsWith('untitled:')
          ? current_file_path
          : 'untitled.md',
    })
    if (!target) return

    // 保存文件
    await writeTextFile(target, markdown_text)

    // 如果之前是未命名文档，需要更新标签栏
    const old_path = current_file_path
    if (old_path && old_path.startsWith('untitled:')) {
      // 从标签栏中移除旧的未命名标签，添加新的文件路径
      set_open_tabs((prev) => {
        const idx = prev.indexOf(old_path)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = target
          return next
        }
        return [...prev, target]
      })
    }

    set_current_file_path(target)
    set_save_status('saved')
    set_last_saved_time(new Date())
  }

  /**
   * handle_ai_complete
   * 切换 AI 启用状态（右键菜单内使用 AI 操作）
   */
  async function handle_ai_complete() {
    const next = !ai_enabled
    set_ai_enabled(next)
    if (store_ref.current) {
      await store_ref.current.set('ai_enabled', next)
      await store_ref.current.save()
    }
  }

  function get_selection_text(): string {
    const view = cm_view_ref.current
    if (!view) return ''
    const sel = view.state.selection.main
    return view.state.sliceDoc(sel.from, sel.to)
  }

  async function ai_invoke(prompt_text: string) {
    const { invoke } = await import('@tauri-apps/api/core')
    const { listen } = await import('@tauri-apps/api/event')
    if (provider !== 'ollama' && (!api_key || api_key.trim() === '')) {
      window.alert(t(ui_language, 'enter_api_key'))
      return
    }
    if (provider === 'openrouter' && !api_key.trim().startsWith('sk-or-')) {
      const ok = window.confirm(
        '当前 Provider 为 OpenRouter，但 API Key 看起来不是 OpenRouter Key（通常以 sk-or- 开头）。仍要继续发送吗？'
      )
      if (!ok) return
    }
    set_ai_loading(true)
    const start_ts = Date.now()
    set_show_ai_result(true)
    set_ai_result_text('')
    abort_ref.current = false
    last_prompt_ref.current = prompt_text
    // 监听流事件（解析 data: JSON 行，兼容 OpenAI/Anthropic）
    try {
      unsubscribe_ref.current()
    } catch {
      // Ignore error when saving recent AI action
    }
    let throttling = false
    let bufferText = ''
    const flush = () => {
      if (!bufferText) return
      const toAppend = bufferText
      bufferText = ''
      set_ai_result_text((prev) => prev + toAppend)
    }
    const unlisten = await listen<string>('ai:stream', (e) => {
      const payload = (e.payload || '').toString().trim()
      if (!payload) return
      if (!payload.startsWith('data:')) return
      const data = payload.slice('data:'.length).trim()
      if (data === '[DONE]') {
        flush()
        set_ai_loading(false)
        set_ai_elapsed_ms(Date.now() - start_ts)
        return
      }
      try {
        const obj = JSON.parse(data)
        const delta = obj?.choices?.[0]?.delta?.content
        const t1 = obj?.delta?.text
        const t2 = obj?.content_block?.text || obj?.content?.[0]?.text
        const piece =
          typeof delta === 'string'
            ? delta
            : typeof t1 === 'string'
              ? t1
              : typeof t2 === 'string'
                ? t2
                : ''
        if (!piece) return
        bufferText += piece
        if (!throttling) {
          throttling = true
          setTimeout(() => {
            flush()
            throttling = false
          }, 60)
        }
      } catch {
        // ignore
      }
    })
    unsubscribe_ref.current = unlisten
    try {
      await invoke('ai_complete_stream', {
        req: {
          provider,
          api_key: api_key.trim(),
          prompt: prompt_text,
          model,
          system_prompt,
          temperature,
          base_url: api_base_url,
        },
      })
    } catch (e) {
      console.error(e)
      if (!abort_ref.current) set_ai_result_text((prev) => prev || `错误：${e}`)
    } finally {
      set_ai_loading(false)
      set_ai_elapsed_ms((prev) => prev || Date.now() - start_ts)
    }
  }

  async function ai_action(
    action: 'continue' | 'rewrite' | 'translate_zh' | 'translate_en' | 'summary',
    scope: 'selection' | 'document'
  ) {
    const selection = get_selection_text()
    if (scope === 'selection' && !selection) {
      window.alert('请先选中要处理的文本，然后再执行该操作。')
      return
    }
    const source = scope === 'selection' ? selection : markdown_text
    let prompt = ''
    switch (action) {
      case 'continue':
        prompt = `基于以下 Markdown 内容继续写作，保持相同风格与语言：\n\n${source}`
        break
      case 'rewrite':
        prompt = `请改写以下内容，使其更清晰、精炼并保持原意：\n\n${source}\n\n只输出改写后的内容。`
        break
      case 'translate_zh':
        prompt = `把以下内容翻译为简体中文，只输出译文：\n\n${source}`
        break
      case 'translate_en':
        prompt = `Translate the following content into natural English. Output only the translation.\n\n${source}`
        break
      case 'summary':
        prompt = `请将以下内容总结为 5 条要点（使用无序列表），只输出要点：\n\n${source}`
        break
    }
    set_ai_title(
      {
        continue: ui_language === 'en-US' ? 'Continue Result' : '续写结果',
        rewrite: ui_language === 'en-US' ? 'Rewrite Result' : '改写结果',
        translate_zh: ui_language === 'en-US' ? 'Translate to Chinese' : '翻译为中文',
        translate_en: 'Translate to English',
        summary: ui_language === 'en-US' ? 'Summary' : '总结要点',
      }[action]
    )
    set_ai_last_scope(scope)
    // 记录最近动作（仅记录 selection 作用域，符合右键菜单使用场景）
    if (scope === 'selection') {
      const titleMap: Record<string, string> = {
        continue: '续写（选中）',
        rewrite: '改写（选中）',
        translate_zh: '翻译为中文（选中）',
        translate_en: 'Translate to English（selected）',
        summary: '总结要点（选中）',
      }
      const id = `builtin_${action}`
      const title = titleMap[action]
      set_recent_ai_actions((prev) => {
        const next = [{ id, title }, ...prev.filter((x) => x.id !== id)]
        return next.slice(0, 5)
      })
      if (store_ref.current) {
        try {
          await store_ref.current.set(
            'recent_ai_actions',
            [{ id, title }, ...recent_ai_actions.filter((x) => x.id !== id)].slice(0, 5)
          )
          await store_ref.current.save()
        } catch {
          // Ignore error when copying to clipboard
        }
      }
    }
    await ai_invoke(prompt)
  }

  async function ai_custom_action(tpl: {
    title: string
    body: string
    scope: 'selection' | 'document'
    vars?: { lang?: string; style?: string }
  }) {
    const selection = get_selection_text()
    if (tpl.scope === 'selection' && !selection) {
      window.alert('请先选中要处理的文本，然后再执行该操作。')
      return
    }
    const source = tpl.scope === 'selection' ? selection : markdown_text
    let prompt = tpl.body || ''
    prompt = prompt.replaceAll('{text}', source)
    if (tpl.vars?.lang) prompt = prompt.replaceAll('{lang}', tpl.vars.lang)
    if (tpl.vars?.style) prompt = prompt.replaceAll('{style}', tpl.vars.style)
    // 内置变量：日期/文件名/模型/提供商
    const now = new Date()
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const date_str = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const filename = current_file_path ? current_file_path.split(/[/\\]/).pop() || '' : ''
    prompt = prompt.replaceAll('{date}', date_str)
    prompt = prompt.replaceAll('{filename}', filename)
    prompt = prompt.replaceAll('{model}', model)
    prompt = prompt.replaceAll('{provider}', provider)
    set_ai_title(tpl.title || (ui_language === 'en-US' ? 'AI Result' : 'AI 结果'))
    set_ai_last_scope(tpl.scope)
    await ai_invoke(prompt)
  }

  /**
   * handle_splitter_down / move / up
   * 拖拽分隔条以改变编辑/预览宽度
   */
  function handle_splitter_down(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault()
    is_dragging_ref.current = true
    document.body.style.cursor = 'col-resize'
  }
  useEffect(() => {
    function on_move(e: MouseEvent) {
      if (!is_dragging_ref.current) return
      const el = container_ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.max(0.15, Math.min(0.85, x / rect.width))
      set_split_ratio(ratio)
    }
    async function on_up() {
      if (!is_dragging_ref.current) return
      is_dragging_ref.current = false
      document.body.style.cursor = ''
      if (store_ref.current) {
        await store_ref.current.set('split_ratio', split_ratio)
        await store_ref.current.save()
      }
    }
    window.addEventListener('mousemove', on_move)
    window.addEventListener('mouseup', on_up)
    return () => {
      window.removeEventListener('mousemove', on_move)
      window.removeEventListener('mouseup', on_up)
    }
  }, [split_ratio])

  /**
   * handle_test_connection
   * 测试当前 Provider 连接可用性
   */
  async function handle_test_connection() {
    const { invoke } = await import('@tauri-apps/api/core')
    try {
      const msg = await invoke<string>('test_connection', {
        req: {
          provider,
          api_key,
          base_url: api_base_url,
        },
      })
      window.alert(msg)
    } catch (e) {
      window.alert(`连接失败: ${e}`)
    }
  }

  // 渲染后对代码块应用语法高亮
  useEffect(() => {
    if (!preview_ref.current) return
    const code_blocks = preview_ref.current.querySelectorAll('pre code')
    code_blocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement)
    })
  }, [rendered_html])

  function insert_at_cursor(text: string) {
    const view = cm_view_ref.current
    if (!view) {
      set_markdown_text((prev) => `${prev}${text}`)
      return
    }
    const tr = view.state.changeByRange((r) => {
      const pos = r.from + text.length
      return {
        changes: { from: r.from, to: r.to, insert: text },
        range: EditorSelection.range(pos, pos),
      }
    })
    view.dispatch(tr)
    view.focus()
  }

  async function editor_copy() {
    const view = cm_view_ref.current
    if (!view) return
    const sel = view.state.selection.main
    const text = view.state.sliceDoc(sel.from, sel.to)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Ignore error when copying to clipboard
    }
  }

  async function editor_cut() {
    const view = cm_view_ref.current
    if (!view) return
    const sel = view.state.selection.main
    const text = view.state.sliceDoc(sel.from, sel.to)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Ignore error when reading from clipboard
    }
    const tr = view.state.update({ changes: { from: sel.from, to: sel.to, insert: '' } })
    view.dispatch(tr)
    view.focus()
  }

  async function editor_paste() {
    const view = cm_view_ref.current
    if (!view) return
    try {
      const text = await navigator.clipboard.readText()
      insert_at_cursor(text)
    } catch {
      // Ignore error when reading from clipboard
    }
  }

  function editor_select_all() {
    const view = cm_view_ref.current
    if (!view) return
    const len = view.state.doc.length
    view.dispatch({ selection: EditorSelection.single(0, len) })
    view.focus()
  }

  function editor_clear() {
    const view = cm_view_ref.current
    if (!view) return
    const sel = view.state.selection.main
    if (sel.empty) return
    const doc_len = view.state.doc.length
    if (sel.from === 0 && sel.to === doc_len) {
      set_markdown_text('')
      return
    }
    const tr = view.state.update({ changes: { from: sel.from, to: sel.to, insert: '' } })
    view.dispatch(tr)
    view.focus()
  }

  /**
   * toggle_inline_format
   * 选区包裹/去包裹 markdown 行内格式（`**`/`*`/`` ` ``），若无选区则在光标处插入成对标记。
   */
  function toggle_inline_format(wrapper: '**' | '*' | '`') {
    const view = cm_view_ref.current
    if (!view) return
    const sel = view.state.selection.main
    const text = view.state.sliceDoc(sel.from, sel.to)
    const w = wrapper
    const isWrapped = text.startsWith(w) && text.endsWith(w) && text.length >= w.length * 2
    let insert: string
    if (text) {
      insert = isWrapped ? text.slice(w.length, text.length - w.length) : `${w}${text}${w}`
    } else {
      insert = `${w}${w}`
    }
    const cursorShift = text ? 0 : -w.length
    const tr = view.state.update({
      changes: { from: sel.from, to: sel.to, insert },
      selection: { anchor: sel.from + insert.length + cursorShift },
    })
    view.dispatch(tr)
    view.focus()
  }

  /**
   * run_global_search
   * 跨文件搜索当前工作区（workspace_root）内的 Markdown 文件，支持正则与忽略大小写。
   */
  async function run_global_search(): Promise<void> {
    if (!workspace_root) {
      window.alert(
        ui_language === 'en-US' ? 'Please open a workspace folder first.' : '请先打开工作区文件夹。'
      )
      return
    }
    const q = (global_query || '').trim()
    if (!q) {
      set_global_results([])
      return
    }
    set_global_searching(true)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      // 复用后端的 list_md_files
      const paths = await invoke<string[]>('list_md_files', { dir: workspace_root })
      const results: Array<{
        path: string
        lineNo: number
        from: number
        to: number
        preview: string
      }> = []
      const re = (() => {
        if (!global_regex) return null
        try {
          return new RegExp(q, global_case_i ? 'gi' : 'g')
        } catch {
          return null
        }
      })()
      for (const p of paths) {
        try {
          const text = await readTextFile(p)
          const lines = text.split('\n')
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (re) {
              re.lastIndex = 0
              let m: RegExpExecArray | null
              while ((m = re.exec(line))) {
                const from = m.index
                const to = m.index + m[0].length
                const preview = line.slice(Math.max(0, from - 40), Math.min(line.length, to + 40))
                results.push({ path: p, lineNo: i + 1, from, to, preview })
                if (m[0].length === 0) re.lastIndex++
              }
            } else {
              const hay = global_case_i ? line.toLowerCase() : line
              const needle = global_case_i ? q.toLowerCase() : q
              let idx = 0
              while (true) {
                const pos = hay.indexOf(needle, idx)
                if (pos === -1) break
                const from = pos
                const to = pos + needle.length
                const preview = line.slice(Math.max(0, from - 40), Math.min(line.length, to + 40))
                results.push({ path: p, lineNo: i + 1, from, to, preview })
                idx = pos + Math.max(1, needle.length)
              }
            }
          }
        } catch {
          /* ignore single file */
        }
      }
      set_global_results(results.slice(0, 500))
    } finally {
      set_global_searching(false)
    }
  }

  /**
   * increase_editor_font_size
   * 增大编辑器字号，并持久化到本地设置存储。
   */
  async function increase_editor_font_size(): Promise<void> {
    const next = Math.min(28, (editor_font_size || 16) + 1)
    set_editor_font_size(next)
    if (store_ref.current) {
      try {
        await store_ref.current.set('editor_font_size', next)
        await store_ref.current.save()
      } catch {
        // Ignore error when saving editor_font_size setting
      }
    }
  }

  /**
   * decrease_editor_font_size
   * 减小编辑器字号，并持久化到本地设置存储。
   */
  async function decrease_editor_font_size(): Promise<void> {
    const next = Math.max(10, (editor_font_size || 16) - 1)
    set_editor_font_size(next)
    if (store_ref.current) {
      try {
        await store_ref.current.set('editor_font_size', next)
        await store_ref.current.save()
      } catch {
        // Ignore error when saving editor_font_size setting
      }
    }
  }

  /**
   * reset_editor_font_size
   * 重置编辑器字号为默认值（16），并持久化到本地设置存储。
   */
  async function reset_editor_font_size(): Promise<void> {
    const next = 16
    set_editor_font_size(next)
    if (store_ref.current) {
      try {
        await store_ref.current.set('editor_font_size', next)
        await store_ref.current.save()
      } catch {
        // Ignore error when saving editor_font_size setting
      }
    }
  }

  /**
   * insert_iso_datetime
   * 在光标处插入 ISO 格式日期时间（YYYY-MM-DD HH:mm:ss）。
   */
  function insert_iso_datetime(): void {
    const now = new Date()
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const text = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    insert_at_cursor(text)
  }

  /**
   * insert_local_datetime
   * 在光标处插入本地格式日期时间（toLocaleString）。
   */
  function insert_local_datetime(): void {
    insert_at_cursor(new Date().toLocaleString())
  }

  return (
    <div
      className={`container ${focus_mode ? 'focus-mode' : ''} ${
        is_mobile && mobile_view === 'preview' ? 'mobile-view-preview' : ''
      } ${is_mobile && show_mobile_sidebar ? 'mobile-show-sidebar' : ''}`}
      ref={container_ref}
      style={{
        gridTemplateColumns: focus_mode
          ? '0px 0px 100% 0px 0px'
          : is_mobile
            ? '100%'
            : `${show_outline ? outline_width : 0}px 6px ${Math.round(split_ratio * 100)}% 6px ${100 - Math.round(split_ratio * 100)}%`,
      }}
    >
      {/* 移动端侧边栏遮罩 */}
      <div className="sidebar-overlay" onClick={() => set_show_mobile_sidebar(false)} />

      <div
        className="settings_bar"
        style={{ gridColumn: '1 / -1', display: focus_mode ? 'none' : 'flex' }}
      >
        {is_mobile && (
          <button
            className="settings_btn"
            onClick={() => set_show_mobile_sidebar(!show_mobile_sidebar)}
          >
            ☰
          </button>
        )}
        <img
          src={monkeyIcon}
          alt="MarkdownMonkey"
          style={{ width: 22, height: 22, alignSelf: 'center' }}
        />
        <button className="settings_btn" onClick={handle_open_file}>
          {t(ui_language, 'open')}
        </button>
        <button
          className="settings_btn"
          onClick={() => {
            // 新建空白文档：创建一个未命名的标签
            const untitled_name = `untitled:${untitled_counter}`
            set_untitled_counter((prev) => prev + 1)
            set_markdown_text('')
            set_current_file_path(untitled_name)
            set_save_status('unsaved')
            set_last_saved_time(null)
            // 将焦点置于编辑器
            const view = cm_view_ref.current
            if (view) {
              view.focus()
            }
          }}
        >
          {t(ui_language, 'new_file')}
        </button>
        <button className="settings_btn" onClick={handle_open_folder}>
          {t(ui_language, 'open_folder')}
        </button>
        <button className="settings_btn btn-primary" onClick={handle_save_file}>
          {current_file_path ? t(ui_language, 'save') : t(ui_language, 'save_as')}
        </button>
        <button className="settings_btn" onClick={() => set_show_settings(true)}>
          {t(ui_language, 'settings')}
        </button>
        <button
          className="settings_btn"
          onClick={() => set_show_shortcuts(true)}
          title={ui_language === 'en-US' ? 'Keyboard Shortcuts' : '键盘快捷键'}
        >
          ⌨️ {ui_language === 'en-US' ? 'Shortcuts' : '快捷键'}
        </button>
        <button
          className="settings_btn"
          onClick={() => {
            set_show_search((v) => !v)
            if (!show_search) setTimeout(() => update_search_state(true), 0)
          }}
        >
          {show_search ? t(ui_language, 'close_search') : t(ui_language, 'search_replace')}
        </button>
        <button
          className="settings_btn"
          onClick={async () => {
            // 导出 HTML
            const { save } = await import('@tauri-apps/plugin-dialog')
            const { writeTextFile } = await import('@tauri-apps/plugin-fs')
            const target = await save({
              filters: [{ name: 'HTML', extensions: ['html'] }],
              defaultPath: 'export.html',
            })
            if (!target) return
            const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${(current_file_path || '').split(/[/\\]/).pop() || 'Document'}</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;max-width:840px;margin:24px auto;padding:0 16px;line-height:1.7;} pre{background:#0b0b0b;color:#f3f3f3;padding:12px;border-radius:6px;overflow:auto;} code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;} h1,h2,h3{margin:1.2em 0 .6em}</style></head><body class="markdown_body">${rendered_html}</body></html>`
            await writeTextFile(target, html)
            alert('已导出 HTML 到: ' + target)
          }}
        >
          {t(ui_language, 'export_html')}
        </button>
        <button
          className="settings_btn"
          onClick={async () => {
            try {
              const { default: html2pdf } = await import('html2pdf.js')
              const target = await save({
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
                defaultPath: 'export.pdf',
              })
              if (!target) return
              const temp = document.createElement('div')
              temp.className = 'markdown_body'
              temp.style.padding = '16px'
              temp.style.maxWidth = '840px'
              temp.innerHTML = rendered_html
              const opt: Record<string, unknown> = {
                margin: [10, 10, 10, 10],
                filename: 'export.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              }
              const worker = (
                html2pdf as unknown as () => {
                  set: (o: Record<string, unknown>) => {
                    from: (src: HTMLElement) => {
                      outputPdf: (type: 'blob' | 'datauristring') => Promise<Blob | string>
                    }
                  }
                }
              )()
                .set(opt)
                .from(temp)
              const blob: Blob = await new Promise<Blob>((resolve, reject) => {
                try {
                  worker
                    .outputPdf('blob')
                    .then((b) => resolve(b as Blob))
                    .catch(reject)
                } catch (e) {
                  reject(e as unknown)
                }
              })
              const bytes = new Uint8Array(await blob.arrayBuffer())
              await writeFile(target, bytes)
              alert(t(ui_language, 'pdf_success') + target)
            } catch (e) {
              console.error(e)
              alert(t(ui_language, 'pdf_failed') + e)
            }
          }}
        >
          {t(ui_language, 'export_pdf')}
        </button>
        <button
          className="settings_btn"
          onClick={() => set_show_image_manager(true)}
          title={ui_language === 'en-US' ? 'Image Manager' : '图片管理器'}
        >
          🖼️ {ui_language === 'en-US' ? 'Images' : '图片'}
        </button>
        <button
          className="settings_btn"
          onClick={() => {
            const view = cm_view_ref.current
            if (!view) return
            const cursor = view.state.selection.main.head
            const tableDetection = detectTableAtCursor(markdown_text, cursor)

            if (tableDetection) {
              set_editing_table_text(tableDetection.tableText)
              set_editing_table_range({
                startLine: tableDetection.startLine,
                endLine: tableDetection.endLine,
              })
              set_show_table_editor(true)
            } else {
              alert(
                ui_language === 'en-US'
                  ? 'No table found at cursor. Place cursor inside a table first.'
                  : '光标处未找到表格。请先将光标放在表格内。'
              )
            }
          }}
          title={ui_language === 'en-US' ? 'Edit Table' : '编辑表格'}
        >
          📊 {ui_language === 'en-US' ? 'Table' : '表格'}
        </button>
        <button className="settings_btn" onClick={handle_ai_complete}>
          {ai_enabled ? t(ui_language, 'ai_enabled') : t(ui_language, 'enable_ai')}
        </button>
        {ai_enabled && (
          <>
            <button className="settings_btn" onClick={() => set_show_ai_chat(true)}>
              {t(ui_language, 'ai_chat')}
            </button>
            {show_ai_chat && (
              <button
                className="settings_btn"
                style={{
                  padding: '4px 6px',
                  fontSize: 10,
                  lineHeight: '1.1',
                  height: 24,
                  alignSelf: 'flex-end',
                }}
                onClick={() => set_chat_reset_tick(Date.now())}
                title="重置 AI 对话位置"
              >
                {t(ui_language, 'reset_position')}
              </button>
            )}
          </>
        )}
        <button className="settings_btn" onClick={() => set_show_outline((v) => !v)}>
          {show_outline ? t(ui_language, 'hide_outline') : t(ui_language, 'show_outline')}
        </button>
        <label
          className="settings_btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          title={ui_language === 'en-US' ? 'Sync editor/preview scroll' : '同步编辑与预览滚动'}
        >
          <input
            type="checkbox"
            checked={sync_scroll}
            onChange={(e) => set_sync_scroll(e.target.checked)}
          />
          {ui_language === 'en-US' ? 'Sync Scroll' : '同步滚动'}
        </label>
        {/* 已移除拼写检查（浏览器原生依赖系统词典，不稳定） */}
        <div style={{ flex: 1 }} />
        <div
          className="status_item"
          title={ui_language === 'en-US' ? 'Application Version' : '程序版本'}
          style={{ opacity: 0.8 }}
        >
          v{app_version || 'dev'}
        </div>
        {is_mobile && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`mobile-view-btn ${mobile_view === 'editor' ? 'active' : ''}`}
              onClick={() => set_mobile_view('editor')}
            >
              ✏️ {ui_language === 'en-US' ? 'Editor' : '编辑'}
            </button>
            <button
              className={`mobile-view-btn ${mobile_view === 'preview' ? 'active' : ''}`}
              onClick={() => set_mobile_view('preview')}
            >
              👁️ {ui_language === 'en-US' ? 'Preview' : '预览'}
            </button>
          </div>
        )}
      </div>
      {show_search && (
        <div className="settings_bar" style={{ gridColumn: '1 / -1', gap: 8 }}>
          <input
            className="settings_input"
            placeholder={t(ui_language, 'search_placeholder')}
            value={search_query}
            onChange={(e) => set_search_query(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') update_search_state(true)
            }}
          />
          <input
            className="settings_input"
            placeholder={t(ui_language, 'replace_placeholder')}
            value={replace_query}
            onChange={(e) => set_replace_query(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={search_regex}
              onChange={(e) => set_search_regex(e.target.checked)}
            />{' '}
            {t(ui_language, 'regex')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={search_case_i}
              onChange={(e) => set_search_case_i(e.target.checked)}
            />{' '}
            {t(ui_language, 'case_insensitive')}
          </label>
          <button className="settings_btn" onClick={() => update_search_state(true)}>
            {t(ui_language, 'search_btn')}
          </button>
          <button className="settings_btn" onClick={search_prev}>
            {t(ui_language, 'prev')}
          </button>
          <button className="settings_btn" onClick={search_next}>
            {t(ui_language, 'next')}
          </button>
          <button className="settings_btn" onClick={replace_current}>
            {t(ui_language, 'replace')}
          </button>
          <button className="settings_btn" onClick={replace_all}>
            {t(ui_language, 'replace_all')}
          </button>
          <div className="status_item">
            {search_total > 0 ? `${search_idx + 1}/${search_total}` : '0/0'}
          </div>
        </div>
      )}
      {show_global_search && !focus_mode && (
        <div
          className="settings_bar"
          style={{ gridColumn: '1 / -1', gap: 8, alignItems: 'center' }}
        >
          <input
            className="settings_input"
            placeholder={
              ui_language === 'en-US'
                ? 'Global search keyword (regex supported)'
                : '全局搜索关键词（支持正则）'
            }
            value={global_query}
            onChange={(e) => set_global_query(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') run_global_search()
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={global_regex}
              onChange={(e) => set_global_regex(e.target.checked)}
            />{' '}
            {ui_language === 'en-US' ? 'Regex' : '正则'}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={global_case_i}
              onChange={(e) => set_global_case_i(e.target.checked)}
            />{' '}
            {ui_language === 'en-US' ? 'Case-insensitive' : '忽略大小写'}
          </label>
          <button
            className="settings_btn"
            disabled={global_searching}
            onClick={() => run_global_search()}
          >
            {global_searching
              ? ui_language === 'en-US'
                ? 'Searching...'
                : '搜索中...'
              : ui_language === 'en-US'
                ? 'Search'
                : '搜索'}
          </button>
          <button
            className="settings_btn"
            onClick={() => {
              set_show_global_search(false)
              set_global_results([])
            }}
          >
            {ui_language === 'en-US' ? 'Close' : '关闭'}
          </button>
        </div>
      )}
      {/* 标签栏 */}
      <TabBar
        tabs={open_tabs}
        currentPath={current_file_path}
        uiLanguage={ui_language}
        onTabClick={switch_to_tab}
        onTabClose={close_tab}
        onContextMenu={(path, x, y) => {
          set_tab_ctx_open(true)
          set_tab_ctx_pos({ x, y })
          set_tab_ctx_path(path)
        }}
        fileDisplayName={file_display_name}
      />
      {tab_ctx_open && (
        <div
          style={{
            position: 'fixed',
            left: tab_ctx_pos.x,
            top: tab_ctx_pos.y,
            zIndex: 9999,
            background: '#1f1f1f',
            border: '1px solid #3a3a3a',
            borderRadius: 4,
            padding: 4,
          }}
          onMouseLeave={() => set_tab_ctx_open(false)}
        >
          <button
            className="settings_btn"
            style={{ display: 'block', width: 180, textAlign: 'left' }}
            onClick={() => {
              set_tab_ctx_open(false)
              set_open_tabs((prev) => prev.filter((p) => p === tab_ctx_path))
              switch_to_tab(tab_ctx_path)
            }}
          >
            {t(ui_language, 'close_others')}
          </button>
          <button
            className="settings_btn"
            style={{ display: 'block', width: 180, textAlign: 'left' }}
            onClick={() => {
              set_tab_ctx_open(false)
              const idx = open_tabs.indexOf(tab_ctx_path)
              set_open_tabs((prev) => prev.filter((_, i) => i <= idx))
              switch_to_tab(tab_ctx_path)
            }}
          >
            {t(ui_language, 'close_right')}
          </button>
          <button
            className="settings_btn"
            style={{ display: 'block', width: 180, textAlign: 'left' }}
            onClick={() => {
              set_tab_ctx_open(false)
              set_open_tabs([])
              set_current_file_path('')
              set_markdown_text('')
            }}
          >
            {t(ui_language, 'close_all_tabs')}
          </button>
          <button
            className="settings_btn"
            style={{ display: 'block', width: 180, textAlign: 'left' }}
            onClick={() => {
              set_tab_ctx_open(false)
              const path = tab_ctx_path
              if (path) navigator.clipboard.writeText(path).catch(() => {})
            }}
          >
            {t(ui_language, 'copy_path')}
          </button>
          <button
            className="settings_btn"
            style={{ display: 'block', width: 180, textAlign: 'left' }}
            onClick={() => {
              set_tab_ctx_open(false)
              const path = tab_ctx_path
              if (!path) return
              const base = path.split(/[/\\]/).slice(0, -1).join('/')
              set_workspace_root(base)
              set_side_tab('files')
            }}
          >
            {t(ui_language, 'locate_in_tree')}
          </button>
        </div>
      )}
      {show_outline && !focus_mode && (
        <div className="pane pane-outline" style={{ width: outline_width }}>
          <div className="sidebar_tabs">
            <button
              className={`sidebar_tab ${side_tab === 'outline' ? 'active' : ''}`}
              onClick={() => set_side_tab('outline')}
            >
              {t(ui_language, 'tab_outline')}
            </button>
            <button
              className={`sidebar_tab ${side_tab === 'files' ? 'active' : ''}`}
              onClick={() => set_side_tab('files')}
            >
              {t(ui_language, 'tab_files')}
            </button>
          </div>
          {side_tab === 'outline' ? (
            <ul className="outline_list">
              {outline_items.map((h, i) => (
                <li key={i} className="outline_item" style={{ paddingLeft: (h.level - 1) * 12 }}>
                  <button
                    className="outline_btn"
                    onClick={() => {
                      const view = cm_view_ref.current
                      if (!view) return
                      const pos = view.state.doc.line(Math.max(1, h.line + 1)).from
                      view.dispatch({
                        selection: EditorSelection.cursor(pos),
                        scrollIntoView: true,
                      })
                    }}
                  >
                    {`H${h.level}`} · {h.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '8px' }}>
              <div className="status_item" title={workspace_root}>
                {workspace_root ? file_display_name(workspace_root) : '未选择文件夹'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button
                  className="settings_btn"
                  onClick={async () => {
                    const base = workspace_root || ''
                    const name = window.prompt(t(ui_language, 'new_file') + ' (.md)', 'untitled.md')
                    if (!name) return
                    const full = (base ? base.replace(/\\/g, '/') + '/' : '') + name
                    try {
                      const { invoke } = await import('@tauri-apps/api/core')
                      await invoke('create_empty_file', { path: full })
                      const { invoke: inv } = await import('@tauri-apps/api/core')
                      const paths = await inv<string[]>('list_md_files', { dir: workspace_root })
                      set_file_list(Array.from(new Set(paths)).sort())
                    } catch (e) {
                      alert('新建失败：' + e)
                    }
                  }}
                >
                  {t(ui_language, 'new_file')}
                </button>
                <button
                  className="settings_btn"
                  onClick={async () => {
                    const { invoke } = await import('@tauri-apps/api/core')
                    const paths = await invoke<string[]>('list_md_files', { dir: workspace_root })
                    set_file_list(Array.from(new Set(paths)).sort())
                  }}
                >
                  {t(ui_language, 'refresh')}
                </button>
              </div>
              <ul className="outline_list">
                {(() => {
                  // 将 file_list 构建为目录树
                  type TreeNode = Record<
                    string,
                    {
                      __dir?: boolean
                      __fullPath?: string
                      __children?: Record<string, TreeNode>
                      __file?: boolean
                      __path?: string
                    }
                  >
                  const tree: TreeNode = {}
                  const ws = (workspace_root || '').replace(/\\/g, '/')
                  for (const p0 of file_list) {
                    const pnorm = (p0 || '').replace(/\\/g, '/')
                    let rel = pnorm
                    if (ws && pnorm.toLowerCase().startsWith(ws.toLowerCase() + '/')) {
                      rel = pnorm.slice(ws.length + 1)
                    }
                    const parts = rel.split('/').filter(Boolean)
                    let cur: TreeNode = tree
                    for (let i = 0; i < parts.length - 1; i++) {
                      const part = parts[i]
                      if (!cur[part])
                        cur[part] = {
                          __dir: true,
                          __fullPath: parts.slice(0, i + 1).join('/'),
                          __children: {},
                        }
                      cur = (cur[part].__children as TreeNode) || {}
                    }
                    const file = parts[parts.length - 1]
                    cur[file] = { __dir: false, __file: true, __path: p0 }
                  }

                  const render = (node: TreeNode, prefix: string[]) => {
                    const entries = Object.entries(node)
                      .filter(([k]) => !k.startsWith('__'))
                      .sort((a, b) => {
                        const ad = a[1].__dir ? 0 : 1
                        const bd = b[1].__dir ? 0 : 1
                        if (ad !== bd) return ad - bd
                        return a[0].localeCompare(b[0])
                      })
                    const out: React.ReactNode[] = []
                    for (const [name, info] of entries) {
                      const full = [...prefix, name].join('/')
                      if (info.__dir) {
                        const folded = !!file_tree_fold[full]
                        out.push(
                          <li key={full} className="outline_item">
                            <button
                              className="outline_btn"
                              onClick={() => set_file_tree_fold((m) => ({ ...m, [full]: !folded }))}
                              title={full}
                            >
                              {folded ? '▶' : '▼'} {name}
                            </button>
                          </li>
                        )
                        if (!folded) {
                          out.push(...render(info.__children || {}, [...prefix, name]))
                        }
                      } else if (info.__file) {
                        const safe = info.__path as string
                        const fname = file_display_name(safe)
                        out.push(
                          <li
                            key={safe}
                            className="outline_item"
                            style={{ paddingLeft: prefix.length * 12 }}
                          >
                            <button
                              className="outline_btn"
                              onDoubleClick={() => open_file_at(safe)}
                              title={safe}
                            >
                              {fname}
                            </button>
                            <div style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
                              <button
                                className="settings_btn"
                                title={t(ui_language, 'rename')}
                                onClick={async () => {
                                  const next = window.prompt(t(ui_language, 'rename') + '：', fname)
                                  if (!next || next === fname) return
                                  const base = safe.split(/[/\\]/).slice(0, -1).join('/')
                                  const dst = (base ? base + '/' : '') + next
                                  try {
                                    const { invoke } = await import('@tauri-apps/api/core')
                                    await invoke('rename_path', { src: safe, dst })
                                    const paths = await invoke<string[]>('list_md_files', {
                                      dir: workspace_root,
                                    })
                                    set_file_list(Array.from(new Set(paths)).sort())
                                  } catch (e) {
                                    alert(t(ui_language, 'rename') + ' 失败：' + e)
                                  }
                                }}
                              >
                                {t(ui_language, 'rename')}
                              </button>
                              <button
                                className="settings_btn"
                                title={t(ui_language, 'remove')}
                                onClick={async () => {
                                  if (!window.confirm(t(ui_language, 'remove') + '？\n' + safe))
                                    return
                                  try {
                                    const { invoke } = await import('@tauri-apps/api/core')
                                    await invoke('delete_path', { target: safe })
                                    const paths = await invoke<string[]>('list_md_files', {
                                      dir: workspace_root,
                                    })
                                    set_file_list(Array.from(new Set(paths)).sort())
                                  } catch (e) {
                                    alert(t(ui_language, 'remove') + ' 失败：' + e)
                                  }
                                }}
                              >
                                {t(ui_language, 'remove')}
                              </button>
                              <button
                                className="settings_btn"
                                title={t(ui_language, 'copy_path')}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(safe)
                                  } catch {
                                    // Ignore error when copying file path
                                  }
                                }}
                              >
                                {t(ui_language, 'copy_path')}
                              </button>
                            </div>
                          </li>
                        )
                      }
                    }
                    return out
                  }
                  // const root = {}
                  // 将工作区根目录名显示为顶级目录
                  const baseName = workspace_root ? file_display_name(workspace_root) : ''
                  const foldedRoot = !!file_tree_fold['/']
                  return [
                    <li key={'__root'} className="outline_item">
                      <button
                        className="outline_btn"
                        onClick={() => set_file_tree_fold((m) => ({ ...m, ['/']: !foldedRoot }))}
                      >
                        {foldedRoot ? '▶' : '▼'} {baseName || '文件'}
                      </button>
                    </li>,
                    ...(foldedRoot ? [] : render(tree, [])),
                  ]
                })()}
              </ul>
            </div>
          )}
        </div>
      )}
      {show_outline && (
        <div
          className="splitter-outline"
          onMouseDown={(e) => {
            e.preventDefault()
            const startX = e.clientX
            const startW = outline_width
            function move(ev: MouseEvent) {
              const dx = ev.clientX - startX
              const next = Math.max(160, Math.min(480, startW + dx))
              set_outline_width(next)
            }
            function up() {
              window.removeEventListener('mousemove', move)
              window.removeEventListener('mouseup', up)
            }
            window.addEventListener('mousemove', move)
            window.addEventListener('mouseup', up)
          }}
        />
      )}
      <div
        className="pane pane-editor"
        style={{ fontSize: editor_font_size }}
        onContextMenu={(e) => {
          e.preventDefault()
          const view = cm_view_ref.current
          if (view) {
            const sel = view.state.selection.main
            set_ctx_has_selection(!sel.empty)
          } else {
            set_ctx_has_selection(false)
          }
          set_ctx_open(true)
          set_ctx_pos({ x: e.clientX, y: e.clientY })
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
          className="editor-container"
        >
          <CodeMirror
            value={markdown_text}
            theme={ui_theme === 'light' ? undefined : oneDark}
            height="auto"
            style={{ height: '100%', maxHeight: 'calc(100vh - 120px)', minHeight: 0 }}
            // 浏览器原生拼写检查（仅英文），开启时对英文单词下划线提示
            basicSetup={true}
            editable={true}
            extensions={[
              markdown(),
              editorScrollSyncExt,
              ...(searchHighlightField ? [searchHighlightField] : []),
              // 强制显示滚动条的主题扩展
              EditorView.theme({
                '.cm-scroller': {
                  overflowY: 'auto !important',
                  overflowX: 'auto !important',
                  maxHeight: 'calc(100vh - 120px) !important',
                },
                '.cm-scroller::-webkit-scrollbar': {
                  width: '14px !important',
                  height: '14px !important',
                },
                '.cm-scroller::-webkit-scrollbar-track': {
                  background: '#2a2a2a !important',
                  border: '1px solid #3a3a3a !important',
                },
                '.cm-scroller::-webkit-scrollbar-thumb': {
                  background: '#888 !important',
                  border: '1px solid #999 !important',
                  borderRadius: '2px !important',
                },
                '.cm-scroller::-webkit-scrollbar-thumb:hover': {
                  background: '#aaa !important',
                },
                '.cm-scroller::-webkit-scrollbar-corner': {
                  background: '#2a2a2a !important',
                },
              }),
              // 自动换行主题：根据 wrap_enabled 切换
              EditorView.theme({
                '.cm-content': {
                  whiteSpace: wrap_enabled ? 'pre-wrap' : 'pre',
                  wordBreak: wrap_enabled ? 'break-word' : 'normal',
                },
              }),
              // 行号显示/隐藏
              EditorView.theme({
                '.cm-gutters': {
                  display: line_numbers_enabled ? 'block' : 'none',
                },
              }),
            ]}
            onChange={(value) => {
              set_markdown_text(value)
              if (current_file_path && value !== markdown_text) {
                set_save_status('unsaved')
              }
            }}
            onCreateEditor={(view) => {
              cm_view_ref.current = view
              // 设置滚动条样式
              setTimeout(() => {
                const scroller = view.dom.querySelector('.cm-scroller')
                if (scroller) {
                  const scrollerEl = scroller as HTMLElement

                  // 使用 auto 而不是 scroll，让滚动条根据内容自动显示
                  scrollerEl.setAttribute(
                    'style',
                    `
                    overflow: auto !important;
                    overflow-y: auto !important;
                    overflow-x: auto !important;
                    height: 100% !important;
                    width: 100% !important;
                    scrollbar-width: auto !important;
                    scrollbar-color: #888 #2a2a2a !important;
                  `
                  )

                  // 滚动条样式已应用
                }
              }, 100)
            }}
          />
        </div>
      </div>
      {!focus_mode && <div className="splitter" onMouseDown={handle_splitter_down} />}
      {!focus_mode && (
        <PreviewArea
          ref={preview_pane_ref}
          rendered_html={rendered_html}
          preview_font_size={preview_font_size}
          setPreviewRef={(el: HTMLDivElement | null) => {
            preview_ref.current = el
            local_preview_ref.current = el
          }}
        />
      )}
      <div className="status_bar" style={{ display: focus_mode ? 'none' : 'flex' }}>
        <div className="status_item">
          {t(ui_language, 'words')}: {status_stats.words}
        </div>
        <div className="status_item">
          {t(ui_language, 'chars')}: {status_stats.chars}
        </div>
        <div className="status_item">
          {t(ui_language, 'read_time')}: ~{status_stats.minutes}{' '}
          {ui_language === 'en-US' ? 'min' : '分钟'}
        </div>
        <div style={{ flex: 1 }} />
        <div className="status_item save_indicator">
          {save_status === 'saved' && (
            <span style={{ color: '#4caf50' }}>
              ● {ui_language === 'en-US' ? 'Saved' : '已保存'}
            </span>
          )}
          {save_status === 'saving' && (
            <span style={{ color: '#ff9800' }}>
              ● {ui_language === 'en-US' ? 'Saving...' : '保存中...'}
            </span>
          )}
          {save_status === 'unsaved' && (
            <span style={{ color: '#f44336' }}>
              ● {ui_language === 'en-US' ? 'Unsaved' : '未保存'}
            </span>
          )}
          {last_saved_time && save_status === 'saved' && (
            <span style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.9em' }}>
              {last_saved_time.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="status_item" title={current_file_path}>
          {current_file_path || t(ui_language, 'unsaved')}
        </div>
      </div>
      {/* 全局搜索结果列表 */}
      {show_global_search && global_results.length > 0 && !focus_mode && (
        <div
          className="pane"
          style={{
            gridColumn: '1 / -1',
            borderTop: '1px solid #2a2a2a',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <ul className="outline_list">
            {global_results.map((r, idx) => (
              <li
                key={idx}
                className="outline_item"
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <button
                  className="outline_btn"
                  title={`${r.path}:${r.lineNo}`}
                  onClick={async () => {
                    // 打开并跳到命中行
                    await open_file_at(r.path)
                    setTimeout(() => {
                      const view = cm_view_ref.current
                      if (!view) return
                      const line = Math.max(1, r.lineNo)
                      const pos = view.state.doc.line(line).from + r.from
                      const pos2 = view.state.doc.line(line).from + r.to
                      view.dispatch({
                        selection: EditorSelection.range(pos, pos2),
                        scrollIntoView: true,
                      })
                      view.focus()
                    }, 50)
                  }}
                >
                  {file_display_name(r.path)}:{r.lineNo}
                </button>
                <div
                  style={{
                    opacity: 0.8,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.preview}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Settings_modal
        is_open={show_settings}
        api_base_url={api_base_url}
        set_api_base_url={set_api_base_url}
        api_key={api_key}
        set_api_key={set_api_key}
        provider={provider}
        set_provider={(v) => {
          set_provider(v)
          apply_provider_defaults(v)
        }}
        model={model}
        set_model={set_model}
        system_prompt={system_prompt}
        set_system_prompt={set_system_prompt}
        temperature={temperature}
        set_temperature={set_temperature}
        editor_font_size={editor_font_size}
        set_editor_font_size={set_editor_font_size}
        preview_font_size={preview_font_size}
        set_preview_font_size={set_preview_font_size}
        ui_language={ui_language}
        set_ui_language={set_ui_language}
        ui_theme={ui_theme}
        set_ui_theme={set_ui_theme}
        ai_actions_enabled={ai_actions_enabled}
        set_ai_actions_enabled={set_ai_actions_enabled}
        ai_custom_templates={ai_custom_templates}
        set_ai_custom_templates={set_ai_custom_templates}
        recent_files={recent_files}
        clear_recent_files={async () => {
          set_recent_files([])
          if (store_ref.current) {
            await store_ref.current.set('recent_files', [])
            await store_ref.current.save()
          }
        }}
        on_open_recent={async (p) => {
          try {
            const content = await readTextFile(p)
            set_markdown_text(content)
            set_current_file_path(p)
          } catch {
            window.alert('打开失败')
          }
        }}
        on_save={handle_save_settings}
        on_close={() => set_show_settings(false)}
        on_test={handle_test_connection}
      />
      <Context_menu
        is_open={ctx_open}
        x={ctx_pos.x}
        y={ctx_pos.y}
        on_close={() => set_ctx_open(false)}
        items={[
          {
            id: 'copy',
            label: ui_language === 'en-US' ? 'Copy' : '复制',
            on_click: () => {
              editor_copy()
            },
          },
          {
            id: 'cut',
            label: ui_language === 'en-US' ? 'Cut' : '剪切',
            on_click: () => {
              editor_cut()
            },
          },
          {
            id: 'paste',
            label: ui_language === 'en-US' ? 'Paste' : '粘贴',
            on_click: () => {
              editor_paste()
            },
          },
          {
            id: 'select_all',
            label: ui_language === 'en-US' ? 'Select All' : '全选',
            on_click: () => {
              editor_select_all()
            },
          },
          {
            id: 'clear',
            label: ui_language === 'en-US' ? 'Clear' : '清除',
            on_click: () => {
              editor_clear()
            },
          },
          // 表情子菜单已移除
          ...(ai_enabled ? [{ id: 'sep-ai', label: 'sep' } as { id: string; label: string }] : []),
          ...(ai_enabled && ctx_has_selection
            ? [
                {
                  id: 'ai_group',
                  label: 'AI',
                  children: [
                    ...(ai_actions_enabled.includes('continue_selection')
                      ? [
                          {
                            id: 'ai_continue_sel',
                            label:
                              ui_language === 'en-US' ? 'Continue (selection)' : '续写（选中）',
                            on_click: () => ai_action('continue', 'selection'),
                          },
                        ]
                      : []),
                    ...(ai_actions_enabled.includes('rewrite_selection')
                      ? [
                          {
                            id: 'ai_rewrite_sel',
                            label: ui_language === 'en-US' ? 'Rewrite (selection)' : '改写（选中）',
                            on_click: () => ai_action('rewrite', 'selection'),
                          },
                        ]
                      : []),
                    ...(ai_actions_enabled.includes('translate_zh_selection')
                      ? [
                          {
                            id: 'ai_translate_zh',
                            label:
                              ui_language === 'en-US'
                                ? 'Translate to Chinese (selection)'
                                : '翻译为中文（选中）',
                            on_click: () => ai_action('translate_zh', 'selection'),
                          },
                        ]
                      : []),
                    ...(ai_actions_enabled.includes('translate_en_selection')
                      ? [
                          {
                            id: 'ai_translate_en',
                            label:
                              ui_language === 'en-US'
                                ? 'Translate to English (selection)'
                                : 'Translate to English（selected）',
                            on_click: () => ai_action('translate_en', 'selection'),
                          },
                        ]
                      : []),
                    ...(ai_actions_enabled.includes('summary_selection')
                      ? [
                          {
                            id: 'ai_summary_sel',
                            label:
                              ui_language === 'en-US'
                                ? 'Summarize (selection)'
                                : '总结要点（选中）',
                            on_click: () => ai_action('summary', 'selection'),
                          },
                        ]
                      : []),
                    ...ai_custom_templates
                      .filter((t) => t.enabled && t.scope === 'selection')
                      .map((t) => ({
                        id: `tpl_${t.id}`,
                        label: t.title,
                        on_click: () => ai_custom_action(t),
                      })),
                    ...(recent_ai_actions.length ? [{ id: 'sep', label: 'sep' }] : []),
                    ...recent_ai_actions.map((act) => ({
                      id: `recent_${act.id}`,
                      label: `${ui_language === 'en-US' ? 'Recent:' : '最近：'}${act.title}`,
                      on_click: () => {
                        // 将最近项映射到内置动作调用
                        if (act.id === 'builtin_continue') ai_action('continue', 'selection')
                        else if (act.id === 'builtin_rewrite') ai_action('rewrite', 'selection')
                        else if (act.id === 'builtin_translate_zh')
                          ai_action('translate_zh', 'selection')
                        else if (act.id === 'builtin_translate_en')
                          ai_action('translate_en', 'selection')
                        else if (act.id === 'builtin_summary') ai_action('summary', 'selection')
                      },
                    })),
                  ],
                },
              ]
            : ai_enabled
              ? [
                  {
                    id: 'ai_hint',
                    label:
                      ui_language === 'en-US'
                        ? 'Please select text to use AI'
                        : '请选择文本以使用 AI 功能',
                    on_click: () => {
                      window.alert(
                        ui_language === 'en-US' ? 'Please select text first' : '请先选中文本'
                      )
                    },
                  },
                ]
              : []),
        ]}
      />
      {/* Outline_modal 已由侧栏替代 */}
      <Ai_result_modal
        is_open={show_ai_result}
        loading={ai_loading}
        title={ai_title}
        result_text={ai_result_text}
        model_name={model}
        elapsed_ms={ai_elapsed_ms}
        ui_language={ui_language}
        on_copy={async () => {
          try {
            await navigator.clipboard.writeText(ai_result_text)
          } catch {
            // Ignore error when copying to clipboard
          }
        }}
        on_copy_md={async () => {
          try {
            await navigator.clipboard.writeText(ai_result_text)
          } catch {
            // Ignore error when copying to clipboard
          }
        }}
        on_copy_code={async () => {
          try {
            await navigator.clipboard.writeText('```\n' + ai_result_text + '\n```')
          } catch {
            // Ignore error when copying to clipboard
          }
        }}
        on_replace={() => {
          const view = cm_view_ref.current
          if (!view) return
          // 清洗：去掉围栏代码块、前后多余提示
          const cleaned = (ai_result_text || '')
            .replace(/^```[\s\S]*?\n|\n```$/g, '')
            .replace(/^输出[:：]\s*/i, '')
            .trim()
          const text = cleaned
          if (ai_last_scope === 'selection') {
            const sel = view.state.selection.main
            const tr = view.state.update({ changes: { from: sel.from, to: sel.to, insert: text } })
            view.dispatch(tr)
          } else if (ai_last_scope === 'document') {
            const tr2 = view.state.update({
              changes: { from: 0, to: view.state.doc.length, insert: text },
            })
            view.dispatch(tr2)
          }
          set_show_ai_result(false)
        }}
        on_cancel={() => {
          abort_ref.current = true
          set_ai_loading(false)
          set_show_ai_result(false)
        }}
        on_close={() => set_show_ai_result(false)}
        on_regen={() => {
          set_ai_result_text('')
          ai_invoke(last_prompt_ref.current)
        }}
      />
      <Ai_chat_modal
        is_open={show_ai_chat}
        provider={provider}
        api_base_url={api_base_url}
        api_key={api_key}
        model={model}
        system_prompt={system_prompt}
        temperature={temperature}
        ui_language={ui_language}
        on_close={() => set_show_ai_chat(false)}
        reset_signal={chat_reset_tick}
        on_insert_to_editor={(text) => {
          const view = cm_view_ref.current
          if (!view) return
          const sel = view.state.selection.main
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: text },
            scrollIntoView: true,
          })
        }}
      />
      <CommandPalette
        is_open={show_command_palette}
        commands={[
          {
            id: 'new',
            label: t(ui_language, 'new_file'),
            shortcut: 'Ctrl+N',
            action: () => {
              const untitled_name = `untitled:${untitled_counter}`
              set_untitled_counter((prev) => prev + 1)
              set_markdown_text('')
              set_current_file_path(untitled_name)
              set_save_status('unsaved')
              set_last_saved_time(null)
            },
          },
          {
            id: 'open',
            label: t(ui_language, 'open'),
            shortcut: 'Ctrl+O',
            action: handle_open_file,
          },
          {
            id: 'save',
            label: t(ui_language, 'save'),
            shortcut: 'Ctrl+S',
            action: handle_save_file,
          },
          { id: 'save_as', label: t(ui_language, 'save_as'), action: handle_save_as },
          {
            id: 'export_html',
            label: t(ui_language, 'export_html'),
            action: async () => {
              const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${(current_file_path || '').split(/[/\\]/).pop() || 'Document'}</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;max-width:840px;margin:24px auto;padding:0 16px;line-height:1.7;} pre{background:#0b0b0b;color:#f3f3f3;padding:12px;border-radius:6px;overflow:auto;} code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;} h1,h2,h3{margin:1.2em 0 .6em}</style></head><body class="markdown_body">${rendered_html}</body></html>`
              const selected = await save({ filters: [{ name: 'HTML', extensions: ['html'] }] })
              if (typeof selected === 'string') {
                await writeTextFile(selected, html)
              }
            },
          },
          {
            id: 'export_pdf',
            label: t(ui_language, 'export_pdf'),
            action: async () => {
              const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${(current_file_path || '').split(/[/\\]/).pop() || 'Document'}</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;max-width:840px;margin:24px auto;padding:0 16px;line-height:1.7;} pre{background:#0b0b0b;color:#f3f3f3;padding:12px;border-radius:6px;overflow:auto;} code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;} h1,h2,h3{margin:1.2em 0 .6em}</style></head><body class="markdown_body">${rendered_html}</body></html>`
              const html2pdf = (window as unknown as { html2pdf?: unknown }).html2pdf as
                | (() => {
                    set: (o: Record<string, unknown>) => {
                      from: (src: string) => { save: () => void }
                    }
                  })
                | undefined
              if (!html2pdf) return
              const opt = {
                margin: 10,
                filename: current_file_path
                  ? current_file_path.replace(/\.md$/, '.pdf')
                  : 'document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              }
              html2pdf().set(opt).from(html).save()
            },
          },
          {
            id: 'settings',
            label: t(ui_language, 'settings'),
            action: () => set_show_settings(true),
          },
          {
            id: 'search',
            label: t(ui_language, 'search_replace'),
            shortcut: 'Ctrl+F',
            action: () => set_show_search(true),
          },
          { id: 'ai_chat', label: t(ui_language, 'ai_chat'), action: () => set_show_ai_chat(true) },
          {
            id: 'toggle_outline',
            label: show_outline ? t(ui_language, 'hide_outline') : t(ui_language, 'show_outline'),
            action: () => set_show_outline(!show_outline),
          },
          {
            id: 'toggle_sync_scroll',
            label:
              ui_language === 'en-US'
                ? sync_scroll
                  ? 'Disable Sync Scroll'
                  : 'Enable Sync Scroll'
                : sync_scroll
                  ? '关闭同步滚动'
                  : '开启同步滚动',
            action: () => set_sync_scroll(!sync_scroll),
          },
          {
            id: 'toggle_theme',
            label: ui_language === 'en-US' ? 'Toggle Theme' : '切换主题',
            action: () => {
              const themes = ['dark', 'light', 'system'] as const
              const current_index = themes.indexOf(ui_theme)
              const next_theme = themes[(current_index + 1) % themes.length]
              set_ui_theme(next_theme)
              apply_theme(next_theme)
            },
          },
          {
            id: 'toggle_language',
            label: ui_language === 'en-US' ? 'Switch to Chinese' : '切换到英文',
            action: () => {
              set_ui_language(ui_language === 'en-US' ? 'zh-CN' : 'en-US')
            },
          },
          {
            id: 'focus_mode',
            label: focus_mode
              ? ui_language === 'en-US'
                ? 'Exit Focus Mode'
                : '退出专注模式'
              : ui_language === 'en-US'
                ? 'Enter Focus Mode'
                : '进入专注模式',
            shortcut: 'F11',
            action: () => {
              set_focus_mode(!focus_mode)
            },
          },
          {
            id: 'toggle_wrap',
            label:
              ui_language === 'en-US'
                ? wrap_enabled
                  ? 'Disable Word Wrap'
                  : 'Enable Word Wrap'
                : wrap_enabled
                  ? '关闭自动换行'
                  : '开启自动换行',
            shortcut: 'Alt+Z',
            action: async () => {
              const next = !wrap_enabled
              set_wrap_enabled(next)
              if (store_ref.current) {
                try {
                  await store_ref.current.set('wrap_enabled', next)
                  await store_ref.current.save()
                } catch {
                  // Ignore error when saving wrap_enabled setting
                }
              }
            },
          },
          {
            id: 'toggle_line_numbers',
            label:
              ui_language === 'en-US'
                ? line_numbers_enabled
                  ? 'Hide Line Numbers'
                  : 'Show Line Numbers'
                : line_numbers_enabled
                  ? '隐藏行号'
                  : '显示行号',
            shortcut: 'Ctrl+Shift+L',
            action: async () => {
              const next = !line_numbers_enabled
              set_line_numbers_enabled(next)
              if (store_ref.current) {
                try {
                  await store_ref.current.set('line_numbers_enabled', next)
                  await store_ref.current.save()
                } catch {
                  // Ignore error when saving line_numbers_enabled setting
                }
              }
            },
          },
          {
            id: 'font_increase',
            label: ui_language === 'en-US' ? 'Increase Font Size' : '增大编辑器字号',
            shortcut: 'Ctrl+=',
            action: () => {
              increase_editor_font_size()
            },
          },
          {
            id: 'font_decrease',
            label: ui_language === 'en-US' ? 'Decrease Font Size' : '减小编辑器字号',
            shortcut: 'Ctrl+-',
            action: () => {
              decrease_editor_font_size()
            },
          },
          {
            id: 'font_reset',
            label: ui_language === 'en-US' ? 'Reset Font Size' : '重置编辑器字号',
            shortcut: 'Ctrl+0',
            action: () => {
              reset_editor_font_size()
            },
          },
          {
            id: 'insert_iso_datetime',
            label: ui_language === 'en-US' ? 'Insert DateTime (ISO)' : '插入日期时间（ISO）',
            action: () => {
              insert_iso_datetime()
            },
          },
          {
            id: 'insert_local_datetime',
            label: ui_language === 'en-US' ? 'Insert DateTime (Local)' : '插入日期时间（本地）',
            action: () => {
              insert_local_datetime()
            },
          },
          {
            id: 'global_search',
            label:
              ui_language === 'en-US'
                ? 'Global Search... (Ctrl+Shift+F)'
                : '全局搜索... (Ctrl+Shift+F)',
            shortcut: 'Ctrl+Shift+F',
            action: () => set_show_global_search(true),
          },
          {
            id: 'fmt_bold',
            label: ui_language === 'en-US' ? 'Bold (selection)' : '加粗（选区）',
            shortcut: 'Ctrl+B',
            action: () => toggle_inline_format('**'),
          },
          {
            id: 'fmt_italic',
            label: ui_language === 'en-US' ? 'Italic (selection)' : '斜体（选区）',
            shortcut: 'Ctrl+I',
            action: () => toggle_inline_format('*'),
          },
          {
            id: 'fmt_code',
            label: ui_language === 'en-US' ? 'Inline Code (selection)' : '行内代码（选区）',
            shortcut: 'Ctrl+`',
            action: () => toggle_inline_format('`'),
          },
          // 打开标签页快速切换
          ...open_tabs.map((p) => ({
            id: `switch_tab_${p}`,
            label: `${ui_language === 'en-US' ? '[Tab]' : '[标签]'} ${file_display_name(p)}`,
            action: () => switch_to_tab(p),
          })),
          // 最近文件（最多 10 条）
          ...recent_files.slice(0, 10).map((p, idx) => ({
            id: `recent_${idx}_${p}`,
            label: `${ui_language === 'en-US' ? '[Recent]' : '[最近]'} ${file_display_name(p)}`,
            shortcut: idx < 9 ? `Alt+${idx + 1}` : undefined,
            action: () => open_file_at(p),
          })),
        ]}
        ui_language={ui_language}
        on_close={() => set_show_command_palette(false)}
      />

      {show_image_manager && (
        <ImageManager
          images={imageManager.images}
          onImageClick={(img) => {
            console.log('Clicked image:', img)
          }}
          getAbsolutePath={imageManager.getAbsolutePath}
          onClose={() => set_show_image_manager(false)}
        />
      )}

      {show_table_editor && editing_table_range && (
        <TableEditor
          initialTableText={editing_table_text}
          onSave={(newTableText) => {
            const view = cm_view_ref.current
            if (!view || !editing_table_range) return

            // 计算表格在文档中的字符位置
            const lines = markdown_text.split('\n')
            let startPos = 0
            for (let i = 0; i < editing_table_range.startLine; i++) {
              startPos += lines[i].length + 1 // +1 for newline
            }

            let endPos = startPos
            for (let i = editing_table_range.startLine; i <= editing_table_range.endLine; i++) {
              endPos += lines[i].length + 1
            }
            endPos -= 1 // Remove last newline

            // Replace table in editor
            view.dispatch({
              changes: { from: startPos, to: endPos, insert: newTableText },
            })

            set_show_table_editor(false)
          }}
          onCancel={() => set_show_table_editor(false)}
        />
      )}

      {show_shortcuts && (
        <KeyboardShortcuts language={ui_language} onClose={() => set_show_shortcuts(false)} />
      )}

      {show_focus_hint && (
        <div className="focus-mode-hint">
          {ui_language === 'en-US'
            ? 'Press ESC or F11 to exit focus mode'
            : '按 ESC 或 F11 退出专注模式'}
        </div>
      )}
    </div>
  )
}

export default App
