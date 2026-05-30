/**
 * Album Lock Utilities
 * PIN/Password di-hash di browser sebelum disimpan ke DB
 * Credentials asli tidak pernah tersimpan di server
 */

// ─── Hash PIN/password dengan SHA-256 ────────────────────────
export async function hashPin(pin) {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'ulax-gallery-salt-2026') // salt unik
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Verifikasi PIN ───────────────────────────────────────────
export async function verifyPin(pin, storedHash) {
  const hash = await hashPin(pin)
  return hash === storedHash
}

// ─── Simpan unlock state di sessionStorage ────────────────────
// Album yang sudah dibuka kuncinya tersimpan sementara di session
const UNLOCK_KEY = 'ulax_unlocked_albums'

export function isAlbumUnlocked(albumId) {
  try {
    const data = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || '{}')
    const entry = data[albumId]
    if (!entry) return false
    // Unlock berlaku 30 menit
    if (Date.now() > entry.exp) {
      revokeAlbumUnlock(albumId)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function grantAlbumUnlock(albumId) {
  try {
    const data = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || '{}')
    data[albumId] = { exp: Date.now() + 30 * 60 * 1000 } // 30 menit
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(data))
  } catch {}
}

export function revokeAlbumUnlock(albumId) {
  try {
    const data = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || '{}')
    delete data[albumId]
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(data))
  } catch {}
}

export function revokeAllUnlocks() {
  sessionStorage.removeItem(UNLOCK_KEY)
}
