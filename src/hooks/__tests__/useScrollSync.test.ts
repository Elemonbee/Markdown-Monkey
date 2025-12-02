import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useScrollSync } from '../useScrollSync'

describe('useScrollSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should return createScrollHandler and lockRef', () => {
    const { result } = renderHook(() => useScrollSync({ enabled: true }))
    expect(result.current.createScrollHandler).toBeDefined()
    expect(result.current.lockRef).toBeDefined()
    expect(result.current.lockRef.current).toEqual({ active: false, token: 0 })
  })

  it('should not scroll if disabled', () => {
    const { result } = renderHook(() => useScrollSync({ enabled: false }))

    const sourceGetter = vi.fn()
    const targetGetter = vi.fn()
    const calculateTargetScroll = vi.fn()

    const handler = result.current.createScrollHandler(
      sourceGetter,
      targetGetter,
      calculateTargetScroll
    )

    handler()

    expect(sourceGetter).not.toHaveBeenCalled()
  })

  it('should not scroll if locked', () => {
    const { result } = renderHook(() => useScrollSync({ enabled: true }))

    // Manually lock
    result.current.lockRef.current.active = true

    const sourceGetter = vi.fn()
    const targetGetter = vi.fn()
    const calculateTargetScroll = vi.fn()

    const handler = result.current.createScrollHandler(
      sourceGetter,
      targetGetter,
      calculateTargetScroll
    )

    handler()

    expect(sourceGetter).not.toHaveBeenCalled()
  })

  it('should throttle scroll events', () => {
    const { result } = renderHook(() => useScrollSync({ enabled: true, throttleMs: 100 }))

    const source = document.createElement('div')
    const target = document.createElement('div')

    // Mock scroll properties
    Object.defineProperty(source, 'scrollTop', { value: 100 })
    Object.defineProperty(source, 'scrollHeight', { value: 1000 })
    Object.defineProperty(source, 'clientHeight', { value: 500 })

    const sourceGetter = vi.fn(() => source)
    const targetGetter = vi.fn(() => target)
    const calculateTargetScroll = vi.fn(() => 200)

    const handler = result.current.createScrollHandler(
      sourceGetter,
      targetGetter,
      calculateTargetScroll
    )

    // First call
    handler()
    vi.runAllTimers() // Execute RAF

    expect(sourceGetter).toHaveBeenCalledTimes(1)

    // Second call immediately (should be throttled)
    handler()
    vi.runAllTimers()

    expect(sourceGetter).toHaveBeenCalledTimes(1)

    // Advance time
    vi.advanceTimersByTime(101)

    // Third call (should pass)
    handler()
    vi.runAllTimers()

    expect(sourceGetter).toHaveBeenCalledTimes(2)
  })

  it('should sync scroll and set lock', () => {
    const { result } = renderHook(() => useScrollSync({ enabled: true }))

    const source = document.createElement('div')
    const target = document.createElement('div')

    Object.defineProperty(source, 'scrollTop', { value: 100 })
    Object.defineProperty(source, 'scrollHeight', { value: 1000 })
    Object.defineProperty(source, 'clientHeight', { value: 500 })

    const sourceGetter = vi.fn(() => source)
    const targetGetter = vi.fn(() => target)
    const calculateTargetScroll = vi.fn(() => 200)

    const handler = result.current.createScrollHandler(
      sourceGetter,
      targetGetter,
      calculateTargetScroll
    )

    handler()
    vi.runAllTimers() // Execute RAF

    expect(calculateTargetScroll).toHaveBeenCalled()
    expect(target.scrollTop).toBe(200)

    // Lock should be active immediately after sync
    expect(result.current.lockRef.current.active).toBe(true)

    // Lock should release after timeout
    vi.advanceTimersByTime(50)
    expect(result.current.lockRef.current.active).toBe(false)
  })
})
