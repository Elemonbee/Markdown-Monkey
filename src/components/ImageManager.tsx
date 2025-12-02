import { memo, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import imageCompression from 'browser-image-compression'

type ImageInfo = {
  url: string
  alt: string
  line: number
  isLocal: boolean
}

type ImageManagerProps = {
  images: ImageInfo[]
  onImageClick: (image: ImageInfo) => void
  getAbsolutePath: (path: string) => string
  onClose: () => void
}

/**
 * ImageManager
 * 图片管理器组件：显示文档中的所有图片
 * Image manager component: displays all images in the document
 */
function ImageManagerComponent(props: ImageManagerProps) {
  const { images, onImageClick, getAbsolutePath, onClose } = props
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [compressProgress, setCompressProgress] = useState(0)
  const [compressQuality, setCompressQuality] = useState<'low' | 'medium' | 'high'>('medium')

  const qualitySettings = {
    low: { maxSizeMB: 0.5, maxWidthOrHeight: 1024 },
    medium: { maxSizeMB: 1, maxWidthOrHeight: 1920 },
    high: { maxSizeMB: 2, maxWidthOrHeight: 2560 },
  }

  const handleCompressImage = async (img: ImageInfo) => {
    if (!img.isLocal) {
      alert('只能压缩本地图片 / Can only compress local images')
      return
    }

    setSelectedImage(img)
    setCompressing(true)
    setCompressProgress(0)

    try {
      const absolutePath = getAbsolutePath(img.url)

      // 读取原始文件
      const response = await fetch(convertFileSrc(absolutePath))
      const blob = await response.blob()
      const file = new File([blob], img.url.split('/').pop() || 'image.jpg', {
        type: blob.type,
      })

      const originalSize = file.size / 1024 / 1024 // MB

      // 压缩选项
      const options = {
        ...qualitySettings[compressQuality],
        useWebWorker: true,
        onProgress: (progress: number) => {
          setCompressProgress(progress)
        },
      }

      // 执行压缩
      const compressedFile = await imageCompression(file, options)
      const compressedSize = compressedFile.size / 1024 / 1024 // MB
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1)

      // 保存压缩后的文件
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const buffer = await compressedFile.arrayBuffer()
      await writeFile(absolutePath, new Uint8Array(buffer))

      alert(
        `压缩成功！\nCompressed successfully!\n\n` +
          `原始大小 Original: ${originalSize.toFixed(2)}MB\n` +
          `压缩后 Compressed: ${compressedSize.toFixed(2)}MB\n` +
          `节省 Saved: ${ratio}%`
      )
    } catch (error) {
      console.error('Compression failed:', error)
      alert('压缩失败 / Compression failed: ' + (error as Error).message)
    } finally {
      setCompressing(false)
      setSelectedImage(null)
      setCompressProgress(0)
    }
  }

  if (images.length === 0) {
    return (
      <div className="modal_overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal_header">
            <div className="modal_title">图片管理器 Image Manager</div>
            <button className="settings_btn" onClick={onClose}>
              关闭 Close
            </button>
          </div>
          <div className="modal_body">
            <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
              当前文档中没有图片 No images in current document
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal_overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, width: '95%' }}
      >
        <div className="modal_header">
          <div className="modal_title">🖼️ 图片管理器 Image Manager ({images.length})</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="settings_btn"
              value={compressQuality}
              onChange={(e) => setCompressQuality(e.target.value as any)}
              title="压缩质量 Compression Quality"
              disabled={compressing}
            >
              <option value="low">低质量 Low (0.5MB)</option>
              <option value="medium">中质量 Medium (1MB)</option>
              <option value="high">高质量 High (2MB)</option>
            </select>
            <button className="settings_btn" onClick={onClose}>
              关闭 Close
            </button>
          </div>
        </div>

        {compressing && selectedImage && (
          <div
            style={{
              padding: 16,
              background: 'rgba(106, 160, 255, 0.1)',
              border: '1px solid #6aa0ff',
              margin: '8px 16px',
              borderRadius: 6,
            }}
          >
            <div style={{ marginBottom: 8, color: '#6aa0ff' }}>
              🔄 正在压缩 Compressing: {selectedImage.alt}
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                background: '#333',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${compressProgress}%`,
                  height: '100%',
                  background: '#6aa0ff',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#888' }}>{compressProgress}%</div>
          </div>
        )}

        <div className="modal_body" style={{ maxHeight: 600, overflow: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
              padding: 8,
            }}
          >
            {images.map((img, index) => {
              const absolutePath = img.isLocal ? getAbsolutePath(img.url) : img.url
              const displaySrc = img.isLocal ? convertFileSrc(absolutePath) : img.url

              return (
                <div
                  key={index}
                  style={{
                    border: '1px solid #333',
                    borderRadius: 8,
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: 150,
                      background: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                    onClick={() => onImageClick(img)}
                  >
                    <img
                      src={displaySrc}
                      alt={img.alt}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement!.innerHTML = '❌ 加载失败'
                      }}
                    />
                  </div>
                  <div style={{ padding: 8, fontSize: 12 }}>
                    <div
                      style={{
                        color: '#ccc',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={img.alt}
                    >
                      {img.alt || 'Untitled'}
                    </div>
                    <div style={{ color: '#666', fontSize: 11, marginBottom: 6 }}>
                      Line {img.line} · {img.isLocal ? '📁 Local' : '🌐 Remote'}
                    </div>
                    {img.isLocal && (
                      <button
                        className="settings_btn"
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          fontSize: 11,
                          background: '#0969da',
                          color: '#fff',
                        }}
                        onClick={() => handleCompressImage(img)}
                        disabled={compressing}
                      >
                        🗜️ 压缩 Compress
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export const ImageManager = memo(ImageManagerComponent)
