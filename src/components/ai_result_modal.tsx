import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
// t 未使用，移除导入以修复打包

type Ai_result_modal_props = {
  is_open: boolean
  loading: boolean
  title: string
  result_text: string
  model_name?: string
  elapsed_ms?: number
  on_copy: () => void
  on_replace: () => void
  on_cancel: () => void
  on_close: () => void
  on_regen?: () => void
  on_copy_md?: () => void
  on_copy_code?: () => void
}

/**
 * Ai_result_modal
 * 展示 AI 结果并提供 复制 / 替换 / 退出；处理中可取消
 */
/**
 * Ai_result_modal
 * 展示 AI 结果并提供 复制 / 替换 / 退出；处理中可取消
 * 支持：全屏切换、自动滚动、文本区域双向缩放、多复制模式、模型与耗时信息
 */
export default function Ai_result_modal(props: Ai_result_modal_props) {
  const { is_open, loading, title, result_text, model_name, elapsed_ms, on_copy, on_replace, on_cancel, on_close, on_regen, on_copy_md, on_copy_code } = props
  const [isFull, set_isFull] = useState<boolean>(false)
  const [autoScroll, set_autoScroll] = useState<boolean>(true)
  const text_ref = useRef<HTMLTextAreaElement | null>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (!autoScroll) return
    const el = text_ref.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [result_text, autoScroll])
  const content = (
    <div className="modal_overlay" onClick={on_close}>
      <div className={`modal ${isFull ? 'modal_full' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal_header">
          <div className="modal_title">{title}</div>
          {model_name && <div style={{ marginLeft: 10, fontSize: 12, color: '#bdbdbd' }}>{model_name}</div>}
          {typeof elapsed_ms === 'number' && <div style={{ marginLeft: 8, fontSize: 12, color: '#bdbdbd' }}>{Math.max(0, Math.round(elapsed_ms))} ms</div>}
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={() => set_autoScroll(v => !v)}>{autoScroll ? 'Auto Scroll: On' : 'Auto Scroll: Off'}</button>
          <button className="settings_btn" onClick={() => set_isFull(v => !v)}>{isFull ? 'Exit Fullscreen' : 'Fullscreen'}</button>
          <button className="settings_btn" onClick={on_close}>Close</button>
        </div>
        <div className="modal_body">
          {loading && (
            <div style={{ color: '#cfcfcf', fontSize: 13, marginBottom: 8 }}>Processing... You can click Cancel to stop displaying.</div>
          )}
          <div style={{ display: 'inline-block', maxWidth: '50%', minWidth: 260 }}>
            <textarea
              className="settings_input"
              readOnly
              value={result_text}
              ref={text_ref}
              style={{ height: 320, resize: 'both', overflow: 'auto', maxWidth: '100%' }}
              title="You can drag to resize."
            />
          </div>
        </div>
        <div className="modal_footer">
          {loading ? (
            <button className="settings_btn" onClick={on_cancel}>Cancel</button>
          ) : (
            <>
              <button className="settings_btn" onClick={on_copy}>Copy</button>
              {on_copy_md && <button className="settings_btn" onClick={on_copy_md}>Copy as Markdown</button>}
              {on_copy_code && <button className="settings_btn" onClick={on_copy_code}>Copy as Code Block</button>}
              <button className="settings_btn" onClick={on_replace}>Replace</button>
              {on_regen && <button className="settings_btn" onClick={on_regen}>Regenerate</button>}
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={on_close}>Close</button>
        </div>
      </div>
    </div>
  )
  return is_open ? createPortal(content, document.body) : null
}


