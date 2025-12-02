import { memo } from 'react'
import { createPortal } from 'react-dom'

type OutlineModalProps = {
  is_open: boolean
  headings: Array<{ level: number; text: string; line: number }>
  on_jump: (line: number) => void
  on_close: () => void
}

/**
 * OutlineModal
 * 文档大纲弹窗
 */
function OutlineModalComponent(props: OutlineModalProps) {
  const { is_open, headings, on_jump, on_close } = props

  if (!is_open) return null

  const content = (
    <div className="modal_overlay" onClick={on_close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal_header">
          <div className="modal_title">文档大纲</div>
          <button className="settings_btn" onClick={on_close}>
            关闭
          </button>
        </div>
        <div className="modal_body" style={{ maxHeight: 360, overflow: 'auto' }}>
          {headings.length === 0 ? (
            <div style={{ color: '#cfcfcf', fontSize: 13 }}>未检测到标题</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 12 }}>
              {headings.map((h, i) => (
                <li
                  key={i}
                  style={{ listStyle: 'none', margin: '6px 0', paddingLeft: (h.level - 1) * 12 }}
                >
                  <button className="settings_btn" onClick={() => on_jump(h.line)}>
                    {`H${h.level}`} · {h.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(content, document.body)
}

const OutlineModal = memo(OutlineModalComponent)
export default OutlineModal
