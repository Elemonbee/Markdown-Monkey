/**
 * useSettingsManager - 设置管理 Hook
 * 提供设置的加载、保存和持久化功能
 * 使用 snake_case 命名以匹配 App.tsx 的风格
 */

import { useRef, useCallback } from 'react'
import { Store } from '@tauri-apps/plugin-store'

export interface SettingsData {
  api_base_url: string
  api_key: string
  provider: string
  model: string
  system_prompt: string
  temperature: number
  editor_font_size: number
  preview_font_size: number
  ui_theme: 'dark' | 'light' | 'system'
  ui_language: string
  ai_enabled: boolean
  ai_actions_enabled: string[]
  ai_custom_templates: Array<{
    id: string
    title: string
    body: string
    scope: 'selection' | 'document'
    enabled: boolean
    vars?: { lang?: string; style?: string }
  }>
  recent_files: string[]
  recent_ai_actions: Array<{ id: string; title: string }>
  outline_shown: boolean
  outline_width: number
  wrap_enabled: boolean
  line_numbers_enabled: boolean
  split_ratio: number
}

export interface SettingsSetters {
  set_api_base_url: (v: string) => void
  set_api_key: (v: string) => void
  set_provider: (v: string) => void
  set_model: (v: string) => void
  set_system_prompt: (v: string) => void
  set_temperature: (v: number) => void
  set_editor_font_size: (v: number) => void
  set_preview_font_size: (v: number) => void
  set_ui_theme: (v: 'dark' | 'light' | 'system') => void
  set_ui_language: (v: string) => void
  set_ai_enabled: (v: boolean) => void
  set_ai_actions_enabled: (v: string[]) => void
  set_ai_custom_templates: (v: SettingsData['ai_custom_templates']) => void
  set_recent_files: (v: string[]) => void
  set_recent_ai_actions: (v: Array<{ id: string; title: string }>) => void
  set_show_outline: (v: boolean) => void
  set_outline_width: (v: number) => void
  set_wrap_enabled: (v: boolean) => void
  set_line_numbers_enabled: (v: boolean) => void
  set_split_ratio: (v: number) => void
}

const DEFAULT_SETTINGS: SettingsData = {
  api_base_url: 'https://api.openai.com',
  api_key: '',
  provider: 'openai',
  model: 'gpt-4o-mini',
  system_prompt: 'You are a helpful assistant for markdown writing.',
  temperature: 0.7,
  editor_font_size: 16,
  preview_font_size: 16,
  ui_theme: 'dark',
  ui_language: 'zh-CN',
  ai_enabled: false,
  ai_actions_enabled: [
    'continue_selection',
    'continue_document',
    'rewrite_selection',
    'translate_zh_selection',
    'translate_en_selection',
    'summary_selection',
    'summary_document',
  ],
  ai_custom_templates: [],
  recent_files: [],
  recent_ai_actions: [],
  outline_shown: false,
  outline_width: 280,
  wrap_enabled: false,
  line_numbers_enabled: true,
  split_ratio: 0.5,
}

export function useSettingsManager() {
  const store_ref = useRef<Store | null>(null)

  /**
   * 加载所有设置
   */
  const load_settings = useCallback(async (setters: SettingsSetters): Promise<void> => {
    const s = await Store.load('settings.json')
    store_ref.current = s

    // 加载各项设置
    const saved_base = (await s.get<string>('api_base_url')) || DEFAULT_SETTINGS.api_base_url
    const saved_provider = (await s.get<string>('provider')) || DEFAULT_SETTINGS.provider
    const saved_model = (await s.get<string>('model')) || DEFAULT_SETTINGS.model
    const saved_system = (await s.get<string>('system_prompt')) || DEFAULT_SETTINGS.system_prompt
    const saved_temp = (await s.get<number>('temperature')) ?? DEFAULT_SETTINGS.temperature
    const saved_split = (await s.get<number>('split_ratio')) ?? DEFAULT_SETTINGS.split_ratio
    const saved_editor_fs =
      (await s.get<number>('editor_font_size')) ?? DEFAULT_SETTINGS.editor_font_size
    const saved_preview_fs =
      (await s.get<number>('preview_font_size')) ?? DEFAULT_SETTINGS.preview_font_size
    const saved_ai_enabled = await s.get<boolean>('ai_enabled')
    const saved_actions = await s.get<string[]>('ai_actions_enabled')
    const saved_custom = await s.get<SettingsData['ai_custom_templates']>('ai_custom_templates')
    const saved_recent = (await s.get<string[]>('recent_files')) || []
    const saved_theme =
      (await s.get<'dark' | 'light' | 'system'>('ui_theme')) || DEFAULT_SETTINGS.ui_theme
    const saved_lang = (await s.get<string>('ui_language')) || DEFAULT_SETTINGS.ui_language
    const saved_recent_ai =
      (await s.get<Array<{ id: string; title: string }>>('recent_ai_actions')) || []
    const saved_wrap = await s.get<boolean>('wrap_enabled')
    const saved_line_numbers = await s.get<boolean>('line_numbers_enabled')
    const saved_outline_shown = await s.get<boolean>('outline_shown')
    const saved_outline_width = await s.get<number>('outline_width')

    // 从 Keyring 读取 API Key
    let saved_key = ''
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const v = await invoke<string | null>('secret_get', {
        service: 'MarkdownMonkey',
        key: 'api_key',
      })
      saved_key = (v || '') as string
    } catch {
      /* ignore */
    }

    // 应用设置
    setters.set_api_base_url(saved_base)
    setters.set_api_key(saved_key)
    setters.set_provider(saved_provider)
    setters.set_model(saved_model)
    setters.set_system_prompt(saved_system)
    setters.set_temperature(saved_temp)
    setters.set_split_ratio(saved_split)
    setters.set_editor_font_size(saved_editor_fs)
    setters.set_preview_font_size(saved_preview_fs)
    setters.set_ui_theme(saved_theme)
    setters.set_ui_language(saved_lang)
    setters.set_recent_files(saved_recent)
    setters.set_recent_ai_actions(saved_recent_ai)

    if (typeof saved_ai_enabled === 'boolean') setters.set_ai_enabled(saved_ai_enabled)
    if (Array.isArray(saved_actions)) setters.set_ai_actions_enabled(saved_actions)
    if (Array.isArray(saved_custom)) setters.set_ai_custom_templates(saved_custom)
    if (typeof saved_wrap === 'boolean') setters.set_wrap_enabled(saved_wrap)
    if (typeof saved_line_numbers === 'boolean')
      setters.set_line_numbers_enabled(saved_line_numbers)
    if (typeof saved_outline_shown === 'boolean') setters.set_show_outline(saved_outline_shown)
    if (typeof saved_outline_width === 'number') setters.set_outline_width(saved_outline_width)
  }, [])

  /**
   * 保存所有设置
   */
  const save_settings = useCallback(async (data: Partial<SettingsData>): Promise<void> => {
    if (!store_ref.current) return

    const s = store_ref.current
    if (data.api_base_url !== undefined) await s.set('api_base_url', data.api_base_url)
    if (data.provider !== undefined) await s.set('provider', data.provider)
    if (data.model !== undefined) await s.set('model', data.model)
    if (data.system_prompt !== undefined) await s.set('system_prompt', data.system_prompt)
    if (data.temperature !== undefined) await s.set('temperature', data.temperature)
    if (data.editor_font_size !== undefined) await s.set('editor_font_size', data.editor_font_size)
    if (data.preview_font_size !== undefined)
      await s.set('preview_font_size', data.preview_font_size)
    if (data.ui_theme !== undefined) await s.set('ui_theme', data.ui_theme)
    if (data.ui_language !== undefined) await s.set('ui_language', data.ui_language)
    if (data.ai_enabled !== undefined) await s.set('ai_enabled', data.ai_enabled)
    if (data.ai_actions_enabled !== undefined)
      await s.set('ai_actions_enabled', data.ai_actions_enabled)
    if (data.ai_custom_templates !== undefined)
      await s.set('ai_custom_templates', data.ai_custom_templates)
    if (data.outline_shown !== undefined) await s.set('outline_shown', data.outline_shown)
    if (data.outline_width !== undefined) await s.set('outline_width', data.outline_width)
    if (data.recent_ai_actions !== undefined)
      await s.set('recent_ai_actions', data.recent_ai_actions)
    if (data.wrap_enabled !== undefined) await s.set('wrap_enabled', data.wrap_enabled)
    if (data.line_numbers_enabled !== undefined)
      await s.set('line_numbers_enabled', data.line_numbers_enabled)
    if (data.split_ratio !== undefined) await s.set('split_ratio', data.split_ratio)
    if (data.recent_files !== undefined) await s.set('recent_files', data.recent_files)

    await s.save()

    // 保存 API Key 到 Keyring
    if (data.api_key !== undefined) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const k = (data.api_key || '').trim()
        if (k) {
          await invoke('secret_set', {
            service: 'MarkdownMonkey',
            key: 'api_key',
            value: k,
          })
        } else {
          await invoke('secret_delete', {
            service: 'MarkdownMonkey',
            key: 'api_key',
          })
        }
      } catch {
        /* ignore */
      }
    }
  }, [])

  /**
   * 保存单个设置项
   */
  const save_setting = useCallback(
    async <K extends keyof SettingsData>(key: K, value: SettingsData[K]): Promise<void> => {
      if (!store_ref.current) return
      await store_ref.current.set(key, value)
      await store_ref.current.save()
    },
    []
  )

  /**
   * 根据提供商设置默认值
   */
  const apply_provider_defaults = useCallback(
    (
      provider: string,
      current_base_url: string,
      current_model: string,
      setters: Pick<SettingsSetters, 'set_api_base_url' | 'set_model'>
    ) => {
      switch (provider) {
        case 'ollama':
          if (!current_base_url || current_base_url.startsWith('https://')) {
            setters.set_api_base_url('http://127.0.0.1:11434')
          }
          if (!current_model || current_model === 'gpt-4o-mini') {
            setters.set_model('llama3')
          }
          break
        case 'openai':
          setters.set_api_base_url('https://api.openai.com')
          if (!current_model || current_model === 'llama3') {
            setters.set_model('gpt-4o-mini')
          }
          break
        case 'openrouter':
          setters.set_api_base_url('https://openrouter.ai/api/v1')
          if (!current_model || current_model === 'gpt-4o-mini') {
            setters.set_model('openai/gpt-4o')
          }
          break
        case 'claude':
          setters.set_api_base_url('https://api.anthropic.com')
          if (!current_model) {
            setters.set_model('claude-3-5-sonnet-latest')
          }
          break
        case 'deepseek':
          setters.set_api_base_url('https://api.deepseek.com')
          if (!current_model) {
            setters.set_model('deepseek-chat')
          }
          break
        case 'kimi':
          setters.set_api_base_url('https://api.moonshot.cn')
          if (!current_model) {
            setters.set_model('moonshot-v1-8k')
          }
          break
      }
    },
    []
  )

  return {
    store_ref,
    load_settings,
    save_settings,
    save_setting,
    apply_provider_defaults,
    DEFAULT_SETTINGS,
  }
}
