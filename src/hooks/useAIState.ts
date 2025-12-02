/**
 * useAIState - AI 相关 UI 状态管理 Hook / AI-related UI state management Hook
 * 管理 AI 功能的 UI 状态（不包含 API 调用逻辑） / Manages UI state for AI features (without API call logic)
 */

import { useState, useCallback, useRef } from 'react'

export interface AIUIState {
  // AI 功能开关
  ai_enabled: boolean

  // AI 结果弹窗
  show_ai_result: boolean
  ai_loading: boolean
  ai_title: string
  ai_result_text: string
  ai_elapsed_ms: number
  ai_last_scope: 'selection' | 'document' | 'unknown'

  // AI 聊天
  show_ai_chat: boolean
  chat_reset_tick: number

  // AI 动作配置
  ai_actions_enabled: string[]
  ai_custom_templates: Array<{
    id: string
    title: string
    body: string
    scope: 'selection' | 'document'
    enabled: boolean
    vars?: { lang?: string; style?: string }
  }>
  recent_ai_actions: Array<{ id: string; title: string }>
}

export interface AIUIActions {
  set_ai_enabled: React.Dispatch<React.SetStateAction<boolean>>
  set_show_ai_result: React.Dispatch<React.SetStateAction<boolean>>
  set_ai_loading: React.Dispatch<React.SetStateAction<boolean>>
  set_ai_title: React.Dispatch<React.SetStateAction<string>>
  set_ai_result_text: React.Dispatch<React.SetStateAction<string>>
  set_ai_elapsed_ms: React.Dispatch<React.SetStateAction<number>>
  set_ai_last_scope: React.Dispatch<React.SetStateAction<'selection' | 'document' | 'unknown'>>
  set_show_ai_chat: React.Dispatch<React.SetStateAction<boolean>>
  set_chat_reset_tick: React.Dispatch<React.SetStateAction<number>>
  set_ai_actions_enabled: React.Dispatch<React.SetStateAction<string[]>>
  set_ai_custom_templates: React.Dispatch<React.SetStateAction<AIUIState['ai_custom_templates']>>
  set_recent_ai_actions: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string }>>>

  // 便捷方法
  toggle_ai: () => void
  open_ai_chat: () => void
  close_ai_chat: () => void
  reset_chat_position: () => void
  append_ai_result: (text: string) => void
  clear_ai_result: () => void
}

export interface AIRefs {
  abort_ref: React.MutableRefObject<boolean>
  unsubscribe_ref: React.MutableRefObject<() => void>
  last_prompt_ref: React.MutableRefObject<string>
}

const DEFAULT_AI_ACTIONS = [
  'continue_selection',
  'continue_document',
  'rewrite_selection',
  'translate_zh_selection',
  'translate_en_selection',
  'summary_selection',
  'summary_document',
]

export function useAIState(): AIUIState & AIUIActions & { refs: AIRefs } {
  // AI 功能开关
  const [ai_enabled, set_ai_enabled] = useState(false)

  // AI 结果弹窗
  const [show_ai_result, set_show_ai_result] = useState(false)
  const [ai_loading, set_ai_loading] = useState(false)
  const [ai_title, set_ai_title] = useState('AI Result')
  const [ai_result_text, set_ai_result_text] = useState('')
  const [ai_elapsed_ms, set_ai_elapsed_ms] = useState(0)
  const [ai_last_scope, set_ai_last_scope] = useState<'selection' | 'document' | 'unknown'>(
    'unknown'
  )

  // AI 聊天
  const [show_ai_chat, set_show_ai_chat] = useState(false)
  const [chat_reset_tick, set_chat_reset_tick] = useState(0)

  // AI 动作配置
  const [ai_actions_enabled, set_ai_actions_enabled] = useState<string[]>(DEFAULT_AI_ACTIONS)
  const [ai_custom_templates, set_ai_custom_templates] = useState<AIUIState['ai_custom_templates']>(
    []
  )
  const [recent_ai_actions, set_recent_ai_actions] = useState<Array<{ id: string; title: string }>>(
    []
  )

  // Refs
  const abort_ref = useRef(false)
  const unsubscribe_ref = useRef<() => void>(() => {})
  const last_prompt_ref = useRef('')

  // 便捷方法
  const toggle_ai = useCallback(() => set_ai_enabled((prev) => !prev), [])
  const open_ai_chat = useCallback(() => set_show_ai_chat(true), [])
  const close_ai_chat = useCallback(() => set_show_ai_chat(false), [])
  const reset_chat_position = useCallback(() => set_chat_reset_tick(Date.now()), [])
  const append_ai_result = useCallback((text: string) => {
    set_ai_result_text((prev) => prev + text)
  }, [])
  const clear_ai_result = useCallback(() => set_ai_result_text(''), [])

  return {
    // State
    ai_enabled,
    show_ai_result,
    ai_loading,
    ai_title,
    ai_result_text,
    ai_elapsed_ms,
    ai_last_scope,
    show_ai_chat,
    chat_reset_tick,
    ai_actions_enabled,
    ai_custom_templates,
    recent_ai_actions,

    // Actions
    set_ai_enabled,
    set_show_ai_result,
    set_ai_loading,
    set_ai_title,
    set_ai_result_text,
    set_ai_elapsed_ms,
    set_ai_last_scope,
    set_show_ai_chat,
    set_chat_reset_tick,
    set_ai_actions_enabled,
    set_ai_custom_templates,
    set_recent_ai_actions,

    // 便捷方法
    toggle_ai,
    open_ai_chat,
    close_ai_chat,
    reset_chat_position,
    append_ai_result,
    clear_ai_result,

    // Refs
    refs: {
      abort_ref,
      unsubscribe_ref,
      last_prompt_ref,
    },
  }
}
