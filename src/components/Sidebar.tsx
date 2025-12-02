/**
 * Sidebar - 侧边栏组件
 * 包含大纲视图和文件树视图
 */

import { memo } from 'react'
import { t } from '../i18n'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export interface OutlineItem {
  level: number
  text: string
  line: number
}

export interface SidebarProps {
  showOutline: boolean
  focusMode: boolean
  outlineWidth: number
  sideTab: 'outline' | 'files'
  outlineItems: OutlineItem[]
  workspaceRoot: string
  fileList: string[]
  fileTreeFold: Record<string, boolean>
  uiLanguage: string
  cmViewRef: React.MutableRefObject<EditorView | null>
  onSideTabChange: (tab: 'outline' | 'files') => void
  onFileTreeFoldChange: (fold: Record<string, boolean>) => void
  onOpenFileAt: (path: string) => Promise<void>
  onNewFile: (basePath: string) => Promise<void>
  onRefreshFiles: () => Promise<void>
  onRenameFile: (path: string, newName: string) => Promise<void>
  onDeleteFile: (path: string) => Promise<void>
  onCopyPath: (path: string) => void
  fileDisplayName: (path: string) => string
}

export const Sidebar = memo(function Sidebar({
  showOutline,
  focusMode,
  outlineWidth,
  sideTab,
  outlineItems,
  workspaceRoot,
  fileList,
  fileTreeFold,
  uiLanguage,
  cmViewRef,
  onSideTabChange,
  onFileTreeFoldChange,
  onOpenFileAt,
  onNewFile,
  onRefreshFiles,
  onRenameFile,
  onDeleteFile,
  onCopyPath,
  fileDisplayName,
}: SidebarProps) {
  if (!showOutline || focusMode) return null

  // 构建文件树
  const buildFileTree = () => {
    const tree: Record<string, unknown> = {}
    const ws = (workspaceRoot || '').replace(/\\/g, '/')

    for (const p0 of fileList) {
      const pnorm = (p0 || '').replace(/\\/g, '/')
      let rel = pnorm
      if (ws && pnorm.toLowerCase().startsWith(ws.toLowerCase() + '/')) {
        rel = pnorm.slice(ws.length + 1)
      }
      const parts = rel.split('/').filter(Boolean)
      let cur = tree as Record<string, Record<string, unknown>>
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!cur[part]) cur[part] = { __dir: true, __children: {} }
        cur = (cur[part] as Record<string, unknown>).__children as Record<
          string,
          Record<string, unknown>
        >
      }
      const file = parts[parts.length - 1]
      cur[file] = { __file: true, __path: p0 }
    }
    return tree
  }

  const renderTree = (node: Record<string, unknown>, prefix: string[]): React.ReactNode[] => {
    const entries = Object.entries(node)
      .filter(([k]) => !k.startsWith('__'))
      .sort((a, b) => {
        const ad = (a[1] as Record<string, unknown>).__dir ? 0 : 1
        const bd = (b[1] as Record<string, unknown>).__dir ? 0 : 1
        if (ad !== bd) return ad - bd
        return a[0].localeCompare(b[0])
      })

    const out: React.ReactNode[] = []
    for (const [name, info] of entries) {
      const infoObj = info as Record<string, unknown>
      const full = [...prefix, name].join('/')

      if (infoObj.__dir) {
        const folded = !!fileTreeFold[full]
        out.push(
          <li key={full} className="outline_item">
            <button
              className="outline_btn"
              onClick={() => onFileTreeFoldChange({ ...fileTreeFold, [full]: !folded })}
              title={full}
            >
              {folded ? '▶' : '▼'} {name}
            </button>
          </li>
        )
        if (!folded) {
          out.push(...renderTree(infoObj.__children as Record<string, unknown>, [...prefix, name]))
        }
      } else if (infoObj.__file) {
        const safe = infoObj.__path as string
        const fname = fileDisplayName(safe)
        out.push(
          <li key={safe} className="outline_item" style={{ paddingLeft: prefix.length * 12 }}>
            <button className="outline_btn" onDoubleClick={() => onOpenFileAt(safe)} title={safe}>
              {fname}
            </button>
            <div style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
              <button
                className="settings_btn"
                title={t(uiLanguage, 'rename')}
                onClick={async () => {
                  const next = window.prompt(t(uiLanguage, 'rename') + '：', fname)
                  if (!next || next === fname) return
                  await onRenameFile(safe, next)
                }}
              >
                {t(uiLanguage, 'rename')}
              </button>
              <button
                className="settings_btn"
                title={t(uiLanguage, 'remove')}
                onClick={async () => {
                  if (!window.confirm(t(uiLanguage, 'remove') + '？\n' + safe)) return
                  await onDeleteFile(safe)
                }}
              >
                {t(uiLanguage, 'remove')}
              </button>
              <button
                className="settings_btn"
                title={t(uiLanguage, 'copy_path')}
                onClick={() => onCopyPath(safe)}
              >
                {t(uiLanguage, 'copy_path')}
              </button>
            </div>
          </li>
        )
      }
    }
    return out
  }

  const tree = buildFileTree()
  const baseName = workspaceRoot ? fileDisplayName(workspaceRoot) : ''
  const foldedRoot = !!fileTreeFold['/']

  return (
    <div className="pane pane-outline" style={{ width: outlineWidth }}>
      <div className="sidebar_tabs">
        <button
          className={`tab_button ${sideTab === 'outline' ? 'active' : ''}`}
          onClick={() => onSideTabChange('outline')}
        >
          {t(uiLanguage, 'tab_outline')}
        </button>
        <button
          className={`tab_button ${sideTab === 'files' ? 'active' : ''}`}
          onClick={() => onSideTabChange('files')}
        >
          {t(uiLanguage, 'tab_files')}
        </button>
      </div>

      {sideTab === 'outline' ? (
        <ul className="outline_list">
          {outlineItems.map((h, i) => (
            <li key={i} className="outline_item" style={{ paddingLeft: (h.level - 1) * 12 }}>
              <button
                className="outline_btn"
                onClick={() => {
                  const view = cmViewRef.current
                  if (!view) return
                  const pos = view.state.doc.line(Math.max(1, h.line + 1)).from
                  view.dispatch({ selection: EditorSelection.cursor(pos), scrollIntoView: true })
                }}
              >
                {`H${h.level}`} · {h.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ padding: '8px' }}>
          <div className="status_item" title={workspaceRoot}>
            {workspaceRoot ? fileDisplayName(workspaceRoot) : '未选择文件夹'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button className="settings_btn" onClick={() => onNewFile(workspaceRoot)}>
              {t(uiLanguage, 'new_file')}
            </button>
            <button className="settings_btn" onClick={onRefreshFiles}>
              {t(uiLanguage, 'refresh')}
            </button>
          </div>
          <ul className="outline_list">
            <li key="__root" className="outline_item">
              <button
                className="outline_btn"
                onClick={() => onFileTreeFoldChange({ ...fileTreeFold, '/': !foldedRoot })}
              >
                {foldedRoot ? '▶' : '▼'} {baseName || '文件'}
              </button>
            </li>
            {!foldedRoot && renderTree(tree, [])}
          </ul>
        </div>
      )}
    </div>
  )
})

export interface SidebarSplitterProps {
  showOutline: boolean
  onResize: (width: number) => void
  currentWidth: number
}

export const SidebarSplitter = memo(function SidebarSplitter({
  showOutline,
  onResize,
  currentWidth,
}: SidebarSplitterProps) {
  if (!showOutline) return null

  return (
    <div
      className="splitter-outline"
      onMouseDown={(e) => {
        e.preventDefault()
        const startX = e.clientX
        const startW = currentWidth

        function move(ev: MouseEvent) {
          const dx = ev.clientX - startX
          const next = Math.max(160, Math.min(480, startW + dx))
          onResize(next)
        }

        function up() {
          window.removeEventListener('mousemove', move)
          window.removeEventListener('mouseup', up)
        }

        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
      }}
    />
  )
})
