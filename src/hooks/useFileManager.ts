/**
 * useFileManager - 文件管理 Hook / File management Hook
 * 处理文件打开、保存、标签管理等功能 / Handles file opening, saving, tab management and other features
 */

import { useState, useCallback, useEffect } from 'react'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { open, save, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import { validateFilePath, validateFileSize } from '../utils/validation'
import { MAX_FILE_SIZE } from '../config/constants'
import { useMemoryLimit } from './useMemoryLimit'

export interface FileManagerState {
  currentFilePath: string
  markdownText: string
  openTabs: string[]
  saveStatus: 'saved' | 'saving' | 'unsaved'
  lastSavedTime: Date | null
  recentFiles: string[]
  workspaceRoot: string
  fileList: string[]
  untitledCounter: number
  untitledDocs: Record<string, string>
}

export interface FileManagerActions {
  setMarkdownText: React.Dispatch<React.SetStateAction<string>>
  setCurrentFilePath: React.Dispatch<React.SetStateAction<string>>
  setSaveStatus: React.Dispatch<React.SetStateAction<'saved' | 'saving' | 'unsaved'>>
  setLastSavedTime: React.Dispatch<React.SetStateAction<Date | null>>
  setRecentFiles: React.Dispatch<React.SetStateAction<string[]>>
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>
  setWorkspaceRoot: React.Dispatch<React.SetStateAction<string>>
  setFileList: React.Dispatch<React.SetStateAction<string[]>>
  setUntitledCounter: React.Dispatch<React.SetStateAction<number>>
  setUntitledDocs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  openFile: () => Promise<void>
  openFileAt: (path: string) => Promise<void>
  saveFile: () => Promise<void>
  saveAs: () => Promise<void>
  openFolder: () => Promise<void>
  switchToTab: (path: string) => Promise<void>
  closeTab: (path: string) => void
  createNewFile: () => void
  fileDisplayName: (path: string) => string
}

export interface UseFileManagerOptions {
  onFileOpened?: (path: string, content: string) => void
  onFileSaved?: (path: string) => void
  onError?: (error: Error) => void
}

export function useFileManager(
  options: UseFileManagerOptions = {}
): FileManagerState & FileManagerActions {
  const [currentFilePath, setCurrentFilePath] = useState('')
  const [markdownText, setMarkdownText] = useState('')
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const [workspaceRoot, setWorkspaceRoot] = useState('')
  const [fileList, setFileList] = useState<string[]>([])
  const [untitledCounter, setUntitledCounter] = useState(1)
  const [untitledDocs, setUntitledDocs] = useState<Record<string, string>>({})

  const { canSetDocument, updateDocumentSize, removeDocument } = useMemoryLimit({
    onLimitExceeded: (message) => {
      console.warn('[内存限制]', message)
      // alert(message) // 避免在 Hook 中直接 alert，最好通过 options 回调
      options.onError?.(new Error(message))
    },
  })

  /**
   * 从路径中提取文件名
   */
  const fileDisplayName = useCallback((p: string): string => {
    if (!p) return ''
    if (p.startsWith('untitled:')) {
      const num = p.replace('untitled:', '')
      return `Untitled-${num}`
    }
    const seg = p.split(/[/\\]/)
    const tail = seg[seg.length - 1]
    if (tail) return tail
    return p.replace(/^[\s\S]*[\\/]/, '')
  }, [])

  /**
   * 打开指定路径的文件
   */
  const openFileAt = useCallback(
    async (path: string) => {
      try {
        const validPath = validateFilePath(path)
        const content = await readTextFile(validPath)
        validateFileSize(content.length, MAX_FILE_SIZE)

        setMarkdownText(content)
        setCurrentFilePath(validPath)
        setOpenTabs((prev) => (prev.includes(validPath) ? prev : [...prev, validPath]))
        setSaveStatus('saved')
        setLastSavedTime(new Date())

        options.onFileOpened?.(validPath, content)
      } catch (e) {
        console.error('Failed to open file:', e)
        options.onError?.(e as Error)
      }
    },
    [options]
  )

  /**
   * 打开文件对话框
   */
  const openFile = useCallback(async () => {
    const selected = await open({
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    })
    if (typeof selected !== 'string') return
    await openFileAt(selected)

    // 更新最近文件
    setRecentFiles((prev) => {
      const next = [selected, ...prev.filter((p) => p !== selected)].slice(0, 20)
      return next
    })
  }, [openFileAt])

  /**
   * 保存当前文件
   */
  const saveFile = useCallback(async () => {
    if (!currentFilePath || currentFilePath.startsWith('untitled:')) {
      // 未命名文档，转为另存为
      const target = await save({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
        defaultPath: 'untitled.md',
      })
      if (!target) return

      await writeTextFile(target, markdownText)

      // 更新标签栏
      const oldPath = currentFilePath
      if (oldPath?.startsWith('untitled:')) {
        setOpenTabs((prev) => {
          const idx = prev.indexOf(oldPath)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = target
            return next
          }
          return [...prev, target]
        })
      }

      setCurrentFilePath(target)
      setSaveStatus('saved')
      setLastSavedTime(new Date())
      options.onFileSaved?.(target)
      return
    }

    setSaveStatus('saving')
    try {
      await writeTextFile(currentFilePath, markdownText)
      setSaveStatus('saved')
      setLastSavedTime(new Date())
      options.onFileSaved?.(currentFilePath)
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('unsaved')
      options.onError?.(error as Error)
    }
  }, [currentFilePath, markdownText, options])

  /**
   * 另存为
   */
  const saveAs = useCallback(async () => {
    const target = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath:
        currentFilePath && !currentFilePath.startsWith('untitled:')
          ? currentFilePath
          : 'untitled.md',
    })
    if (!target) return

    await writeTextFile(target, markdownText)

    const oldPath = currentFilePath
    if (oldPath?.startsWith('untitled:')) {
      setOpenTabs((prev) => {
        const idx = prev.indexOf(oldPath)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = target
          return next
        }
        return [...prev, target]
      })
    }

    setCurrentFilePath(target)
    setSaveStatus('saved')
    setLastSavedTime(new Date())
  }, [currentFilePath, markdownText])

  /**
   * 打开文件夹
   */
  /**
   * 打开文件夹
   */
  const openFolder = useCallback(async () => {
    const opts: OpenDialogOptions = {
      directory: true,
      defaultPath: workspaceRoot || undefined,
    }
    const dir = await open(opts)
    if (typeof dir !== 'string') return

    setWorkspaceRoot(dir)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const paths = await invoke<string[]>('list_md_files', { dir })
      const unique = Array.from(new Set(paths))
      setFileList(unique.sort())

      // 启动文件监听
      await invoke('watch_start', { dir })
    } catch (e) {
      console.error(e)
      setFileList([])
    }
  }, [workspaceRoot])

  // 监听文件系统变更
  useEffect(() => {
    let unlisten: (() => void) | null = null
    const setupListener = async () => {
      if (!workspaceRoot) return
      try {
        const { listen } = await import('@tauri-apps/api/event')
        unlisten = await listen('fs:changed', async () => {
          try {
            const { invoke } = await import('@tauri-apps/api/core')
            const paths = await invoke<string[]>('list_md_files', { dir: workspaceRoot })
            setFileList(Array.from(new Set(paths)).sort())
          } catch {
            /* ignore */
          }
        })
      } catch {
        /* ignore */
      }
    }
    setupListener()
    return () => {
      if (unlisten) unlisten()
    }
  }, [workspaceRoot])

  /**
   * 切换标签
   */
  const switchToTab = useCallback(
    async (path: string) => {
      if (!path || currentFilePath === path) return

      // 保存当前未命名文档
      if (currentFilePath?.startsWith('untitled:')) {
        const { allowed, reason } = canSetDocument(currentFilePath, markdownText)
        if (allowed) {
          updateDocumentSize(currentFilePath, markdownText)
          setUntitledDocs((prev) => ({
            ...prev,
            [currentFilePath]: markdownText,
          }))
        } else {
          console.warn('[内存限制] 无法保存文档:', reason)
          // 仍然保存，但会触发警告
          setUntitledDocs((prev) => ({
            ...prev,
            [currentFilePath]: markdownText,
          }))
        }
      }

      // 切换到目标文件
      if (path.startsWith('untitled:')) {
        const content = untitledDocs[path] || ''
        setMarkdownText(content)
        setCurrentFilePath(path)
        setSaveStatus('unsaved')
        setLastSavedTime(null)
      } else {
        try {
          const content = await readTextFile(path)
          setMarkdownText(content)
          setCurrentFilePath(path)
          setSaveStatus('saved')
          setLastSavedTime(new Date())
        } catch (e) {
          console.error(e)
        }
      }
    },
    [currentFilePath, markdownText, untitledDocs]
  )

  /**
   * 关闭标签
   */
  const closeTab = useCallback(
    (path: string) => {
      if (path.startsWith('untitled:')) {
        removeDocument(path)
        setUntitledDocs((prev) => {
          const next = { ...prev }
          delete next[path]
          return next
        })
      }

      setOpenTabs((prev) => {
        const idx = prev.indexOf(path)
        const nextTabs = prev.filter((p) => p !== path)

        if (currentFilePath === path) {
          const fallback =
            idx > 0 ? nextTabs[idx - 1] : nextTabs[idx] || nextTabs[nextTabs.length - 1]

          if (fallback) {
            switchToTab(fallback)
          } else {
            setCurrentFilePath('')
            setMarkdownText('')
          }
        }
        return nextTabs
      })
    },
    [currentFilePath, switchToTab]
  )

  /**
   * 创建新文件
   */
  const createNewFile = useCallback(() => {
    const untitledName = `untitled:${untitledCounter}`
    setUntitledCounter((prev) => prev + 1)
    setMarkdownText('')
    setCurrentFilePath(untitledName)
    setSaveStatus('unsaved')
    setLastSavedTime(null)
  }, [untitledCounter])

  return {
    // State
    currentFilePath,
    markdownText,
    openTabs,
    saveStatus,
    lastSavedTime,
    recentFiles,
    workspaceRoot,
    fileList,
    untitledCounter,
    untitledDocs,
    // Actions
    setMarkdownText,
    setCurrentFilePath,
    setSaveStatus,
    setLastSavedTime,
    setRecentFiles,
    setOpenTabs,
    setWorkspaceRoot,
    setFileList,
    setUntitledCounter,
    setUntitledDocs,
    openFile,
    openFileAt,
    saveFile,
    saveAs,
    openFolder,
    switchToTab,
    closeTab,
    createNewFile,
    fileDisplayName,
  }
}
