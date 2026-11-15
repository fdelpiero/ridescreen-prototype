import { IMAGE_JPEG_QUALITY, IMAGE_MAX_DIMENSION } from '../config'

const IMAGE_FALLBACK_MAX_BYTES = 1024 * 1024

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Photos straight off a tablet camera are several megabytes. Shrink them to a
 * JPEG no larger than IMAGE_MAX_DIMENSION on the long side before storing.
 * A file the browser cannot decode is kept as it is only when it is small.
 */
export async function imageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file')
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY)
  } catch {
    // Small files the browser cannot resize (some SVGs) are kept as they are.
    if (file.size > IMAGE_FALLBACK_MAX_BYTES) {
      throw new Error('This browser could not open that image. Try a JPG or PNG instead')
    }
    return readAsDataUrl(file)
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  csv: 'text/csv',
}

/**
 * Browsers disagree on the type of a CSV (Windows reports a spreadsheet type,
 * some report nothing), so the file extension decides when it is one we know.
 */
export function reportFileType(name: string, browserType: string): string {
  const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''
  return TYPE_BY_EXTENSION[extension] ?? browserType
}
