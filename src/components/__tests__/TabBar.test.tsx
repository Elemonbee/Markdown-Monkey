import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TabBar } from '../TabBar'

describe('TabBar', () => {
  const defaultProps = {
    tabs: ['/path/to/file1.md', '/path/to/file2.md'],
    currentPath: '/path/to/file1.md',
    uiLanguage: 'zh-CN',
    onTabClick: vi.fn(),
    onTabClose: vi.fn(),
    onContextMenu: vi.fn(),
    fileDisplayName: (path: string) => path.split('/').pop() || '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no tabs', () => {
    const { container } = render(<TabBar {...defaultProps} tabs={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tabs correctly', () => {
    render(<TabBar {...defaultProps} />)
    expect(screen.getByText('file1.md')).toBeInTheDocument()
    expect(screen.getByText('file2.md')).toBeInTheDocument()
  })

  it('highlights current tab', () => {
    render(<TabBar {...defaultProps} />)
    const tab1 = screen.getByText('file1.md').closest('div')
    const tab2 = screen.getByText('file2.md').closest('div')

    // Check border color specifically to avoid shorthand parsing issues
    // #6aa0ff = rgb(106, 160, 255)
    // #3a3a3a = rgb(58, 58, 58)
    expect(tab1).toHaveStyle({ borderColor: '#6aa0ff' })
    expect(tab2).toHaveStyle({ borderColor: '#3a3a3a' })
  })

  it('calls onTabClick when clicked', () => {
    render(<TabBar {...defaultProps} />)
    fireEvent.click(screen.getByText('file2.md'))
    expect(defaultProps.onTabClick).toHaveBeenCalledWith('/path/to/file2.md')
  })

  it('calls onTabClose when close button clicked', () => {
    render(<TabBar {...defaultProps} />)
    // The title comes from i18n 'close' key which is '关闭' in zh-CN
    const closeButtons = screen.getAllByTitle('关闭')
    fireEvent.click(closeButtons[0])
    expect(defaultProps.onTabClose).toHaveBeenCalledWith('/path/to/file1.md')
  })

  it('stops propagation when clicking close button', () => {
    render(<TabBar {...defaultProps} />)
    const closeButtons = screen.getAllByTitle('关闭')
    fireEvent.click(closeButtons[0])
    expect(defaultProps.onTabClick).not.toHaveBeenCalled()
  })

  it('calls onContextMenu when right clicked', () => {
    render(<TabBar {...defaultProps} />)
    fireEvent.contextMenu(screen.getByText('file1.md'))
    expect(defaultProps.onContextMenu).toHaveBeenCalled()
  })
})
