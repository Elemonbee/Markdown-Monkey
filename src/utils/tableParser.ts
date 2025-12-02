/**
 * parseMarkdownTable
 * 解析 Markdown 表格为二维数组
 * Parse Markdown table into 2D array
 */
export function parseMarkdownTable(tableText: string): {
  headers: string[]
  rows: string[][]
  alignments: ('left' | 'center' | 'right')[]
} {
  const lines = tableText.trim().split('\n')
  if (lines.length < 2) {
    return { headers: [], rows: [], alignments: [] }
  }

  // 解析表头
  const headerLine = lines[0]
  const headers = headerLine
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h.length > 0)

  // 解析对齐行
  const alignmentLine = lines[1]
  const alignments = alignmentLine
    .split('|')
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
    .map((a) => {
      if (a.startsWith(':') && a.endsWith(':')) return 'center'
      if (a.endsWith(':')) return 'right'
      return 'left'
    })

  // 解析数据行
  const rows: string[][] = []
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .map((c) => c.trim())
      .filter((c, index, arr) => {
        // 过滤掉首尾的空字符串（由 | 开头/结尾导致）
        return !(index === 0 && c === '') && !(index === arr.length - 1 && c === '')
      })
    if (cells.length > 0) {
      rows.push(cells)
    }
  }

  return { headers, rows, alignments }
}

/**
 * tableToMarkdown
 * 将二维数组转换回 Markdown 表格
 * Convert 2D array back to Markdown table
 */
export function tableToMarkdown(
  headers: string[],
  rows: string[][],
  alignments: ('left' | 'center' | 'right')[]
): string {
  const alignmentRow = alignments.map((align) => {
    if (align === 'center') return ':---:'
    if (align === 'right') return '---:'
    return '---'
  })

  const headerLine = '| ' + headers.join(' | ') + ' |'
  const separatorLine = '| ' + alignmentRow.join(' | ') + ' |'
  const dataLines = rows.map((row) => '| ' + row.join(' | ') + ' |')

  return [headerLine, separatorLine, ...dataLines].join('\n')
}

/**
 * detectTableAtCursor
 * 检测光标位置是否在表格内
 * Detect if cursor is within a table
 */
export function detectTableAtCursor(
  text: string,
  cursorPosition: number
): {
  found: boolean
  startLine: number
  endLine: number
  tableText: string
} | null {
  const lines = text.split('\n')
  let currentPos = 0
  let cursorLine = 0

  // 找到光标所在行
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1 // +1 for newline
    if (currentPos + lineLength > cursorPosition) {
      cursorLine = i
      break
    }
    currentPos += lineLength
  }

  // 检查当前行及前后是否有表格
  const isTableLine = (line: string) => line.trim().includes('|')

  if (!isTableLine(lines[cursorLine])) {
    return null
  }

  // 向上找表格开始
  let startLine = cursorLine
  while (startLine > 0 && isTableLine(lines[startLine - 1])) {
    startLine--
  }

  // 向下找表格结束
  let endLine = cursorLine
  while (endLine < lines.length - 1 && isTableLine(lines[endLine + 1])) {
    endLine++
  }

  const tableLines = lines.slice(startLine, endLine + 1)
  const tableText = tableLines.join('\n')

  return {
    found: true,
    startLine,
    endLine,
    tableText,
  }
}
