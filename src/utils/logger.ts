/**
 * 统一日志工具 / Unified logging utility
 * 提供一致的日志格式和错误处理 / Provides consistent log formatting and error handling
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  /** 是否在生产环境禁用 / Whether to disable in production environment */
  disableInProduction?: boolean
  /** 日志前缀 / Log prefix */
  prefix?: string
}

const isDev = import.meta.env.DEV

/**
 * 创建带前缀的日志函数 / Create log function with prefix
 */
function createLogger(prefix: string, options: LogOptions = {}) {
  const { disableInProduction = true } = options

  const shouldLog = (level: LogLevel): boolean => {
    if (disableInProduction && !isDev && level !== 'error') {
      return false
    }
    return true
  }

  const formatMessage = (message: string): string => {
    return `[${prefix}] ${message}`
  }

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(formatMessage(message), ...args)
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog('info')) {
        console.log(formatMessage(message), ...args)
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage(message), ...args)
      }
    },
    error: (message: string, ...args: unknown[]) => {
      // 错误日志始终输出 / Error logs are always output
      console.error(formatMessage(message), ...args)
    },
  }
}

// 预定义的日志实例 / Predefined log instances
export const appLogger = createLogger('App')
export const fileLogger = createLogger('File')
export const aiLogger = createLogger('AI')
export const memoryLogger = createLogger('Memory')
export const mermaidLogger = createLogger('Mermaid')

// 导出创建函数供自定义使用 / Export creation function for custom use
export { createLogger }
export type { LogLevel, LogOptions }
