/**
 * Mermaid 图表渲染缓存 Hook
 * 避免重复渲染相同的图表定义
 */

import { useRef, useCallback } from 'react'
import mermaid from 'mermaid'

interface CacheEntry {
  svg: string
  timestamp: number
}

const CACHE_MAX_SIZE = 50
const CACHE_MAX_AGE = 5 * 60 * 1000 // 5 分钟

export function useMermaidCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map())

  /**
   * 生成缓存键（基于图表定义的哈希）
   */
  const getCacheKey = useCallback((definition: string): string => {
    // 简单的哈希函数
    let hash = 0
    for (let i = 0; i < definition.length; i++) {
      const char = definition.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  }, [])

  /**
   * 清理过期缓存
   */
  const cleanCache = useCallback(() => {
    const now = Date.now()
    const cache = cacheRef.current

    // 删除过期条目
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_MAX_AGE) {
        cache.delete(key)
      }
    }

    // 如果缓存仍然过大，删除最旧的条目
    if (cache.size > CACHE_MAX_SIZE) {
      const entries = Array.from(cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toDelete = entries.slice(0, cache.size - CACHE_MAX_SIZE)
      for (const [key] of toDelete) {
        cache.delete(key)
      }
    }
  }, [])

  /**
   * 渲染 Mermaid 图表（带缓存）
   */
  const renderMermaid = useCallback(
    async (definition: string, id: string): Promise<string> => {
      const cacheKey = getCacheKey(definition)
      const cache = cacheRef.current

      // 检查缓存
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE) {
        return cached.svg
      }

      try {
        // 渲染新图表
        const { svg } = await mermaid.render(id, definition)

        // 存入缓存
        cache.set(cacheKey, {
          svg,
          timestamp: Date.now(),
        })

        // 清理缓存
        cleanCache()

        return svg
      } catch (error) {
        console.error('Mermaid rendering error:', error)
        throw error
      }
    },
    [getCacheKey, cleanCache]
  )

  /**
   * 清空缓存
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
  }, [])

  /**
   * 获取缓存统计信息
   */
  const getCacheStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize: CACHE_MAX_SIZE,
      maxAge: CACHE_MAX_AGE,
    }
  }, [])

  return {
    renderMermaid,
    clearCache,
    getCacheStats,
  }
}
