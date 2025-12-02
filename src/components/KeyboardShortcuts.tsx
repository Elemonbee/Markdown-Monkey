import { memo } from 'react'

type ShortcutItem = {
  category: string
  shortcuts: Array<{
    key: string
    description: string
  }>
}

type KeyboardShortcutsProps = {
  onClose: () => void
  language: string
}

/**
 * KeyboardShortcuts
 * 快捷键帮助模态框
 * Keyboard shortcuts help modal
 */
function KeyboardShortcutsComponent(props: KeyboardShortcutsProps) {
  const { onClose, language } = props
  const isEnglish = language === 'en-US'

  const shortcuts: ShortcutItem[] = [
    {
      category: isEnglish ? 'File Operations' : '文件操作',
      shortcuts: [
        { key: 'Ctrl+N', description: isEnglish ? 'New file' : '新建文件' },
        { key: 'Ctrl+O', description: isEnglish ? 'Open file' : '打开文件' },
        { key: 'Ctrl+S', description: isEnglish ? 'Save file' : '保存文件' },
        { key: 'Ctrl+Shift+S', description: isEnglish ? 'Save as' : '另存为' },
      ],
    },
    {
      category: isEnglish ? 'Tab Management' : '标签管理',
      shortcuts: [
        { key: 'Ctrl+Tab', description: isEnglish ? 'Next tab (循环)' : '下一个标签（循环）' },
        { key: 'Ctrl+Shift+Tab', description: isEnglish ? 'Previous tab' : '上一个标签（反向）' },
        { key: 'Ctrl+W', description: isEnglish ? 'Close current tab' : '关闭当前标签' },
      ],
    },
    {
      category: isEnglish ? 'Search' : '搜索',
      shortcuts: [
        { key: 'Ctrl+F', description: isEnglish ? 'Find & Replace' : '文内搜索替换' },
        { key: 'Ctrl+Shift+F', description: isEnglish ? 'Global search' : '全局搜索（工作区）' },
      ],
    },
    {
      category: isEnglish ? 'Quick Actions' : '快速操作',
      shortcuts: [
        { key: 'Ctrl+Shift+P', description: isEnglish ? 'Command palette' : '命令面板' },
        { key: 'Ctrl+P', description: isEnglish ? 'Quick open file' : '快速打开文件' },
      ],
    },
    {
      category: isEnglish ? 'View' : '视图',
      shortcuts: [
        { key: 'F11', description: isEnglish ? 'Toggle focus mode' : '切换专注模式' },
        { key: 'ESC', description: isEnglish ? 'Exit focus mode' : '退出专注模式' },
      ],
    },
    {
      category: isEnglish ? 'Editor' : '编辑器',
      shortcuts: [
        { key: 'Alt+Z', description: isEnglish ? 'Toggle word wrap' : '切换自动换行' },
        { key: 'Ctrl+=', description: isEnglish ? 'Zoom in' : '字号放大' },
        { key: 'Ctrl+-', description: isEnglish ? 'Zoom out' : '字号缩小' },
        { key: 'Ctrl+0', description: isEnglish ? 'Reset zoom' : '字号重置' },
        { key: 'Ctrl+Shift+L', description: isEnglish ? 'Toggle line numbers' : '显示/隐藏行号' },
      ],
    },
    {
      category: isEnglish ? 'Formatting' : '格式化',
      shortcuts: [
        { key: 'Ctrl+B', description: isEnglish ? 'Bold' : '加粗' },
        { key: 'Ctrl+I', description: isEnglish ? 'Italic' : '斜体' },
        { key: 'Ctrl+`', description: isEnglish ? 'Inline code' : '行内代码' },
      ],
    },
  ]

  return (
    <div className="modal_overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, width: '90%' }}
      >
        <div className="modal_header">
          <div className="modal_title">⌨️ {isEnglish ? 'Keyboard Shortcuts' : '键盘快捷键'}</div>
          <button className="settings_btn" onClick={onClose}>
            {isEnglish ? 'Close' : '关闭'}
          </button>
        </div>
        <div className="modal_body" style={{ padding: 16, maxHeight: 600, overflow: 'auto' }}>
          {shortcuts.map((category, idx) => (
            <div key={idx} style={{ marginBottom: 24 }}>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6aa0ff',
                  marginBottom: 12,
                  borderBottom: '1px solid #333',
                  paddingBottom: 6,
                }}
              >
                {category.category}
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {category.shortcuts.map((shortcut, sidx) => (
                  <div
                    key={sidx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#1a1a1a',
                      borderRadius: 6,
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#222'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a1a1a'
                    }}
                  >
                    <span style={{ color: '#ccc', fontSize: 13 }}>{shortcut.description}</span>
                    <kbd
                      style={{
                        background: '#2a2a2a',
                        color: '#eee',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        border: '1px solid #444',
                        boxShadow: '0 2px 0 #111',
                      }}
                    >
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 24,
              padding: 12,
              background: 'rgba(106, 160, 255, 0.1)',
              borderRadius: 6,
              fontSize: 12,
              color: '#888',
              textAlign: 'center',
            }}
          >
            💡{' '}
            {isEnglish
              ? 'Tip: Press Ctrl+Shift+P to open the command palette for more actions'
              : '提示：按 Ctrl+Shift+P 打开命令面板查看更多操作'}
          </div>
        </div>
      </div>
    </div>
  )
}

export const KeyboardShortcuts = memo(KeyboardShortcutsComponent)
