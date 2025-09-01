type Ai_settings_modal_props = {
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
  on_save: () => Promise<void>
  on_close: () => void
  on_test: () => Promise<void>
}

/**
 * Ai_settings_modal
 * AI 相关配置弹窗（与编辑器设置分离）
 */
export default function Ai_settings_modal(props: Ai_settings_modal_props) {
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
    on_save,
    on_close,
    on_test,
  } = props

  if (!is_open) return null

  const is_ollama = provider === 'ollama'

  return (
    <div className="modal_overlay" onClick={on_close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal_header">
          <div className="modal_title">AI 设置</div>
          <button className="settings_btn" onClick={on_close}>关闭</button>
        </div>
        <div className="modal_body">
          <div className="form_row">
            <label className="form_label">Provider</label>
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
            <label className="form_label">API Base URL</label>
            <input
              className="settings_input"
              placeholder={is_ollama ? 'http://127.0.0.1:11434' : 'https://api.openai.com'}
              value={api_base_url}
              onChange={(e) => set_api_base_url(e.target.value)}
            />
          </div>
          <div className="form_row">
            <label className="form_label">API Key</label>
            <input
              className="settings_input"
              placeholder={is_ollama ? 'Ollama 无需 Key' : '必填'}
              value={api_key}
              onChange={(e) => set_api_key(e.target.value)}
              type="password"
              disabled={is_ollama}
            />
          </div>
          <div className="form_row">
            <label className="form_label">Model</label>
            <input
              className="settings_input"
              placeholder={is_ollama ? 'llama3' : 'gpt-4o-mini 等'}
              value={model}
              onChange={(e) => set_model(e.target.value)}
            />
          </div>
          <div className="form_row">
            <label className="form_label">System Prompt</label>
            <input
              className="settings_input"
              placeholder="You are a helpful assistant..."
              value={system_prompt}
              onChange={(e) => set_system_prompt(e.target.value)}
            />
          </div>
          <div className="form_row">
            <label className="form_label">Temperature</label>
            <input
              className="settings_input"
              placeholder="0.7"
              value={temperature}
              onChange={(e) => set_temperature(Number(e.target.value))}
              type="number"
              step={0.1}
              min={0}
              max={2}
            />
          </div>
        </div>
        <div className="modal_footer">
          <button className="settings_btn" onClick={on_test}>测试连接</button>
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={on_save}>保存</button>
        </div>
      </div>
    </div>
  )
}


