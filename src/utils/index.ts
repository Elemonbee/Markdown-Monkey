/**
 * 工具函数索引文件
 * 统一导出所有工具函数
 */

export { copyToClipboard, readFromClipboard } from './clipboard'

export {
  padZero,
  getISODate,
  getISODateTime,
  getLocalDateTime,
  getRelativeTime,
} from './dateFormat'

export {
  createLogger,
  appLogger,
  fileLogger,
  aiLogger,
  memoryLogger,
  mermaidLogger,
} from './logger'
export type { LogLevel, LogOptions } from './logger'

export {
  getFileName,
  getDirectoryPath,
  getPathSeparator,
  joinPath,
  normalizePath,
  isMarkdownFile,
  isUntitledDocument,
  getUntitledNumber,
  getDisplayName,
  saveToStore,
} from './pathUtils'

export {
  validateAIResponse,
  extractAIContent,
  validateModelListResponse,
  extractModelIds,
  validateFilePath,
  validateFileSize,
  sanitizeHTML,
  validateAPIKey,
} from './validation'
export type { AIResponse, ModelListResponse } from './validation'
