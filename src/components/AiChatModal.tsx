import { memo } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Store } from '@tauri-apps/plugin-store'
import { t } from '../i18n'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type AiChatModalProps = {
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
 * AiChatModal / AI Chat Modal
 * 简易 AI 对话窗口：展示消息列表、输入发送，支持流式显示与取消 / Simple AI chat window: displays message list, input/send, supports streaming display and cancellation
 */
function AiChatModalComponent(props: AiChatModalProps) {
  const {
    is_open,
    provider,
    api_base_url,
    api_key,
    model,
    system_prompt,
    temperature,
    on_close,
    reset_signal,
    on_insert_to_editor,
    ui_language,
  } = props
  const lang = (ui_language as string) || 'zh-CN'
  const [messages, set_messages] = useState<ChatMessage[]>([])
  const [input, set_input] = useState<string>('')
  const [loading, set_loading] = useState<boolean>(false)
  const [isMin, set_isMin] = useState<boolean>(false)
  const [pos, set_pos] = useState<{ x: number; y: number }>({ x: 80, y: 80 })
  const [chat_provider, set_chat_provider] = useState<string>(provider)
  const [chat_model, set_chat_model] = useState<string>(model)
  const [chat_base_url, set_chat_base_url] = useState<string>(api_base_url)

  const drag_ref = useRef<{ dx: number; dy: number; dragging: boolean }>({
    dx: 0,
    dy: 0,
    dragging: false,
  })
  const list_ref = useRef<HTMLDivElement | null>(null)
  const unsubscribe_ref = useRef<() => void>(() => {})
  const abort_ref = useRef<boolean>(false)
  const store_ref = useRef<Store | null>(null)

  useEffect(() => {
    if (!is_open) return
    const el = list_ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, is_open])

  // 当全局配置 (props) 变化时，同步更新内部状态
  // Sync internal state when global config (props) changes
  useEffect(() => {
    set_chat_provider(provider)
  }, [provider])

  useEffect(() => {
    set_chat_model(model)
  }, [model])

  useEffect(() => {
    set_chat_base_url(api_base_url)
  }, [api_base_url])

  // 初始化：加载持久化的聊天数据与窗口状态
  useEffect(() => {
    async function init() {
      const s = await Store.load('settings.json')
      store_ref.current = s
      try {
        const saved_msgs = (await s.get<ChatMessage[]>('chat_messages')) || []
        const saved_input = (await s.get<string>('chat_input')) || ''
        const saved_pos = await s.get<{ x: number; y: number }>('chat_pos')
        const saved_min = await s.get<boolean>('chat_minimized')
        // 移除独立的连接配置加载，改用 props 传入的全局配置
        // Remove independent connection config loading, use global config passed via props instead
        if (Array.isArray(saved_msgs)) set_messages(saved_msgs)
        if (typeof saved_input === 'string') set_input(saved_input)
        if (saved_pos && typeof saved_pos.x === 'number' && typeof saved_pos.y === 'number')
          set_pos(saved_pos)
        if (typeof saved_min === 'boolean') set_isMin(saved_min)
      } catch {
        /* ignore */
      }
    }
    init()
  }, [])

  // 持久化
  useEffect(() => {
    ;(async () => {
      try {
        if (store_ref.current) {
          await store_ref.current.set('chat_messages', messages)
          await store_ref.current.save()
        }
      } catch {
        /* ignore */
      }
    })()
  }, [messages])
  useEffect(() => {
    ;(async () => {
      try {
        if (store_ref.current) {
          await store_ref.current.set('chat_input', input)
          await store_ref.current.save()
        }
      } catch {
        /* ignore */
      }
    })()
  }, [input])
  useEffect(() => {
    ;(async () => {
      try {
        if (store_ref.current) {
          await store_ref.current.set('chat_pos', pos)
          await store_ref.current.save()
        }
      } catch {
        /* ignore */
      }
    })()
  }, [pos])
  useEffect(() => {
    ;(async () => {
      try {
        if (store_ref.current) {
          await store_ref.current.set('chat_minimized', isMin)
          await store_ref.current.save()
        }
      } catch {
        /* ignore */
      }
    })()
  }, [isMin])
  // 移除 chat_provider, chat_model, chat_base_url 的持久化保存
  // Remove persistence for chat_provider, chat_model, chat_base_url

  // 移除自动重置 base_url 的逻辑，完全依赖全局配置
  // Remove logic that automatically resets base_url, rely entirely on global config

  // 外部触发：重置位置为默认值
  useEffect(() => {
    if (typeof reset_signal === 'number') {
      set_pos({ x: 80, y: 80 })
      ;(async () => {
        try {
          if (store_ref.current) {
            await store_ref.current.set('chat_pos', { x: 80, y: 80 })
            await store_ref.current.save()
          }
        } catch {
          /* ignore */
        }
      })()
    }
  }, [reset_signal])

  if (!is_open) return null

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

  async function handle_send() {
    const content = input.trim()
    if (!content || loading) return
    set_messages((prev) => [...prev, { role: 'user', content }])
    set_input('')
    set_messages((prev) => [...prev, { role: 'assistant', content: '' }])
    set_loading(true)
    abort_ref.current = false
    try {
      unsubscribe_ref.current()
    } catch {
      /* ignore */
    }

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
      if (data === '[DONE]') {
        flush()
        set_loading(false)
        return
      }
      try {
        const obj = JSON.parse(data)
        const delta = obj?.choices?.[0]?.delta?.content
        const t1 = obj?.delta?.text
        const t2 = obj?.content_block?.text || obj?.content?.[0]?.text
        const piece =
          typeof delta === 'string'
            ? delta
            : typeof t1 === 'string'
              ? t1
              : typeof t2 === 'string'
                ? t2
                : ''
        if (!piece) return
        bufferText += piece
        if (!throttling) {
          throttling = true
          setTimeout(() => {
            flush()
            throttling = false
          }, 60)
        }
      } catch {
        /* ignore */
      }
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
          messages: messages.concat([{ role: 'user', content }]),
        },
      })
    } catch (e: unknown) {
      append_assistant_delta(`\n[Error] ${String(e)}`)
    } finally {
      set_loading(false)
    }
  }

  function handle_cancel() {
    abort_ref.current = true
    set_loading(false)
  }

  function on_header_down(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target && target.closest('select, input, textarea, button')) return
    e.preventDefault()
    const sx = e.clientX,
      sy = e.clientY
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

  if (isMin) {
    const mini = (
      <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 10001 }}>
        <div className="modal" style={{ width: 320 }} onMouseDown={on_header_down}>
          <div className="modal_header" style={{ cursor: 'move' }}>
            <div className="modal_title">AI 对话（最小化）</div>
            <button className="settings_btn" onClick={() => set_isMin(false)}>
              展开
            </button>
            <button className="settings_btn" onClick={on_close}>
              关闭
            </button>
          </div>
        </div>
      </div>
    )
    return createPortal(mini, document.body)
  }

  const contentNode = (
    <div className="modal_overlay" onClick={() => set_isMin(true)}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'fixed', left: pos.x, top: pos.y }}
      >
        <div className="modal_header" onMouseDown={on_header_down} style={{ cursor: 'move' }}>
          <div className="modal_title">{t(lang, 'ai_chat')}</div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888' }}
          >
            <span>
              {chat_provider === 'openai'
                ? 'OpenAI (兼容 API)'
                : chat_provider === 'claude'
                  ? 'Claude'
                  : 'Ollama'}
            </span>
            <span>·</span>
            <span>{chat_model}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
            <button className="settings_btn" onClick={() => set_isMin(true)}>
              {t(lang, 'minimize')}
            </button>
            <button className="settings_btn" onClick={on_close}>
              {t(lang, 'close')}
            </button>
          </div>
        </div>

        <div className="modal_body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            ref={list_ref}
            style={{
              maxHeight: 360,
              overflow: 'auto',
              padding: '6px 2px',
              border: '1px solid #2b2b2b',
              borderRadius: 8,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: '#cfcfcf', fontSize: 13 }}>{t(lang, 'start_chat')}</div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  style={{ margin: '8px 6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                    {m.role === 'user' ? t(lang, 'you') : t(lang, 'ai_label')}
                  </div>
                  <div style={{ fontSize: 14 }}>{m.content}</div>
                </div>
              ))
            )}
          </div>
          <textarea
            className="settings_input"
            style={{ height: 80 }}
            placeholder={t(lang, 'type_message_placeholder')}
            value={input}
            onChange={(e) => set_input(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handle_send()
              }
            }}
          />
        </div>
        <div className="modal_footer">
          {loading ? (
            <button className="settings_btn" onClick={handle_cancel}>
              {t(lang, 'cancel')}
            </button>
          ) : (
            <>
              <button className="settings_btn" onClick={handle_send}>
                {t(lang, 'send')}
              </button>
              <button
                className="settings_btn"
                onClick={() => {
                  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
                  if (lastAssistant && on_insert_to_editor)
                    on_insert_to_editor(lastAssistant.content || '')
                }}
              >
                {t(lang, 'insert_to_editor')}
              </button>
              <button
                className="settings_btn"
                onClick={async () => {
                  try {
                    const { save } = await import('@tauri-apps/plugin-dialog')
                    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
                    const target = await save({
                      filters: [{ name: 'JSON', extensions: ['json'] }],
                      defaultPath: 'chat_session.json',
                    })
                    if (!target) return
                    await writeTextFile(
                      target,
                      JSON.stringify(
                        {
                          provider: chat_provider,
                          model: chat_model,
                          base_url: chat_base_url,
                          messages,
                        },
                        null,
                        2
                      )
                    )
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {t(lang, 'export')}
              </button>
              <button className="settings_btn" onClick={() => set_messages([])}>
                {t(lang, 'clear')}
              </button>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="settings_btn" onClick={on_close}>
            {t(lang, 'close')}
          </button>
        </div>
      </div>
    </div>
  )
  return createPortal(contentNode, document.body)
}

const AiChatModal = memo(AiChatModalComponent)
export default AiChatModal
