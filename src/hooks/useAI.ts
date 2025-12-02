/**
 * useAI - AI 功能 Hook / AI functionality Hook
 * 处理 AI 补全、流式响应和自定义动作 / Handles AI completion, streaming responses, and custom actions
 */

import { useState, useRef, useCallback } from 'react'
// AI 功能 Hook

export interface AIState {
  aiLoading: boolean
  aiTitle: string
  aiResultText: string
  aiElapsedMs: number
  aiLastScope: 'selection' | 'document' | 'unknown'
  showAiResult: boolean
  showAiChat: boolean
  chatResetTick: number
}

export interface AIActions {
  setShowAiResult: (show: boolean) => void
  setShowAiChat: (show: boolean) => void
  setChatResetTick: (tick: number) => void
  aiInvoke: (promptText: string, config: AIConfig) => Promise<void>
  aiAction: (
    action: 'continue' | 'rewrite' | 'translate_zh' | 'translate_en' | 'summary',
    scope: 'selection' | 'document',
    config: AIConfig,
    getText: () => { selection: string; document: string },
    uiLanguage: string,
    onRecentAction?: (action: { id: string; title: string }) => void
  ) => Promise<void>
  aiCustomAction: (
    tpl: AICustomTemplate,
    config: AIConfig,
    getText: () => { selection: string; document: string },
    context: { currentFilePath: string; model: string; provider: string },
    uiLanguage: string
  ) => Promise<void>
  abortAI: () => void
  testConnection: (config: AIConfig) => Promise<void>
}

export interface AIConfig {
  provider: string
  apiKey: string
  apiBaseUrl: string
  model: string
  systemPrompt: string
  temperature: number
}

export interface AICustomTemplate {
  id: string
  title: string
  body: string
  scope: 'selection' | 'document'
  enabled: boolean
  vars?: { lang?: string; style?: string }
}

export function useAI(): AIState & AIActions {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiTitle, setAiTitle] = useState('AI Result')
  const [aiResultText, setAiResultText] = useState('')
  const [aiElapsedMs, setAiElapsedMs] = useState(0)
  const [aiLastScope, setAiLastScope] = useState<'selection' | 'document' | 'unknown'>('unknown')
  const [showAiResult, setShowAiResult] = useState(false)
  const [showAiChat, setShowAiChat] = useState(false)
  const [chatResetTick, setChatResetTick] = useState(0)

  const abortRef = useRef(false)
  const unsubscribeRef = useRef<() => void>(() => {})
  const lastPromptRef = useRef('')

  /**
   * 中止 AI 请求
   */
  const abortAI = useCallback(() => {
    abortRef.current = true
  }, [])

  /**
   * 调用 AI
   */
  const aiInvoke = useCallback(async (promptText: string, config: AIConfig) => {
    const { invoke } = await import('@tauri-apps/api/core')
    const { listen } = await import('@tauri-apps/api/event')

    if (config.provider !== 'ollama' && (!config.apiKey || config.apiKey.trim() === '')) {
      window.alert('请先在设置中输入 API Key')
      return
    }

    if (config.provider === 'openrouter' && !config.apiKey.trim().startsWith('sk-or-')) {
      const ok = window.confirm(
        '当前 Provider 为 OpenRouter，但 API Key 看起来不是 OpenRouter Key（通常以 sk-or- 开头）。仍要继续发送吗？'
      )
      if (!ok) return
    }

    setAiLoading(true)
    const startTs = Date.now()
    setShowAiResult(true)
    setAiResultText('')
    abortRef.current = false
    lastPromptRef.current = promptText

    // 清理之前的监听器
    try {
      unsubscribeRef.current()
    } catch {
      /* ignore */
    }

    let throttling = false
    let bufferText = ''

    const flush = () => {
      if (!bufferText) return
      const toAppend = bufferText
      bufferText = ''
      setAiResultText((prev) => prev + toAppend)
    }

    const unlisten = await listen<string>('ai:stream', (e) => {
      const payload = (e.payload || '').toString().trim()
      if (!payload) return
      if (!payload.startsWith('data:')) return

      const data = payload.slice('data:'.length).trim()
      if (data === '[DONE]') {
        flush()
        setAiLoading(false)
        setAiElapsedMs(Date.now() - startTs)
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
        // ignore parse errors
      }
    })

    unsubscribeRef.current = unlisten

    try {
      await invoke('ai_complete_stream', {
        req: {
          provider: config.provider,
          api_key: config.apiKey.trim(),
          prompt: promptText,
          model: config.model,
          system_prompt: config.systemPrompt,
          temperature: config.temperature,
          base_url: config.apiBaseUrl,
        },
      })
    } catch (e: unknown) {
      console.error(e)
      if (!abortRef.current) {
        setAiResultText((prev) => prev || `错误：${e}`)
      }
    } finally {
      setAiLoading(false)
      setAiElapsedMs((prev) => prev || Date.now() - startTs)
    }
  }, [])

  /**
   * 执行 AI 动作
   */
  const aiAction = useCallback(
    async (
      action: 'continue' | 'rewrite' | 'translate_zh' | 'translate_en' | 'summary',
      scope: 'selection' | 'document',
      config: AIConfig,
      getText: () => { selection: string; document: string },
      uiLanguage: string,
      onRecentAction?: (action: { id: string; title: string }) => void
    ) => {
      const { selection, document } = getText()

      if (scope === 'selection' && !selection) {
        window.alert('请先选中要处理的文本，然后再执行该操作。')
        return
      }

      const source = scope === 'selection' ? selection : document
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

      const titleMap: Record<string, string> = {
        continue: uiLanguage === 'en-US' ? 'Continue Result' : '续写结果',
        rewrite: uiLanguage === 'en-US' ? 'Rewrite Result' : '改写结果',
        translate_zh: uiLanguage === 'en-US' ? 'Translate to Chinese' : '翻译为中文',
        translate_en: 'Translate to English',
        summary: uiLanguage === 'en-US' ? 'Summary' : '总结要点',
      }

      setAiTitle(titleMap[action])
      setAiLastScope(scope)

      // 记录最近动作
      if (scope === 'selection' && onRecentAction) {
        const recentTitleMap: Record<string, string> = {
          continue: '续写（选中）',
          rewrite: '改写（选中）',
          translate_zh: '翻译为中文（选中）',
          translate_en: 'Translate to English（selected）',
          summary: '总结要点（选中）',
        }
        onRecentAction({
          id: `builtin_${action}`,
          title: recentTitleMap[action],
        })
      }

      await aiInvoke(prompt, config)
    },
    [aiInvoke]
  )

  /**
   * 执行自定义 AI 动作
   */
  const aiCustomAction = useCallback(
    async (
      tpl: AICustomTemplate,
      config: AIConfig,
      getText: () => { selection: string; document: string },
      context: { currentFilePath: string; model: string; provider: string },
      uiLanguage: string
    ) => {
      const { selection, document } = getText()

      if (tpl.scope === 'selection' && !selection) {
        window.alert('请先选中要处理的文本，然后再执行该操作。')
        return
      }

      const source = tpl.scope === 'selection' ? selection : document
      let prompt = (tpl.body || '').replaceAll('{text}', source)

      if (tpl.vars?.lang) prompt = prompt.replaceAll('{lang}', tpl.vars.lang)
      if (tpl.vars?.style) prompt = prompt.replaceAll('{style}', tpl.vars.style)

      // 内置变量
      const now = new Date()
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const filename = context.currentFilePath
        ? context.currentFilePath.split(/[/\\]/).pop() || ''
        : ''

      prompt = prompt.replaceAll('{date}', dateStr)
      prompt = prompt.replaceAll('{filename}', filename)
      prompt = prompt.replaceAll('{model}', context.model)
      prompt = prompt.replaceAll('{provider}', context.provider)

      setAiTitle(tpl.title || (uiLanguage === 'en-US' ? 'AI Result' : 'AI 结果'))
      setAiLastScope(tpl.scope)

      await aiInvoke(prompt, config)
    },
    [aiInvoke]
  )

  /**
   * 测试连接
   */
  const testConnection = useCallback(async (config: AIConfig) => {
    const { invoke } = await import('@tauri-apps/api/core')
    try {
      const msg = await invoke<string>('test_connection', {
        req: {
          provider: config.provider,
          api_key: config.apiKey,
          base_url: config.apiBaseUrl,
        },
      })
      window.alert(msg)
    } catch (e: unknown) {
      window.alert(`连接失败: ${e}`)
    }
  }, [])

  return {
    // State
    aiLoading,
    aiTitle,
    aiResultText,
    aiElapsedMs,
    aiLastScope,
    showAiResult,
    showAiChat,
    chatResetTick,
    // Actions
    setShowAiResult,
    setShowAiChat,
    setChatResetTick,
    aiInvoke,
    aiAction,
    aiCustomAction,
    abortAI,
    testConnection,
  }
}
