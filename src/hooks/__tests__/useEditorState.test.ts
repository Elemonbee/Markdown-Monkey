import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorState } from '../useEditorState'

describe('useEditorState', () => {
  beforeEach(() => {
    // Reset any shared state if needed
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useEditorState())

    // Editor configuration defaults
    expect(result.current.editor_font_size).toBe(16)
    expect(result.current.preview_font_size).toBe(16)
    expect(result.current.wrap_enabled).toBe(false)
    expect(result.current.line_numbers_enabled).toBe(true)

    // UI state defaults
    expect(result.current.show_search).toBe(false)
    expect(result.current.show_outline).toBe(false)
    expect(result.current.sync_scroll).toBe(true)
    expect(result.current.focus_mode).toBe(false)

    // Search state
    expect(result.current.search_query).toBe('')
    expect(result.current.search_regex).toBe(false)
    expect(result.current.search_case_i).toBe(true)
    expect(result.current.search_idx).toBe(-1)
    expect(result.current.search_total).toBe(0)

    // Outline state
    expect(result.current.outline_width).toBe(280)
    // Note: outline_items is not part of useEditorState, removed from test

    // Side tab
    expect(result.current.side_tab).toBe('outline')
  })

  it('should update editor font size', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_editor_font_size(20)
    })

    expect(result.current.editor_font_size).toBe(20)
  })

  it('should update preview font size', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_preview_font_size(18)
    })

    expect(result.current.preview_font_size).toBe(18)
  })

  it('should toggle wrap enabled', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.wrap_enabled).toBe(false)

    act(() => {
      result.current.set_wrap_enabled(true)
    })

    expect(result.current.wrap_enabled).toBe(true)
  })

  it('should toggle line numbers', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.line_numbers_enabled).toBe(true)

    act(() => {
      result.current.set_line_numbers_enabled(false)
    })

    expect(result.current.line_numbers_enabled).toBe(false)
  })

  it('should toggle search visibility', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.show_search).toBe(false)

    act(() => {
      result.current.set_show_search(true)
    })

    expect(result.current.show_search).toBe(true)
  })

  it('should update search query', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_search_query('test')
    })

    expect(result.current.search_query).toBe('test')
  })

  it('should toggle search regex mode', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.search_regex).toBe(false)

    act(() => {
      result.current.set_search_regex(true)
    })

    expect(result.current.search_regex).toBe(true)
  })

  it('should update search index and total', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_search_idx(2)
      result.current.set_search_total(10)
    })

    expect(result.current.search_idx).toBe(2)
    expect(result.current.search_total).toBe(10)
  })

  it('should toggle outline visibility', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.show_outline).toBe(false)

    act(() => {
      result.current.set_show_outline(true)
    })

    expect(result.current.show_outline).toBe(true)
  })

  it('should update outline width', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_outline_width(320)
    })

    expect(result.current.outline_width).toBe(320)
  })

  it('should toggle focus mode', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.focus_mode).toBe(false)

    act(() => {
      result.current.set_focus_mode(true)
    })

    expect(result.current.focus_mode).toBe(true)
  })

  it('should toggle sync scroll', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.sync_scroll).toBe(true)

    act(() => {
      result.current.set_sync_scroll(false)
    })

    expect(result.current.sync_scroll).toBe(false)
  })

  it('should switch side tab', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.side_tab).toBe('outline')

    act(() => {
      result.current.set_side_tab('files')
    })

    expect(result.current.side_tab).toBe('files')
  })

  it('should provide cm_view_ref as a ref object', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.refs.cm_view_ref).toBeDefined()
    expect(result.current.refs.cm_view_ref.current).toBeNull()
  })

  it('should provide preview_ref as a ref object', () => {
    const { result } = renderHook(() => useEditorState())

    expect(result.current.refs.preview_ref).toBeDefined()
    expect(result.current.refs.preview_ref.current).toBeNull()
  })

  it('should support function updater for editor font size', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_editor_font_size(20)
    })

    act(() => {
      result.current.set_editor_font_size((prev) => prev + 2)
    })

    expect(result.current.editor_font_size).toBe(22)
  })

  it('should support function updater for search query', () => {
    const { result } = renderHook(() => useEditorState())

    act(() => {
      result.current.set_search_query('test')
    })

    act(() => {
      result.current.set_search_query((prev) => prev + ' query')
    })

    expect(result.current.search_query).toBe('test query')
  })
})
