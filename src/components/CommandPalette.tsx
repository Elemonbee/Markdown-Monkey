import { memo, useState, useEffect, useRef } from 'react'

interface Command {
  id: string
  label: string
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  is_open: boolean
  commands: Command[]
  ui_language: string
  on_close: () => void
}

function CommandPaletteComponent({
  is_open,
  commands,
  ui_language,
  on_close,
}: CommandPaletteProps) {
  const [search_query, set_search_query] = useState('')
  const [selected_index, set_selected_index] = useState(0)
  const input_ref = useRef<HTMLInputElement>(null)

  const filtered_commands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search_query.toLowerCase())
  )

  useEffect(() => {
    if (is_open) {
      set_search_query('')
      set_selected_index(0)
      setTimeout(() => input_ref.current?.focus(), 100)
    }
  }, [is_open])

  useEffect(() => {
    if (!is_open) return

    const handle_keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        on_close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        set_selected_index((i) => Math.min(i + 1, filtered_commands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        set_selected_index((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered_commands[selected_index]) {
          filtered_commands[selected_index].action()
          on_close()
        }
      }
    }

    window.addEventListener('keydown', handle_keydown)
    return () => window.removeEventListener('keydown', handle_keydown)
  }, [is_open, selected_index, filtered_commands, on_close])

  if (!is_open) return null

  return (
    <div className="modal_overlay" onClick={on_close}>
      <div className="command_palette" onClick={(e) => e.stopPropagation()}>
        <div className="command_palette_header">
          <input
            ref={input_ref}
            type="text"
            className="command_palette_input"
            placeholder={ui_language === 'en-US' ? 'Type a command...' : '输入命令...'}
            value={search_query}
            onChange={(e) => {
              set_search_query(e.target.value)
              set_selected_index(0)
            }}
          />
        </div>
        <div className="command_palette_list">
          {filtered_commands.length === 0 ? (
            <div className="command_palette_empty">
              {ui_language === 'en-US' ? 'No commands found' : '没有找到命令'}
            </div>
          ) : (
            filtered_commands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command_palette_item ${index === selected_index ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action()
                  on_close()
                }}
                onMouseEnter={() => set_selected_index(index)}
              >
                <span className="command_palette_label">{cmd.label}</span>
                {cmd.shortcut && <span className="command_palette_shortcut">{cmd.shortcut}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const CommandPalette = memo(CommandPaletteComponent)
export default CommandPalette
