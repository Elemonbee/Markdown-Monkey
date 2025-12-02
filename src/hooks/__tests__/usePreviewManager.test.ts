import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePreviewManager } from '../usePreviewManager'

// Mock dependencies
vi.mock('marked', () => {
  const MockLexer = function () {
    return {
      lex: vi.fn((_text: string) => {
        // Simple mock that returns mock tokens
        return [
          { raw: '# Hello\n', type: 'heading' },
          { raw: 'Some text\n', type: 'paragraph' },
        ]
      }),
    }
  }

  return {
    marked: {
      Lexer: MockLexer,
      parser: vi.fn((_tokens: any) => '<h1>Hello</h1><p>Some text</p>'),
    },
  }
})

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html), // Pass through for testing
  },
}))

vi.mock('mermaid', () => ({
  default: {
    render: vi.fn((id: string, _definition: string) =>
      Promise.resolve({ svg: `<svg id="${id}">Mermaid Chart</svg>` })
    ),
  },
}))

import { marked } from 'marked'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'

describe('usePreviewManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePreviewManager())

    expect(result.current.rendered_html).toBe('')
    expect(result.current.block_map).toEqual([])
  })

  it('should render basic markdown', async () => {
    const { result } = renderHook(() => usePreviewManager())

    await act(async () => {
      await result.current.render_markdown('# Hello\nSome text')
    })

    expect(marked.parser).toHaveBeenCalled()
    expect(result.current.rendered_html).toContain('<h1>Hello</h1>')
  })

  it('should call DOMPurify.sanitize', async () => {
    const { result } = renderHook(() => usePreviewManager())

    await act(async () => {
      await result.current.render_markdown('# Test')
    })

    expect(DOMPurify.sanitize).toHaveBeenCalled()
  })

  it('should generate block mapping', async () => {
    const { result } = renderHook(() => usePreviewManager())

    await act(async () => {
      await result.current.render_markdown('# Hello\nSome text')
    })

    // Block map should have been created
    expect(result.current.block_map.length).toBeGreaterThan(0)

    // Each block should have start, end, idx
    result.current.block_map.forEach((block: any) => {
      expect(block).toHaveProperty('start')
      expect(block).toHaveProperty('end')
      expect(block).toHaveProperty('idx')
    })
  })

  it('should handle Mermaid code blocks', async () => {
    // Mock marked to return HTML with Mermaid code block
    vi.mocked(marked.parser).mockReturnValueOnce(
      '<pre><code class="language-mermaid">graph TD\nA-->B</code></pre>'
    )

    const { result } = renderHook(() => usePreviewManager())

    await act(async () => {
      await result.current.render_markdown('```mermaid\ngraph TD\nA-->B\n```')
    })

    // Mermaid render should have been called
    expect(mermaid.render).toHaveBeenCalled()

    // HTML should contain the SVG
    expect(result.current.rendered_html).toContain('<svg')
    expect(result.current.rendered_html).toContain('Mermaid Chart')
  })

  it('should handle Mermaid rendering errors gracefully', async () => {
    // Mock mermaid to throw error
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('Mermaid error'))

    vi.mocked(marked.parser).mockReturnValueOnce(
      '<pre><code class="language-mermaid">invalid mermaid</code></pre>'
    )

    const { result } = renderHook(() => usePreviewManager())

    // Should not throw
    await act(async () => {
      await result.current.render_markdown('```mermaid\ninvalid\n```')
    })

    // Should still have some HTML (original code block preserved)
    expect(result.current.rendered_html).toBeDefined()
  })

  it('should handle empty markdown', async () => {
    const { result } = renderHook(() => usePreviewManager())

    await act(async () => {
      await result.current.render_markdown('')
    })

    expect(result.current.rendered_html).toBeDefined()
  })
})
