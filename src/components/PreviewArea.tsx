import { memo, forwardRef } from 'react'

interface PreviewAreaProps {
  rendered_html: string
  preview_font_size: number
  setPreviewRef: (el: HTMLDivElement | null) => void
}

const PreviewArea = forwardRef<HTMLDivElement, PreviewAreaProps>(
  ({ rendered_html, preview_font_size, setPreviewRef }, ref) => {
    return (
      <div className="pane pane-preview" style={{ fontSize: preview_font_size }} ref={ref}>
        <div
          ref={setPreviewRef}
          className="preview_html markdown_body"
          dangerouslySetInnerHTML={{ __html: rendered_html }}
        />
      </div>
    )
  }
)

export default memo(PreviewArea)
