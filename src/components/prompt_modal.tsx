import { createPortal } from 'react-dom'

type Prompt_modal_props = {
  is_open: boolean
  on_close: () => void
  on_submit: (opts: { prompt: string, include_document: boolean }) => void
}

/**
 * Prompt_modal
 * 提示输入弹窗，用于 AI 续写/指令
 */
export default function Prompt_modal(props: Prompt_modal_props) {
  const { is_open, on_close, on_submit } = props
  if (!is_open) return null
  let prompt_value = ''
  let include_document = true

  const content = (
    <div className="modal_overlay" onClick={on_close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal_header">
          <div className="modal_title">AI 提示</div>
          <button className="settings_btn" onClick={on_close}>关闭</button>
        </div>
        <div className="modal_body">
          <div className="form_row" style={{ alignItems: 'flex-start' }}>
            <label className="form_label">提示词</label>
            <textarea className="settings_input" style={{ height: 120 }} placeholder="描述你想让 AI 做什么" onChange={(e) => { prompt_value = e.target.value }} />
          </div>
          <div className="form_row">
            <label className="form_label">上下文</label>
            <label style={{ color: '#cfcfcf', fontSize: 13 }}>
              <input type="checkbox" defaultChecked onChange={(e) => { include_document = e.target.checked }} />
              将当前文档内容作为上下文一并发送
            </label>
          </div>
        </div>
        <div className="modal_footer">
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={() => on_submit({ prompt: prompt_value, include_document })}>发送</button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}


