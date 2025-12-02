/**
 * 运行时类型验证工具
 * 用于验证 API 响应和外部数据
 */

export interface AIResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
    delta?: {
      content?: string
    }
  }>
  message?: {
    content?: string
  }
  content?: Array<{
    text?: string
  }>
  delta?: {
    text?: string
  }
  error?: {
    message?: string
    type?: string
  }
}

export interface ModelListResponse {
  data?: Array<{
    id?: string
    name?: string
  }>
  models?: Array<{
    model?: string
    name?: string
    id?: string
  }>
}

/**
 * 验证 AI 响应格式
 */
export function validateAIResponse(data: unknown): AIResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid AI response: not an object')
  }
  return data as AIResponse
}

/**
 * 从 AI 响应中安全提取内容
 */
export function extractAIContent(response: AIResponse): string {
  // OpenAI 格式
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content
  }

  // Ollama 格式
  if (response.message?.content) {
    return response.message.content
  }

  // Claude 格式
  if (response.content?.[0]?.text) {
    return response.content[0].text
  }

  // 流式响应格式
  if (response.choices?.[0]?.delta?.content) {
    return response.choices[0].delta.content
  }

  if (response.delta?.text) {
    return response.delta.text
  }

  // 错误处理
  if (response.error?.message) {
    throw new Error(`AI API Error: ${response.error.message}`)
  }

  return ''
}

/**
 * 验证模型列表响应
 */
export function validateModelListResponse(data: unknown): ModelListResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid model list response: not an object')
  }
  return data as ModelListResponse
}

/**
 * 从模型列表响应中提取模型 ID
 */
export function extractModelIds(response: ModelListResponse): string[] {
  const ids: string[] = []

  // OpenAI 格式
  if (Array.isArray(response.data)) {
    ids.push(...response.data.map((m) => m.id || m.name || '').filter(Boolean))
  }

  // Ollama 格式
  if (Array.isArray(response.models)) {
    ids.push(...response.models.map((m) => m.model || m.name || m.id || '').filter(Boolean))
  }

  return ids
}

/**
 * 清理和验证文件路径
 */
export function validateFilePath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid file path')
  }

  // 移除多余的空白字符
  const cleaned = path.trim()

  // 检查路径长度
  if (cleaned.length === 0) {
    throw new Error('File path is empty')
  }

  if (cleaned.length > 4096) {
    throw new Error('File path is too long')
  }

  // 检查非法字符（Windows 路径允许冒号用于盘符，如 C:\）
  // 只检查真正非法的字符：< > " | ? * 和控制字符
  // eslint-disable-next-line no-control-regex
  const illegalChars = /[<>"|?*\x00-\x1f]/
  if (illegalChars.test(cleaned)) {
    throw new Error('File path contains illegal characters')
  }

  // 检查路径遍历攻击（但允许正常的相对路径）
  // 只阻止明显的攻击模式
  if (cleaned.includes('\0') || cleaned.includes('..\\..\\..\\')) {
    throw new Error('Invalid file path pattern')
  }

  return cleaned
}

/**
 * 验证文件大小（字节）
 */
export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): void {
  if (typeof size !== 'number' || size < 0) {
    throw new Error('Invalid file size')
  }

  if (size > maxSize) {
    const sizeMB = (size / 1024 / 1024).toFixed(2)
    const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2)
    throw new Error(`File too large (${sizeMB} MB). Maximum size is ${maxSizeMB} MB`)
  }
}

/**
 * 清理 HTML 内容（额外的安全层）
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // 移除潜在的脚本标签
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // 移除事件处理器属性
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  return cleaned
}

/**
 * 验证 API Key 格式
 */
export function validateAPIKey(key: string, provider: string): boolean {
  if (!key || typeof key !== 'string') {
    return false
  }

  const trimmed = key.trim()

  // 基本长度检查
  if (trimmed.length < 10) {
    return false
  }

  // 特定提供商的格式检查
  switch (provider) {
    case 'openai':
      return /^sk-[a-zA-Z0-9]{32,}$/.test(trimmed)
    case 'claude':
      return /^sk-ant-[a-zA-Z0-9-_]{32,}$/.test(trimmed)
    case 'ollama':
      return true // Ollama 不需要 API Key
    default:
      return trimmed.length >= 10
  }
}
