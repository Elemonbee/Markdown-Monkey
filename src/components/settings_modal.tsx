import { useEffect, useState } from 'react'
import { t } from '../i18n'
import { createPortal } from 'react-dom'

type Settings_modal_props = {
  is_open: boolean
  api_base_url: string
  set_api_base_url: (v: string) => void
  api_key: string
  set_api_key: (v: string) => void
  provider: string
  set_provider: (v: string) => void
  model: string
  set_model: (v: string) => void
  system_prompt: string
  set_system_prompt: (v: string) => void
  temperature: number
  set_temperature: (v: number) => void
  editor_font_size: number
  set_editor_font_size: (v: number) => void
  preview_font_size: number
  set_preview_font_size: (v: number) => void
  ui_language?: string
  set_ui_language?: (v: string) => void
  ui_theme?: string
  set_ui_theme?: (v: string) => void
  ai_actions_enabled: string[]
  set_ai_actions_enabled: (v: string[]) => void
  ai_custom_templates: Array<{ id: string, title: string, body: string, scope: 'selection' | 'document', enabled: boolean, vars?: { lang?: string, style?: string } }>
  set_ai_custom_templates: (v: Array<{ id: string, title: string, body: string, scope: 'selection' | 'document', enabled: boolean, vars?: { lang?: string, style?: string } }>) => void
  recent_files?: string[]
  clear_recent_files?: () => void
  on_open_recent?: (path: string) => void
  on_save: () => Promise<void>
  on_close: () => void
  on_test: () => Promise<void>
}

/**
 * Settings_modal
 * 设置弹窗：管理 AI 相关配置与本地 Ollama 连接
 */
export default function Settings_modal(props: Settings_modal_props) {
  const {
    is_open,
    api_base_url,
    set_api_base_url,
    api_key,
    set_api_key,
    provider,
    set_provider,
    model,
    set_model,
    system_prompt,
    set_system_prompt,
    temperature,
    set_temperature,
    editor_font_size,
    set_editor_font_size,
    preview_font_size,
    set_preview_font_size,
    ui_language = 'zh-CN',
    set_ui_language,
    ui_theme = 'dark',
    set_ui_theme,
    ai_actions_enabled,
    set_ai_actions_enabled,
    ai_custom_templates,
    set_ai_custom_templates,
    recent_files = [],
    clear_recent_files,
    on_save,
    on_close,
    on_test,
    on_open_recent,
  } = props

  useEffect(() => {
    function on_keydown(e: KeyboardEvent) {
      if (!is_open) return
      if (e.key === 'Escape') on_close()
    }
    window.addEventListener('keydown', on_keydown)
    return () => window.removeEventListener('keydown', on_keydown)
  }, [is_open, on_close])

  // 先声明所有 hooks，避免在关闭/打开之间出现 hooks 数量不一致
  const [active_tab, set_active_tab] = useState<'ui' | 'ai' | 'templates'>('ui')
  const [model_list, set_model_list] = useState<string[]>([])
  const [loading_models, set_loading_models] = useState<boolean>(false)
  const [load_error, set_load_error] = useState<string>('')
  const is_ollama = provider === 'ollama'

  if (!is_open) return null

  async function handle_fetch_models() {
    set_loading_models(true)
    set_load_error('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const v = await invoke<any>('list_models', {
        req: { provider, api_key, base_url: api_base_url }
      })
      let ids: string[] = []
      if (v && Array.isArray((v as any).data)) {
        ids = (v as any).data.map((m: any) => m.id || m.name).filter(Boolean)
      } else if (v && Array.isArray((v as any).models)) {
        ids = (v as any).models.map((m: any) => m.model || m.name || m.id).filter(Boolean)
      }
      set_model_list(ids)
    } catch (e: any) {
      set_load_error(String(e))
    } finally {
      set_loading_models(false)
    }
  }

  const content = (
    <div className="modal_overlay" onClick={on_close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal_header">
          <div className="modal_title">{t(ui_language as any, 'settings_title')}</div>
          <button className="settings_btn" onClick={on_close}>{t(ui_language as any, 'close')}</button>
        </div>
        <div className="modal_body">
          <div className="tabs">
            <button className={`tab_button ${active_tab === 'ui' ? 'active' : ''}`} onClick={() => set_active_tab('ui')}>{t(ui_language as any, 'tab_ui')}</button>
            <button className={`tab_button ${active_tab === 'ai' ? 'active' : ''}`} onClick={() => set_active_tab('ai')}>{t(ui_language as any, 'tab_ai')}</button>
            <button className={`tab_button ${active_tab === 'templates' ? 'active' : ''}`} onClick={() => set_active_tab('templates')}>{t(ui_language as any, 'tab_templates')}</button>
          </div>

          {active_tab === 'ui' && (
            <div className="tab_panel">
              {recent_files.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ color: '#cfcfcf', fontSize: 13, marginBottom: 6 }}>{t(ui_language as any, 'recent_files_label')}</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {recent_files.slice(0, 10).map((p) => (
                      <li key={p} style={{ wordBreak: 'break-all', margin: '4px 0' }}>
                        <button className="settings_btn" onClick={() => on_open_recent && on_open_recent(p)} title={p}>{t(ui_language as any, 'open_label')}</button>
                        <span style={{ marginLeft: 8, opacity: 0.9 }}>{p}</span>
                      </li>
                    ))}
                  </ul>
                  {clear_recent_files && <button className="settings_btn" style={{ marginTop: 8 }} onClick={clear_recent_files}>{t(ui_language as any, 'clear_recent')}</button>}
                </div>
              )}
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'editor_font_size')}</label>
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
                <label className="form_label">{t(ui_language as any, 'preview_font_size')}</label>
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
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'language')}</label>
                <select className="settings_input" value={ui_language} onChange={(e) => set_ui_language && set_ui_language(e.target.value)}>
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'theme')}</label>
                <select className="settings_input" value={ui_theme} onChange={(e) => set_ui_theme && set_ui_theme(e.target.value)}>
                  <option value="dark">{t(ui_language as any, 'theme_dark')}</option>
                  <option value="light">{t(ui_language as any, 'theme_light')}</option>
                  <option value="system">{t(ui_language as any, 'theme_system')}</option>
                </select>
              </div>
            </div>
          )}

          {active_tab === 'ai' && (
            <div className="tab_panel">
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'provider')}</label>
                <select className="settings_input" value={provider} onChange={(e) => set_provider(e.target.value)}>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="kimi">Kimi</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama (本地)</option>
                </select>
              </div>
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'api_base_url')}</label>
                <input
                  className="settings_input"
                  placeholder={is_ollama ? t(ui_language as any, 'base_url_ph_ollama') : t(ui_language as any, 'base_url_ph_openai')}
                  value={api_base_url}
                  onChange={(e) => set_api_base_url(e.target.value)}
                />
              </div>
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'api_key')}</label>
                <input
                  className="settings_input"
                  placeholder={is_ollama ? t(ui_language as any, 'api_key_ph_ollama') : t(ui_language as any, 'api_key_ph_required')}
                  value={api_key}
                  onChange={(e) => set_api_key(e.target.value)}
                  type="password"
                  disabled={is_ollama}
                />
              </div>
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'model_label')}</label>
                <input
                  className="settings_input"
                  placeholder={is_ollama ? t(ui_language as any, 'model_ph_ollama') : t(ui_language as any, 'model_ph_openai')}
                  value={model}
                  onChange={(e) => set_model(e.target.value)}
                />
              </div>
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'model_list_label')}</label>
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button className="settings_btn" onClick={handle_fetch_models}>{loading_models ? t(ui_language as any, 'loading_text') : t(ui_language as any, 'get_models_btn')}</button>
                  <select className="settings_input" value={model} onChange={(e) => set_model(e.target.value)}>
                    <option value="">{t(ui_language as any, 'select_model_placeholder')}</option>
                    {model_list.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              {load_error && <div style={{ color: '#f88', fontSize: 12, marginTop: 4 }}>{t(ui_language as any, 'error_prefix')} {load_error}</div>}
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'system_prompt_label')}</label>
                <input
                  className="settings_input"
                  placeholder={t(ui_language as any, 'system_prompt_placeholder')}
                  value={system_prompt}
                  onChange={(e) => set_system_prompt(e.target.value)}
                />
              </div>
              <div className="form_row">
                <label className="form_label">{t(ui_language as any, 'temperature_label')}</label>
                <input
                  className="settings_input"
                  placeholder={t(ui_language as any, 'temperature_placeholder')}
                  value={temperature}
                  onChange={(e) => set_temperature(Number(e.target.value))}
                  type="number"
                  step={0.1}
                  min={0}
                  max={2}
                />
              </div>
            </div>
          )}

          {active_tab === 'templates' && (
            <div className="tab_panel">
              <div style={{ color: '#cfcfcf', fontSize: 13, marginBottom: 8 }}>{t(ui_language as any, 'ai_menu_title')}</div>
              {[
                { id: 'continue_selection', label: t(ui_language as any, 'continue_sel') },
                { id: 'continue_document', label: t(ui_language as any, 'continue_doc') },
                { id: 'rewrite_selection', label: t(ui_language as any, 'rewrite_sel') },
                { id: 'translate_zh_selection', label: t(ui_language as any, 'translate_zh_sel') },
                { id: 'translate_en_selection', label: t(ui_language as any, 'translate_en_sel') },
                { id: 'summary_selection', label: t(ui_language as any, 'summary_sel') },
                { id: 'summary_document', label: t(ui_language as any, 'summary_doc') },
              ].map((item) => (
                <div key={item.id} className="form_row">
                  <label className="form_label">{item.label}</label>
                  <input
                    type="checkbox"
                    checked={ai_actions_enabled.includes(item.id)}
                    onChange={(e) => {
                      const checked = e.target.checked
                      if (checked) {
                        if (!ai_actions_enabled.includes(item.id)) {
                          set_ai_actions_enabled([...ai_actions_enabled, item.id])
                        }
                      } else {
                        set_ai_actions_enabled(ai_actions_enabled.filter((x) => x !== item.id))
                      }
                    }}
                  />
                </div>
              ))}

              <div style={{
                border: '1px solid #2b2b2b',
                borderRadius: 8,
                padding: 10,
                margin: '12px 0',
                color: '#cfcfcf',
                fontSize: 12,
                lineHeight: 1.6,
                background: 'rgba(255,255,255,0.03)'
              }}>
                <div style={{ marginBottom: 6 }}>{t(ui_language as any, 'placeholder_guide')}</div>
                <div>{t(ui_language as any, 'ph_text')}</div>
                <div>{t(ui_language as any, 'ph_lang')}</div>
                <div>{t(ui_language as any, 'ph_style')}</div>
                <div>{t(ui_language as any, 'ph_date')}</div>
                <div>{t(ui_language as any, 'ph_filename')}</div>
                <div>{t(ui_language as any, 'ph_model')}</div>
              </div>

              <div style={{ color: '#cfcfcf', fontSize: 13, margin: '12px 0 6px' }}>{t(ui_language as any, 'custom_templates_hint')}</div>
              {ai_custom_templates.map((tpl, idx) => (
                <div key={tpl.id} style={{ border: '1px solid #2b2b2b', borderRadius: 8, padding: 8, marginBottom: 8 }}>
                  <div className="form_row">
                    <label className="form_label">{t(ui_language as any, 'title_label_i18n')}</label>
                    <input className="settings_input" value={tpl.title} onChange={(e) => {
                      const next = [...ai_custom_templates]
                      next[idx] = { ...tpl, title: e.target.value }
                      set_ai_custom_templates(next)
                    }} />
                  </div>
                  <div className="form_row">
                    <label className="form_label">{t(ui_language as any, 'scope_label_i18n')}</label>
                    <select className="settings_input" value={tpl.scope} onChange={(e) => {
                      const next = [...ai_custom_templates]
                      next[idx] = { ...tpl, scope: (e.target.value as 'selection' | 'document') }
                      set_ai_custom_templates(next)
                    }}>
                      <option value="selection">{t(ui_language as any, 'scope_selection')}</option>
                      <option value="document">{t(ui_language as any, 'scope_document')}</option>
                    </select>
                  </div>
                  <div className="form_row" style={{ alignItems: 'flex-start' }}>
                    <label className="form_label">{t(ui_language as any, 'prompt_label_i18n')}</label>
                    <textarea className="settings_input" style={{ height: 100 }} value={tpl.body} onChange={(e) => {
                      const next = [...ai_custom_templates]
                      next[idx] = { ...tpl, body: e.target.value }
                      set_ai_custom_templates(next)
                    }} />
                  </div>
                  <div className="form_row">
                    <label className="form_label">{t(ui_language as any, 'vars_label_i18n')}</label>
                    <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                      <input className="settings_input" placeholder="lang (e.g. zh-CN/en-US)" value={tpl.vars?.lang || ''} onChange={(e) => {
                        const next = [...ai_custom_templates]
                        next[idx] = { ...tpl, vars: { ...(tpl.vars || {}), lang: e.target.value } }
                        set_ai_custom_templates(next)
                      }} />
                      <input className="settings_input" placeholder="style (e.g. concise/formal)" value={tpl.vars?.style || ''} onChange={(e) => {
                        const next = [...ai_custom_templates]
                        next[idx] = { ...tpl, vars: { ...(tpl.vars || {}), style: e.target.value } }
                        set_ai_custom_templates(next)
                      }} />
                    </div>
                  </div>
                  <div className="form_row">
                    <label className="form_label">{t(ui_language as any, 'enabled_label_i18n')}</label>
                    <input type="checkbox" checked={tpl.enabled} onChange={(e) => {
                      const next = [...ai_custom_templates]
                      next[idx] = { ...tpl, enabled: e.target.checked }
                      set_ai_custom_templates(next)
                    }} />
                    <div style={{ flex: 1 }} />
                    <button className="settings_btn" onClick={() => {
                      const next = ai_custom_templates.filter((x) => x.id !== tpl.id)
                      set_ai_custom_templates(next)
                    }}>{t(ui_language as any, 'delete_btn')}</button>
                  </div>
                </div>
              ))}
              <div className="form_row" style={{ gap: 8 }}>
                <div style={{ width: 120 }} />
                <button className="settings_btn" onClick={() => {
                  const id = `tpl_${Date.now()}`
                  set_ai_custom_templates([
                    ...ai_custom_templates,
                    { id, title: '新模板', body: '请基于以下内容执行你的任务：\n\n{text}', scope: 'selection', enabled: true }
                  ])
                }}>{t(ui_language as any, 'new_template_btn')}</button>
                <button className="settings_btn" onClick={async () => {
                  try {
                    const { save } = await import('@tauri-apps/plugin-dialog')
                    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
                    const target = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: 'ai_templates.json' })
                    if (!target) return
                    await writeTextFile(target, JSON.stringify(ai_custom_templates, null, 2))
                  } catch (e) { console.error(e) }
                }}>{t(ui_language as any, 'export_templates_btn')}</button>
                <button className="settings_btn" onClick={async () => {
                  try {
                    const { open } = await import('@tauri-apps/plugin-dialog')
                    const { readTextFile } = await import('@tauri-apps/plugin-fs')
                    const file = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] })
                    if (typeof file !== 'string') return
                    const content = await readTextFile(file)
                    const parsed = JSON.parse(content)
                    if (Array.isArray(parsed)) {
                      set_ai_custom_templates(parsed)
                    } else {
                      alert('Invalid file content: expected array')
                    }
                  } catch (e) { console.error(e) }
                }}>{t(ui_language as any, 'import_templates_btn')}</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal_footer">
          {active_tab === 'ai' && <button className="settings_btn" onClick={on_test}>{t(ui_language as any, 'test_connection')}</button>}
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={on_save}>{t(ui_language as any, 'save_btn')}</button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}


