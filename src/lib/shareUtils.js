import { supabase } from './supabase'

// Buat share link
export async function createShareLink(albumId, expiresInHours = 24) {
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
    : null

  const { data, error } = await supabase
    .from('share_links')
    .insert({ album_id: albumId, expires_at: expiresAt })
    .select()
    .single()

  if (error) throw error
  return data
}

// Ambil share links album
export async function getShareLinks(albumId) {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('album_id', albumId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Hapus share link
export async function deleteShareLink(id) {
  const { error } = await supabase
    .from('share_links')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// Build share URL
export function buildShareUrl(token) {
  return `${window.location.origin}/share/${token}`
}

// Format expiry
export function formatExpiry(expiresAt) {
  if (!expiresAt) return 'Tidak ada batas waktu'
  const diff = new Date(expiresAt) - Date.now()
  if (diff <= 0) return 'Kedaluwarsa'
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} hari lagi`
  return `${hours} jam lagi`
}
