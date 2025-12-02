/**
 * Hooks 索引文件
 * 统一导出所有自定义 hooks
 */

export { useFileManager } from './useFileManager'
export type { FileManagerState, FileManagerActions, UseFileManagerOptions } from './useFileManager'

export { useSearch } from './useSearch'
export type { SearchState, SearchActions, SearchMatch, GlobalSearchResult } from './useSearch'

export { useSettings } from './useSettings'
export type { SettingsState, SettingsActions, AICustomTemplate } from './useSettings'

export { useSettingsManager } from './useSettingsManager'
export type { SettingsData, SettingsSetters } from './useSettingsManager'

export { useAI } from './useAI'
export type { AIState, AIActions, AIConfig } from './useAI'

export { useMermaidCache } from './useMermaidCache'
export { useMemoryLimit } from './useMemoryLimit'
export { useScrollSync } from './useScrollSync'

export { useEditorState } from './useEditorState'
export type { EditorState, EditorActions, EditorRefs } from './useEditorState'

export { useAIState } from './useAIState'
export type { AIUIState, AIUIActions, AIRefs } from './useAIState'

export { useDocumentState } from './useDocumentState'
export type { DocumentState, DocumentActions, DocumentRefs } from './useDocumentState'
