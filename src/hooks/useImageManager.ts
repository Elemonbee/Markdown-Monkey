import { useState, useCallback, useMemo } from 'react'

type ImageInfo = {
  url: string
  alt: string
  line: number
  isLocal: boolean
}

/**
 * useImageManager
 * 从 Markdown 文本中提取图片信息
 * Extract image information from Markdown text
 */
export function useImageManager(markdownText: string, currentFilePath: string) {
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null)

  // 提取所有图片 / Extract all images
  const images = useMemo(() => {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const lines = markdownText.split('\n')
    const foundImages: ImageInfo[] = []

    lines.forEach((line, index) => {
      let match
      while ((match = imageRegex.exec(line)) !== null) {
        const alt = match[1] || 'Untitled'
        const url = match[2]
        const isLocal = !url.startsWith('http://') && !url.startsWith('https://')

        foundImages.push({
          url,
          alt,
          line: index + 1,
          isLocal,
        })
      }
    })

    return foundImages
  }, [markdownText])

  // 获取图片绝对路径 / Get absolute image path
  const getAbsolutePath = useCallback(
    (relativePath: string): string => {
      if (!currentFilePath || relativePath.startsWith('http')) {
        return relativePath
      }

      // 计算相对于当前文件的绝对路径
      const dirPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
      return `${dirPath}/${relativePath}`.replace(/\/+/g, '/')
    },
    [currentFilePath]
  )

  return {
    images,
    selectedImage,
    setSelectedImage,
    getAbsolutePath,
    imageCount: images.length,
  }
}
