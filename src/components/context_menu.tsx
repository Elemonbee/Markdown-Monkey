import { createPortal } from 'react-dom'
import { useState } from 'react'

type Context_menu_item = {
  id: string
  label: string
  on_click?: () => void
  children?: Context_menu_item[]
}

type Context_menu_props = {
  is_open: boolean
  x: number
  y: number
  items: Context_menu_item[]
  on_close: () => void
}

/**
 * Context_menu
 * 自定义右键菜单（简易）
 */
export default function Context_menu(props: Context_menu_props) {
  const { is_open, x, y, items, on_close } = props
  const [submenu, set_submenu] = useState<{ x: number, y: number, items: Context_menu_item[] } | null>(null)
  if (!is_open) return null
  const content = (
    <div className="context_menu_overlay" onClick={() => { set_submenu(null); on_close(); }} onContextMenu={(e) => { e.preventDefault(); set_submenu(null); on_close(); }}>
      <div className="context_menu" style={{ left: x, top: y }}>
        {items.map((it) => (
          it.id.startsWith('sep') ? (
            <div key={it.id} className="context_sep" />
          ) : it.children && it.children.length > 0 ? (
            <div
              key={it.id}
              className="context_item"
              onMouseEnter={(e) => {
                set_submenu({ x: x + 180, y: e.clientY - 12, items: it.children! })
              }}
              onMouseLeave={() => { /* keep submenu open until overlay click */ }}
            >
              <span style={{ flex: 1 }}>{it.label}</span>
              <span>{'›'}</span>
            </div>
          ) : (
            <div key={it.id} className="context_item" onClick={() => { it.on_click && it.on_click(); on_close(); }}>
              {it.label}
            </div>
          )
        ))}
      </div>
      {submenu && (
        <div className="context_menu" style={{ left: submenu.x, top: submenu.y }}>
          {submenu.items.map((sit) => (
            sit.id.startsWith('sep') ? (
              <div key={sit.id} className="context_sep" />
            ) : (
              <div key={sit.id} className="context_item" onClick={() => { sit.on_click && sit.on_click(); set_submenu(null); on_close(); }}>
                {sit.label}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
  return createPortal(content, document.body)
}


