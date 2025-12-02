/**
 * usePreviewManager - 预览管理 Hook / Preview management Hook
 * 处理 Markdown 渲染、Mermaid 图表和块级映射 / Handles Markdown rendering, Mermaid diagrams, and block-level mapping
 */

import { useState, useCallback, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'

export interface BlockMapping {
  start: number
  end: number
  idx: number
}

export interface PreviewManagerState {
  rendered_html: string
  block_map: BlockMapping[]
}

export interface PreviewManagerActions {
  set_rendered_html: React.Dispatch<React.SetStateAction<string>>
  render_markdown: (md_text: string) => Promise<void>
  get_block_map: () => BlockMapping[]
}

export function usePreviewManager(): PreviewManagerState & PreviewManagerActions {
  const [rendered_html, set_rendered_html] = useState<string>('')
  const block_map_ref = useRef<BlockMapping[]>([])

  /**
   * 渲染 Markdown 为 HTML，支持 Mermaid 图表 / Renders Markdown to HTML with support for Mermaid diagrams
   */
  const render_markdown = useCallback(async (md_text: string) => {
    // 解析为 token，以便建立块级映射，减轻代码块/图片造成的高度不一致 / Parse into tokens to establish block-level mapping, reducing height inconsistency caused by code blocks/images
    const lexer = new marked.Lexer()
    const tokens = lexer.lex(md_text)

    // 用于滚动同步的块范围（editor 文本 offset） / Block range for scroll synchronization (editor text offset)
    const blocks: BlockMapping[] = []
    let offset = 0
    tokens.forEach((t, idx) => {
      const raw = (t as any).raw as string | undefined
      if (typeof raw === 'string' && raw.length > 0) {
        const start = md_text.indexOf(raw, offset)
        const end = start >= 0 ? start + raw.length : offset
        if (start >= 0) {
          blocks.push({ start, end, idx })
          offset = end
        }
      }
    })
    block_map_ref.current = blocks

    const parsed = marked.parser(tokens)
    let html = typeof parsed === 'string' ? parsed : await parsed

    // 处理 Mermaid 代码块
    const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g
    const mermaidBlocks: string[] = []
    let match

    while ((match = mermaidRegex.exec(html)) !== null) {
      mermaidBlocks.push(match[1])
    }

    // 渲染 Mermaid 图表
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const graphDefinition = mermaidBlocks[i]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")

      try {
        const id = `mermaid-${Date.now()}-${i}`
        const { svg } = await mermaid.render(id, graphDefinition)
        html = html.replace(
          `<pre><code class="language-mermaid">${mermaidBlocks[i]}</code></pre>`,
          `<div class="mermaid-container">${svg}</div>`
        )
      } catch (error) {
        console.error('Mermaid rendering error:', error)
        // 如果渲染失败，保留原始代码块
      }
    }

    const sanitized_html = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true, svg: true, svgFilters: true },
      ADD_TAGS: [
        'svg',
        'g',
        'path',
        'rect',
        'circle',
        'text',
        'line',
        'polyline',
        'polygon',
        'ellipse',
        'defs',
        'marker',
        'style',
      ],
      ADD_ATTR: [
        'viewBox',
        'preserveAspectRatio',
        'xmlns',
        'width',
        'height',
        'd',
        'fill',
        'stroke',
        'stroke-width',
        'transform',
        'cx',
        'cy',
        'r',
        'x',
        'y',
        'points',
        'marker-end',
        'marker-start',
        'id',
        'class',
        'style',
      ],
    })
    set_rendered_html(sanitized_html)
  }, [])

  /**
   * 获取块级映射（用于滚动同步）
   */
  const get_block_map = useCallback(() => {
    return block_map_ref.current
  }, [])

  return {
    rendered_html,
    block_map: block_map_ref.current,
    set_rendered_html,
    render_markdown,
    get_block_map,
  }
}
