/**
 * 内存限制 Hook
 * 防止未命名文档占用过多内存
 */

import { useCallback, useRef } from 'react'

interface MemoryLimitOptions {
  maxDocumentSize?: number // 单个文档最大字节数
  maxTotalSize?: number // 所有文档总大小
  onLimitExceeded?: (message: string) => void
}

const DEFAULT_MAX_DOCUMENT_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_MAX_TOTAL_SIZE = 20 * 1024 * 1024 // 20MB

export function useMemoryLimit(options: MemoryLimitOptions = {}) {
  const {
    maxDocumentSize = DEFAULT_MAX_DOCUMENT_SIZE,
    maxTotalSize = DEFAULT_MAX_TOTAL_SIZE,
    onLimitExceeded,
  } = options

  const totalSizeRef = useRef(0)
  const documentSizesRef = useRef<Map<string, number>>(new Map())

  /**
   * 计算字符串的字节大小（UTF-8）
   */
  const getByteSize = useCallback((str: string): number => {
    return new Blob([str]).size
  }, [])

  /**
   * 格式化字节大小为可读格式
   */
  const formatSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }, [])

  /**
   * 检查是否可以设置文档内容
   */
  const canSetDocument = useCallback(
    (documentId: string, content: string): { allowed: boolean; reason?: string } => {
      const newSize = getByteSize(content)

      // 检查单个文档大小
      if (newSize > maxDocumentSize) {
        const message = `文档过大 (${formatSize(newSize)})，最大允许 ${formatSize(maxDocumentSize)}`
        if (onLimitExceeded) onLimitExceeded(message)
        return { allowed: false, reason: message }
      }

      // 计算新的总大小
      const oldSize = documentSizesRef.current.get(documentId) || 0
      const newTotalSize = totalSizeRef.current - oldSize + newSize

      // 检查总大小
      if (newTotalSize > maxTotalSize) {
        const message = `内存使用过高 (${formatSize(newTotalSize)})，最大允许 ${formatSize(maxTotalSize)}`
        if (onLimitExceeded) onLimitExceeded(message)
        return { allowed: false, reason: message }
      }

      return { allowed: true }
    },
    [maxDocumentSize, maxTotalSize, getByteSize, formatSize, onLimitExceeded]
  )

  /**
   * 更新文档大小记录
   */
  const updateDocumentSize = useCallback(
    (documentId: string, content: string): void => {
      const newSize = getByteSize(content)
      const oldSize = documentSizesRef.current.get(documentId) || 0

      documentSizesRef.current.set(documentId, newSize)
      totalSizeRef.current = totalSizeRef.current - oldSize + newSize
    },
    [getByteSize]
  )

  /**
   * 删除文档记录
   */
  const removeDocument = useCallback((documentId: string): void => {
    const size = documentSizesRef.current.get(documentId) || 0
    documentSizesRef.current.delete(documentId)
    totalSizeRef.current -= size
  }, [])

  /**
   * 获取内存使用统计
   */
  const getMemoryStats = useCallback(() => {
    return {
      totalSize: totalSizeRef.current,
      totalSizeFormatted: formatSize(totalSizeRef.current),
      documentCount: documentSizesRef.current.size,
      maxTotalSize,
      maxTotalSizeFormatted: formatSize(maxTotalSize),
      usagePercent: ((totalSizeRef.current / maxTotalSize) * 100).toFixed(1),
    }
  }, [formatSize, maxTotalSize])

  /**
   * 清空所有记录
   */
  const clear = useCallback(() => {
    documentSizesRef.current.clear()
    totalSizeRef.current = 0
  }, [])

  return {
    canSetDocument,
    updateDocumentSize,
    removeDocument,
    getMemoryStats,
    clear,
  }
}
