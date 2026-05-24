import { supabase } from './supabase'

const BUCKET = 'gallery-media'

export async function uploadFile(file, albumId, onProgress) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  // Simpan langsung di root bucket dengan nama unik
  const ext = file.name.split('.').pop().toLowerCase()
  const uniqueName = `${user.id}_${albumId}_${Date.now()}.${ext}`

  onProgress?.(20)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(uniqueName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (error) throw new Error(`Upload gagal: ${error.message}`)

  onProgress?.(100)

  // Langsung buat public URL (tidak perlu signed URL)
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path)

  console.log('Upload sukses, path:', data.path)
  console.log('Public URL:', urlData.publicUrl)

  return {
    nodeId: data.path,
    fileName: file.name,
    fileSize: file.size,
    publicUrl: urlData.publicUrl,
  }
}

export async function getStreamUrl(filePath) {
  // Coba public URL dulu (lebih cepat, tidak butuh auth)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  if (data?.publicUrl) return data.publicUrl

  // Fallback signed URL
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600)

  if (error) throw new Error(`Gagal ambil URL: ${error.message}`)
  return signed.signedUrl
}

export async function getCachedStreamUrl(filePath) {
  const cacheKey = `url_${filePath}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    const { url, exp } = JSON.parse(cached)
    if (Date.now() < exp) return url
  }
  const url = await getStreamUrl(filePath)
  sessionStorage.setItem(cacheKey, JSON.stringify({ url, exp: Date.now() + 50 * 60 * 1000 }))
  return url
}

export async function deleteFile(filePath) {
  if (!filePath) return true
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) console.warn('Delete warning:', error.message)
  return true
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

export function isVideo(mimeType) { return mimeType?.startsWith('video/') }
export function isImage(mimeType) { return mimeType?.startsWith('image/') }
