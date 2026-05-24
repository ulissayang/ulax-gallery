/**
 * B2 Multi-Storage Manager
 * Support multiple B2 buckets - file lama tetap tampil dari B2 lama
 * File baru masuk ke B2 yang aktif
 */
import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-presign`

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Tidak terautentikasi')
  return session.access_token
}

async function callEdge(body) {
  const token = await getToken()
  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Edge error ${res.status}`)
  return data
}

// ─── Upload ke B2 aktif ───────────────────────────────────────
export async function uploadToB2(file, albumId, onProgress) {
  const token = await getToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('albumId', albumId)
  onProgress?.(5)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress?.(5 + Math.round((e.loaded / e.total) * 90))
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { onProgress?.(100); resolve(JSON.parse(xhr.responseText)) }
        catch { reject(new Error('Response tidak valid')) }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error || `Gagal: ${xhr.status}`)) }
        catch { reject(new Error(`Upload gagal: ${xhr.status}`)) }
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Koneksi gagal')))
    xhr.timeout = 15 * 60 * 1000
    xhr.addEventListener('timeout', () => reject(new Error('Upload timeout')))
    xhr.open('POST', EDGE_URL)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  })
}

// ─── Load image sebagai blob ──────────────────────────────────
// storageConfigId: ID config B2 tempat file disimpan
// Kalau null/undefined → pakai B2 aktif (backward compat)
export async function loadImageBlob(key, storageConfigId = null) {
  const token = await getToken()

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      action: 'proxy-download',
      key,
      storageConfigId, // null = pakai aktif, ada = pakai config spesifik
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Gagal load: ${res.status}`)
  }

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// ─── Get cached signed URL (persistent, tidak hilang saat refresh) ──
export async function getCachedStreamUrl(key, storageConfigId = null) {
  if (!key) throw new Error('Key tidak boleh kosong')

  const cacheKey = `b2_${storageConfigId || 'active'}_${btoa(encodeURIComponent(key)).slice(0, 24)}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) {
    try {
      const { url, exp } = JSON.parse(cached)
      // Masih valid (belum expired)
      if (Date.now() < exp) return url
    } catch {}
  }

  // Minta signed URL dari Edge Function (berlaku 1 jam)
  const { downloadUrl } = await callEdge({
    action: 'download',
    key,
    storageConfigId,
  })

  // Cache 50 menit (signed URL B2 berlaku 1 jam)
  sessionStorage.setItem(cacheKey, JSON.stringify({
    url: downloadUrl,
    exp: Date.now() + 50 * 60 * 1000,
  }))

  return downloadUrl
}

// ─── Delete file ──────────────────────────────────────────────
export async function deleteFromB2(key, storageConfigId = null) {
  if (!key) return true
  try {
    await callEdge({ action: 'delete', key, storageConfigId })
  } catch (e) {
    console.warn('Delete B2 warning:', e.message)
  }
  return true
}

// ─── Storage info (semua config) ─────────────────────────────
export async function checkStorageInfo() {
  return callEdge({ action: 'storage-info' })
}

// ─── Helpers ──────────────────────────────────────────────────
export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(2) + ' GB'
}

export function isVideo(mimeType) { return mimeType?.startsWith('video/') }
export function isImage(mimeType) { return mimeType?.startsWith('image/') }
export const uploadToMega = uploadToB2
export const deleteFromMega = deleteFromB2
