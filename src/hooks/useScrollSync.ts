/**
 * 优化的滚动同步 Hook / Optimized scroll synchronization Hook
 * 使用 requestAnimationFrame 和节流来提升性能 / Uses requestAnimationFrame and throttling to improve performance
 */

import { useRef, useCallback, useEffect } from 'react'

interface ScrollSyncOptions {
  enabled: boolean
  throttleMs?: number
}

export function useScrollSync(options: ScrollSyncOptions) {
  const { enabled, throttleMs = 16 } = options // 默认 ~60fps

  const lockRef = useRef({ active: false, token: 0 })
  const rafIdRef = useRef<number | null>(null)
  const lastScrollTimeRef = useRef(0)

  /**
   * 创建节流的滚动处理器 / Create throttled scroll handler
   */
  const createScrollHandler = useCallback(
    (
      sourceGetter: () => HTMLElement | null,
      targetGetter: () => HTMLElement | null,
      calculateTargetScroll: (sourceRatio: number) => number
    ) => {
      return () => {
        if (!enabled) return
        if (lockRef.current.active) return

        const now = Date.now()
        if (now - lastScrollTimeRef.current < throttleMs) {
          return
        }
        lastScrollTimeRef.current = now

        // 取消之前的 RAF
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current)
        }

        rafIdRef.current = requestAnimationFrame(() => {
          const source = sourceGetter()
          const target = targetGetter()

          if (!source || !target) return

          // 获取源滚动比例
          const sourceRatio =
            source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight)

          if (!isFinite(sourceRatio)) return

          // 设置锁
          const myToken = ++lockRef.current.token
          lockRef.current.active = true

          // 计算并设置目标滚动位置
          const targetScroll = calculateTargetScroll(sourceRatio)
          target.scrollTop = targetScroll

          // 释放锁
          setTimeout(() => {
            if (lockRef.current.token === myToken) {
              lockRef.current.active = false
            }
          }, 50)

          rafIdRef.current = null
        })
      }
    },
    [enabled, throttleMs]
  )

  /**
   * 清理函数
   */
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return {
    createScrollHandler,
    lockRef,
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}
