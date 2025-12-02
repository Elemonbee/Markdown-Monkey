import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useAIState } from '../useAIState'

describe('useAIState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAIState())

    expect(result.current.ai_enabled).toBe(false)
    expect(result.current.show_ai_result).toBe(false)
    expect(result.current.ai_loading).toBe(false)
    expect(result.current.ai_title).toBe('AI Result')
    expect(result.current.ai_result_text).toBe('')
    expect(result.current.show_ai_chat).toBe(false)
    expect(result.current.ai_actions_enabled).toHaveLength(7) // Default actions
  })

  it('should toggle AI enabled state', () => {
    const { result } = renderHook(() => useAIState())

    act(() => {
      result.current.toggle_ai()
    })
    expect(result.current.ai_enabled).toBe(true)

    act(() => {
      result.current.toggle_ai()
    })
    expect(result.current.ai_enabled).toBe(false)
  })

  it('should manage AI chat visibility', () => {
    const { result } = renderHook(() => useAIState())

    act(() => {
      result.current.open_ai_chat()
    })
    expect(result.current.show_ai_chat).toBe(true)

    act(() => {
      result.current.close_ai_chat()
    })
    expect(result.current.show_ai_chat).toBe(false)
  })

  it('should append and clear AI result', () => {
    const { result } = renderHook(() => useAIState())

    act(() => {
      result.current.append_ai_result('Hello')
    })
    expect(result.current.ai_result_text).toBe('Hello')

    act(() => {
      result.current.append_ai_result(' World')
    })
    expect(result.current.ai_result_text).toBe('Hello World')

    act(() => {
      result.current.clear_ai_result()
    })
    expect(result.current.ai_result_text).toBe('')
  })

  it('should update various state values', () => {
    const { result } = renderHook(() => useAIState())

    act(() => {
      result.current.set_ai_title('New Title')
      result.current.set_ai_loading(true)
      result.current.set_ai_elapsed_ms(100)
      result.current.set_ai_last_scope('document')
    })

    expect(result.current.ai_title).toBe('New Title')
    expect(result.current.ai_loading).toBe(true)
    expect(result.current.ai_elapsed_ms).toBe(100)
    expect(result.current.ai_last_scope).toBe('document')
  })

  it('should reset chat position', () => {
    const { result } = renderHook(() => useAIState())
    const initialTick = result.current.chat_reset_tick

    act(() => {
      result.current.reset_chat_position()
    })

    expect(result.current.chat_reset_tick).toBeGreaterThan(initialTick)
  })

  it('should expose refs', () => {
    const { result } = renderHook(() => useAIState())

    expect(result.current.refs.abort_ref).toBeDefined()
    expect(result.current.refs.unsubscribe_ref).toBeDefined()
    expect(result.current.refs.last_prompt_ref).toBeDefined()
  })
})
