import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettingsManager } from '../useSettingsManager'

// Mock Tauri Store
const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
}

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: {
    load: vi.fn(() => Promise.resolve(mockStore)),
  },
}))

describe('useSettingsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => useSettingsManager())
    // Just checking if it renders without error
    expect(result.current).toBeDefined()
  })

  it('should load settings from store', async () => {
    mockStore.get.mockImplementation((key) => {
      if (key === 'ui_theme') return Promise.resolve('light')
      return Promise.resolve(undefined)
    })

    const setters = {
      set_api_base_url: vi.fn(),
      set_api_key: vi.fn(),
      set_provider: vi.fn(),
      set_model: vi.fn(),
      set_system_prompt: vi.fn(),
      set_temperature: vi.fn(),
      set_editor_font_size: vi.fn(),
      set_preview_font_size: vi.fn(),
      set_ui_theme: vi.fn(),
      set_ui_language: vi.fn(),
      set_ai_enabled: vi.fn(),
      set_ai_actions_enabled: vi.fn(),
      set_ai_custom_templates: vi.fn(),
      set_recent_files: vi.fn(),
      set_recent_ai_actions: vi.fn(),
      set_show_outline: vi.fn(),
      set_outline_width: vi.fn(),
      set_wrap_enabled: vi.fn(),
      set_line_numbers_enabled: vi.fn(),
      set_split_ratio: vi.fn(),
    }

    const { result } = renderHook(() => useSettingsManager())

    await act(async () => {
      await result.current.load_settings(setters)
    })

    expect(mockStore.get).toHaveBeenCalledWith('ui_theme')
    expect(setters.set_ui_theme).toHaveBeenCalledWith('light')
  })

  it('should save a setting', async () => {
    const { result } = renderHook(() => useSettingsManager())

    const setters = {
      set_api_base_url: vi.fn(),
      set_api_key: vi.fn(),
      set_provider: vi.fn(),
      set_model: vi.fn(),
      set_system_prompt: vi.fn(),
      set_temperature: vi.fn(),
      set_editor_font_size: vi.fn(),
      set_preview_font_size: vi.fn(),
      set_ui_theme: vi.fn(),
      set_ui_language: vi.fn(),
      set_ai_enabled: vi.fn(),
      set_ai_actions_enabled: vi.fn(),
      set_ai_custom_templates: vi.fn(),
      set_recent_files: vi.fn(),
      set_recent_ai_actions: vi.fn(),
      set_show_outline: vi.fn(),
      set_outline_width: vi.fn(),
      set_wrap_enabled: vi.fn(),
      set_line_numbers_enabled: vi.fn(),
      set_split_ratio: vi.fn(),
    }

    await act(async () => {
      await result.current.load_settings(setters)
    })

    await act(async () => {
      await result.current.save_setting('ui_theme', 'dark')
    })

    expect(mockStore.set).toHaveBeenCalledWith('ui_theme', 'dark')
    expect(mockStore.save).toHaveBeenCalled()
  })
})
