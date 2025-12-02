/**
 * useDocumentState - 文档状态管理 Hook
 * 管理当前文档、标签页和工作区相关状态
 */

import { useState, useCallback, useRef } from 'react'

export interface DocumentState {
  // 当前文档
  markdown_text: string
  rendered_html: string
  current_file_path: string
  save_status: 'saved' | 'saving' | 'unsaved'
  last_saved_time: Date | null

  // 标签页
  open_tabs: string[]
  tab_ctx_open: boolean
  tab_ctx_pos: { x: number; y: number }
  tab_ctx_path: string

  // 未命名文档
  untitled_counter: number
  untitled_docs: Record<string, string>

  // 工作区
  workspace_root: string
  file_list: string[]
  file_tree_fold: Record<string, boolean>
  recent_files: string[]

  // 右键菜单
  ctx_open: boolean
  ctx_pos: { x: number; y: number }
  ctx_has_selection: boolean
}

export interface DocumentActions {
  // 当前文档
  set_markdown_text: (text: string) => void
  set_rendered_html: (html: string) => void
  set_current_file_path: (path: string) => void
  set_save_status: (status: 'saved' | 'saving' | 'unsaved') => void
  set_last_saved_time: (time: Date | null) => void

  // 标签页
  set_open_tabs: (tabs: string[] | ((prev: string[]) => string[])) => void
  set_tab_ctx_open: (open: boolean) => void
  set_tab_ctx_pos: (pos: { x: number; y: number }) => void
  set_tab_ctx_path: (path: string) => void

  // 未命名文档
  set_untitled_counter: (counter: number | ((prev: number) => number)) => void
  set_untitled_docs: (
    docs: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)
  ) => void

  // 工作区
  set_workspace_root: (root: string) => void
  set_file_list: (list: string[]) => void
  set_file_tree_fold: (
    fold: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void
  set_recent_files: (files: string[] | ((prev: string[]) => string[])) => void

  // 右键菜单
  set_ctx_open: (open: boolean) => void
  set_ctx_pos: (pos: { x: number; y: number }) => void
  set_ctx_has_selection: (has: boolean) => void

  // 便捷方法
  create_new_untitled: () => string
  mark_unsaved: () => void
  mark_saved: () => void
  add_to_recent: (path: string) => void
}

export interface DocumentRefs {
  autosave_timer_ref: React.MutableRefObject<number | null>
  current_path_ref: React.MutableRefObject<string>
}

export function useDocumentState(): DocumentState & DocumentActions & { refs: DocumentRefs } {
  // 当前文档
  const [markdown_text, set_markdown_text] = useState('')
  const [rendered_html, set_rendered_html] = useState('')
  const [current_file_path, set_current_file_path] = useState('')
  const [save_status, set_save_status] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [last_saved_time, set_last_saved_time] = useState<Date | null>(null)

  // 标签页
  const [open_tabs, set_open_tabs] = useState<string[]>([])
  const [tab_ctx_open, set_tab_ctx_open] = useState(false)
  const [tab_ctx_pos, set_tab_ctx_pos] = useState({ x: 0, y: 0 })
  const [tab_ctx_path, set_tab_ctx_path] = useState('')

  // 未命名文档
  const [untitled_counter, set_untitled_counter] = useState(1)
  const [untitled_docs, set_untitled_docs] = useState<Record<string, string>>({})

  // 工作区
  const [workspace_root, set_workspace_root] = useState('')
  const [file_list, set_file_list] = useState<string[]>([])
  const [file_tree_fold, set_file_tree_fold] = useState<Record<string, boolean>>({})
  const [recent_files, set_recent_files] = useState<string[]>([])

  // 右键菜单
  const [ctx_open, set_ctx_open] = useState(false)
  const [ctx_pos, set_ctx_pos] = useState({ x: 0, y: 0 })
  const [ctx_has_selection, set_ctx_has_selection] = useState(false)

  // Refs
  const autosave_timer_ref = useRef<number | null>(null)
  const current_path_ref = useRef('')

  // 便捷方法
  const create_new_untitled = useCallback(() => {
    const name = `untitled:${untitled_counter}`
    set_untitled_counter((prev) => prev + 1)
    set_markdown_text('')
    set_current_file_path(name)
    set_save_status('unsaved')
    set_last_saved_time(null)
    return name
  }, [untitled_counter])

  const mark_unsaved = useCallback(() => {
    set_save_status('unsaved')
  }, [])

  const mark_saved = useCallback(() => {
    set_save_status('saved')
    set_last_saved_time(new Date())
  }, [])

  const add_to_recent = useCallback((path: string) => {
    set_recent_files((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, 20)
      return next
    })
  }, [])

  return {
    // State
    markdown_text,
    rendered_html,
    current_file_path,
    save_status,
    last_saved_time,
    open_tabs,
    tab_ctx_open,
    tab_ctx_pos,
    tab_ctx_path,
    untitled_counter,
    untitled_docs,
    workspace_root,
    file_list,
    file_tree_fold,
    recent_files,
    ctx_open,
    ctx_pos,
    ctx_has_selection,

    // Actions
    set_markdown_text,
    set_rendered_html,
    set_current_file_path,
    set_save_status,
    set_last_saved_time,
    set_open_tabs,
    set_tab_ctx_open,
    set_tab_ctx_pos,
    set_tab_ctx_path,
    set_untitled_counter,
    set_untitled_docs,
    set_workspace_root,
    set_file_list,
    set_file_tree_fold,
    set_recent_files,
    set_ctx_open,
    set_ctx_pos,
    set_ctx_has_selection,

    // 便捷方法
    create_new_untitled,
    mark_unsaved,
    mark_saved,
    add_to_recent,

    // Refs
    refs: {
      autosave_timer_ref,
      current_path_ref,
    },
  }
}
