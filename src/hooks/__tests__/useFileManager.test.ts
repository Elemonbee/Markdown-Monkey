import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFileManager } from '../useFileManager'

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  ask: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { open, save } from '@tauri-apps/plugin-dialog'

describe('useFileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileManager())

    expect(result.current.currentFilePath).toBe('')
    expect(result.current.markdownText).toBe('')
    expect(result.current.saveStatus).toBe('saved')
  })

  it('should handle new file creation', () => {
    const { result } = renderHook(() => useFileManager())

    act(() => {
      result.current.createNewFile()
    })

    expect(result.current.currentFilePath).toMatch(/^untitled:/)
    expect(result.current.markdownText).toBe('')
  })

  it('should update text content', () => {
    const { result } = renderHook(() => useFileManager())

    act(() => {
      result.current.setMarkdownText('Hello World')
    })

    expect(result.current.markdownText).toBe('Hello World')
  })

  it('should open a file successfully', async () => {
    const mockPath = '/path/to/file.md'
    const mockContent = '# Hello'

    vi.mocked(open).mockResolvedValue(mockPath)
    vi.mocked(readTextFile).mockResolvedValue(mockContent)

    const { result } = renderHook(() => useFileManager())

    await act(async () => {
      await result.current.openFile()
    })

    expect(open).toHaveBeenCalled()
    expect(readTextFile).toHaveBeenCalledWith(mockPath)
    expect(result.current.currentFilePath).toBe(mockPath)
    expect(result.current.markdownText).toBe(mockContent)
  })

  it('should save a new file (save as)', async () => {
    const mockPath = '/path/to/new.md'
    const content = 'New Content'

    vi.mocked(save).mockResolvedValue(mockPath)

    const { result } = renderHook(() => useFileManager())

    act(() => {
      result.current.setMarkdownText(content)
    })

    await act(async () => {
      await result.current.saveFile()
    })

    expect(save).toHaveBeenCalled()
    expect(writeTextFile).toHaveBeenCalledWith(mockPath, content)
    expect(result.current.currentFilePath).toBe(mockPath)
    expect(result.current.saveStatus).toBe('saved')
  })
})
