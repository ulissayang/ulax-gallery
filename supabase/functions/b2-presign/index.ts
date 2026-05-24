import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from 'https://esm.sh/@aws-sdk/client-s3@3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// ─── Buat S3 client ───────────────────────────────────────────
function makeS3(endpoint: string, region: string, keyId: string, appKey: string) {
  return new S3Client({
    endpoint: `https://${endpoint}`,
    region,
    credentials: { accessKeyId: keyId, secretAccessKey: appKey },
    forcePathStyle: true,
  })
}

// ─── Supabase admin client (pakai service role) ───────────────
function makeAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

// ─── Ambil storage config dari DB (pakai admin untuk baca app_key) ──
async function getConfig(adminClient: any, userId: string, configId: string | null) {
  if (configId && configId !== 'null') {
    const { data, error } = await adminClient
      .from('storage_configs')
      .select('*')
      .eq('id', configId)
      .eq('user_id', userId) // pastikan milik user ini
      .single()
    if (error || !data) throw new Error('Storage config tidak ditemukan')
    return data
  }

  // Ambil yang aktif
  const { data, error } = await adminClient
    .from('storage_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) throw new Error('Tidak ada storage aktif. Buka Pengaturan → Storage untuk setup.')
  return data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return respond({ error: 'Unauthorized' }, 401)

    // User client (untuk auth check)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return respond({ error: 'Unauthorized' }, 401)

    // Admin client untuk akses credentials B2 di DB
    const adminClient = makeAdminClient()
    const contentType = req.headers.get('content-type') ?? ''

    // ══════════════════════════════════════════════════════════
    // UPLOAD (multipart/form-data)
    // ══════════════════════════════════════════════════════════
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      const albumId = formData.get('albumId') as string
      const storageConfigId = formData.get('storageConfigId') as string || null

      if (!file) return respond({ error: 'File tidak ada' }, 400)
      if (!albumId) return respond({ error: 'albumId diperlukan' }, 400)

      const config = await getConfig(adminClient, user.id, storageConfigId)
      const s3 = makeS3(config.endpoint, config.region, config.key_id, config.app_key)

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const key = `${user.id}/${albumId}/${Date.now()}-${safeName}`

      console.log(`📤 Upload: ${file.name} (${(file.size/1024/1024).toFixed(2)}MB) → ${config.bucket_name}/${key}`)

      const bytes = new Uint8Array(await file.arrayBuffer())

      await s3.send(new PutObjectCommand({
        Bucket: config.bucket_name,
        Key: key,
        Body: bytes,
        ContentType: file.type,
        ContentLength: bytes.length,
      }))

      // Update used_bytes
      await adminClient
        .from('storage_configs')
        .update({ used_bytes: (config.used_bytes || 0) + file.size })
        .eq('id', config.id)

      console.log(`✅ Upload sukses: ${key}`)
      return respond({
        nodeId: key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageConfigId: config.id,
      })
    }

    // ══════════════════════════════════════════════════════════
    // JSON ACTIONS
    // ══════════════════════════════════════════════════════════
    const body = await req.json()
    const { action, key, storageConfigId } = body

    // ── Download (presigned URL) ──────────────────────────────
    if (action === 'download') {
      if (!key) return respond({ error: 'key diperlukan' }, 400)
      const config = await getConfig(adminClient, user.id, storageConfigId || null)
      const s3 = makeS3(config.endpoint, config.region, config.key_id, config.app_key)
      const downloadUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: config.bucket_name, Key: key }),
        { expiresIn: 3600 }
      )
      return respond({ downloadUrl })
    }

    // ── Proxy download (stream via edge function) ─────────────
    if (action === 'proxy-download') {
      if (!key) return respond({ error: 'key diperlukan' }, 400)
      const config = await getConfig(adminClient, user.id, storageConfigId || null)
      const s3 = makeS3(config.endpoint, config.region, config.key_id, config.app_key)
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: config.bucket_name, Key: key }),
        { expiresIn: 300 }
      )
      const b2Res = await fetch(signedUrl)
      if (!b2Res.ok) return respond({ error: `B2 error: ${b2Res.status}` }, b2Res.status)
      return new Response(b2Res.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': b2Res.headers.get('Content-Type') || 'application/octet-stream',
          'Content-Length': b2Res.headers.get('Content-Length') || '',
          'Cache-Control': 'private, max-age=3600',
        }
      })
    }

    // ── Delete ────────────────────────────────────────────────
    if (action === 'delete') {
      if (!key) return respond({ success: true })
      const config = await getConfig(adminClient, user.id, storageConfigId || null)
      const s3 = makeS3(config.endpoint, config.region, config.key_id, config.app_key)
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: config.bucket_name, Key: key }))
        // Update used_bytes
        await adminClient
          .from('storage_configs')
          .update({ used_bytes: Math.max(0, (config.used_bytes || 0) - 1) })
          .eq('id', config.id)
      } catch (e: any) { console.warn('Delete warning:', e.message) }
      return respond({ success: true })
    }

    // ── Test connection ───────────────────────────────────────
    if (action === 'test-connection') {
      const { endpoint, bucketName, region, keyId, appKey } = body
      if (!endpoint || !bucketName || !region || !keyId || !appKey) {
        return respond({ error: 'Semua field diperlukan untuk test koneksi' }, 400)
      }
      const s3 = makeS3(endpoint, region, keyId, appKey)
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }))
        return respond({ ok: true, message: 'Koneksi berhasil! Bucket dapat diakses.' })
      } catch (err: any) {
        return respond({ error: `Koneksi gagal: ${err.message}` }, 400)
      }
    }

    // ── Copy between storages ─────────────────────────────────
    if (action === 'copy-between-storages') {
      const { sourceConfigId, targetConfigId, key: srcKey } = body
      const src = await getConfig(adminClient, user.id, sourceConfigId)
      const tgt = await getConfig(adminClient, user.id, targetConfigId)
      const srcS3 = makeS3(src.endpoint, src.region, src.key_id, src.app_key)
      const tgtS3 = makeS3(tgt.endpoint, tgt.region, tgt.key_id, tgt.app_key)

      // Download dari source
      const url = await getSignedUrl(srcS3, new GetObjectCommand({ Bucket: src.bucket_name, Key: srcKey }), { expiresIn: 300 })
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Download source gagal: ${res.status}`)
      const bytes = new Uint8Array(await res.arrayBuffer())
      const ct = res.headers.get('Content-Type') || 'application/octet-stream'

      // Upload ke target
      await tgtS3.send(new PutObjectCommand({
        Bucket: tgt.bucket_name, Key: srcKey,
        Body: bytes, ContentType: ct, ContentLength: bytes.length,
      }))

      // Update used_bytes target
      await adminClient
        .from('storage_configs')
        .update({ used_bytes: (tgt.used_bytes || 0) + bytes.length })
        .eq('id', targetConfigId)

      return respond({ success: true, newKey: srcKey })
    }

    // ── Storage info ──────────────────────────────────────────
    if (action === 'storage-info') {
      // Ambil semua storage configs user
      const { data: configs } = await adminClient
        .from('storage_configs')
        .select('id, name, total_bytes, is_active, color')
        .eq('user_id', user.id)

      // Hitung used_bytes AKURAT langsung dari media_items
      // Termasuk file lama yang storage_config_id = null (pakai config aktif)
      const { data: usageData } = await adminClient
        .from('media_items')
        .select('storage_config_id, file_size')

      const fmt = (b: number) => {
        if (!b || b < 0) return '0 B'
        if (b < 1024) return b + ' B'
        if (b < 1048576) return (b/1024).toFixed(1) + ' KB'
        if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB'
        return (b/1073741824).toFixed(2) + ' GB'
      }

      // Hitung total keseluruhan
      const totalUsedBytes = (usageData || []).reduce((s: number, i: any) => s + (i.file_size || 0), 0)
      const totalBytes = (configs || []).reduce((s: number, c: any) => s + (c.total_bytes || 0), 0)
        || 10 * 1024 * 1024 * 1024 // fallback 10GB kalau belum ada config

      // Hitung per storage config
      const perStorage = (configs || []).map((cfg: any) => {
        const cfgUsed = (usageData || [])
          .filter((i: any) => i.storage_config_id === cfg.id)
          .reduce((s: number, i: any) => s + (i.file_size || 0), 0)
        const cfgPct = parseFloat(((cfgUsed / Math.max(cfg.total_bytes, 1)) * 100).toFixed(1))
        return {
          id: cfg.id,
          name: cfg.name,
          color: cfg.color,
          isActive: cfg.is_active,
          used: cfgUsed,
          total: cfg.total_bytes,
          usedPercent: cfgPct,
          usedFormatted: fmt(cfgUsed),
          totalFormatted: fmt(cfg.total_bytes),
          availableFormatted: fmt(cfg.total_bytes - cfgUsed),
        }
      })

      // Update used_bytes di DB supaya akurat (background sync)
      for (const s of perStorage) {
        await adminClient
          .from('storage_configs')
          .update({ used_bytes: s.used })
          .eq('id', s.id)
      }

      return respond({
        used: totalUsedBytes,
        total: totalBytes,
        usedPercent: parseFloat(((totalUsedBytes / Math.max(totalBytes, 1)) * 100).toFixed(1)),
        usedFormatted: fmt(totalUsedBytes),
        totalFormatted: fmt(totalBytes),
        availableFormatted: fmt(totalBytes - totalUsedBytes),
        perStorage, // detail per storage config
      })
    }

    return respond({ error: `Action tidak dikenal: ${action}` }, 400)

  } catch (err: any) {
    console.error('[b2-presign] ERROR:', err.message)
    return respond({ error: err.message }, 500)
  }
})
