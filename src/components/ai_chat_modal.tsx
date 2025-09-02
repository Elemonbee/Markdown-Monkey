import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Store } from '@tauri-apps/plugin-store'
import { t } from '../i18n'

type ChatMessage = { role: 'user' | 'assistant', content: string }

type Ai_chat_modal_props = {
  is_open: boolean
  provider: string
  api_base_url: string
  api_key: string
  model: string
  system_prompt: string
  temperature: number
  on_close: () => void
  reset_signal?: number
  on_insert_to_editor?: (text: string) => void
  ui_language?: string
}

/**
 * Ai_chat_modal
 * 简易 AI 对话窗口：展示消息列表、输入发送，支持流式显示与取消
 */
export default function Ai_chat_modal(props: Ai_chat_modal_props) {
  const { is_open, provider, api_base_url, api_key, model, system_prompt, temperature, on_close, reset_signal, on_insert_to_editor, ui_language } = props
  const lang = (ui_language as string) || 'zh-CN'
  const [messages, set_messages] = useState<ChatMessage[]>([])
  const [input, set_input] = useState<string>('')
  const [loading, set_loading] = useState<boolean>(false)
  const [isMin, set_isMin] = useState<boolean>(false)
  const [pos, set_pos] = useState<{x:number,y:number}>({ x: 80, y: 80 })
  const [chat_provider, set_chat_provider] = useState<string>(provider)
  const [chat_model, set_chat_model] = useState<string>(model)
  const [chat_base_url, set_chat_base_url] = useState<string>(api_base_url)
  const [model_list, set_model_list] = useState<string[]>([])
  const [loading_models, set_loading_models] = useState<boolean>(false)
  const [load_error, set_load_error] = useState<string>('')
  const drag_ref = useRef<{dx:number,dy:number,dragging:boolean}>({dx:0,dy:0,dragging:false})
  const list_ref = useRef<HTMLDivElement | null>(null)
  const unsubscribe_ref = useRef<() => void>(() => {})
  const abort_ref = useRef<boolean>(false)
  const store_ref = useRef<Store | null>(null)

  useEffect(() => {
    if (!is_open) return
    const el = list_ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, is_open])

  // 初始化：加载持久化的聊天数据与窗口状态
  useEffect(() => {
    async function init() {
      const s = await Store.load('settings.json')
      store_ref.current = s
      try {
        const saved_msgs = (await s.get<any>('chat_messages')) || []
        const saved_input = (await s.get<string>('chat_input')) || ''
        const saved_pos = (await s.get<{x:number,y:number}>('chat_pos'))
        const saved_min = (await s.get<boolean>('chat_minimized'))
        const saved_p = (await s.get<string>('chat_provider'))
        const saved_m = (await s.get<string>('chat_model'))
        const saved_b = (await s.get<string>('chat_base_url'))
        if (Array.isArray(saved_msgs)) set_messages(saved_msgs)
        if (typeof saved_input === 'string') set_input(saved_input)
        if (saved_pos && typeof saved_pos.x === 'number' && typeof saved_pos.y === 'number') set_pos(saved_pos)
        if (typeof saved_min === 'boolean') set_isMin(saved_min)
        if (typeof saved_p === 'string') set_chat_provider(saved_p)
        if (typeof saved_m === 'string') set_chat_model(saved_m)
        if (typeof saved_b === 'string') set_chat_base_url(saved_b)
      } catch (_e) { /* ignore */ }
    }
    init()
  }, [])

  // 持久化：消息、输入、位置、最小化状态
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_messages', messages); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [messages])
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_input', input); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [input])
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_pos', pos); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [pos])
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_minimized', isMin); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [isMin])
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_provider', chat_provider); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [chat_provider])
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_model', chat_model); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [chat_model])
  useEffect(() => { (async () => { try { if (store_ref.current) { await store_ref.current.set('chat_base_url', chat_base_url); await store_ref.current.save() } } catch (_e) { /* ignore */ } })() }, [chat_base_url])

  // 根据 provider 自动切换 base_url（仅对聊天生效，不影响全局设置）
  useEffect(() => {
    const defaults: Record<string, string> = {
      openai: 'https://api.openai.com',
      claude: 'https://api.anthropic.com',
      deepseek: 'https://api.deepseek.com',
      kimi: 'https://api.moonshot.cn',
      openrouter: 'https://openrouter.ai/api/v1',
      ollama: 'http://127.0.0.1:11434',
    }
    const d = defaults[chat_provider] || chat_base_url
    set_chat_base_url(d)
  }, [chat_provider])

  async function handle_fetch_models() {
    set_loading_models(true)
    set_load_error('')
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const v = await invoke<unknown>('list_models', { req: { provider: chat_provider, api_key, base_url: chat_base_url } })
      let ids: string[] = []
      if (typeof v === 'object' && v !== null) {
        const maybe = v as { data?: Array<{ id?: string, name?: string }>, models?: Array<{ model?: string, name?: string, id?: string }> }
        if (Array.isArray(maybe.data)) {
          ids = maybe.data.map((m) => m.id || m.name || '').filter(Boolean) as string[]
        } else if (Array.isArray(maybe.models)) {
          ids = maybe.models.map((m) => m.model || m.name || m.id || '').filter(Boolean) as string[]
        }
      }
      set_model_list(ids)
    } catch (e: unknown) {
      set_load_error(String(e))
    } finally {
      set_loading_models(false)
    }
  }

  // 外部触发：重置位置为默认值
  useEffect(() => {
    if (typeof reset_signal === 'number') {
      set_pos({ x: 80, y: 80 })
      ;(async () => { try { if (store_ref.current) { await store_ref.current.set('chat_pos', { x: 80, y: 80 }); await store_ref.current.save() } } catch (_e) { /* ignore */ } })()
    }
  }, [reset_signal])

  if (!is_open) return null

  /**
   * append_assistant_delta
   * 将流式片段追加到最后一个 assistant 消息
   */
  function append_assistant_delta(text: string) {
    set_messages((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (!last || last.role !== 'assistant') {
        next.push({ role: 'assistant', content: text })
      } else {
        last.content += text
      }
      return next
    })
  }

  /**
   * handle_send
   * 发送当前输入为 user 消息并拉取 assistant 回复（流式）
   */
  async function handle_send() {
    const content = input.trim()
    if (!content || loading) return
    set_messages((prev) => [...prev, { role: 'user', content }])
    set_input('')
    set_messages((prev) => [...prev, { role: 'assistant', content: '' }])
    set_loading(true)
    abort_ref.current = false
    try { unsubscribe_ref.current(); } catch (_e) { /* ignore */ }

    const { invoke } = await import('@tauri-apps/api/core')
    const { listen } = await import('@tauri-apps/api/event')

    const prompt = content

    let throttling = false
    let bufferText = ''
    const flush = () => {
      if (!bufferText) return
      const t = bufferText
      bufferText = ''
      append_assistant_delta(t)
    }
    const unlisten = await listen<string>('ai:stream', (e) => {
      const payload = (e.payload || '').toString().trim()
      if (!payload || !payload.startsWith('data:')) return
      const data = payload.slice('data:'.length).trim()
      if (data === '[DONE]') { flush(); set_loading(false); return }
      try {
        const obj = JSON.parse(data)
        const delta = obj?.choices?.[0]?.delta?.content
        const t1 = obj?.delta?.text
        const t2 = obj?.content_block?.text || obj?.content?.[0]?.text
        const piece = typeof delta === 'string' ? delta : typeof t1 === 'string' ? t1 : typeof t2 === 'string' ? t2 : ''
        if (!piece) return
        bufferText += piece
        if (!throttling) {
          throttling = true
          setTimeout(() => { flush(); throttling = false }, 60)
        }
      } catch (_e) { /* ignore */ }
    })
    unsubscribe_ref.current = unlisten

    try {
      await invoke('ai_complete_stream', {
        req: {
          provider: chat_provider,
          api_key: api_key.trim(),
          prompt,
          model: chat_model,
          system_prompt,
          temperature,
          base_url: chat_base_url,
          messages: messages.concat([{ role: 'user', content }])
        }
      })
    } catch (e: unknown) {
      append_assistant_delta(`\n[Error] ${String(e)}`)
    } finally {
      set_loading(false)
    }
  }

  /**
   * handle_cancel
   * 终止当前显示（请求可能仍在后台进行）
   */
  function handle_cancel() {
    abort_ref.current = true
    set_loading(false)
  }

  function on_header_down(e: React.MouseEvent) {
    // 若命中交互控件（select/input/textarea/button），不触发拖拽，保证可正常点击
    const target = e.target as HTMLElement
    if (target && target.closest('select, input, textarea, button')) return
    e.preventDefault()
    const sx = e.clientX, sy = e.clientY
    drag_ref.current = { dx: sx - pos.x, dy: sy - pos.y, dragging: true }
    const onMove = (ev: MouseEvent) => {
      if (!drag_ref.current.dragging) return
      set_pos({ x: ev.clientX - drag_ref.current.dx, y: ev.clientY - drag_ref.current.dy })
    }
    const onUp = () => {
      drag_ref.current.dragging = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // 最小化：渲染为可拖动的小浮条，不使用遮罩层，避免遮挡编辑器
  if (isMin) {
    const mini = (
      <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 10001 }}>
        <div className="modal" style={{ width: 320 }} onMouseDown={on_header_down}>
          <div className="modal_header" style={{ cursor: 'move' }}>
            <div className="modal_title">AI 对话（最小化）</div>
            <button className="settings_btn" onClick={() => set_isMin(false)}>展开</button>
            <button className="settings_btn" onClick={on_close}>关闭</button>
          </div>
        </div>
      </div>
    )
    return createPortal(mini, document.body)
  }

  const contentNode = (
    <div className="modal_overlay" onClick={() => set_isMin(true)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: pos.x, top: pos.y }}>
        <div className="modal_header" onMouseDown={on_header_down} style={{ cursor: 'move' }}>
          <div className="modal_title">{t(lang, 'ai_chat')}</div>
          <select className="settings_input" style={{ width: 120, flexShrink: 0 }} value={chat_provider} onChange={(e) => set_chat_provider(e.target.value)}>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
            <option value="deepseek">DeepSeek</option>
            <option value="kimi">Kimi</option>
            <option value="openrouter">OpenRouter</option>
            <option value="ollama">Ollama</option>
          </select>
          <input className="settings_input" style={{ flex: 1, minWidth: 220 }} placeholder={chat_provider==='ollama'?t(lang,'base_url_ph_ollama'):t(lang,'base_url_ph_openai')} value={chat_base_url} onChange={(e) => set_chat_base_url(e.target.value)} />
          <input className="settings_input" style={{ width: 200, flexShrink: 0 }} placeholder={chat_provider==='ollama'?t(lang,'model_ph_ollama'):t(lang,'model_ph_openai')} value={chat_model} onChange={(e) => set_chat_model(e.target.value)} />
          <button className="settings_btn" style={{ whiteSpace: 'nowrap', minWidth: 84, flexShrink: 0 }} onClick={handle_fetch_models}>{loading_models ? t(lang,'loading_text') : t(lang,'get_models_btn')}</button>
          <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
            <select className="settings_input" style={{ width: 220, maxWidth: 320, flexShrink: 0 }} value={chat_model} onChange={(e) => set_chat_model(e.target.value)}>
              <option value="">{t(lang,'select_model_placeholder')}</option>
              {model_list.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
            <button className="settings_btn" onClick={() => set_isMin(true)}>{t(lang,'minimize')}</button>
            <button className="settings_btn" onClick={on_close}>{t(lang,'close')}</button>
          </div>
        </div>
        {load_error && <div style={{ color: '#f88', fontSize: 12, margin: '4px 16px 0' }}>{t(lang,'error_prefix')} {load_error}</div>}
        <div className="modal_body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div ref={list_ref} style={{ maxHeight: 360, overflow: 'auto', padding: '6px 2px', border: '1px solid #2b2b2b', borderRadius: 8 }}>
            {messages.length === 0 ? (
              <div style={{ color: '#cfcfcf', fontSize: 13 }}>{t(lang,'start_chat')}</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ margin: '8px 6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{m.role === 'user' ? t(lang,'you') : t(lang,'ai_label')}</div>
                  <div style={{ fontSize: 14 }}>{m.content}</div>
                </div>
              ))
            )}
          </div>
          <textarea className="settings_input" style={{ height: 80 }} placeholder={t(lang,'type_message_placeholder')} value={input}
            onChange={(e) => set_input(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handle_send() }
            }}
          />
        </div>
        <div className="modal_footer">
          {loading ? (
            <button className="settings_btn" onClick={handle_cancel}>{t(lang,'cancel')}</button>
          ) : (
            <>
              <button className="settings_btn" onClick={handle_send}>{t(lang,'send')}</button>
              <button className="settings_btn" onClick={() => {
                const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
                if (lastAssistant && on_insert_to_editor) on_insert_to_editor(lastAssistant.content || '')
              }}>{t(lang,'insert_to_editor')}</button>
              <button className="settings_btn" onClick={async () => {
                try {
                  const { save } = await import('@tauri-apps/plugin-dialog')
                  const { writeTextFile } = await import('@tauri-apps/plugin-fs')
                  const target = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: 'chat_session.json' })
                  if (!target) return
                  await writeTextFile(target, JSON.stringify({ provider: chat_provider, model: chat_model, base_url: chat_base_url, messages }, null, 2))
                } catch (_e) { /* ignore */ }
              }}>{t(lang,'export')}</button>
              <button className="settings_btn" onClick={() => set_messages([])}>{t(lang,'clear')}</button>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={on_close}>{t(lang,'close')}</button>
        </div>
      </div>
    </div>
  )
  return createPortal(contentNode, document.body)
}


