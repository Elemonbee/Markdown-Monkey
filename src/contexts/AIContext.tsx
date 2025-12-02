/**
 * AI 状态管理 Context / AI state management Context
 * 将 AI 相关的状态从 App.tsx 中分离出来 / Separates AI-related state from App.tsx
 */

import { createContext, useContext, useState, type ReactNode } from 'react'

interface AIState {
  ai_enabled: boolean
  provider: string
  api_base_url: string
  api_key: string
  model: string
  system_prompt: string
  temperature: number
  ai_actions_enabled: string[]
  ai_custom_templates: Array<{
    id: string
    title: string
    body: string
    scope: 'selection' | 'document'
    enabled: boolean
    vars?: { lang?: string; style?: string }
  }>
}

interface AIContextType extends AIState {
  set_ai_enabled: (enabled: boolean) => void
  set_provider: (provider: string) => void
  set_api_base_url: (url: string) => void
  set_api_key: (key: string) => void
  set_model: (model: string) => void
  set_system_prompt: (prompt: string) => void
  set_temperature: (temp: number) => void
  set_ai_actions_enabled: (actions: string[]) => void
  set_ai_custom_templates: (
    templates: Array<{
      id: string
      title: string
      body: string
      scope: 'selection' | 'document'
      enabled: boolean
      vars?: { lang?: string; style?: string }
    }>
  ) => void
}

const AIContext = createContext<AIContextType | undefined>(undefined)

export function AIProvider({ children }: { children: ReactNode }) {
  const [ai_enabled, set_ai_enabled] = useState<boolean>(false)
  const [provider, set_provider] = useState<string>('openai')
  const [api_base_url, set_api_base_url] = useState<string>('https://api.openai.com')
  const [api_key, set_api_key] = useState<string>('')
  const [model, set_model] = useState<string>('gpt-4o-mini')
  const [system_prompt, set_system_prompt] = useState<string>(
    'You are a helpful assistant for markdown writing.'
  )
  const [temperature, set_temperature] = useState<number>(0.7)
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

  const value: AIContextType = {
    ai_enabled,
    provider,
    api_base_url,
    api_key,
    model,
    system_prompt,
    temperature,
    ai_actions_enabled,
    ai_custom_templates,
    set_ai_enabled,
    set_provider,
    set_api_base_url,
    set_api_key,
    set_model,
    set_system_prompt,
    set_temperature,
    set_ai_actions_enabled,
    set_ai_custom_templates,
  }

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAI() {
  const context = useContext(AIContext)
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider')
  }
  return context
}
