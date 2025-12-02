/**
 * SearchBar - 搜索栏组件 / Search bar component
 * 文档内搜索和全局搜索 / In-document search and global search
 */

import { memo } from 'react'
import { t } from '../i18n'

export interface SearchBarProps {
  showSearch: boolean
  searchQuery: string
  replaceQuery: string
  searchRegex: boolean
  searchCaseInsensitive: boolean
  searchIndex: number
  searchTotal: number
  uiLanguage: string
  onSearchQueryChange: (query: string) => void
  onReplaceQueryChange: (query: string) => void
  onSearchRegexChange: (regex: boolean) => void
  onSearchCaseChange: (caseI: boolean) => void
  onSearch: () => void
  onSearchPrev: () => void
  onSearchNext: () => void
  onReplaceCurrent: () => void
  onReplaceAll: () => void
}

export const SearchBar = memo(function SearchBar({
  showSearch,
  searchQuery,
  replaceQuery,
  searchRegex,
  searchCaseInsensitive,
  searchIndex,
  searchTotal,
  uiLanguage,
  onSearchQueryChange,
  onReplaceQueryChange,
  onSearchRegexChange,
  onSearchCaseChange,
  onSearch,
  onSearchPrev,
  onSearchNext,
  onReplaceCurrent,
  onReplaceAll,
}: SearchBarProps) {
  if (!showSearch) return null

  return (
    <div className="settings_bar" style={{ gridColumn: '1 / -1', gap: 8 }}>
      <input
        className="settings_input"
        placeholder={t(uiLanguage, 'search_placeholder')}
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch()
        }}
      />
      <input
        className="settings_input"
        placeholder={t(uiLanguage, 'replace_placeholder')}
        value={replaceQuery}
        onChange={(e) => onReplaceQueryChange(e.target.value)}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={searchRegex}
          onChange={(e) => onSearchRegexChange(e.target.checked)}
        />
        {t(uiLanguage, 'regex')}
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={searchCaseInsensitive}
          onChange={(e) => onSearchCaseChange(e.target.checked)}
        />
        {t(uiLanguage, 'case_insensitive')}
      </label>
      <button className="settings_btn" onClick={onSearch}>
        {t(uiLanguage, 'search_btn')}
      </button>
      <button className="settings_btn" onClick={onSearchPrev}>
        {t(uiLanguage, 'prev')}
      </button>
      <button className="settings_btn" onClick={onSearchNext}>
        {t(uiLanguage, 'next')}
      </button>
      <button className="settings_btn" onClick={onReplaceCurrent}>
        {t(uiLanguage, 'replace')}
      </button>
      <button className="settings_btn" onClick={onReplaceAll}>
        {t(uiLanguage, 'replace_all')}
      </button>
      <div className="status_item">
        {searchTotal > 0 ? `${searchIndex + 1}/${searchTotal}` : '0/0'}
      </div>
    </div>
  )
})

export interface GlobalSearchBarProps {
  showGlobalSearch: boolean
  globalQuery: string
  globalRegex: boolean
  globalCaseInsensitive: boolean
  globalSearching: boolean
  uiLanguage: string
  focusMode: boolean
  onGlobalQueryChange: (query: string) => void
  onGlobalRegexChange: (regex: boolean) => void
  onGlobalCaseChange: (caseI: boolean) => void
  onSearch: () => void
  onClose: () => void
}

export const GlobalSearchBar = memo(function GlobalSearchBar({
  showGlobalSearch,
  globalQuery,
  globalRegex,
  globalCaseInsensitive,
  globalSearching,
  uiLanguage,
  focusMode,
  onGlobalQueryChange,
  onGlobalRegexChange,
  onGlobalCaseChange,
  onSearch,
  onClose,
}: GlobalSearchBarProps) {
  if (!showGlobalSearch || focusMode) return null

  return (
    <div className="settings_bar" style={{ gridColumn: '1 / -1', gap: 8, alignItems: 'center' }}>
      <input
        className="settings_input"
        placeholder={
          uiLanguage === 'en-US'
            ? 'Global search keyword (regex supported)'
            : '全局搜索关键词（支持正则）'
        }
        value={globalQuery}
        onChange={(e) => onGlobalQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch()
        }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={globalRegex}
          onChange={(e) => onGlobalRegexChange(e.target.checked)}
        />
        {uiLanguage === 'en-US' ? 'Regex' : '正则'}
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="checkbox"
          checked={globalCaseInsensitive}
          onChange={(e) => onGlobalCaseChange(e.target.checked)}
        />
        {uiLanguage === 'en-US' ? 'Case-insensitive' : '忽略大小写'}
      </label>
      <button className="settings_btn" disabled={globalSearching} onClick={onSearch}>
        {globalSearching
          ? uiLanguage === 'en-US'
            ? 'Searching...'
            : '搜索中...'
          : uiLanguage === 'en-US'
            ? 'Search'
            : '搜索'}
      </button>
      <button className="settings_btn" onClick={onClose}>
        {uiLanguage === 'en-US' ? 'Close' : '关闭'}
      </button>
    </div>
  )
})

export interface GlobalSearchResult {
  path: string
  lineNo: number
  from: number
  to: number
  preview: string
}

export interface GlobalSearchResultsProps {
  showGlobalSearch: boolean
  results: GlobalSearchResult[]
  focusMode: boolean
  fileDisplayName: (path: string) => string
  onResultClick: (result: GlobalSearchResult) => void
}

export const GlobalSearchResults = memo(function GlobalSearchResults({
  showGlobalSearch,
  results,
  focusMode,
  fileDisplayName,
  onResultClick,
}: GlobalSearchResultsProps) {
  if (!showGlobalSearch || results.length === 0 || focusMode) return null

  return (
    <div
      className="pane"
      style={{
        gridColumn: '1 / -1',
        borderTop: '1px solid #2a2a2a',
        maxHeight: 280,
        overflowY: 'auto',
      }}
    >
      <ul className="outline_list">
        {results.map((r, idx) => (
          <li
            key={idx}
            className="outline_item"
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <button
              className="outline_btn"
              title={`${r.path}:${r.lineNo}`}
              onClick={() => onResultClick(r)}
            >
              {fileDisplayName(r.path)}:{r.lineNo}
            </button>
            <div
              style={{
                opacity: 0.8,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {r.preview}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
})
