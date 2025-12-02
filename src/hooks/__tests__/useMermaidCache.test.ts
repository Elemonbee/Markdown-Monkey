import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMermaidCache } from '../useMermaidCache'
import mermaid from 'mermaid'

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    render: vi.fn(),
  },
}))

describe('useMermaidCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render and cache mermaid diagram', async () => {
    const { result } = renderHook(() => useMermaidCache())

    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>test</svg>' } as any)

    const definition = 'graph TD\nA-->B'
    const id = 'mermaid-1'

    // First render
    let svg = ''
    await act(async () => {
      svg = await result.current.renderMermaid(definition, id)
    })

    expect(svg).toBe('<svg>test</svg>')
    expect(mermaid.render).toHaveBeenCalledTimes(1)
    expect(mermaid.render).toHaveBeenCalledWith(id, definition)

    // Second render (should use cache)
    await act(async () => {
      svg = await result.current.renderMermaid(definition, id)
    })

    expect(svg).toBe('<svg>test</svg>')
    expect(mermaid.render).toHaveBeenCalledTimes(1) // Call count should not increase
  })

  it('should generate different cache keys for different definitions', async () => {
    const { result } = renderHook(() => useMermaidCache())

    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>test</svg>' } as any)

    await act(async () => {
      await result.current.renderMermaid('graph TD\nA-->B', 'id1')
    })

    await act(async () => {
      await result.current.renderMermaid('graph TD\nA-->C', 'id2')
    })

    expect(mermaid.render).toHaveBeenCalledTimes(2)
    expect(result.current.getCacheStats().size).toBe(2)
  })

  it('should expire cache entries', async () => {
    const { result } = renderHook(() => useMermaidCache())

    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>test</svg>' } as any)

    await act(async () => {
      await result.current.renderMermaid('graph TD\nA-->B', 'id1')
    })

    expect(mermaid.render).toHaveBeenCalledTimes(1)

    // Advance time past MAX_AGE (5 minutes)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000)

    // Render again
    await act(async () => {
      await result.current.renderMermaid('graph TD\nA-->B', 'id1')
    })

    // Should re-render because cache expired
    expect(mermaid.render).toHaveBeenCalledTimes(2)
  })

  it('should limit cache size', async () => {
    const { result } = renderHook(() => useMermaidCache())

    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>test</svg>' } as any)

    // Fill cache beyond limit (50)
    for (let i = 0; i < 55; i++) {
      await act(async () => {
        await result.current.renderMermaid(`graph TD\nA-->${i}`, `id${i}`)
      })
      // Advance time slightly to ensure stable sort order
      vi.advanceTimersByTime(10)
    }

    const stats = result.current.getCacheStats()
    expect(stats.size).toBeLessThanOrEqual(50)
  })

  it('should clear cache', async () => {
    const { result } = renderHook(() => useMermaidCache())

    vi.mocked(mermaid.render).mockResolvedValue({ svg: '<svg>test</svg>' } as any)

    await act(async () => {
      await result.current.renderMermaid('graph TD\nA-->B', 'id1')
    })

    expect(result.current.getCacheStats().size).toBe(1)

    act(() => {
      result.current.clearCache()
    })

    expect(result.current.getCacheStats().size).toBe(0)
  })

  it('should handle render errors', async () => {
    const { result } = renderHook(() => useMermaidCache())

    const error = new Error('Render failed')
    vi.mocked(mermaid.render).mockRejectedValue(error)

    await expect(result.current.renderMermaid('invalid', 'id1')).rejects.toThrow('Render failed')
  })
})
