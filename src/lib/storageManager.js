/**
 * Storage Manager - kelola multiple B2 buckets
 * Semua config tersimpan di Supabase DB (terenkripsi via RLS)
 */
import { supabase } from './supabase'

// ─── Ambil semua storage configs ─────────────────────────────
export async function getStorageConfigs() {
  const { data, error } = await supabase
    .from('storage_configs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Ambil config aktif ───────────────────────────────────────
export async function getActiveConfig() {
  const { data, error } = await supabase
    .from('storage_configs')
    .select('*')
    .eq('is_active', true)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

// ─── Tambah config baru ───────────────────────────────────────
export async function addStorageConfig({ name, endpoint, bucketName, region, keyId, appKey, totalGB, color, notes }) {
  // Test koneksi dulu sebelum simpan
  await testStorageConnection({ endpoint, bucketName, region, keyId, appKey })

  const { data, error } = await supabase
    .from('storage_configs')
    .insert({
      name,
      endpoint,
      bucket_name: bucketName,
      region,
      key_id: keyId,
      app_key: appKey,
      total_bytes: (totalGB || 10) * 1024 * 1024 * 1024,
      color: color || 'gold',
      notes,
      is_active: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Update config ────────────────────────────────────────────
export async function updateStorageConfig(id, updates) {
  const updateData = {}
  if (updates.name) updateData.name = updates.name
  if (updates.endpoint) updateData.endpoint = updates.endpoint
  if (updates.bucketName) updateData.bucket_name = updates.bucketName
  if (updates.region) updateData.region = updates.region
  if (updates.keyId) updateData.key_id = updates.keyId
  if (updates.appKey) updateData.app_key = updates.appKey
  if (updates.totalGB) updateData.total_bytes = updates.totalGB * 1024 * 1024 * 1024
  if (updates.color) updateData.color = updates.color
  if (updates.notes !== undefined) updateData.notes = updates.notes

  const { data, error } = await supabase
    .from('storage_configs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Set config sebagai aktif ─────────────────────────────────
export async function setActiveConfig(id) {
  // Trigger di DB akan auto-deactivate yang lain
  const { data, error } = await supabase
    .from('storage_configs')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // Update Edge Function secrets via API
  // (di production, ini perlu dipanggil dari server)
  return data
}

// ─── Hapus config ─────────────────────────────────────────────
export async function deleteStorageConfig(id) {
  // Cek apakah ada media yang pakai config ini
  const { count } = await supabase
    .from('media_items')
    .select('id', { count: 'exact', head: true })
    .eq('storage_config_id', id)

  if (count > 0) {
    throw new Error(`Storage ini masih digunakan oleh ${count} file. Ekspor file dulu sebelum menghapus.`)
  }

  const { error } = await supabase
    .from('storage_configs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Test koneksi B2 ──────────────────────────────────────────
export async function testStorageConnection({ endpoint, bucketName, region, keyId, appKey }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Tidak terautentikasi')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-presign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'test-connection',
        endpoint, bucketName, region, keyId, appKey,
      }),
    }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Koneksi gagal')
  return data
}

// ─── Ekspor file dari satu B2 ke B2 lain ─────────────────────
export async function exportToNewStorage(sourceConfigId, targetConfigId, onProgress) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Tidak terautentikasi')

  // Ambil semua file dari source
  const { data: mediaItems } = await supabase
    .from('media_items')
    .select('*')
    .eq('storage_config_id', sourceConfigId)

  if (!mediaItems?.length) {
    throw new Error('Tidak ada file di storage ini')
  }

  const total = mediaItems.length
  let done = 0
  const errors = []

  for (const item of mediaItems) {
    try {
      onProgress?.({ done, total, current: item.file_name })

      // Panggil Edge Function untuk copy file antar B2
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/b2-presign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'copy-between-storages',
            sourceConfigId,
            targetConfigId,
            key: item.mega_node_id,
          }),
        }
      )

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      // Update media_item dengan config baru dan key baru
      await supabase
        .from('media_items')
        .update({
          storage_config_id: targetConfigId,
          mega_node_id: result.newKey,
        })
        .eq('id', item.id)

      done++
      onProgress?.({ done, total, current: item.file_name })

    } catch (err) {
      errors.push({ file: item.file_name, error: err.message })
      done++
    }
  }

  return { success: done - errors.length, failed: errors.length, errors }
}

// ─── Format bytes ─────────────────────────────────────────────
export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
  return (bytes / 1073741824).toFixed(2) + ' GB'
}
