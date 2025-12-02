/**
 * useSearch - 搜索替换 Hook / Search and replace Hook
 * 处理文档内搜索、替换和全局搜索功能 / Handles in-document search, replace and global search functionality
 */

import { useState, useCallback } from 'react'
import { EditorView, Decoration } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import { EditorSelection, RangeSetBuilder, StateField } from '@codemirror/state'
import { readTextFile } from '@tauri-apps/plugin-fs'

export interface SearchMatch {
  from: number
  to: number
}

export interface GlobalSearchResult {
  path: string
  lineNo: number
  from: number
  to: number
  preview: string
}

export interface SearchState {
  showSearch: boolean
  searchQuery: string
  replaceQuery: string
  searchRegex: boolean
  searchCaseInsensitive: boolean
  searchIndex: number
  searchTotal: number
  // 全局搜索
  showGlobalSearch: boolean
  globalQuery: string
  globalRegex: boolean
  globalCaseInsensitive: boolean
  globalSearching: boolean
  globalResults: GlobalSearchResult[]
}

export interface SearchActions {
  setShowSearch: (show: boolean) => void
  setSearchQuery: (query: string) => void
  setReplaceQuery: (query: string) => void
  setSearchRegex: (regex: boolean) => void
  setSearchCaseInsensitive: (caseI: boolean) => void
  setShowGlobalSearch: (show: boolean) => void
  setGlobalQuery: (query: string) => void
  setGlobalRegex: (regex: boolean) => void
  setGlobalCaseInsensitive: (caseI: boolean) => void
  findAllMatches: (docText: string) => SearchMatch[]
  updateSearchState: (view: EditorView | null, selectFirst: boolean) => void
  searchNext: (view: EditorView | null) => void
  searchPrev: (view: EditorView | null) => void
  replaceCurrent: (view: EditorView | null, onTextChange: (text: string) => void) => void
  replaceAll: (view: EditorView | null, onTextChange: (text: string) => void) => void
  runGlobalSearch: (workspaceRoot: string, uiLanguage: string) => Promise<void>
  clearGlobalResults: () => void
  getSearchDecorations: (view: EditorView | null) => DecorationSet | null
  getSearchHighlightField: (decorations: DecorationSet | null) => StateField<DecorationSet> | null
}

export function useSearch(): SearchState & SearchActions {
  // 文档内搜索状态
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceQuery, setReplaceQuery] = useState('')
  const [searchRegex, setSearchRegex] = useState(false)
  const [searchCaseInsensitive, setSearchCaseInsensitive] = useState(true)
  const [searchIndex, setSearchIndex] = useState(-1)
  const [searchTotal, setSearchTotal] = useState(0)

  // 全局搜索状态
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [globalQuery, setGlobalQuery] = useState('')
  const [globalRegex, setGlobalRegex] = useState(false)
  const [globalCaseInsensitive, setGlobalCaseInsensitive] = useState(true)
  const [globalSearching, setGlobalSearching] = useState(false)
  const [globalResults, setGlobalResults] = useState<GlobalSearchResult[]>([])

  /**
   * 查找所有匹配项
   */
  const findAllMatches = useCallback(
    (docText: string): SearchMatch[] => {
      if (!searchQuery) return []
      try {
        if (searchRegex) {
          const flags = searchCaseInsensitive ? 'gi' : 'g'
          const re = new RegExp(searchQuery, flags)
          const out: SearchMatch[] = []
          let m: RegExpExecArray | null
          while ((m = re.exec(docText))) {
            out.push({ from: m.index, to: m.index + m[0].length })
            if (m[0].length === 0) re.lastIndex++
          }
          return out
        } else {
          const q = searchCaseInsensitive ? searchQuery.toLowerCase() : searchQuery
          const src = searchCaseInsensitive ? docText.toLowerCase() : docText
          const out: SearchMatch[] = []
          let idx = 0
          while (true) {
            const i = src.indexOf(q, idx)
            if (i === -1) break
            out.push({ from: i, to: i + q.length })
            idx = i + Math.max(1, q.length)
          }
          return out
        }
      } catch {
        return []
      }
    },
    [searchQuery, searchRegex, searchCaseInsensitive]
  )

  /**
   * 更新搜索状态
   */
  const updateSearchState = useCallback(
    (view: EditorView | null, selectFirst: boolean) => {
      if (!view) return
      const docText = view.state.doc.toString()
      const matches = findAllMatches(docText)
      setSearchTotal(matches.length)
      if (matches.length === 0) {
        setSearchIndex(-1)
        return
      }
      let idx = searchIndex
      if (selectFirst || idx < 0 || idx >= matches.length) idx = 0
      const r = matches[idx]
      view.dispatch({
        selection: EditorSelection.range(r.from, r.to),
        scrollIntoView: true,
      })
      setSearchIndex(idx)
    },
    [findAllMatches, searchIndex]
  )

  /**
   * 搜索下一个
   */
  const searchNext = useCallback(
    (view: EditorView | null) => {
      if (!view) return
      const docText = view.state.doc.toString()
      const matches = findAllMatches(docText)
      if (matches.length === 0) {
        setSearchIndex(-1)
        setSearchTotal(0)
        return
      }
      const next = (searchIndex + 1 + matches.length) % matches.length
      const r = matches[next]
      view.dispatch({
        selection: EditorSelection.range(r.from, r.to),
        scrollIntoView: true,
      })
      setSearchIndex(next)
      setSearchTotal(matches.length)
    },
    [findAllMatches, searchIndex]
  )

  /**
   * 搜索上一个
   */
  const searchPrev = useCallback(
    (view: EditorView | null) => {
      if (!view) return
      const docText = view.state.doc.toString()
      const matches = findAllMatches(docText)
      if (matches.length === 0) {
        setSearchIndex(-1)
        setSearchTotal(0)
        return
      }
      const prev = (searchIndex - 1 + matches.length) % matches.length
      const r = matches[prev]
      view.dispatch({
        selection: EditorSelection.range(r.from, r.to),
        scrollIntoView: true,
      })
      setSearchIndex(prev)
      setSearchTotal(matches.length)
    },
    [findAllMatches, searchIndex]
  )

  /**
   * 替换当前
   */
  const replaceCurrent = useCallback(
    (view: EditorView | null, onTextChange: (text: string) => void) => {
      if (!view) return
      const sel = view.state.selection.main
      const tr = view.state.update({
        changes: { from: sel.from, to: sel.to, insert: replaceQuery },
      })
      view.dispatch(tr)
      onTextChange(view.state.doc.toString())
      updateSearchState(view, false)
    },
    [replaceQuery, updateSearchState]
  )

  /**
   * 替换全部
   */
  const replaceAll = useCallback(
    (view: EditorView | null, onTextChange: (text: string) => void) => {
      if (!view || !searchQuery) return
      const docText = view.state.doc.toString()
      const matches = findAllMatches(docText)
      if (matches.length === 0) return
      const changes = matches.map((r) => ({
        from: r.from,
        to: r.to,
        insert: replaceQuery,
      }))
      const tr = view.state.update({ changes })
      view.dispatch(tr)
      onTextChange(view.state.doc.toString())
      setSearchIndex(-1)
      setSearchTotal(0)
    },
    [searchQuery, replaceQuery, findAllMatches]
  )

  /**
   * 全局搜索
   */
  const runGlobalSearch = useCallback(
    async (workspaceRoot: string, uiLanguage: string) => {
      if (!workspaceRoot) {
        window.alert(
          uiLanguage === 'en-US'
            ? 'Please open a workspace folder first.'
            : '请先打开工作区文件夹。'
        )
        return
      }
      const q = (globalQuery || '').trim()
      if (!q) {
        setGlobalResults([])
        return
      }

      setGlobalSearching(true)
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const paths = await invoke<string[]>('list_md_files', { dir: workspaceRoot })
        const results: GlobalSearchResult[] = []

        const re = (() => {
          if (!globalRegex) return null
          try {
            return new RegExp(q, globalCaseInsensitive ? 'gi' : 'g')
          } catch {
            return null
          }
        })()

        for (const p of paths) {
          try {
            const text = await readTextFile(p)
            const lines = text.split('\n')
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i]
              if (re) {
                re.lastIndex = 0
                let m: RegExpExecArray | null
                while ((m = re.exec(line))) {
                  const from = m.index
                  const to = m.index + m[0].length
                  const preview = line.slice(Math.max(0, from - 40), Math.min(line.length, to + 40))
                  results.push({ path: p, lineNo: i + 1, from, to, preview })
                  if (m[0].length === 0) re.lastIndex++
                }
              } else {
                const hay = globalCaseInsensitive ? line.toLowerCase() : line
                const needle = globalCaseInsensitive ? q.toLowerCase() : q
                let idx = 0
                while (true) {
                  const pos = hay.indexOf(needle, idx)
                  if (pos === -1) break
                  const from = pos
                  const to = pos + needle.length
                  const preview = line.slice(Math.max(0, from - 40), Math.min(line.length, to + 40))
                  results.push({ path: p, lineNo: i + 1, from, to, preview })
                  idx = pos + Math.max(1, needle.length)
                }
              }
            }
          } catch {
            // ignore single file errors
          }
        }
        setGlobalResults(results.slice(0, 500))
      } finally {
        setGlobalSearching(false)
      }
    },
    [globalQuery, globalRegex, globalCaseInsensitive]
  )

  /**
   * 清除全局搜索结果
   */
  const clearGlobalResults = useCallback(() => {
    setGlobalResults([])
  }, [])

  /**
   * 获取搜索装饰
   */
  const getSearchDecorations = useCallback(
    (view: EditorView | null): DecorationSet | null => {
      if (!view || !searchQuery) return null
      const matches = findAllMatches(view.state.doc.toString())
      const builder = new RangeSetBuilder<Decoration>()
      const deco = Decoration.mark({ class: 'mmk-search-hit' })
      matches.forEach((r) => builder.add(r.from, r.to, deco))
      return builder.finish()
    },
    [searchQuery, findAllMatches]
  )

  /**
   * 获取搜索高亮字段
   */
  const getSearchHighlightField = useCallback(
    (decorations: DecorationSet | null): StateField<DecorationSet> | null => {
      if (!decorations) return null
      return StateField.define<DecorationSet>({
        create() {
          return decorations
        },
        update() {
          return decorations
        },
        provide: (f) => EditorView.decorations.from(f),
      })
    },
    []
  )

  return {
    // State
    showSearch,
    searchQuery,
    replaceQuery,
    searchRegex,
    searchCaseInsensitive,
    searchIndex,
    searchTotal,
    showGlobalSearch,
    globalQuery,
    globalRegex,
    globalCaseInsensitive,
    globalSearching,
    globalResults,
    // Actions
    setShowSearch,
    setSearchQuery,
    setReplaceQuery,
    setSearchRegex,
    setSearchCaseInsensitive,
    setShowGlobalSearch,
    setGlobalQuery,
    setGlobalRegex,
    setGlobalCaseInsensitive,
    findAllMatches,
    updateSearchState,
    searchNext,
    searchPrev,
    replaceCurrent,
    replaceAll,
    runGlobalSearch,
    clearGlobalResults,
    getSearchDecorations,
    getSearchHighlightField,
  }
}
