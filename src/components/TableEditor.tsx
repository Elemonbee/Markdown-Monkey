import { memo, useState } from 'react'
import { parseMarkdownTable, tableToMarkdown } from '../utils/tableParser'

type TableEditorProps = {
  initialTableText: string
  onSave: (newTableText: string) => void
  onCancel: () => void
}

/**
 * TableEditor
 * 可视化表格编辑器
 * Visual table editor component
 */
function TableEditorComponent(props: TableEditorProps) {
  const { initialTableText, onSave, onCancel } = props

  const parsed = parseMarkdownTable(initialTableText)
  const [headers, setHeaders] = useState<string[]>(parsed.headers)
  const [rows, setRows] = useState<string[][]>(parsed.rows)
  const [alignments, setAlignments] = useState<('left' | 'center' | 'right')[]>(parsed.alignments)

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows]
    if (!newRows[rowIndex]) {
      newRows[rowIndex] = []
    }
    newRows[rowIndex][colIndex] = value
    setRows(newRows)
  }

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...headers]
    newHeaders[colIndex] = value
    setHeaders(newHeaders)
  }

  const addRow = () => {
    const newRow = new Array(headers.length).fill('')
    setRows([...rows, newRow])
  }

  const deleteRow = (rowIndex: number) => {
    setRows(rows.filter((_, i) => i !== rowIndex))
  }

  const addColumn = () => {
    setHeaders([...headers, 'New Column'])
    setAlignments([...alignments, 'left'])
    setRows(rows.map((row) => [...row, '']))
  }

  const deleteColumn = (colIndex: number) => {
    setHeaders(headers.filter((_, i) => i !== colIndex))
    setAlignments(alignments.filter((_, i) => i !== colIndex))
    setRows(rows.map((row) => row.filter((_, i) => i !== colIndex)))
  }

  const handleSave = () => {
    const newTableText = tableToMarkdown(headers, rows, alignments)
    onSave(newTableText)
  }

  return (
    <div className="modal_overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90%', width: 900 }}
      >
        <div className="modal_header">
          <div className="modal_title">表格编辑器 Table Editor</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="settings_btn btn-primary" onClick={handleSave}>
              保存 Save
            </button>
            <button className="settings_btn" onClick={onCancel}>
              取消 Cancel
            </button>
          </div>
        </div>
        <div className="modal_body" style={{ padding: 16, maxHeight: 600, overflow: 'auto' }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <button className="settings_btn" onClick={addRow}>
              + 添加行 Add Row
            </button>
            <button className="settings_btn" onClick={addColumn}>
              + 添加列 Add Column
            </button>
          </div>

          <div style={{ overflow: 'auto' }}>
            <table
              style={{
                borderCollapse: 'collapse',
                width: '100%',
                background: '#1a1a1a',
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: 40, background: '#222', border: '1px solid #444' }}>#</th>
                  {headers.map((header, colIndex) => (
                    <th
                      key={colIndex}
                      style={{
                        border: '1px solid #444',
                        padding: 8,
                        background: '#2a2a2a',
                        minWidth: 120,
                      }}
                    >
                      <input
                        style={{
                          width: '100%',
                          background: '#333',
                          border: '1px solid #555',
                          color: '#eee',
                          padding: 4,
                          borderRadius: 4,
                        }}
                        value={header}
                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)}
                      />
                      <button
                        className="settings_btn"
                        style={{ marginTop: 4, padding: '2px 6px', fontSize: 11 }}
                        onClick={() => deleteColumn(colIndex)}
                      >
                        🗑️ 删除列
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td
                      style={{
                        border: '1px solid #444',
                        padding: 8,
                        background: '#222',
                        textAlign: 'center',
                      }}
                    >
                      {rowIndex + 1}
                      <button
                        className="settings_btn"
                        style={{ marginTop: 4, padding: '2px 6px', fontSize: 11 }}
                        onClick={() => deleteRow(rowIndex)}
                      >
                        🗑️
                      </button>
                    </td>
                    {headers.map((_, colIndex) => (
                      <td key={colIndex} style={{ border: '1px solid #444', padding: 4 }}>
                        <input
                          style={{
                            width: '100%',
                            background: '#2a2a2a',
                            border: '1px solid #444',
                            color: '#ccc',
                            padding: 6,
                            borderRadius: 4,
                          }}
                          value={row[colIndex] || ''}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
            提示：支持 Excel 风格单元格编辑 Tip: Excel-style cell editing supported
          </div>
        </div>
      </div>
    </div>
  )
}

export const TableEditor = memo(TableEditorComponent)
