/**
 * Toolbar - 工具栏组件
 * 顶部操作按钮栏
 */

import { memo } from 'react'
import { t } from '../i18n'

export interface ToolbarProps {
  uiLanguage: string
  appVersion: string
  aiEnabled: boolean
  syncScroll: boolean
  showOutline: boolean
  showSearch: boolean
  showAiChat: boolean
  focusMode: boolean
  monkeyIcon: string
  onOpenFile: () => void
  onNewFile: () => void
  onOpenFolder: () => void
  onSaveFile: () => void
  onShowSettings: () => void
  onToggleSearch: () => void
  onExportHtml: () => void
  onExportPdf: () => void
  onToggleAi: () => void
  onShowAiChat: () => void
  onResetChatPosition: () => void
  onToggleOutline: () => void
  onToggleSyncScroll: (enabled: boolean) => void
  currentFilePath: string
}

export const Toolbar = memo(function Toolbar({
  uiLanguage,
  appVersion,
  aiEnabled,
  syncScroll,
  showOutline,
  showSearch,
  showAiChat,
  focusMode,
  monkeyIcon,
  onOpenFile,
  onNewFile,
  onOpenFolder,
  onSaveFile,
  onShowSettings,
  onToggleSearch,
  onExportHtml,
  onExportPdf,
  onToggleAi,
  onShowAiChat,
  onResetChatPosition,
  onToggleOutline,
  onToggleSyncScroll,
  currentFilePath,
}: ToolbarProps) {
  if (focusMode) return null

  return (
    <div className="settings_bar" style={{ gridColumn: '1 / -1', display: 'flex' }}>
      <img
        src={monkeyIcon}
        alt="MarkdownMonkey"
        style={{ width: 22, height: 22, alignSelf: 'center' }}
      />
      <button className="settings_btn" onClick={onOpenFile}>
        {t(uiLanguage, 'open')}
      </button>
      <button className="settings_btn" onClick={onNewFile}>
        {t(uiLanguage, 'new_file')}
      </button>
      <button className="settings_btn" onClick={onOpenFolder}>
        {t(uiLanguage, 'open_folder')}
      </button>
      <button className="settings_btn" onClick={onSaveFile}>
        {currentFilePath ? t(uiLanguage, 'save') : t(uiLanguage, 'save_as')}
      </button>
      <button className="settings_btn" onClick={onShowSettings}>
        {t(uiLanguage, 'settings')}
      </button>
      <button className="settings_btn" onClick={onToggleSearch}>
        {showSearch ? t(uiLanguage, 'close_search') : t(uiLanguage, 'search_replace')}
      </button>
      <button className="settings_btn" onClick={onExportHtml}>
        {t(uiLanguage, 'export_html')}
      </button>
      <button className="settings_btn" onClick={onExportPdf}>
        {t(uiLanguage, 'export_pdf')}
      </button>
      <button className="settings_btn" onClick={onToggleAi}>
        {aiEnabled ? t(uiLanguage, 'ai_enabled') : t(uiLanguage, 'enable_ai')}
      </button>
      {aiEnabled && (
        <>
          <button className="settings_btn" onClick={onShowAiChat}>
            {t(uiLanguage, 'ai_chat')}
          </button>
          {showAiChat && (
            <button
              className="settings_btn"
              style={{
                padding: '4px 6px',
                fontSize: 10,
                lineHeight: '1.1',
                height: 24,
                alignSelf: 'flex-end',
              }}
              onClick={onResetChatPosition}
              title="重置 AI 对话位置"
            >
              {t(uiLanguage, 'reset_position')}
            </button>
          )}
        </>
      )}
      <button className="settings_btn" onClick={onToggleOutline}>
        {showOutline ? t(uiLanguage, 'hide_outline') : t(uiLanguage, 'show_outline')}
      </button>
      <label
        className="settings_btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
        }}
        title={uiLanguage === 'en-US' ? 'Sync editor/preview scroll' : '同步编辑与预览滚动'}
      >
        <input
          type="checkbox"
          checked={syncScroll}
          onChange={(e) => onToggleSyncScroll(e.target.checked)}
        />
        {uiLanguage === 'en-US' ? 'Sync Scroll' : '同步滚动'}
      </label>
      <div style={{ flex: 1 }} />
      <div
        className="status_item"
        title={uiLanguage === 'en-US' ? 'Application Version' : '程序版本'}
        style={{ opacity: 0.8 }}
      >
        v{appVersion || 'dev'}
      </div>
    </div>
  )
})
