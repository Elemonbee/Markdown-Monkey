import { memo } from 'react'
import { t } from '../i18n'

export interface TabBarProps {
  tabs: string[]
  currentPath: string
  uiLanguage: string
  onTabClick: (path: string) => void
  onTabClose: (path: string) => void
  onContextMenu: (path: string, x: number, y: number) => void
  fileDisplayName: (path: string) => string
}

export const TabBar = memo(function TabBar({
  tabs,
  currentPath,
  uiLanguage,
  onTabClick,
  onTabClose,
  onContextMenu,
  fileDisplayName,
}: TabBarProps) {
  if (tabs.length === 0) return null

  return (
    <div
      className="settings_bar"
      style={{
        gridColumn: '1 / -1',
        gap: 6,
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {tabs.map((p) => {
        const safe = typeof p === 'string' ? p : ''
        if (!safe) return null

        const isActive = safe === currentPath
        const name = fileDisplayName(safe)

        return (
          <div
            key={safe}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: isActive ? '1px solid #6aa0ff' : '1px solid #2b2b2b',
              borderRadius: '6px',
              padding: '6px 8px', // 增加内边距
              background: isActive ? 'rgba(106,160,255,0.12)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              maxWidth: '250px',
              minHeight: '32px', // 增加最小高度
            }}
            onClick={() => onTabClick(safe)}
            onContextMenu={(e) => {
              e.preventDefault()
              onContextMenu(safe, e.clientX, e.clientY)
            }}
          >
            <span
              style={{
                padding: '0 4px',
                lineHeight: '1.4',
                userSelect: 'none',
                pointerEvents: 'none',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
              }}
              title={name}
            >
              {name}
            </span>
            <span
              style={{
                padding: '4px', // 增加点击区域
                lineHeight: '1',
                cursor: 'pointer',
                userSelect: 'none',
                marginLeft: '2px',
                borderRadius: '4px',
                fontSize: '16px', // 放大关闭按钮
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
              onClick={(e) => {
                e.stopPropagation()
                onTabClose(safe)
              }}
              title={t(uiLanguage, 'close') || '关闭标签'}
            >
              ×
            </span>
          </div>
        )
      })}
    </div>
  )
})
