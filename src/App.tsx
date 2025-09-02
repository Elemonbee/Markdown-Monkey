import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { t } from './i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { Store } from '@tauri-apps/plugin-store'
const monkeyIcon = new URL('../assets/icon.svg', import.meta.url).href
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile, writeFile } from '@tauri-apps/plugin-fs'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, Decoration } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { EditorSelection, RangeSetBuilder, StateField } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import Settings_modal from './components/settings_modal'
import Context_menu from './components/context_menu'
import Ai_result_modal from './components/ai_result_modal'
// import Outline_modal from './components/outline_modal'
import Ai_chat_modal from './components/ai_chat_modal'

/**
 * App
 * 应用主组件：左侧 Markdown 编辑，右侧 HTML 预览（含代码高亮与 XSS 清理）
 */
function App() {
  const [markdown_text, set_markdown_text] = useState<string>(`# MarkdownMonkey 使用说明

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

祝你写作愉快！`)
  const preview_ref = useRef<HTMLDivElement | null>(null)
  const store_ref = useRef<Store | null>(null)
  const [api_base_url, set_api_base_url] = useState<string>('https://api.openai.com')
  const [api_key, set_api_key] = useState<string>('')
  const [current_file_path, set_current_file_path] = useState<string>('')
  const [provider, set_provider] = useState<string>('openai')
  const [model, set_model] = useState<string>('gpt-4o-mini')
  const [system_prompt, set_system_prompt] = useState<string>('You are a helpful assistant for markdown writing.')
  const [temperature, set_temperature] = useState<number>(0.7)

  const [rendered_html, set_rendered_html] = useState<string>('')
  const [show_settings, set_show_settings] = useState<boolean>(false)
  const [split_ratio, set_split_ratio] = useState<number>(0.5)
  const container_ref = useRef<HTMLDivElement | null>(null)
  const is_dragging_ref = useRef<boolean>(false)
  const [editor_font_size, set_editor_font_size] = useState<number>(16)
  const [preview_font_size, set_preview_font_size] = useState<number>(16)
  const [ui_theme, set_ui_theme] = useState<string>('dark')
  const [ui_language, set_ui_language] = useState<string>('zh-CN')
  const media_query_ref = useRef<MediaQueryList | null>(null)
  const [ai_enabled, set_ai_enabled] = useState<boolean>(false)
  const [status_stats, set_status_stats] = useState<{ chars: number, words: number, minutes: number }>({ chars: 0, words: 0, minutes: 0 })
  const [ai_last_scope, set_ai_last_scope] = useState<'selection' | 'document' | 'unknown'>('unknown')
  const [show_ai_result, set_show_ai_result] = useState<boolean>(false)
  const [ai_loading, set_ai_loading] = useState<boolean>(false)
  const [ai_title, set_ai_title] = useState<string>('AI Result')
  const [ai_result_text, set_ai_result_text] = useState<string>('')
  const [ai_elapsed_ms, set_ai_elapsed_ms] = useState<number>(0)
  const abort_ref = useRef<boolean>(false)
  const unsubscribe_ref = useRef<() => void>(() => {})
  const last_prompt_ref = useRef<string>('')
  const autosave_timer_ref = useRef<number | null>(null)
  const [history_enabled] = useState<boolean>(true)
  const [history_interval_ms] = useState<number>(15000)
  const [show_outline, set_show_outline] = useState<boolean>(false)
  const [outline_items, set_outline_items] = useState<Array<{ level: number, text: string, line: number }>>([])
  const [outline_width, set_outline_width] = useState<number>(280)
  const [ai_actions_enabled, set_ai_actions_enabled] = useState<string[]>([
    'continue_selection','continue_document','rewrite_selection','translate_zh_selection','translate_en_selection','summary_selection','summary_document'
  ])
  const [ai_custom_templates, set_ai_custom_templates] = useState<Array<{ id: string, title: string, body: string, scope: 'selection' | 'document', enabled: boolean, vars?: { lang?: string, style?: string } }>>([])
  const [ctx_open, set_ctx_open] = useState<boolean>(false)
  const [ctx_pos, set_ctx_pos] = useState<{x:number,y:number}>({x:0,y:0})
  const cm_view_ref = useRef<EditorView | null>(null)
  const [ctx_has_selection, set_ctx_has_selection] = useState<boolean>(false)
  const [recent_files, set_recent_files] = useState<string[]>([])
  const [recent_ai_actions, set_recent_ai_actions] = useState<Array<{ id: string, title: string }>>([])
  const [show_ai_chat, set_show_ai_chat] = useState<boolean>(false)
  const [chat_reset_tick, set_chat_reset_tick] = useState<number>(0)
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
  const [tab_ctx_pos, set_tab_ctx_pos] = useState<{x:number,y:number}>({x:0,y:0})
  const [tab_ctx_path, set_tab_ctx_path] = useState<string>('')
  // const auto_refresh_timer_ref = useRef<any>(null)

  /**
   * file_display_name
   * 从完整路径中提取显示名称（文件名）。
   */
  function file_display_name(p: string): string {
    if (!p) return ''
    // 先尝试以 / 或 \\ 分割
    const seg = p.split(/[/\\]/)
    const tail = seg[seg.length - 1]
    if (tail) return tail
    // 兜底：用正则去掉前缀目录
    return p.replace(/^[\s\S]*[\\/]/, '')
  }

  // 确保当前打开文件总在标签栏里，且避免把工作区路径误当作标签
  useEffect(() => {
    const isFile = typeof current_file_path === 'string' && /\.(md|markdown)$/i.test(current_file_path)
    if (!isFile) return
    set_open_tabs((prev) => {
      const cleaned = prev.filter((t) => t && t !== workspace_root)
      if (cleaned.includes(current_file_path)) return cleaned
      return [...cleaned, current_file_path]
    })
  }, [current_file_path, workspace_root])

  /**
   * switch_to_tab
   * 切换到指定标签（文件路径）。若已是当前文件则不重复读取。
   */
  async function switch_to_tab(path: string) {
    if (!path) return
    if (current_file_path === path) return
    try {
      const content = await readTextFile(path)
      set_markdown_text(content)
      set_current_file_path(path)
    } catch (e) { console.error(e) }
  }

  /**
   * close_tab
   * 关闭标签；若关闭的是当前标签，则切换到相邻一个标签或清空。
   */
  async function close_tab(path: string) {
    set_open_tabs((prev) => {
      const idx = prev.indexOf(path)
      const nextTabs = prev.filter((p) => p !== path)
      // 若关闭的是当前标签，切换到相邻一个标签
      if (current_file_path === path) {
        const fallback = idx > 0 ? nextTabs[idx - 1] : (nextTabs[idx] || nextTabs[nextTabs.length - 1])
        if (fallback) {
          // 切到 fallback
          switch_to_tab(fallback)
        } else {
          // 没有标签了，清空状态
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
  function apply_theme(theme: string) {
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
      if (!api_base_url || api_base_url.startsWith('https://')) set_api_base_url('http://127.0.0.1:11434')
      if (!model || model === 'gpt-4o-mini') set_model('llama3')
      return
    }
    if (p === 'openai') {
      set_api_base_url('https://api.openai.com')
      if (!model || model === 'llama3') set_model('gpt-4o-mini')
      return
    }
    if (p === 'openrouter') {
      set_api_base_url('https://openrouter.ai/api/v1')
      if (!model || model === 'gpt-4o-mini') set_model('openai/gpt-4o')
      return
    }
    if (p === 'claude') {
      set_api_base_url('https://api.anthropic.com')
      if (!model) set_model('claude-3-5-sonnet-latest')
      return
    }
    if (p === 'deepseek') {
      set_api_base_url('https://api.deepseek.com')
      if (!model) set_model('deepseek-chat')
      return
    }
    if (p === 'kimi') {
      set_api_base_url('https://api.moonshot.cn')
      if (!model) set_model('moonshot-v1-8k')
      return
    }
  }

  async function open_file_at(path: string) {
    try {
      const content = await readTextFile(path)
      set_markdown_text(content)
      set_current_file_path(path)
      set_open_tabs((prev) => prev.includes(path) ? prev : [...prev, path])
    } catch (e) { console.error(e) }
  }

  async function handle_open_folder() {
    const dir = await open({ directory: true, defaultPath: workspace_root || undefined } as any)
    if (typeof dir !== 'string') return
    set_workspace_root(dir)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const paths = await invoke<string[]>('list_md_files', { dir })
      const unique = Array.from(new Set(paths))
      set_file_list(unique.sort())
      if (unique.length === 0) console.warn('[handle_open_folder] no markdown files found or access denied in:', dir)
    } catch (e) { console.error(e); set_file_list([]) }
    set_side_tab('files')
    set_show_outline(true)
    // 启动自动刷新：每 3s 拉取一次（简单轮询）
    // 切换为文件系统监听：告知后端开始 watch
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('watch_start', { dir })
    } catch { /* ignore */ }
  }

  /**
   * compute_rendered_html
   * 根据当前 markdown 文本计算并更新 HTML 预览
   */
  function compute_rendered_html(md_text: string) {
    const parsed = marked.parse(md_text)
    if (typeof parsed === 'string') {
      const sanitized_html = DOMPurify.sanitize(parsed, { USE_PROFILES: { html: true, svg: true, svgFilters: true } })
      set_rendered_html(sanitized_html)
    } else {
      parsed.then((html) => {
        const sanitized_html = DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true, svgFilters: true } })
        set_rendered_html(sanitized_html)
      })
    }
  }

  useEffect(() => {
    compute_rendered_html(markdown_text)
    const chars = markdown_text.length
    const words = (markdown_text.match(/\S+/g) || []).length
    const minutes = Math.max(1, Math.round(words / 200))
    set_status_stats({ chars, words, minutes })
  }, [markdown_text])

  // 监听后端 fs 事件 → 刷新文件列表
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
          } catch {}
        })
      } catch { /* ignore */ }
    })()
    return () => { try { if (unlisten) unlisten() } catch { /* ignore */ } }
  }, [workspace_root])

  // 预览命中高亮
  useEffect(() => {
    const root = preview_ref.current
    if (!root) return
    // 先清理旧的高亮
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
      try { re = new RegExp(q, search_case_i ? 'gi' : 'g') } catch { re = null }
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

  // 解析大纲（支持行首 0-3 空格、尾部可选 #）
  useEffect(() => {
    const lines = markdown_text.split('\n')
    const items: Array<{ level: number, text: string, line: number }> = []
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
          ts
        })
        // 仅保留最近 20 条
        const all = await store_ref.current.keys()
        const histories = all.filter((k) => typeof k === 'string' && (k as string).startsWith('history_')) as string[]
        if (histories.length > 20) {
          const sorted = histories.sort()
          const toDelete = sorted.slice(0, histories.length - 20)
          for (const k of toDelete) await store_ref.current.delete(k)
        }
        await store_ref.current.save()
      } catch (e) { console.error(e) }
    }, history_interval_ms)
    return () => { if (autosave_timer_ref.current) clearInterval(autosave_timer_ref.current) }
  }, [history_enabled, history_interval_ms, markdown_text, current_file_path, model, provider])

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
          try { await mkdir(imagesDir, { recursive: true }) } catch {}
          const nameSafe = `pasted_${Date.now()}.png`
          const target = imagesDir + pathSep + nameSafe
          await writeFsFile(target, new Uint8Array(arr))
          const rel = `./images/${nameSafe}`
          const md = `![image](${rel})`
          const view = cm_view_ref.current
          if (view) {
            const sel = view.state.selection.main
            view.dispatch({ changes: { from: sel.from, to: sel.to, insert: md }, scrollIntoView: true })
          }
        }
      } catch {}
    }
    window.addEventListener('paste', on_paste as any)
    return () => window.removeEventListener('paste', on_paste as any)
  }, [current_file_path])

  function find_all_matches(docText: string): Array<{ from: number, to: number }> {
    if (!search_query) return []
    try {
      if (search_regex) {
        const flags = search_case_i ? 'gi' : 'g'
        const re = new RegExp(search_query, flags)
        const out: Array<{ from: number, to: number }> = []
        let m: RegExpExecArray | null
        while ((m = re.exec(docText))) {
          out.push({ from: m.index, to: m.index + m[0].length })
          if (m[0].length === 0) re.lastIndex++
        }
        return out
      } else {
        const q = search_case_i ? search_query.toLowerCase() : search_query
        const src = search_case_i ? docText.toLowerCase() : docText
        const out: Array<{ from: number, to: number }> = []
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
  }

  // 高亮命中：构建装饰
  const searchDecorations: DecorationSet | null = useMemo(() => {
    const view = cm_view_ref.current
    if (!view || !search_query) return null
    const matches = find_all_matches(view.state.doc.toString())
    const builder = new RangeSetBuilder<Decoration>()
    const deco = Decoration.mark({ class: 'mmk-search-hit' })
    matches.forEach(r => builder.add(r.from, r.to, deco))
    return builder.finish()
  }, [find_all_matches])

  const searchHighlightField: StateField<DecorationSet> | null = useMemo(() => {
    if (!searchDecorations) return null
    return StateField.define<DecorationSet>({
      create() { return searchDecorations },
      update(_value) { return searchDecorations },
      provide: f => EditorView.decorations.from(f)
    })
  }, [searchDecorations])

  function update_search_state(selectFirst: boolean) {
    const view = cm_view_ref.current
    if (!view) return
    const docText = view.state.doc.toString()
    const matches = find_all_matches(docText)
    set_search_total(matches.length)
    if (matches.length === 0) { set_search_idx(-1); return }
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
    if (matches.length === 0) { set_search_idx(-1); set_search_total(0); return }
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
    if (matches.length === 0) { set_search_idx(-1); set_search_total(0); return }
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
    const changes = matches.map(r => ({ from: r.from, to: r.to, insert: replace_query }))
    const tr = view.state.update({ changes })
    view.dispatch(tr)
    set_markdown_text(view.state.doc.toString())
    set_search_idx(-1)
    set_search_total(0)
  }

  // 编辑器 -> 预览 同步滚动
  useEffect(() => {
    const view = cm_view_ref.current
    const preview = preview_ref.current
    if (!view || !preview) return
    const onScroll = () => {
      const s = view.scrollDOM
      const ratio = s.scrollTop / Math.max(1, s.scrollHeight - s.clientHeight)
      preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
    }
    view.scrollDOM.addEventListener('scroll', onScroll)
    return () => view.scrollDOM.removeEventListener('scroll', onScroll)
  }, [])

  // 初始化 store
  useEffect(() => {
    async function init_store() {
      const s = await Store.load('settings.json')
      store_ref.current = s
      const saved_base = (await s.get<string>('api_base_url')) || api_base_url
      const saved_key = (await s.get<string>('api_key')) || ''
      const saved_provider = (await s.get<string>('provider')) || provider
      const saved_model = (await s.get<string>('model')) || model
      const saved_system = (await s.get<string>('system_prompt')) || system_prompt
      const saved_temp = (await s.get<number>('temperature')) || temperature
      const saved_split = (await s.get<number>('split_ratio')) || split_ratio
      const saved_editor_fs = (await s.get<number>('editor_font_size')) || editor_font_size
      const saved_preview_fs = (await s.get<number>('preview_font_size')) || preview_font_size
      const saved_ai_enabled = (await s.get<boolean>('ai_enabled'))
      const saved_actions = (await s.get<string[]>('ai_actions_enabled'))
      const saved_custom = (await s.get<any>('ai_custom_templates'))
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
      const saved_outline_shown = (await s.get<boolean>('outline_shown'))
      const saved_outline_width = (await s.get<number>('outline_width'))
      if (typeof saved_outline_shown === 'boolean') set_show_outline(saved_outline_shown)
      if (typeof saved_outline_width === 'number') set_outline_width(saved_outline_width)
      const saved_theme = (await s.get<string>('ui_theme')) || ui_theme
      const saved_lang = (await s.get<string>('ui_language')) || ui_language
      const saved_recent_ai = (await s.get<Array<{ id: string, title: string }>>('recent_ai_actions')) || []
      set_ui_theme(saved_theme)
      set_ui_language(saved_lang)
      set_recent_ai_actions(saved_recent_ai)
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
    await store_ref.current.set('api_key', api_key)
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
    await store_ref.current.save()
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
    } catch {}
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
    if (!current_file_path) {
      await handle_save_as()
      return
    }
    await writeTextFile(current_file_path, markdown_text)
  }

  /**
   * handle_save_as
   * 另存为文件
   */
  async function handle_save_as() {
    const target = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: current_file_path || 'untitled.md',
    })
    if (!target) return
    await writeTextFile(target, markdown_text)
    set_current_file_path(target)
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
      const ok = window.confirm('当前 Provider 为 OpenRouter，但 API Key 看起来不是 OpenRouter Key（通常以 sk-or- 开头）。仍要继续发送吗？')
      if (!ok) return
    }
    set_ai_loading(true)
    const start_ts = Date.now()
    set_show_ai_result(true)
    set_ai_result_text('')
    abort_ref.current = false
    last_prompt_ref.current = prompt_text
    // 监听流事件（解析 data: JSON 行，兼容 OpenAI/Anthropic）
    try { unsubscribe_ref.current(); } catch {}
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
      if (data === '[DONE]') { flush(); set_ai_loading(false); set_ai_elapsed_ms(Date.now() - start_ts); return }
      try {
        const obj = JSON.parse(data)
        const delta = obj?.choices?.[0]?.delta?.content
        const t1 = obj?.delta?.text
        const t2 = obj?.content_block?.text || obj?.content?.[0]?.text
        const piece = typeof delta === 'string' ? delta : typeof t1 === 'string' ? t1 : typeof t2 === 'string' ? t2 : ''
        if (!piece) return
        bufferText += piece
        if (!throttling) {
          throttling = true
          setTimeout(() => { flush(); throttling = false }, 60)
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
        }
      })
    } catch (e: any) {
      console.error(e)
      if (!abort_ref.current) set_ai_result_text((prev) => prev || `错误：${e}`)
    } finally {
      set_ai_loading(false)
      set_ai_elapsed_ms((prev) => prev || (Date.now() - start_ts))
    }
  }

  async function ai_action(action: 'continue' | 'rewrite' | 'translate_zh' | 'translate_en' | 'summary', scope: 'selection' | 'document') {
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
    set_ai_title({
      continue: ui_language==='en-US'?'Continue Result':'续写结果',
      rewrite: ui_language==='en-US'?'Rewrite Result':'改写结果',
      translate_zh: ui_language==='en-US'?'Translate to Chinese':'翻译为中文',
      translate_en: 'Translate to English',
      summary: ui_language==='en-US'?'Summary':'总结要点'
    }[action])
    set_ai_last_scope(scope)
    // 记录最近动作（仅记录 selection 作用域，符合右键菜单使用场景）
    if (scope === 'selection') {
      const titleMap: Record<string, string> = {
        continue: '续写（选中）',
        rewrite: '改写（选中）',
        translate_zh: '翻译为中文（选中）',
        translate_en: 'Translate to English（selected）',
        summary: '总结要点（选中）'
      }
      const id = `builtin_${action}`
      const title = titleMap[action]
      set_recent_ai_actions((prev) => {
        const next = [{ id, title }, ...prev.filter(x => x.id !== id)]
        return next.slice(0, 5)
      })
      if (store_ref.current) {
        try { await store_ref.current.set('recent_ai_actions', [{ id, title }, ...recent_ai_actions.filter(x => x.id !== id)].slice(0,5)); await store_ref.current.save() } catch {}
      }
    }
    await ai_invoke(prompt)
  }

  async function ai_custom_action(tpl: { title: string, body: string, scope: 'selection' | 'document', vars?: { lang?: string, style?: string } }) {
    const selection = get_selection_text()
    if (tpl.scope === 'selection' && !selection) {
      window.alert('请先选中要处理的文本，然后再执行该操作。')
      return
    }
    const source = tpl.scope === 'selection' ? selection : markdown_text
    let prompt = (tpl.body || '')
    prompt = prompt.replaceAll('{text}', source)
    if (tpl.vars?.lang) prompt = prompt.replaceAll('{lang}', tpl.vars.lang)
    if (tpl.vars?.style) prompt = prompt.replaceAll('{style}', tpl.vars.style)
    // 内置变量：日期/文件名/模型/提供商
    const now = new Date()
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    const date_str = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
    const filename = current_file_path ? current_file_path.split(/[/\\]/).pop() || '' : ''
    prompt = prompt.replaceAll('{date}', date_str)
    prompt = prompt.replaceAll('{filename}', filename)
    prompt = prompt.replaceAll('{model}', model)
    prompt = prompt.replaceAll('{provider}', provider)
    set_ai_title(tpl.title || (ui_language==='en-US'?'AI Result':'AI 结果'))
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
        }
      })
      window.alert(msg)
    } catch (e: any) {
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
        range: EditorSelection.range(pos, pos)
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
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  async function editor_cut() {
    const view = cm_view_ref.current
    if (!view) return
    const sel = view.state.selection.main
    const text = view.state.sliceDoc(sel.from, sel.to)
    try { await navigator.clipboard.writeText(text) } catch {}
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
    } catch {}
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

  return (
    <div className="container" ref={container_ref} style={{ gridTemplateColumns: `${show_outline ? outline_width : 0}px 6px ${Math.round(split_ratio*100)}% 6px ${100 - Math.round(split_ratio*100)}%` }}>
      <div className="settings_bar" style={{ gridColumn: '1 / -1' }}>
        <img src={monkeyIcon} alt="MarkdownMonkey" style={{ width: 22, height: 22, alignSelf: 'center' }} />
        <button className="settings_btn" onClick={handle_open_file}>{t(ui_language, 'open')}</button>
        <button className="settings_btn" onClick={handle_open_folder}>{t(ui_language, 'open_folder')}</button>
        <button className="settings_btn" onClick={handle_save_file}>{current_file_path ? t(ui_language, 'save') : t(ui_language, 'save_as')}</button>
        <button className="settings_btn" onClick={() => set_show_settings(true)}>{t(ui_language, 'settings')}</button>
        <button className="settings_btn" onClick={() => { set_show_search(v => !v); if (!show_search) setTimeout(() => update_search_state(true), 0) }}>{show_search ? t(ui_language, 'close_search') : t(ui_language, 'search_replace')}</button>
        <button className="settings_btn" onClick={async () => {
          // 导出 HTML
          const { save } = await import('@tauri-apps/plugin-dialog')
          const { writeTextFile } = await import('@tauri-apps/plugin-fs')
          const target = await save({ filters: [{ name: 'HTML', extensions: ['html'] }], defaultPath: 'export.html' })
          if (!target) return
          const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${(current_file_path||'').split(/[/\\]/).pop()||'Document'}</title><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;max-width:840px;margin:24px auto;padding:0 16px;line-height:1.7;} pre{background:#0b0b0b;color:#f3f3f3;padding:12px;border-radius:6px;overflow:auto;} code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;} h1,h2,h3{margin:1.2em 0 .6em}</style></head><body class="markdown_body">${rendered_html}</body></html>`
          await writeTextFile(target, html)
          alert('已导出 HTML 到: '+target)
        }}>{t(ui_language, 'export_html')}</button>
        <button className="settings_btn" onClick={async () => {
          try {
            const { default: html2pdf } = await import('html2pdf.js')
            const target = await save({ filters: [{ name: 'PDF', extensions: ['pdf'] }], defaultPath: 'export.pdf' })
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
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }
            const worker = (html2pdf as any)().set(opt).from(temp)
            const blob: Blob = await new Promise((resolve, reject) => {
              try { worker.outputPdf('blob').then(resolve).catch(reject) } catch (e) { reject(e) }
            })
            const bytes = new Uint8Array(await blob.arrayBuffer())
            await writeFile(target, bytes)
            alert(t(ui_language, 'pdf_success') + target)
          } catch (e) { console.error(e); alert(t(ui_language, 'pdf_failed') + e) }
        }}>{t(ui_language, 'export_pdf')}</button>
        <button className="settings_btn" onClick={handle_ai_complete}>{ai_enabled ? t(ui_language, 'ai_enabled') : t(ui_language, 'enable_ai')}</button>
        {ai_enabled && (
          <>
            <button className="settings_btn" onClick={() => set_show_ai_chat(true)}>{t(ui_language, 'ai_chat')}</button>
            {show_ai_chat && (
              <button
                className="settings_btn"
                style={{ padding: '4px 6px', fontSize: 10, lineHeight: '1.1', height: 24, alignSelf: 'flex-end' }}
                onClick={() => set_chat_reset_tick(Date.now())}
                title="重置 AI 对话位置"
              >{t(ui_language, 'reset_position')}</button>
            )}
          </>
        )}
        <button className="settings_btn" onClick={() => set_show_outline((v) => !v)}>{show_outline ? t(ui_language, 'hide_outline') : t(ui_language, 'show_outline')}</button>
      </div>
      {show_search && (
        <div className="settings_bar" style={{ gridColumn: '1 / -1', gap: 8 }}>
          <input className="settings_input" placeholder={t(ui_language, 'search_placeholder')} value={search_query} onChange={(e) => set_search_query(e.target.value)} onKeyDown={(e) => { if (e.key==='Enter') update_search_state(true) }} />
          <input className="settings_input" placeholder={t(ui_language, 'replace_placeholder')} value={replace_query} onChange={(e) => set_replace_query(e.target.value)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={search_regex} onChange={(e) => set_search_regex(e.target.checked)} /> {t(ui_language, 'regex')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={search_case_i} onChange={(e) => set_search_case_i(e.target.checked)} /> {t(ui_language, 'case_insensitive')}
          </label>
          <button className="settings_btn" onClick={() => update_search_state(true)}>{t(ui_language, 'search_btn')}</button>
          <button className="settings_btn" onClick={search_prev}>{t(ui_language, 'prev')}</button>
          <button className="settings_btn" onClick={search_next}>{t(ui_language, 'next')}</button>
          <button className="settings_btn" onClick={replace_current}>{t(ui_language, 'replace')}</button>
          <button className="settings_btn" onClick={replace_all}>{t(ui_language, 'replace_all')}</button>
          <div className="status_item">{search_total > 0 ? `${search_idx + 1}/${search_total}` : '0/0'}</div>
        </div>
      )}
      {/* 标签栏 */}
      {open_tabs.length > 0 && (
        <div className="settings_bar" style={{ gridColumn: '1 / -1', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {open_tabs.map((p, idx) => {
            const safe = typeof p === 'string' ? p : ''
            if (!safe) return null
            const is_active = safe === current_file_path
            const name = file_display_name(safe)
            return (
              <div key={safe}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/tab-index', String(idx)) }}
                onDragOver={(e) => { e.preventDefault() }}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromIdx = parseInt(e.dataTransfer.getData('text/tab-index') || '-1', 10)
                  if (fromIdx < 0 || fromIdx === idx) return
                  set_open_tabs((prev) => {
                    const next = prev.slice()
                    const [moved] = next.splice(fromIdx, 1)
                    next.splice(idx, 0, moved)
                    return next
                  })
                }}
                style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 4, border: is_active ? '1px solid #6aa0ff' : '1px solid #3a3a3a', padding: '2px 6px', background: is_active ? 'rgba(106,160,255,0.12)' : 'transparent' }}
                onContextMenu={(e) => { e.preventDefault(); set_tab_ctx_open(true); set_tab_ctx_pos({ x: e.clientX, y: e.clientY }); set_tab_ctx_path(safe) }}
              >
                <button
                  className="settings_btn"
                  title={safe}
                  style={{ padding: '2px 6px', lineHeight: '1.2' }}
                  onClick={() => switch_to_tab(safe)}
                >{name}</button>
                <button
                  className="settings_btn"
                  title="关闭标签"
                  style={{ padding: '2px 6px', lineHeight: '1.2' }}
                  onClick={() => close_tab(safe)}
                >×</button>
              </div>
            )
          })}
        </div>
      )}
      {tab_ctx_open && (
        <div style={{ position: 'fixed', left: tab_ctx_pos.x, top: tab_ctx_pos.y, zIndex: 9999, background: '#1f1f1f', border: '1px solid #3a3a3a', borderRadius: 4, padding: 4 }}
          onMouseLeave={() => set_tab_ctx_open(false)}
        >
          <button className="settings_btn" style={{ display: 'block', width: 180, textAlign: 'left' }} onClick={() => { set_tab_ctx_open(false); set_open_tabs((prev) => prev.filter((p) => p === tab_ctx_path)); switch_to_tab(tab_ctx_path) }}>{t(ui_language, 'close_others')}</button>
          <button className="settings_btn" style={{ display: 'block', width: 180, textAlign: 'left' }} onClick={() => { set_tab_ctx_open(false); const idx = open_tabs.indexOf(tab_ctx_path); set_open_tabs((prev) => prev.filter((_, i) => i <= idx)); switch_to_tab(tab_ctx_path) }}>{t(ui_language, 'close_right')}</button>
          <button className="settings_btn" style={{ display: 'block', width: 180, textAlign: 'left' }} onClick={() => { set_tab_ctx_open(false); const path = tab_ctx_path; if (path) navigator.clipboard.writeText(path).catch(() => {}); }}>{t(ui_language, 'copy_path')}</button>
          <button className="settings_btn" style={{ display: 'block', width: 180, textAlign: 'left' }} onClick={() => { set_tab_ctx_open(false); const path = tab_ctx_path; if (!path) return; const base = path.split(/[/\\]/).slice(0, -1).join('/'); set_workspace_root(base); set_side_tab('files') }}>{t(ui_language, 'locate_in_tree')}</button>
        </div>
      )}
      {show_outline && (
        <div className="pane pane-outline" style={{ width: outline_width }}>
          <div className="sidebar_tabs">
            <button className={`tab_button ${side_tab==='outline'?'active':''}`} onClick={() => set_side_tab('outline')}>{t(ui_language, 'tab_outline')}</button>
            <button className={`tab_button ${side_tab==='files'?'active':''}`} onClick={() => set_side_tab('files')}>{t(ui_language, 'tab_files')}</button>
          </div>
          {side_tab === 'outline' ? (
            <ul className="outline_list">
              {outline_items.map((h, i) => (
                <li key={i} className="outline_item" style={{ paddingLeft: (h.level - 1) * 12 }}>
                  <button className="outline_btn" onClick={() => {
                    const view = cm_view_ref.current
                    if (!view) return
                    const pos = view.state.doc.line(Math.max(1, h.line + 1)).from
                    view.dispatch({ selection: EditorSelection.cursor(pos), scrollIntoView: true })
                  }}>{`H${h.level}`} · {h.text}</button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '8px' }}>
              <div className="status_item" title={workspace_root}>{workspace_root ? file_display_name(workspace_root) : '未选择文件夹'}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button className="settings_btn" onClick={async () => {
                  const base = workspace_root || ''
                  const name = window.prompt(t(ui_language, 'new_file') + ' (.md)', 'untitled.md')
                  if (!name) return
                  const full = (base ? base.replace(/\\/g,'/') + '/' : '') + name
                  try { const { invoke } = await import('@tauri-apps/api/core'); await invoke('create_empty_file', { path: full }); const { invoke: inv } = await import('@tauri-apps/api/core'); const paths = await inv<string[]>('list_md_files', { dir: workspace_root }); set_file_list(Array.from(new Set(paths)).sort()) } catch (e) { alert('新建失败：'+e) }
                }}>{t(ui_language, 'new_file')}</button>
                <button className="settings_btn" onClick={async () => {
                  const { invoke } = await import('@tauri-apps/api/core');
                  const paths = await invoke<string[]>('list_md_files', { dir: workspace_root });
                  set_file_list(Array.from(new Set(paths)).sort())
                }}>{t(ui_language, 'refresh')}</button>
              </div>
              <ul className="outline_list">
                {(() => {
                  // 将 file_list 构建为目录树
                  const tree: any = {}
                  const ws = (workspace_root || '').replace(/\\/g,'/')
                  for (const p0 of file_list) {
                    const pnorm = (p0 || '').replace(/\\/g,'/')
                    let rel = pnorm
                    if (ws && pnorm.toLowerCase().startsWith(ws.toLowerCase() + '/')) {
                      rel = pnorm.slice(ws.length + 1)
                    }
                    const parts = rel.split('/').filter(Boolean)
                    let cur = tree
                    for (let i = 0; i < parts.length - 1; i++) {
                      const part = parts[i]
                      if (!cur[part]) cur[part] = { __dir: true, __children: {} }
                      cur = cur[part].__children
                    }
                    const file = parts[parts.length - 1]
                    cur[file] = { __file: true, __path: p0 }
                  }

                  const render = (node: any, prefix: string[]) => {
                    const entries = Object.entries(node)
                      .filter(([k]) => !k.startsWith('__'))
                      .sort((a: any, b: any) => {
                        const ad = a[1].__dir ? 0 : 1
                        const bd = b[1].__dir ? 0 : 1
                        if (ad !== bd) return ad - bd
                        return a[0].localeCompare(b[0])
                      })
                    const out: any[] = []
                    for (const [name, info] of entries as any) {
                      const full = [...prefix, name].join('/')
                      if (info.__dir) {
                        const folded = !!file_tree_fold[full]
                        out.push(
                          <li key={full} className="outline_item">
                            <button className="outline_btn" onClick={() => set_file_tree_fold((m) => ({ ...m, [full]: !folded }))} title={full}>
                              {folded ? '▶' : '▼'} {name}
                            </button>
                          </li>
                        )
                        if (!folded) {
                          out.push(...render(info.__children, [...prefix, name]))
                        }
                      } else if (info.__file) {
                        const safe = info.__path as string
                        const fname = file_display_name(safe)
                        out.push(
                          <li key={safe} className="outline_item" style={{ paddingLeft: prefix.length * 12 }}>
                            <button className="outline_btn" onDoubleClick={() => open_file_at(safe)} title={safe}>{fname}</button>
                            <div style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
                              <button className="settings_btn" title={t(ui_language, 'rename')} onClick={async () => {
                                const next = window.prompt(t(ui_language, 'rename') + '：', fname)
                                if (!next || next === fname) return
                                const base = (safe.split(/[/\\]/).slice(0, -1).join('/'))
                                const dst = (base ? base + '/' : '') + next
                                try { const { invoke } = await import('@tauri-apps/api/core'); await invoke('rename_path', { src: safe, dst }); const paths = await invoke<string[]>('list_md_files', { dir: workspace_root }); set_file_list(Array.from(new Set(paths)).sort()) } catch (e) { alert(t(ui_language, 'rename') + ' 失败：'+e) }
                              }}>{t(ui_language, 'rename')}</button>
                              <button className="settings_btn" title={t(ui_language, 'remove')} onClick={async () => {
                                if (!window.confirm(t(ui_language, 'remove') + '？\n'+safe)) return
                                try { const { invoke } = await import('@tauri-apps/api/core'); await invoke('delete_path', { target: safe }); const paths = await invoke<string[]>('list_md_files', { dir: workspace_root }); set_file_list(Array.from(new Set(paths)).sort()) } catch (e) { alert(t(ui_language, 'remove') + ' 失败：'+e) }
                              }}>{t(ui_language, 'remove')}</button>
                              <button className="settings_btn" title={t(ui_language, 'copy_path')} onClick={async () => { try { await navigator.clipboard.writeText(safe) } catch {} }}>{t(ui_language, 'copy_path')}</button>
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
                      <button className="outline_btn" onClick={() => set_file_tree_fold((m) => ({ ...m, ['/']: !foldedRoot }))}>{foldedRoot ? '▶' : '▼'} {baseName || '文件'}</button>
                    </li>,
                    ...(foldedRoot ? [] : render(tree, []))
                  ]
                })()}
              </ul>
            </div>
          )}
        </div>
      )}
      {show_outline && <div className="splitter-outline" onMouseDown={(e) => {
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
      }} />}
      <div className="pane pane-editor" style={{ fontSize: editor_font_size }}
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
        }}>
        <CodeMirror
          value={markdown_text}
          theme={ui_theme === 'light' ? undefined : oneDark}
          height="100%"
          extensions={[markdown(), ...(searchHighlightField ? [searchHighlightField] : [])]}
          onChange={(value) => set_markdown_text(value)}
          onCreateEditor={(view) => { cm_view_ref.current = view }}
        />
      </div>
      <div className="splitter" onMouseDown={handle_splitter_down} />
      <div className="pane pane-preview" style={{ fontSize: preview_font_size }}>
        <div
          ref={preview_ref}
          className="preview_html markdown_body"
          dangerouslySetInnerHTML={{ __html: rendered_html }}
        />
      </div>
      <div className="status_bar">
        <div className="status_item">{t(ui_language, 'words')}: {status_stats.words}</div>
        <div className="status_item">{t(ui_language, 'chars')}: {status_stats.chars}</div>
        <div className="status_item">{t(ui_language, 'read_time')}: ~{status_stats.minutes} {ui_language==='en-US'?'min':'分钟'}</div>
        <div style={{ flex: 1 }} />
        <div className="status_item" title={current_file_path}>{current_file_path || t(ui_language, 'unsaved')}</div>
      </div>
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
          } catch { window.alert('打开失败'); }
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
          { id: 'copy', label: ui_language==='en-US'?'Copy':'复制', on_click: () => { editor_copy() } },
          { id: 'cut', label: ui_language==='en-US'?'Cut':'剪切', on_click: () => { editor_cut() } },
          { id: 'paste', label: ui_language==='en-US'?'Paste':'粘贴', on_click: () => { editor_paste() } },
          { id: 'select_all', label: ui_language==='en-US'?'Select All':'全选', on_click: () => { editor_select_all() } },
          { id: 'clear', label: ui_language==='en-US'?'Clear':'清除', on_click: () => { editor_clear() } },
          // 表情子菜单已移除
          ...(ai_enabled ? [{ id: 'sep-ai', label: 'sep' } as any] : []),
          ...(ai_enabled && ctx_has_selection ? [{
            id: 'ai_group',
            label: 'AI',
            children: [
              ...(ai_actions_enabled.includes('continue_selection') ? [{ id: 'ai_continue_sel', label: ui_language==='en-US'?'Continue (selection)':'续写（选中）', on_click: () => ai_action('continue','selection') }] : []),
              ...(ai_actions_enabled.includes('rewrite_selection') ? [{ id: 'ai_rewrite_sel', label: ui_language==='en-US'?'Rewrite (selection)':'改写（选中）', on_click: () => ai_action('rewrite','selection') }] : []),
              ...(ai_actions_enabled.includes('translate_zh_selection') ? [{ id: 'ai_translate_zh', label: ui_language==='en-US'?'Translate to Chinese (selection)':'翻译为中文（选中）', on_click: () => ai_action('translate_zh','selection') }] : []),
              ...(ai_actions_enabled.includes('translate_en_selection') ? [{ id: 'ai_translate_en', label: ui_language==='en-US'?'Translate to English (selection)':'Translate to English（selected）', on_click: () => ai_action('translate_en','selection') }] : []),
              ...(ai_actions_enabled.includes('summary_selection') ? [{ id: 'ai_summary_sel', label: ui_language==='en-US'?'Summarize (selection)':'总结要点（选中）', on_click: () => ai_action('summary','selection') }] : []),
              ...ai_custom_templates.filter(t => t.enabled && t.scope === 'selection').map(t => ({ id: `tpl_${t.id}`, label: t.title, on_click: () => ai_custom_action(t) }))
              ,
              ...(recent_ai_actions.length ? [{ id: 'sep', label: 'sep' }] : []),
              ...recent_ai_actions.map((act) => ({
                id: `recent_${act.id}`,
                label: `${ui_language==='en-US'?'Recent:':'最近：'}${act.title}`,
                on_click: () => {
                  // 将最近项映射到内置动作调用
                  if (act.id === 'builtin_continue') ai_action('continue', 'selection')
                  else if (act.id === 'builtin_rewrite') ai_action('rewrite', 'selection')
                  else if (act.id === 'builtin_translate_zh') ai_action('translate_zh', 'selection')
                  else if (act.id === 'builtin_translate_en') ai_action('translate_en', 'selection')
                  else if (act.id === 'builtin_summary') ai_action('summary', 'selection')
                }
              }))
            ]
          }] : (ai_enabled ? [{ id: 'ai_hint', label: ui_language==='en-US' ? 'Please select text to use AI' : '请选择文本以使用 AI 功能', on_click: () => { window.alert(ui_language==='en-US' ? 'Please select text first' : '请先选中文本'); } }] : []))
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
        on_copy={async () => { try { await navigator.clipboard.writeText(ai_result_text) } catch {} }}
        on_copy_md={async () => { try { await navigator.clipboard.writeText(ai_result_text) } catch {} }}
        on_copy_code={async () => { try { await navigator.clipboard.writeText('```\n' + ai_result_text + '\n```') } catch {} }}
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
            const tr2 = view.state.update({ changes: { from: 0, to: view.state.doc.length, insert: text } })
            view.dispatch(tr2)
          }
          set_show_ai_result(false)
        }}
        on_cancel={() => { abort_ref.current = true; set_ai_loading(false); set_show_ai_result(false) }}
        on_close={() => set_show_ai_result(false)}
        on_regen={() => { set_ai_result_text(''); ai_invoke(last_prompt_ref.current) }}
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
          view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text }, scrollIntoView: true })
        }}
      />
    </div>
  )
}

export default App
