/**
 * 日期格式化工具函数 / Date formatting utility functions
 */

/**
 * 将数字补零到两位 / Pad number to two digits
 */
export function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * 获取 ISO 格式的日期字符串 (YYYY-MM-DD) / Get ISO format date string (YYYY-MM-DD)
 */
export function getISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`
}

/**
 * 获取 ISO 格式的日期时间字符串 (YYYY-MM-DD HH:mm:ss) / Get ISO format date-time string (YYYY-MM-DD HH:mm:ss)
 */
export function getISODateTime(date: Date = new Date()): string {
  return `${getISODate(date)} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`
}

/**
 * 获取本地格式的日期时间字符串 / Get locally formatted date-time string
 */
export function getLocalDateTime(date: Date = new Date()): string {
  return date.toLocaleString()
}

/**
 * 格式化相对时间（如 "刚刚"、"5分钟前"） / Format relative time (e.g., "just now", "5 minutes ago")
 */
export function getRelativeTime(date: Date, locale: string = 'zh-CN'): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  const isEnglish = locale === 'en-US'

  if (seconds < 60) {
    return isEnglish ? 'just now' : '刚刚'
  }
  if (minutes < 60) {
    return isEnglish ? `${minutes} min ago` : `${minutes}分钟前`
  }
  if (hours < 24) {
    return isEnglish ? `${hours} hour${hours > 1 ? 's' : ''} ago` : `${hours}小时前`
  }
  if (days < 7) {
    return isEnglish ? `${days} day${days > 1 ? 's' : ''} ago` : `${days}天前`
  }

  return date.toLocaleDateString(locale)
}
