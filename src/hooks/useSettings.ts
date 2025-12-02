/**
 * useSettings - 设置管理 Hook / Settings management Hook
 * 处理应用设置的加载、保存和持久化 / Handles loading, saving and persistence of application settings
 */

import { useState, useRef, useCallback } from 'react'
import { Store } from '@tauri-apps/plugin-store'

export interface AICustomTemplate {
  id: string
  title: string
  body: string
  scope: 'selection' | 'document'
  enabled: boolean
  vars?: { lang?: string; style?: string }
}

export interface SettingsState {
  // API 设置
  apiBaseUrl: string
  apiKey: string
  provider: string
  model: string
  systemPrompt: string
  temperature: number
  // UI 设置
  editorFontSize: number
  previewFontSize: number
  uiTheme: 'dark' | 'light' | 'system'
  uiLanguage: string
  // 功能设置
  aiEnabled: boolean
  syncScroll: boolean
  wrapEnabled: boolean
  lineNumbersEnabled: boolean
  // AI 动作
  aiActionsEnabled: string[]
  aiCustomTemplates: AICustomTemplate[]
  recentAiActions: Array<{ id: string; title: string }>
  // 布局
  splitRatio: number
  outlineWidth: number
  showOutline: boolean
}

export interface SettingsActions {
  setApiBaseUrl: (url: string) => void
  setApiKey: (key: string) => void
  setProvider: (provider: string) => void
  setModel: (model: string) => void
  setSystemPrompt: (prompt: string) => void
  setTemperature: (temp: number) => void
  setEditorFontSize: (size: number) => void
  setPreviewFontSize: (size: number) => void
  setUiTheme: (theme: 'dark' | 'light' | 'system') => void
  setUiLanguage: (lang: string) => void
  setAiEnabled: (enabled: boolean) => void
  setSyncScroll: (sync: boolean) => void
  setWrapEnabled: (wrap: boolean) => void
  setLineNumbersEnabled: (enabled: boolean) => void
  setAiActionsEnabled: (actions: string[]) => void
  setAiCustomTemplates: (templates: AICustomTemplate[]) => void
  setRecentAiActions: (actions: Array<{ id: string; title: string }>) => void
  setSplitRatio: (ratio: number) => void
  setOutlineWidth: (width: number) => void
  setShowOutline: (show: boolean) => void
  saveSettings: () => Promise<void>
  loadSettings: () => Promise<void>
  applyProviderDefaults: (provider: string) => void
  increaseEditorFontSize: () => Promise<void>
  decreaseEditorFontSize: () => Promise<void>
  resetEditorFontSize: () => Promise<void>
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

export function useSettings(): SettingsState &
  SettingsActions & { storeRef: React.MutableRefObject<Store | null> } {
  const storeRef = useRef<Store | null>(null)

  // API 设置
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.openai.com')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o-mini')
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant for markdown writing.'
  )
  const [temperature, setTemperature] = useState(0.7)

  // UI 设置
  const [editorFontSize, setEditorFontSize] = useState(16)
  const [previewFontSize, setPreviewFontSize] = useState(16)
  const [uiTheme, setUiTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [uiLanguage, setUiLanguage] = useState('zh-CN')

  // 功能设置
  const [aiEnabled, setAiEnabled] = useState(false)
  const [syncScroll, setSyncScroll] = useState(true)
  const [wrapEnabled, setWrapEnabled] = useState(false)
  const [lineNumbersEnabled, setLineNumbersEnabled] = useState(true)

  // AI 动作
  const [aiActionsEnabled, setAiActionsEnabled] = useState<string[]>(DEFAULT_AI_ACTIONS)
  const [aiCustomTemplates, setAiCustomTemplates] = useState<AICustomTemplate[]>([])
  const [recentAiActions, setRecentAiActions] = useState<Array<{ id: string; title: string }>>([])

  // 布局
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [outlineWidth, setOutlineWidth] = useState(280)
  const [showOutline, setShowOutline] = useState(false)

  /**
   * 根据提供商设置默认值
   */
  const applyProviderDefaults = useCallback(
    (p: string) => {
      switch (p) {
        case 'ollama':
          if (!apiBaseUrl || apiBaseUrl.startsWith('https://')) {
            setApiBaseUrl('http://127.0.0.1:11434')
          }
          if (!model || model === 'gpt-4o-mini') setModel('llama3')
          break
        case 'openai':
          setApiBaseUrl('https://api.openai.com')
          if (!model || model === 'llama3') setModel('gpt-4o-mini')
          break
        case 'openrouter':
          setApiBaseUrl('https://openrouter.ai/api/v1')
          if (!model || model === 'gpt-4o-mini') setModel('openai/gpt-4o')
          break
        case 'claude':
          setApiBaseUrl('https://api.anthropic.com')
          if (!model) setModel('claude-3-5-sonnet-latest')
          break
        case 'deepseek':
          setApiBaseUrl('https://api.deepseek.com')
          if (!model) setModel('deepseek-chat')
          break
        case 'kimi':
          setApiBaseUrl('https://api.moonshot.cn')
          if (!model) setModel('moonshot-v1-8k')
          break
      }
    },
    [apiBaseUrl, model]
  )

  /**
   * 加载设置
   */
  const loadSettings = useCallback(async () => {
    const s = await Store.load('settings.json')
    storeRef.current = s

    // 加载各项设置
    const savedBase = (await s.get<string>('api_base_url')) || 'https://api.openai.com'
    const savedProvider = (await s.get<string>('provider')) || 'openai'
    const savedModel = (await s.get<string>('model')) || 'gpt-4o-mini'
    const savedSystem =
      (await s.get<string>('system_prompt')) || 'You are a helpful assistant for markdown writing.'
    const savedTemp = (await s.get<number>('temperature')) || 0.7
    const savedSplit = (await s.get<number>('split_ratio')) || 0.5
    const savedEditorFs = (await s.get<number>('editor_font_size')) || 16
    const savedPreviewFs = (await s.get<number>('preview_font_size')) || 16
    const savedAiEnabled = await s.get<boolean>('ai_enabled')
    const savedActions = await s.get<string[]>('ai_actions_enabled')
    const savedCustom = await s.get<AICustomTemplate[]>('ai_custom_templates')
    const savedTheme = (await s.get<'dark' | 'light' | 'system'>('ui_theme')) || 'dark'
    const savedLang = (await s.get<string>('ui_language')) || 'zh-CN'
    const savedRecentAi =
      (await s.get<Array<{ id: string; title: string }>>('recent_ai_actions')) || []
    const savedWrap = await s.get<boolean>('wrap_enabled')
    const savedLineNumbers = await s.get<boolean>('line_numbers_enabled')
    const savedOutlineShown = await s.get<boolean>('outline_shown')
    const savedOutlineWidth = await s.get<number>('outline_width')

    // 从 Keyring 读取 API Key
    let savedKey = ''
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const v = await invoke<string | null>('secret_get', {
        service: 'MarkdownMonkey',
        key: 'api_key',
      })
      savedKey = (v || '') as string
    } catch {
      /* ignore */
    }

    // 应用设置
    setApiBaseUrl(savedBase)
    setApiKey(savedKey)
    setProvider(savedProvider)
    setModel(savedModel)
    setSystemPrompt(savedSystem)
    setTemperature(savedTemp)
    setSplitRatio(savedSplit)
    setEditorFontSize(savedEditorFs)
    setPreviewFontSize(savedPreviewFs)
    setUiTheme(savedTheme)
    setUiLanguage(savedLang)
    setRecentAiActions(savedRecentAi)

    if (typeof savedAiEnabled === 'boolean') setAiEnabled(savedAiEnabled)
    if (Array.isArray(savedActions)) setAiActionsEnabled(savedActions)
    if (Array.isArray(savedCustom)) setAiCustomTemplates(savedCustom)
    if (typeof savedWrap === 'boolean') setWrapEnabled(savedWrap)
    if (typeof savedLineNumbers === 'boolean') setLineNumbersEnabled(savedLineNumbers)
    if (typeof savedOutlineShown === 'boolean') setShowOutline(savedOutlineShown)
    if (typeof savedOutlineWidth === 'number') setOutlineWidth(savedOutlineWidth)
  }, [])

  /**
   * 保存设置
   */
  const saveSettings = useCallback(async () => {
    if (!storeRef.current) return

    await storeRef.current.set('api_base_url', apiBaseUrl)
    await storeRef.current.set('provider', provider)
    await storeRef.current.set('model', model)
    await storeRef.current.set('system_prompt', systemPrompt)
    await storeRef.current.set('temperature', temperature)
    await storeRef.current.set('editor_font_size', editorFontSize)
    await storeRef.current.set('preview_font_size', previewFontSize)
    await storeRef.current.set('ui_theme', uiTheme)
    await storeRef.current.set('ui_language', uiLanguage)
    await storeRef.current.set('ai_enabled', aiEnabled)
    await storeRef.current.set('ai_actions_enabled', aiActionsEnabled)
    await storeRef.current.set('ai_custom_templates', aiCustomTemplates)
    await storeRef.current.set('outline_shown', showOutline)
    await storeRef.current.set('outline_width', outlineWidth)
    await storeRef.current.set('recent_ai_actions', recentAiActions)
    await storeRef.current.set('wrap_enabled', wrapEnabled)
    await storeRef.current.set('line_numbers_enabled', lineNumbersEnabled)
    await storeRef.current.save()

    // 保存 API Key 到 Keyring
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const k = (apiKey || '').trim()
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
  }, [
    apiBaseUrl,
    provider,
    model,
    systemPrompt,
    temperature,
    editorFontSize,
    previewFontSize,
    uiTheme,
    uiLanguage,
    aiEnabled,
    aiActionsEnabled,
    aiCustomTemplates,
    showOutline,
    outlineWidth,
    recentAiActions,
    wrapEnabled,
    lineNumbersEnabled,
    apiKey,
  ])

  /**
   * 增大编辑器字号
   */
  const increaseEditorFontSize = useCallback(async () => {
    const next = Math.min(28, (editorFontSize || 16) + 1)
    setEditorFontSize(next)
    if (storeRef.current) {
      try {
        await storeRef.current.set('editor_font_size', next)
        await storeRef.current.save()
      } catch {
        /* ignore */
      }
    }
  }, [editorFontSize])

  /**
   * 减小编辑器字号
   */
  const decreaseEditorFontSize = useCallback(async () => {
    const next = Math.max(10, (editorFontSize || 16) - 1)
    setEditorFontSize(next)
    if (storeRef.current) {
      try {
        await storeRef.current.set('editor_font_size', next)
        await storeRef.current.save()
      } catch {
        /* ignore */
      }
    }
  }, [editorFontSize])

  /**
   * 重置编辑器字号
   */
  const resetEditorFontSize = useCallback(async () => {
    const next = 16
    setEditorFontSize(next)
    if (storeRef.current) {
      try {
        await storeRef.current.set('editor_font_size', next)
        await storeRef.current.save()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return {
    // State
    apiBaseUrl,
    apiKey,
    provider,
    model,
    systemPrompt,
    temperature,
    editorFontSize,
    previewFontSize,
    uiTheme,
    uiLanguage,
    aiEnabled,
    syncScroll,
    wrapEnabled,
    lineNumbersEnabled,
    aiActionsEnabled,
    aiCustomTemplates,
    recentAiActions,
    splitRatio,
    outlineWidth,
    showOutline,
    // Actions
    setApiBaseUrl,
    setApiKey,
    setProvider,
    setModel,
    setSystemPrompt,
    setTemperature,
    setEditorFontSize,
    setPreviewFontSize,
    setUiTheme,
    setUiLanguage,
    setAiEnabled,
    setSyncScroll,
    setWrapEnabled,
    setLineNumbersEnabled,
    setAiActionsEnabled,
    setAiCustomTemplates,
    setRecentAiActions,
    setSplitRatio,
    setOutlineWidth,
    setShowOutline,
    saveSettings,
    loadSettings,
    applyProviderDefaults,
    increaseEditorFontSize,
    decreaseEditorFontSize,
    resetEditorFontSize,
    storeRef,
  }
}
