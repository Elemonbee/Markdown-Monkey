/**
 * 剪贴板工具函数 / Clipboard utility functions
 */

/**
 * 复制文本到剪贴板 / Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 从剪贴板读取文本 / Read text from clipboard
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return null
  }
}

/**
 * 复制代码块到剪贴板（带围栏） / Copy code block to clipboard (with fence)
 */
export async function copyCodeBlock(code: string, language: string = ''): Promise<boolean> {
  const formatted = `\`\`\`${language}\n${code}\n\`\`\``
  return copyToClipboard(formatted)
}
