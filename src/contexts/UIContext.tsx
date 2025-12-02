/**
 * UI 状态管理 Context / UI state management Context
 * 将 UI 相关的状态从 App.tsx 中分离出来 / Separates UI-related state from App.tsx
 */

import { createContext, useContext, useState, type ReactNode } from 'react'

interface UIState {
  ui_theme: 'dark' | 'light' | 'system'
  ui_language: string
  preview_font_size: number
  split_ratio: number
  show_outline: boolean
  outline_width: number
  show_settings: boolean
  show_search: boolean
  show_command_palette: boolean
  focus_mode: boolean
  sync_scroll: boolean
}

interface UIContextType extends UIState {
  set_ui_theme: (theme: 'dark' | 'light' | 'system') => void
  set_ui_language: (lang: string) => void
  set_preview_font_size: (size: number) => void
  set_split_ratio: (ratio: number) => void
  set_show_outline: (show: boolean) => void
  set_outline_width: (width: number) => void
  set_show_settings: (show: boolean) => void
  set_show_search: (show: boolean) => void
  set_show_command_palette: (show: boolean) => void
  set_focus_mode: (mode: boolean) => void
  set_sync_scroll: (sync: boolean) => void
  toggleOutline: () => void
  toggleSettings: () => void
  toggleSearch: () => void
  toggleFocusMode: () => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: ReactNode }) {
  const [ui_theme, set_ui_theme] = useState<'dark' | 'light' | 'system'>('dark')
  const [ui_language, set_ui_language] = useState<string>('zh-CN')
  const [preview_font_size, set_preview_font_size] = useState<number>(16)
  const [split_ratio, set_split_ratio] = useState<number>(0.5)
  const [show_outline, set_show_outline] = useState<boolean>(false)
  const [outline_width, set_outline_width] = useState<number>(280)
  const [show_settings, set_show_settings] = useState<boolean>(false)
  const [show_search, set_show_search] = useState<boolean>(false)
  const [show_command_palette, set_show_command_palette] = useState<boolean>(false)
  const [focus_mode, set_focus_mode] = useState<boolean>(false)
  const [sync_scroll, set_sync_scroll] = useState<boolean>(true)

  const toggleOutline = () => set_show_outline((prev) => !prev)
  const toggleSettings = () => set_show_settings((prev) => !prev)
  const toggleSearch = () => set_show_search((prev) => !prev)
  const toggleFocusMode = () => set_focus_mode((prev) => !prev)

  const value: UIContextType = {
    ui_theme,
    ui_language,
    preview_font_size,
    split_ratio,
    show_outline,
    outline_width,
    show_settings,
    show_search,
    show_command_palette,
    focus_mode,
    sync_scroll,
    set_ui_theme,
    set_ui_language,
    set_preview_font_size,
    set_split_ratio,
    set_show_outline,
    set_outline_width,
    set_show_settings,
    set_show_search,
    set_show_command_palette,
    set_focus_mode,
    set_sync_scroll,
    toggleOutline,
    toggleSettings,
    toggleSearch,
    toggleFocusMode,
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
