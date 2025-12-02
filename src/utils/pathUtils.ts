/**
 * 路径处理工具函数 / Path processing utility functions
 */

/**
 * 从完整路径中提取文件名 / Extract filename from full path
 */
export function getFileName(path: string): string {
  if (!path) return ''
  const segments = path.split(/[/\\]/)
  return segments[segments.length - 1] || ''
}

/**
 * 从完整路径中提取目录路径 / Extract directory path from full path
 */
export function getDirectoryPath(path: string, separator: string = '/'): string {
  if (!path) return ''
  return path.split(/[/\\]/).slice(0, -1).join(separator)
}

/**
 * 获取路径分隔符（根据路径中使用的分隔符） / Get path separator (based on the separator used in the path)
 */
export function getPathSeparator(path: string): string {
  return path.includes('\\') ? '\\' : '/'
}

/**
 * 连接路径 / Join paths
 */
export function joinPath(base: string, ...parts: string[]): string {
  const sep = getPathSeparator(base)
  const cleanBase = base.replace(/[/\\]$/, '')
  const cleanParts = parts.map((p) => p.replace(/^[/\\]|[/\\]$/g, ''))
  return [cleanBase, ...cleanParts].filter(Boolean).join(sep)
}

/**
 * 规范化路径（将反斜杠转换为正斜杠） / Normalize path (convert backslashes to forward slashes)
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

/**
 * 检查路径是否为 Markdown 文件 / Check if path is a Markdown file
 */
export function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown)$/i.test(path)
}

/**
 * 检查路径是否为未命名文档 / Check if path is an untitled document
 */
export function isUntitledDocument(path: string): boolean {
  return path.startsWith('untitled:')
}

/**
 * 从未命名文档路径中提取编号 / Extract number from untitled document path
 */
export function getUntitledNumber(path: string): string {
  if (!isUntitledDocument(path)) return ''
  return path.replace('untitled:', '')
}

/**
 * 获取文件的显示名称 / Get display name of file
 */
export function getDisplayName(path: string): string {
  if (!path) return ''
  if (isUntitledDocument(path)) {
    return `Untitled-${getUntitledNumber(path)}`
  }
  return getFileName(path) || path.replace(/^[\s\S]*[\\/]/, '')
}

/**
 * 安全地保存设置到 Store / Safely save settings to Store
 * @param store Store 实例 / Store instance
 * @param key 设置键 / Setting key
 * @param value 设置值 / Setting value
 */
export async function saveToStore<T>(
  store: { set: (key: string, value: T) => Promise<void>; save: () => Promise<void> } | null,
  key: string,
  value: T
): Promise<void> {
  if (!store) return
  try {
    await store.set(key, value)
    await store.save()
  } catch {
    // 静默处理错误
  }
}
