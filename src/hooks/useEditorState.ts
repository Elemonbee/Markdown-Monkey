/**
 * useEditorState - 编辑器状态管理 Hook / Editor state management Hook
 * 管理编辑器的 UI 状态和配置 / Manages UI state and configuration of the editor
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { EditorView } from '@codemirror/view'

export interface EditorState {
  // 编辑器配置
  editor_font_size: number
  preview_font_size: number
  wrap_enabled: boolean
  line_numbers_enabled: boolean
  sync_scroll: boolean
  split_ratio: number
  focus_mode: boolean

  // UI 状态
  show_settings: boolean
  show_search: boolean
  show_command_palette: boolean
  show_focus_hint: boolean
  show_outline: boolean
  outline_width: number
  side_tab: 'outline' | 'files'

  // 搜索状态
  search_query: string
  replace_query: string
  search_regex: boolean
  search_case_i: boolean
  search_idx: number
  search_total: number

  // 全局搜索
  show_global_search: boolean
  global_query: string
  global_regex: boolean
  global_case_i: boolean
  global_searching: boolean
  global_results: Array<{ path: string; lineNo: number; from: number; to: number; preview: string }>
}

export interface EditorActions {
  // 编辑器配置
  set_editor_font_size: Dispatch<SetStateAction<number>>
  set_preview_font_size: Dispatch<SetStateAction<number>>
  set_wrap_enabled: Dispatch<SetStateAction<boolean>>
  set_line_numbers_enabled: Dispatch<SetStateAction<boolean>>
  set_sync_scroll: Dispatch<SetStateAction<boolean>>
  set_split_ratio: Dispatch<SetStateAction<number>>
  set_focus_mode: Dispatch<SetStateAction<boolean>>

  // UI 状态
  set_show_settings: Dispatch<SetStateAction<boolean>>
  set_show_search: Dispatch<SetStateAction<boolean>>
  set_show_command_palette: Dispatch<SetStateAction<boolean>>
  set_show_focus_hint: Dispatch<SetStateAction<boolean>>
  set_show_outline: Dispatch<SetStateAction<boolean>>
  set_outline_width: Dispatch<SetStateAction<number>>
  set_side_tab: Dispatch<SetStateAction<'outline' | 'files'>>

  // 搜索状态
  set_search_query: Dispatch<SetStateAction<string>>
  set_replace_query: Dispatch<SetStateAction<string>>
  set_search_regex: Dispatch<SetStateAction<boolean>>
  set_search_case_i: Dispatch<SetStateAction<boolean>>
  set_search_idx: Dispatch<SetStateAction<number>>
  set_search_total: Dispatch<SetStateAction<number>>

  // 全局搜索
  set_show_global_search: Dispatch<SetStateAction<boolean>>
  set_global_query: Dispatch<SetStateAction<string>>
  set_global_regex: Dispatch<SetStateAction<boolean>>
  set_global_case_i: Dispatch<SetStateAction<boolean>>
  set_global_searching: Dispatch<SetStateAction<boolean>>
  set_global_results: Dispatch<SetStateAction<EditorState['global_results']>>

  // 便捷方法
  toggle_focus_mode: () => void
  toggle_wrap: () => void
  toggle_line_numbers: () => void
  toggle_sync_scroll: () => void
  toggle_outline: () => void
  toggle_search: () => void
}

export interface EditorRefs {
  cm_view_ref: React.MutableRefObject<EditorView | null>
  container_ref: React.MutableRefObject<HTMLDivElement | null>
  preview_ref: React.MutableRefObject<HTMLDivElement | null>
  preview_pane_ref: React.MutableRefObject<HTMLDivElement | null>
  is_dragging_ref: React.MutableRefObject<boolean>
  sync_scroll_ref: React.MutableRefObject<boolean>
  scroll_lock_ref: React.MutableRefObject<{ active: boolean; token: number }>
  scroll_state_ref: React.MutableRefObject<
    Record<string, { editorRatio: number; previewRatio: number }>
  >
  block_map_ref: React.MutableRefObject<Array<{ start: number; end: number; idx: number }>>
}

export function useEditorState(): EditorState & EditorActions & { refs: EditorRefs } {
  // 编辑器配置
  const [editor_font_size, set_editor_font_size] = useState(16)
  const [preview_font_size, set_preview_font_size] = useState(16)
  const [wrap_enabled, set_wrap_enabled] = useState(false)
  const [line_numbers_enabled, set_line_numbers_enabled] = useState(true)
  const [sync_scroll, set_sync_scroll] = useState(true)
  const [split_ratio, set_split_ratio] = useState(0.5)
  const [focus_mode, set_focus_mode] = useState(false)

  // UI 状态
  const [show_settings, set_show_settings] = useState(false)
  const [show_search, set_show_search] = useState(false)
  const [show_command_palette, set_show_command_palette] = useState(false)
  const [show_focus_hint, set_show_focus_hint] = useState(false)
  const [show_outline, set_show_outline] = useState(false)
  const [outline_width, set_outline_width] = useState(280)
  const [side_tab, set_side_tab] = useState<'outline' | 'files'>('outline')

  // 搜索状态
  const [search_query, set_search_query] = useState('')
  const [replace_query, set_replace_query] = useState('')
  const [search_regex, set_search_regex] = useState(false)
  const [search_case_i, set_search_case_i] = useState(true)
  const [search_idx, set_search_idx] = useState(-1)
  const [search_total, set_search_total] = useState(0)

  // 全局搜索
  const [show_global_search, set_show_global_search] = useState(false)
  const [global_query, set_global_query] = useState('')
  const [global_regex, set_global_regex] = useState(false)
  const [global_case_i, set_global_case_i] = useState(true)
  const [global_searching, set_global_searching] = useState(false)
  const [global_results, set_global_results] = useState<EditorState['global_results']>([])

  // Refs
  const cm_view_ref = useRef<EditorView | null>(null)
  const container_ref = useRef<HTMLDivElement | null>(null)
  const preview_ref = useRef<HTMLDivElement | null>(null)
  const preview_pane_ref = useRef<HTMLDivElement | null>(null)
  const is_dragging_ref = useRef(false)
  const sync_scroll_ref = useRef(true)
  const scroll_lock_ref = useRef({ active: false, token: 0 })
  const scroll_state_ref = useRef<Record<string, { editorRatio: number; previewRatio: number }>>({})
  const block_map_ref = useRef<Array<{ start: number; end: number; idx: number }>>([])

  // Sync sync_scroll state to ref
  useEffect(() => {
    sync_scroll_ref.current = !!sync_scroll
  }, [sync_scroll])

  // 便捷方法
  const toggle_focus_mode = useCallback(() => set_focus_mode((prev) => !prev), [])
  const toggle_wrap = useCallback(() => set_wrap_enabled((prev) => !prev), [])
  const toggle_line_numbers = useCallback(() => set_line_numbers_enabled((prev) => !prev), [])
  const toggle_sync_scroll = useCallback(() => set_sync_scroll((prev) => !prev), [])
  const toggle_outline = useCallback(() => set_show_outline((prev) => !prev), [])
  const toggle_search = useCallback(() => set_show_search((prev) => !prev), [])

  return {
    // State
    editor_font_size,
    preview_font_size,
    wrap_enabled,
    line_numbers_enabled,
    sync_scroll,
    split_ratio,
    focus_mode,
    show_settings,
    show_search,
    show_command_palette,
    show_focus_hint,
    show_outline,
    outline_width,
    side_tab,
    search_query,
    replace_query,
    search_regex,
    search_case_i,
    search_idx,
    search_total,
    show_global_search,
    global_query,
    global_regex,
    global_case_i,
    global_searching,
    global_results,

    // Actions
    set_editor_font_size,
    set_preview_font_size,
    set_wrap_enabled,
    set_line_numbers_enabled,
    set_sync_scroll,
    set_split_ratio,
    set_focus_mode,
    set_show_settings,
    set_show_search,
    set_show_command_palette,
    set_show_focus_hint,
    set_show_outline,
    set_outline_width,
    set_side_tab,
    set_search_query,
    set_replace_query,
    set_search_regex,
    set_search_case_i,
    set_search_idx,
    set_search_total,
    set_show_global_search,
    set_global_query,
    set_global_regex,
    set_global_case_i,
    set_global_searching,
    set_global_results,

    // 便捷方法
    toggle_focus_mode,
    toggle_wrap,
    toggle_line_numbers,
    toggle_sync_scroll,
    toggle_outline,
    toggle_search,

    // Refs
    refs: {
      cm_view_ref,
      container_ref,
      preview_ref,
      preview_pane_ref,
      is_dragging_ref,
      sync_scroll_ref,
      scroll_lock_ref,
      scroll_state_ref,
      block_map_ref,
    },
  }
}
