/**
 * 编辑器状态管理 Context / Editor state management Context
 * 将编辑器相关的状态从 App.tsx 中分离出来 / Separates editor-related state from App.tsx
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface EditorState {
  markdown_text: string
  current_file_path: string
  save_status: 'saved' | 'saving' | 'unsaved'
  last_saved_time: Date | null
  editor_font_size: number
  wrap_enabled: boolean
  line_numbers_enabled: boolean
}

interface EditorContextType extends EditorState {
  set_markdown_text: (text: string) => void
  set_current_file_path: (path: string) => void
  set_save_status: (status: 'saved' | 'saving' | 'unsaved') => void
  set_last_saved_time: (time: Date | null) => void
  set_editor_font_size: (size: number) => void
  set_wrap_enabled: (enabled: boolean) => void
  set_line_numbers_enabled: (enabled: boolean) => void
  updateText: (text: string) => void
}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

export function EditorProvider({ children }: { children: ReactNode }) {
  const [markdown_text, set_markdown_text] = useState<string>('')
  const [current_file_path, set_current_file_path] = useState<string>('')
  const [save_status, set_save_status] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [last_saved_time, set_last_saved_time] = useState<Date | null>(null)
  const [editor_font_size, set_editor_font_size] = useState<number>(16)
  const [wrap_enabled, set_wrap_enabled] = useState<boolean>(false)
  const [line_numbers_enabled, set_line_numbers_enabled] = useState<boolean>(true)

  const updateText = useCallback((text: string) => {
    set_markdown_text(text)
    set_save_status('unsaved')
  }, [])

  const value: EditorContextType = {
    markdown_text,
    current_file_path,
    save_status,
    last_saved_time,
    editor_font_size,
    wrap_enabled,
    line_numbers_enabled,
    set_markdown_text,
    set_current_file_path,
    set_save_status,
    set_last_saved_time,
    set_editor_font_size,
    set_wrap_enabled,
    set_line_numbers_enabled,
    updateText,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
}
