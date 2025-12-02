/**
 * StatusBar - 状态栏组件
 * 显示文档统计、保存状态和文件路径
 */

import { memo } from 'react'
import { t } from '../i18n'

export interface StatusBarProps {
  stats: {
    chars: number
    words: number
    minutes: number
  }
  saveStatus: 'saved' | 'saving' | 'unsaved'
  lastSavedTime: Date | null
  currentFilePath: string
  uiLanguage: string
  focusMode: boolean
}

export const StatusBar = memo(function StatusBar({
  stats,
  saveStatus,
  lastSavedTime,
  currentFilePath,
  uiLanguage,
  focusMode,
}: StatusBarProps) {
  if (focusMode) return null

  return (
    <div className="status_bar" style={{ display: 'flex' }}>
      <div className="status_item">
        {t(uiLanguage, 'words')}: {stats.words}
      </div>
      <div className="status_item">
        {t(uiLanguage, 'chars')}: {stats.chars}
      </div>
      <div className="status_item">
        {t(uiLanguage, 'read_time')}: ~{stats.minutes} {uiLanguage === 'en-US' ? 'min' : '分钟'}
      </div>
      <div style={{ flex: 1 }} />
      <div className="status_item save_indicator">
        {saveStatus === 'saved' && (
          <span style={{ color: '#4caf50' }}>● {uiLanguage === 'en-US' ? 'Saved' : '已保存'}</span>
        )}
        {saveStatus === 'saving' && (
          <span style={{ color: '#ff9800' }}>
            ● {uiLanguage === 'en-US' ? 'Saving...' : '保存中...'}
          </span>
        )}
        {saveStatus === 'unsaved' && (
          <span style={{ color: '#f44336' }}>
            ● {uiLanguage === 'en-US' ? 'Unsaved' : '未保存'}
          </span>
        )}
        {lastSavedTime && saveStatus === 'saved' && (
          <span style={{ marginLeft: 8, opacity: 0.7, fontSize: '0.9em' }}>
            {lastSavedTime.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="status_item" title={currentFilePath}>
        {currentFilePath || t(uiLanguage, 'unsaved')}
      </div>
    </div>
  )
})
