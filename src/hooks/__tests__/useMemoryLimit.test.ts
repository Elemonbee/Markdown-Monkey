import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useMemoryLimit } from '../useMemoryLimit'

describe('useMemoryLimit', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useMemoryLimit())
    const stats = result.current.getMemoryStats()

    expect(stats.totalSize).toBe(0)
    expect(stats.documentCount).toBe(0)
    expect(stats.maxTotalSize).toBe(20 * 1024 * 1024) // Default 20MB
  })

  it('should allow setting document within limits', () => {
    const { result } = renderHook(() =>
      useMemoryLimit({
        maxDocumentSize: 100,
        maxTotalSize: 200,
      })
    )

    const content = 'test content' // 12 bytes
    const check = result.current.canSetDocument('doc1', content)

    expect(check.allowed).toBe(true)
    expect(check.reason).toBeUndefined()

    act(() => {
      result.current.updateDocumentSize('doc1', content)
    })

    const stats = result.current.getMemoryStats()
    expect(stats.totalSize).toBe(12)
    expect(stats.documentCount).toBe(1)
  })

  it('should block document exceeding max size', () => {
    renderHook(() =>
      useMemoryLimit({
        maxDocumentSize: 10,
      })
    )

    const onLimitExceeded = vi.fn()
    const { result: resultWithCallback } = renderHook(() =>
      useMemoryLimit({
        maxDocumentSize: 10,
        onLimitExceeded,
      })
    )

    const content = 'this is too long' // 16 bytes
    const check = resultWithCallback.current.canSetDocument('doc1', content)

    expect(check.allowed).toBe(false)
    expect(check.reason).toContain('文档过大')
    expect(onLimitExceeded).toHaveBeenCalled()
  })

  it('should block document exceeding total size', () => {
    const { result } = renderHook(() =>
      useMemoryLimit({
        maxTotalSize: 20,
      })
    )

    // First doc takes 15 bytes
    const content1 = '123456789012345'
    act(() => {
      result.current.updateDocumentSize('doc1', content1)
    })

    // Second doc tries to take 10 bytes (total 25 > 20)
    const content2 = '1234567890'
    const check = result.current.canSetDocument('doc2', content2)

    expect(check.allowed).toBe(false)
    expect(check.reason).toContain('内存使用过高')
  })

  it('should update existing document size correctly', () => {
    const { result } = renderHook(() => useMemoryLimit())

    act(() => {
      result.current.updateDocumentSize('doc1', 'small') // 5 bytes
    })

    expect(result.current.getMemoryStats().totalSize).toBe(5)

    act(() => {
      result.current.updateDocumentSize('doc1', 'larger content') // 14 bytes
    })

    // Should replace old size, not add to it
    expect(result.current.getMemoryStats().totalSize).toBe(14)
  })

  it('should remove document', () => {
    const { result } = renderHook(() => useMemoryLimit())

    act(() => {
      result.current.updateDocumentSize('doc1', 'content')
      result.current.updateDocumentSize('doc2', 'content')
    })

    expect(result.current.getMemoryStats().documentCount).toBe(2)

    act(() => {
      result.current.removeDocument('doc1')
    })

    const stats = result.current.getMemoryStats()
    expect(stats.documentCount).toBe(1)
    expect(stats.totalSize).toBe(7) // 'content' length
  })

  it('should clear all records', () => {
    const { result } = renderHook(() => useMemoryLimit())

    act(() => {
      result.current.updateDocumentSize('doc1', 'content')
    })

    act(() => {
      result.current.clear()
    })

    const stats = result.current.getMemoryStats()
    expect(stats.totalSize).toBe(0)
    expect(stats.documentCount).toBe(0)
  })

  it('should format size correctly', () => {
    // Access private formatSize via getMemoryStats for indirect testing
    const { result } = renderHook(() => useMemoryLimit({ maxTotalSize: 1024 * 1024 * 5 }))

    // 0 bytes
    expect(result.current.getMemoryStats().totalSizeFormatted).toBe('0 B')

    // KB
    act(() => {
      // Create a large string ~1.5KB
      result.current.updateDocumentSize('doc1', 'a'.repeat(1500))
    })
    expect(result.current.getMemoryStats().totalSizeFormatted).toBe('1.46 KB')

    // MB (indirectly via maxTotalSizeFormatted)
    expect(result.current.getMemoryStats().maxTotalSizeFormatted).toBe('5.00 MB')
  })
})
