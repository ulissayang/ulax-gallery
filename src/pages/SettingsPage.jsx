import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Lock, Eye, EyeOff, User, Shield, Database, Palette,
  Check, Plus, Trash2, Edit2, RefreshCw, HardDrive, Zap, Copy,
  AlertTriangle, CheckCircle, Loader, ChevronRight, Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { showConfirm } from '../components/Alert'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import {
  getStorageConfigs, addStorageConfig, updateStorageConfig,
  setActiveConfig, deleteStorageConfig, testStorageConnection,
  exportToNewStorage, formatBytes
} from '../lib/storageManager'

const COVER_COLORS = [
  { id: 'gold', label: 'Emas', from: '#d4a017', to: '#7c5632' },
  { id: 'rose', label: 'Rose', from: '#be185d', to: '#7c3aed' },
  { id: 'teal', label: 'Teal', from: '#0d9488', to: '#0c4a6e' },
  { id: 'slate', label: 'Slate', from: '#475569', to: '#0f172a' },
  { id: 'amber', label: 'Amber', from: '#d97706', to: '#92400e' },
  { id: 'violet', label: 'Violet', from: '#7c3aed', to: '#1e1b4b' },
]

const STORAGE_COLORS = [
  { id: 'gold', from: '#d4a017', to: '#7c5632' },
  { id: 'blue', from: '#2563eb', to: '#1e3a8a' },
  { id: 'green', from: '#16a34a', to: '#14532d' },
  { id: 'rose', from: '#be185d', to: '#7c3aed' },
  { id: 'orange', from: '#ea580c', to: '#7c2d12' },
  { id: 'teal', from: '#0d9488', to: '#134e4a' },
]

// ─── Storage Config Card ──────────────────────────────────────
function StorageCard({ config, onSetActive, onEdit, onDelete, onExport }) {
  const usedPct = Math.min(((config.used_bytes || 0) / config.total_bytes) * 100, 100).toFixed(1)
  const color = STORAGE_COLORS.find(c => c.id === config.color) || STORAGE_COLORS[0]

  return (
    <div className="card-glass rounded-2xl overflow-hidden" style={{ border: `1px solid ${config.is_active ? 'rgba(212,160,23,0.4)' : 'rgba(255,255,255,0.06)'}` }}>
      {/* Header gradient */}
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${color.from}, ${color.to})` }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color.from}30, ${color.to}30)`, border: `1px solid ${color.from}40` }}>
              <HardDrive size={18} style={{ color: color.from }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-body font-medium" style={{ color: '#e8ddd3' }}>{config.name}</p>
                {config.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-body font-medium" style={{ background: 'rgba(212,160,23,0.2)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.3)' }}>
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs font-mono mt-0.5" style={{ color: '#9e7452' }}>{config.bucket_name}</p>
            </div>
          </div>

          <div className="flex gap-1">
            <button onClick={() => onEdit(config)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#9e7452' }}>
              <Edit2 size={14} />
            </button>
            <button onClick={() => onExport(config)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: '#9e7452' }} title="Ekspor ke storage lain">
              <Copy size={14} />
            </button>
            {!config.is_active && (
              <button onClick={() => onDelete(config)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Storage bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs font-mono mb-1.5" style={{ color: '#9e7452' }}>
            <span>{formatBytes(config.used_bytes || 0)} terpakai</span>
            <span>{formatBytes(config.total_bytes)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usedPct}%`,
                background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
              }}
            />
          </div>
          <p className="text-xs font-mono mt-1" style={{ color: '#5e3f24' }}>{usedPct}% terpakai</p>
        </div>

        {/* Info */}
        <div className="text-xs font-body space-y-1 mb-4" style={{ color: '#7c5632' }}>
          <p>🌐 {config.endpoint}</p>
          <p>📍 Region: {config.region}</p>
          {config.notes && <p>📝 {config.notes}</p>}
        </div>

        {/* Action */}
        {!config.is_active && (
          <button
            onClick={() => onSetActive(config)}
            className="w-full py-2 rounded-lg text-sm font-body font-medium transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})`, color: 'white' }}
          >
            <Zap size={13} className="inline mr-1.5" />
            Jadikan Aktif
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Add/Edit Storage Modal ───────────────────────────────────
function StorageModal({ isOpen, onClose, onSave, editConfig = null }) {
  const [form, setForm] = useState({ name: '', endpoint: 's3.us-east-005.backblazeb2.com', bucketName: '', region: 'us-east-005', keyId: '', appKey: '', totalGB: 10, color: 'gold', notes: '' })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editConfig) {
      setForm({
        name: editConfig.name || '',
        endpoint: editConfig.endpoint || '',
        bucketName: editConfig.bucket_name || '',
        region: editConfig.region || 'us-east-005',
        keyId: editConfig.key_id || '',
        appKey: '',  // Jangan tampilkan app key lama
        totalGB: Math.round((editConfig.total_bytes || 10737418240) / 1073741824),
        color: editConfig.color || 'gold',
        notes: editConfig.notes || '',
      })
    } else {
      setForm({ name: '', endpoint: 's3.us-east-005.backblazeb2.com', bucketName: '', region: 'us-east-005', keyId: '', appKey: '', totalGB: 10, color: 'gold', notes: '' })
    }
    setTestResult(null)
  }, [editConfig, isOpen])

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await testStorageConnection({ endpoint: form.endpoint, bucketName: form.bucketName, region: form.region, keyId: form.keyId, appKey: form.appKey })
      setTestResult({ ok: true, msg: 'Koneksi berhasil! Storage siap digunakan.' })
    } catch (err) {
      setTestResult({ ok: false, msg: err.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.endpoint || !form.bucketName || !form.keyId) {
      toast.error('Isi semua field yang wajib')
      return
    }
    if (!editConfig && !form.appKey) {
      toast.error('Application Key wajib diisi untuk storage baru')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={onClose} />
      <div className="relative w-full max-w-lg card-glass rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
        {/* Header warna */}
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${STORAGE_COLORS.find(c=>c.id===form.color)?.from || '#d4a017'}, ${STORAGE_COLORS.find(c=>c.id===form.color)?.to || '#7c5632'})` }} />

        <div className="p-6">
          <h2 className="font-display text-xl italic mb-5" style={{ color: '#faf4e8' }}>
            {editConfig ? 'Edit Storage' : 'Tambah Storage Baru'}
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Nama */}
            <div>
              <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Nama Storage *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mis. B2 Utama, B2 Backup 2024" className="input-field" required />
            </div>

            {/* Endpoint */}
            <div>
              <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Endpoint *</label>
              <input value={form.endpoint} onChange={e => set('endpoint', e.target.value)} placeholder="s3.us-east-005.backblazeb2.com" className="input-field" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Bucket name */}
              <div>
                <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Bucket Name *</label>
                <input value={form.bucketName} onChange={e => set('bucketName', e.target.value)} placeholder="ulax-gallery" className="input-field" required />
              </div>
              {/* Region */}
              <div>
                <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Region *</label>
                <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="us-east-005" className="input-field" required />
              </div>
            </div>

            {/* Key ID */}
            <div>
              <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Key ID *</label>
              <input value={form.keyId} onChange={e => set('keyId', e.target.value)} placeholder="00561a8186f32f..." className="input-field font-mono text-sm" required />
            </div>

            {/* App Key */}
            <div>
              <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>
                Application Key {editConfig ? '(kosongkan jika tidak diubah)' : '*'}
              </label>
              <input value={form.appKey} onChange={e => set('appKey', e.target.value)} type="password" placeholder={editConfig ? '••••••••' : 'K005...'} className="input-field font-mono text-sm" required={!editConfig} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Total GB */}
              <div>
                <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Kapasitas (GB)</label>
                <input type="number" value={form.totalGB} onChange={e => set('totalGB', parseInt(e.target.value))} min={1} max={10000} className="input-field" />
              </div>
              {/* Warna */}
              <div>
                <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Warna</label>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {STORAGE_COLORS.map(c => (
                    <button key={c.id} type="button" onClick={() => set('color', c.id)} className="w-7 h-7 rounded-lg transition-all" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, transform: form.color === c.id ? 'scale(1.2)' : 'scale(1)', boxShadow: form.color === c.id ? `0 0 0 2px #0d0905, 0 0 0 3px ${c.from}` : 'none' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Catatan (opsional)</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Mis. Untuk foto 2024, Backup khusus video..." className="input-field" />
            </div>

            {/* Test result */}
            {testResult && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-body" style={{ background: testResult.ok ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.ok ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`, color: testResult.ok ? '#4ade80' : '#fca5a5' }}>
                {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {testResult.msg}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">Batal</button>
              <button type="button" onClick={handleTest} disabled={testing || !form.keyId || !form.appKey} className="flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all" style={{ background: 'rgba(255,255,255,0.06)', color: '#b8987d', border: '1px solid rgba(255,255,255,0.1)', opacity: (!form.keyId || !form.appKey) ? 0.5 : 1 }}>
                {testing ? <><Loader size={14} className="inline animate-spin mr-1" />Testing...</> : 'Test Koneksi'}
              </button>
              <button type="submit" disabled={saving} className="btn-gold flex-1" style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Menyimpan...' : editConfig ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Export Modal ─────────────────────────────────────────────
function ExportModal({ isOpen, sourceConfig, configs, onClose, onExport }) {
  const [targetId, setTargetId] = useState('')
  const [progress, setProgress] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState(null)

  const targets = configs.filter(c => c.id !== sourceConfig?.id)

  const handleExport = async () => {
    if (!targetId) { toast.error('Pilih storage tujuan dulu'); return }
    setExporting(true)
    setProgress({ done: 0, total: 0, current: '' })
    try {
      const res = await exportToNewStorage(sourceConfig.id, targetId, setProgress)
      setResult(res)
      if (res.failed === 0) toast.success(`Semua ${res.success} file berhasil diekspor!`)
      else toast.error(`${res.failed} file gagal diekspor`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  if (!isOpen || !sourceConfig) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} onClick={!exporting ? onClose : undefined} />
      <div className="relative w-full max-w-md card-glass rounded-2xl p-6 shadow-2xl" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
        <h2 className="font-display text-xl italic mb-2" style={{ color: '#faf4e8' }}>Ekspor File</h2>
        <p className="text-sm font-body mb-5" style={{ color: '#9e7452' }}>
          Pindahkan semua file dari <strong style={{ color: '#d4a017' }}>{sourceConfig.name}</strong> ke storage lain
        </p>

        {result ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <p className="font-body font-medium" style={{ color: '#4ade80' }}>✅ Ekspor selesai!</p>
              <p className="text-sm mt-1" style={{ color: '#9e7452' }}>{result.success} file berhasil, {result.failed} gagal</p>
            </div>
            {result.errors?.length > 0 && (
              <div className="text-xs font-body space-y-1 max-h-32 overflow-y-auto" style={{ color: '#ef4444' }}>
                {result.errors.map((e, i) => <p key={i}>• {e.file}: {e.error}</p>)}
              </div>
            )}
            <button onClick={onClose} className="btn-gold w-full">Selesai</button>
          </div>
        ) : (
          <>
            {targets.length === 0 ? (
              <div className="text-center py-6">
                <p className="font-body" style={{ color: '#9e7452' }}>Tidak ada storage lain. Tambah storage baru dulu.</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                <label className="block text-xs font-body uppercase tracking-widest mb-2" style={{ color: '#9e7452' }}>Pilih Storage Tujuan</label>
                {targets.map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => setTargetId(cfg.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: targetId === cfg.id ? 'rgba(212,160,23,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${targetId === cfg.id ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <HardDrive size={16} style={{ color: targetId === cfg.id ? '#d4a017' : '#9e7452' }} />
                    <div>
                      <p className="text-sm font-body font-medium" style={{ color: '#e8ddd3' }}>{cfg.name}</p>
                      <p className="text-xs font-mono" style={{ color: '#9e7452' }}>{cfg.bucket_name} • {formatBytes(cfg.total_bytes - (cfg.used_bytes || 0))} tersisa</p>
                    </div>
                    {targetId === cfg.id && <Check size={16} className="ml-auto" style={{ color: '#d4a017' }} />}
                  </button>
                ))}
              </div>
            )}

            {/* Progress */}
            {progress && progress.total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs font-mono mb-1" style={{ color: '#9e7452' }}>
                  <span>{progress.current}</span>
                  <span>{progress.done}/{progress.total}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress.total ? (progress.done/progress.total*100) : 0}%`, background: 'linear-gradient(90deg, #d4a017, #e8b84b)' }} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} disabled={exporting} className="btn-ghost flex-1">Batal</button>
              <button onClick={handleExport} disabled={!targetId || exporting || targets.length === 0} className="btn-gold flex-1" style={{ opacity: (!targetId || exporting) ? 0.6 : 1 }}>
                {exporting ? <><Loader size={14} className="inline animate-spin mr-1.5" />Mengekspor...</> : 'Mulai Ekspor'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────
export default function SettingsPage() {
  const { user, updatePassword, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('storage')

  // Password
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  // Storage
  const [storageConfigs, setStorageConfigs] = useState([])
  const [storageLoading, setStorageLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState(null)
  const [exportSource, setExportSource] = useState(null)

  useEffect(() => {
    loadStorageConfigs()
  }, [])

  const loadStorageConfigs = async () => {
    setStorageLoading(true)
    try {
      const configs = await getStorageConfigs()
      setStorageConfigs(configs)
    } catch (err) {
      toast.error('Gagal memuat storage configs')
    } finally {
      setStorageLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPass !== confirmPass) { toast.error('Password tidak cocok'); return }
    if (newPass.length < 8) { toast.error('Min. 8 karakter'); return }
    setPassLoading(true)
    try {
      await updatePassword(newPass)
      toast.success('Password berhasil diubah!')
      setNewPass(''); setConfirmPass('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPassLoading(false)
    }
  }

  const handleAddStorage = async (form) => {
    if (editingConfig) {
      await updateStorageConfig(editingConfig.id, form)
      toast.success('Storage diperbarui!')
    } else {
      await addStorageConfig(form)
      toast.success('Storage baru ditambahkan!')
    }
    await loadStorageConfigs()
    setEditingConfig(null)
  }

  const handleSetActive = async (config) => {
    try {
      await setActiveConfig(config.id)
      toast.success(`"${config.name}" sekarang aktif! Restart app untuk efek penuh.`)
      await loadStorageConfigs()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (config) => {
    const ok = await showConfirm({
      title: 'Hapus Storage',
      message: `Hapus storage "${config.name}"? Config ini akan dihapus permanen.`,
      confirmText: 'Ya, Hapus',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteStorageConfig(config.id)
      toast.success('Storage dihapus')
      await loadStorageConfigs()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const sections = [
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
    { id: 'akun', label: 'Akun', icon: User },
  ]

  const totalStorageBytes = storageConfigs.reduce((sum, c) => sum + (c.total_bytes || 0), 0)
  const usedStorageBytes = storageConfigs.reduce((sum, c) => sum + (c.used_bytes || 0), 0)

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-body mb-4 group" style={{ color: '#9e7452' }}>
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            Kembali
          </button>
          <h1 className="font-display text-3xl italic" style={{ color: '#faf4e8' }}>Pengaturan</h1>
          <div className="deco-line w-20 mt-3" />
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-44 shrink-0">
            <nav className="space-y-1">
              {sections.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveSection(id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body text-left transition-all"
                  style={activeSection === id
                    ? { background: 'rgba(212,160,23,0.15)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.25)' }
                    : { color: '#9e7452', border: '1px solid transparent' }
                  }
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* ══ STORAGE ══ */}
            {activeSection === 'storage' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="card-glass rounded-2xl p-5" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-xl italic" style={{ color: '#faf4e8' }}>Manajemen Storage</h2>
                    <button onClick={() => { setEditingConfig(null); setAddModalOpen(true) }} className="btn-gold flex items-center gap-2 text-sm">
                      <Plus size={14} /> Tambah B2
                    </button>
                  </div>
                  <div className="deco-line mb-4" />

                  {storageConfigs.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-2">
                      {[
                        { label: 'Total Storage', value: formatBytes(totalStorageBytes) },
                        { label: 'Terpakai', value: formatBytes(usedStorageBytes) },
                        { label: 'Tersisa', value: formatBytes(totalStorageBytes - usedStorageBytes) },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className="text-lg font-display italic" style={{ color: '#d4a017' }}>{value}</p>
                          <p className="text-xs font-body mt-1" style={{ color: '#9e7452' }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Storage list */}
                {storageLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader size={24} className="animate-spin" style={{ color: '#d4a017' }} />
                  </div>
                ) : storageConfigs.length === 0 ? (
                  <div className="card-glass rounded-2xl p-10 text-center" style={{ border: '1px dashed rgba(212,160,23,0.2)' }}>
                    <HardDrive size={40} className="mx-auto mb-4" style={{ color: 'rgba(212,160,23,0.3)' }} />
                    <p className="font-display text-xl italic mb-2" style={{ color: '#e8ddd3' }}>Belum ada storage</p>
                    <p className="text-sm font-body mb-5" style={{ color: '#9e7452' }}>Tambah Backblaze B2 bucket pertama kamu</p>
                    <button onClick={() => setAddModalOpen(true)} className="btn-gold">
                      <Plus size={15} className="inline mr-1.5" /> Tambah Storage Pertama
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {storageConfigs.map(config => (
                      <StorageCard
                        key={config.id}
                        config={config}
                        onSetActive={handleSetActive}
                        onEdit={cfg => { setEditingConfig(cfg); setAddModalOpen(true) }}
                        onDelete={handleDelete}
                        onExport={cfg => setExportSource(cfg)}
                      />
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="card-glass rounded-xl p-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-body" style={{ color: '#7c5632' }}>
                    💡 <strong style={{ color: '#9e7452' }}>Tips:</strong> Kamu bisa tambah storage B2 tak terbatas. Gunakan fitur Ekspor untuk memindahkan file antar storage. Hanya 1 storage yang aktif untuk upload baru.
                  </p>
                </div>
              </div>
            )}

            {/* ══ KEAMANAN ══ */}
            {activeSection === 'keamanan' && (
              <div className="card-glass rounded-2xl p-6" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
                <h2 className="font-display text-xl italic mb-1" style={{ color: '#faf4e8' }}>Keamanan</h2>
                <div className="deco-line mb-5" />
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Password Baru</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                      <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 8 karakter" className="input-field pl-10 pr-10" required />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }}>
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>Konfirmasi Password</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                      <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Ulangi password" className="input-field pl-10" required />
                    </div>
                  </div>
                  {newPass && (
                    <div className="space-y-1.5">
                      {[
                        { label: 'Min. 8 karakter', ok: newPass.length >= 8 },
                        { label: 'Huruf besar', ok: /[A-Z]/.test(newPass) },
                        { label: 'Mengandung angka', ok: /\d/.test(newPass) },
                      ].map(({ label, ok }) => (
                        <div key={label} className="flex items-center gap-2 text-xs font-body">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: ok ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.05)' }}>
                            {ok && <Check size={10} style={{ color: '#4ade80' }} />}
                          </div>
                          <span style={{ color: ok ? '#4ade80' : '#9e7452' }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="submit" disabled={passLoading} className="btn-gold w-full" style={{ opacity: passLoading ? 0.7 : 1 }}>
                    {passLoading ? 'Menyimpan...' : 'Ubah Password'}
                  </button>
                </form>
              </div>
            )}

            {/* ══ AKUN ══ */}
            {activeSection === 'akun' && (
              <div className="card-glass rounded-2xl p-6 space-y-5" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
                <h2 className="font-display text-xl italic" style={{ color: '#faf4e8' }}>Akun</h2>
                <div className="deco-line" />
                <div className="space-y-4">
                  {[
                    { label: 'Email', value: user?.email },
                    { label: 'ID Pengguna', value: user?.id, mono: true, small: true },
                    { label: 'Bergabung', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '—' },
                  ].map(({ label, value, mono, small }) => (
                    <div key={label}>
                      <label className="block text-xs font-body uppercase tracking-widest mb-1.5" style={{ color: '#9e7452' }}>{label}</label>
                      <div className="input-field opacity-60 cursor-not-allowed">
                        <span className={`${mono ? 'font-mono' : 'font-body'} ${small ? 'text-xs' : 'text-sm'}`}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={async () => { const ok = await showConfirm({
      title: 'Keluar',
      message: 'Kamu akan keluar dari MyGallery.',
      confirmText: 'Ya, Keluar',
    })
    if (!ok) return; await signOut(); navigate('/login') }} className="px-5 py-2.5 rounded-lg text-sm font-body font-medium transition-all hover:bg-red-500/10" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Keluar dari Akun
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
      <Footer />

      {/* Modals */}
      <StorageModal
        isOpen={addModalOpen}
        editConfig={editingConfig}
        onClose={() => { setAddModalOpen(false); setEditingConfig(null) }}
        onSave={handleAddStorage}
      />

      <ExportModal
        isOpen={!!exportSource}
        sourceConfig={exportSource}
        configs={storageConfigs}
        onClose={() => setExportSource(null)}
        onExport={() => { setExportSource(null); loadStorageConfigs() }}
      />
    </div>
  )
}
