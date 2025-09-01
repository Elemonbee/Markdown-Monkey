type Editor_settings_modal_props = {
  is_open: boolean
  editor_font_size: number
  set_editor_font_size: (v: number) => void
  preview_font_size: number
  set_preview_font_size: (v: number) => void
  on_save: () => Promise<void>
  on_close: () => void
}

/**
 * Editor_settings_modal
 * 编辑器/预览的外观与字号设置弹窗
 */
export default function Editor_settings_modal(props: Editor_settings_modal_props) {
  const {
    is_open,
    editor_font_size,
    set_editor_font_size,
    preview_font_size,
    set_preview_font_size,
    on_save,
    on_close,
  } = props

  if (!is_open) return null

  return (
    <div className="modal_overlay" onClick={on_close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal_header">
          <div className="modal_title">编辑器设置</div>
          <button className="settings_btn" onClick={on_close}>关闭</button>
        </div>
        <div className="modal_body">
          <div className="form_row">
            <label className="form_label">编辑器字号</label>
            <input
              className="settings_input"
              placeholder="16"
              value={editor_font_size}
              onChange={(e) => set_editor_font_size(Number(e.target.value))}
              type="number"
              step={1}
              min={10}
              max={28}
            />
          </div>
          <div className="form_row">
            <label className="form_label">预览字号</label>
            <input
              className="settings_input"
              placeholder="16"
              value={preview_font_size}
              onChange={(e) => set_preview_font_size(Number(e.target.value))}
              type="number"
              step={1}
              min={10}
              max={28}
            />
          </div>
        </div>
        <div className="modal_footer">
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={on_save}>保存</button>
        </div>
      </div>
    </div>
  )
}


