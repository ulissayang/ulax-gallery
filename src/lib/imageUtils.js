/**
 * Image utilities: compress, EXIF, thumbnail
 */

// Compress gambar sebelum upload
// maxWidth: lebar maks pixel, quality: 0-1
export async function compressImage(file, maxWidth = 2560, quality = 0.85) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  // Kalau maxWidth null = tidak resize, tapi tetap kompres quality
  if (!maxWidth && quality >= 1) return file // tidak perlu compress

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (maxWidth && width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size > file.size) { resolve(file); return }
          const compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() })
          resolve(compressed)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

// Ambil dimensi gambar
export function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// Format duration video
export function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Cek apakah format didukung
export const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
export const ACCEPTED_VIDEOS = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/avi']
export const ACCEPTED_ALL = [...ACCEPTED_IMAGES, ...ACCEPTED_VIDEOS]
