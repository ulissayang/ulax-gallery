import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Download, Trash2, Edit2, Play, Info } from 'lucide-react'
import { loadImageBlob, formatFileSize, isVideo } from '../lib/b2.js'
import { showConfirm } from './Alert'
import { formatDistanceToNow } from '../lib/dateUtils'

export default function MediaLightbox({ items, initialIndex, onClose, onDelete, onEdit }) {
  const [index, setIndex] = useState(initialIndex ?? 0)
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const videoRef = useRef(null)
  const item = items[index]

  // Load media saat item berubah
  useEffect(() => {
    if (!item) return
    setLoading(true)
    setError(null)

    // Revoke blob URL lama
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null)

    loadImageBlob(item.mega_node_id, item.storage_config_id || null)
      .then(url => { setBlobUrl(url); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })

    return () => {}
  }, [item?.id])



  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, items.length])

  const prev = () => setIndex(i => i > 0 ? i - 1 : items.length - 1)
  const next = () => setIndex(i => i < items.length - 1 ? i + 1 : 0)

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: 'Hapus Media',
      message: `Hapus "${item.title || item.file_name}"? File akan dihapus permanen dari storage.`,
      confirmText: 'Ya, Hapus',
      danger: true,
    })
    if (!ok) return
    await onDelete(item)
    if (items.length <= 1) { onClose(); return }
    setIndex(i => i > 0 ? i - 1 : 0)
  }

  const handleDownload = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = item.file_name
    a.target = '_blank'
    a.click()
  }

  if (!item) return null
  const videoFile = isVideo(item.mime_type)

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(5,3,2,0.98)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(212,160,23,0.1)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={18} />
          </button>
          <div>
            <p className="font-body text-sm font-medium line-clamp-1" style={{ color: '#e8ddd3' }}>
              {item.title || item.file_name}
            </p>
            <p className="text-xs font-mono" style={{ color: '#9e7452' }}>
              {index + 1} / {items.length} • {formatFileSize(item.file_size)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowInfo(!showInfo)} className={`btn-ghost p-2 rounded-lg ${showInfo ? 'border-gold-500/40' : ''}`}>
            <Info size={16} />
          </button>
          <button onClick={handleDownload} disabled={!url} className="btn-ghost p-2 rounded-lg" title="Download">
            <Download size={16} />
          </button>
          <button onClick={() => onEdit(item)} className="btn-ghost p-2 rounded-lg">
            <Edit2 size={16} />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-lg border transition-all hover:bg-red-500/10" style={{ borderColor: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main viewer */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Prev/Next */}
        {items.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8ddd3' }}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={next} className="absolute right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8ddd3' }}>
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Media content */}
        <div className="w-full h-full flex items-center justify-center p-8">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(212,160,23,0.2)', borderTopColor: '#d4a017' }} />
              <p className="text-sm font-body" style={{ color: '#9e7452' }}>Memuat media...</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-red-400 font-body mb-2">Gagal memuat media</p>
              <p className="text-sm font-body" style={{ color: '#9e7452' }}>{error}</p>
              <button onClick={() => { setLoading(true); loadImageBlob(item.mega_node_id).then(url => { setBlobUrl(url); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) }) }} className="btn-ghost mt-4 text-sm">Coba lagi</button>
            </div>
          )}

          {blobUrl && !loading && (
            videoFile ? (
              <video
                ref={videoRef}
                src={blobUrl}
                className="max-h-[75vh] max-w-full rounded-lg"
                controls
                autoPlay
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <img
                src={blobUrl}
                alt={item.title || item.file_name}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
            )
          )}
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="absolute right-0 top-0 bottom-0 w-64 card-glass p-5 overflow-y-auto" style={{ borderLeft: '1px solid rgba(212,160,23,0.1)' }}>
            <h3 className="font-display text-base italic mb-4" style={{ color: '#d4a017' }}>Informasi File</h3>
            <div className="space-y-3">
              {[
                { label: 'Nama', value: item.file_name },
                { label: 'Judul', value: item.title || '—' },
                { label: 'Tipe', value: item.mime_type },
                { label: 'Ukuran', value: formatFileSize(item.file_size) },
                { label: 'Diupload', value: new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-wider mb-1 font-body" style={{ color: '#5e3f24' }}>{label}</p>
                  <p className="text-sm font-body break-all" style={{ color: '#b8987d' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {items.length > 1 && (
        <div className="shrink-0 py-3 px-4 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(212,160,23,0.1)' }}>
          <div className="flex gap-2 w-max mx-auto">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setIndex(i)}
                className="shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-200 flex items-center justify-center"
                style={{
                  border: i === index ? '2px solid #d4a017' : '2px solid transparent',
                  opacity: i === index ? 1 : 0.5,
                  transform: i === index ? 'scale(1.1)' : 'scale(1)',
                  background: 'rgba(212,160,23,0.1)',
                }}
              >
                {isVideo(it.mime_type)
                  ? <Play size={16} style={{ color: '#a78bfa' }} />
                  : <span style={{ fontSize: 18 }}>🖼️</span>
                }
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
