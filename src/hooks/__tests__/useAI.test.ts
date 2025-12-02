import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAI } from '../useAI'

// Mock Tauri APIs
const mockInvoke = vi.fn()
const mockListen = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: any[]) => mockListen(...args),
}))

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Setup default mock returns
    mockListen.mockResolvedValue(() => {}) // Unlisten function
    mockInvoke.mockResolvedValue('Success')

    // Mock window.alert and confirm
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAI())

    expect(result.current.aiLoading).toBe(false)
    expect(result.current.aiResultText).toBe('')
    expect(result.current.showAiResult).toBe(false)
  })

  it('should validate API key', async () => {
    const { result } = renderHook(() => useAI())

    const config = {
      provider: 'openai',
      apiKey: '', // Empty key
      apiBaseUrl: '',
      model: 'gpt-3.5',
      systemPrompt: '',
      temperature: 0.7,
    }

    await act(async () => {
      await result.current.aiInvoke('test prompt', config)
    })

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('请先在设置中输入 API Key'))
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('should invoke AI and handle streaming response', async () => {
    const { result } = renderHook(() => useAI())

    let streamCallback: (e: any) => void = () => {}

    // Mock listen to capture callback
    mockListen.mockImplementation(async (_event, callback) => {
      streamCallback = callback
      return () => {}
    })

    // Mock invoke to be blocking (simulate real behavior)
    let resolveInvoke: (value: any) => void = () => {}
    mockInvoke.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveInvoke = resolve
      })
    })

    const config = {
      provider: 'openai',
      apiKey: 'sk-test',
      apiBaseUrl: '',
      model: 'gpt-3.5',
      systemPrompt: '',
      temperature: 0.7,
    }

    let promise: Promise<void>
    await act(async () => {
      promise = result.current.aiInvoke('test prompt', config)
    })

    expect(result.current.aiLoading).toBe(true)
    expect(result.current.showAiResult).toBe(true)

    // Simulate stream chunks
    await act(async () => {
      streamCallback({ payload: 'data: {"choices":[{"delta":{"content":"Hello"}}]}' })
      streamCallback({ payload: 'data: {"choices":[{"delta":{"content":" World"}}]}' })

      // Advance timers to trigger throttle flush
      vi.advanceTimersByTime(100)
    })

    expect(result.current.aiResultText).toBe('Hello World')

    // Simulate completion
    await act(async () => {
      streamCallback({ payload: 'data: [DONE]' })
      resolveInvoke('Success')
      await promise
    })

    expect(result.current.aiLoading).toBe(false)
    expect(mockInvoke).toHaveBeenCalledWith('ai_complete_stream', expect.any(Object))
  })

  it('should handle AI actions', async () => {
    const { result } = renderHook(() => useAI())

    const config = {
      provider: 'openai',
      apiKey: 'sk-test',
      apiBaseUrl: '',
      model: 'gpt-3.5',
      systemPrompt: '',
      temperature: 0.7,
    }

    const getText = vi.fn().mockReturnValue({
      selection: 'selected text',
      document: 'full document',
    })

    await act(async () => {
      await result.current.aiAction('summary', 'selection', config, getText, 'zh-CN')
    })

    expect(result.current.aiTitle).toBe('总结要点')
    expect(mockInvoke).toHaveBeenCalledWith(
      'ai_complete_stream',
      expect.objectContaining({
        req: expect.objectContaining({
          prompt: expect.stringContaining('请将以下内容总结为 5 条要点'),
        }),
      })
    )
  })

  it('should require selection for selection-scoped actions', async () => {
    const { result } = renderHook(() => useAI())

    const config = {
      provider: 'openai',
      apiKey: 'sk-test',
      apiBaseUrl: '',
      model: 'gpt-3.5',
      systemPrompt: '',
      temperature: 0.7,
    }

    const getText = vi.fn().mockReturnValue({
      selection: '', // No selection
      document: 'full document',
    })

    await act(async () => {
      await result.current.aiAction('summary', 'selection', config, getText, 'zh-CN')
    })

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('请先选中要处理的文本'))
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('should handle custom AI actions', async () => {
    const { result } = renderHook(() => useAI())

    const config = {
      provider: 'openai',
      apiKey: 'sk-test',
      apiBaseUrl: '',
      model: 'gpt-3.5',
      systemPrompt: '',
      temperature: 0.7,
    }

    const template = {
      id: 'custom1',
      title: 'Custom Action',
      body: 'Explain: {text}',
      scope: 'selection' as const,
      enabled: true,
    }

    const getText = vi.fn().mockReturnValue({
      selection: 'code',
      document: '',
    })

    const context = {
      currentFilePath: 'test.md',
      model: 'gpt-4',
      provider: 'openai',
    }

    await act(async () => {
      await result.current.aiCustomAction(template, config, getText, context, 'en-US')
    })

    expect(result.current.aiTitle).toBe('Custom Action')
    expect(mockInvoke).toHaveBeenCalledWith(
      'ai_complete_stream',
      expect.objectContaining({
        req: expect.objectContaining({
          prompt: 'Explain: code',
        }),
      })
    )
  })

  it('should test connection', async () => {
    const { result } = renderHook(() => useAI())

    mockInvoke.mockResolvedValue('Connection successful')

    const config = {
      provider: 'openai',
      apiKey: 'sk-test',
      apiBaseUrl: '',
      model: 'gpt-3.5',
      systemPrompt: '',
      temperature: 0.7,
    }

    await act(async () => {
      await result.current.testConnection(config)
    })

    expect(mockInvoke).toHaveBeenCalledWith('test_connection', expect.any(Object))
    expect(window.alert).toHaveBeenCalledWith('Connection successful')
  })
})
