import { useState, useEffect } from 'react'
import { X, Palette } from 'lucide-react'
import { COVER_COLORS, getCoverGradient } from './AlbumCard'

export default function AlbumModal({ isOpen, onClose, onSave, album = null }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverColor, setCoverColor] = useState('gold')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (album) {
      setTitle(album.title || '')
      setDescription(album.description || '')
      setCoverColor(album.cover_color || 'gold')
    } else {
      setTitle('')
      setDescription('')
      setCoverColor('gold')
    }
    setError('')
  }, [album, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { setError('Judul album wajib diisi'); return }
    setLoading(true)
    try {
      await onSave({ title: title.trim(), description: description.trim(), coverColor })
      onClose()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan album')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md card-glass rounded-2xl overflow-hidden shadow-2xl page-enter" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
        {/* Preview header */}
        <div className="h-24 relative" style={{ background: getCoverGradient(coverColor) }}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }} />
          <div className="absolute inset-0 flex items-end px-6 py-4">
            <span className="font-display text-xl italic text-white/90 truncate">
              {title || 'Judul Album...'}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl italic" style={{ color: '#faf4e8' }}>
              {album ? 'Edit Album' : 'Album Baru'}
            </h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-body font-medium mb-1.5 uppercase tracking-widest" style={{ color: '#9e7452' }}>Judul Album *</label>
              <input
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); setError('') }}
                placeholder="Mis. Liburan 2024, Wisuda, dll."
                className="input-field"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-xs font-body font-medium mb-1.5 uppercase tracking-widest" style={{ color: '#9e7452' }}>Deskripsi (Opsional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ceritakan sedikit tentang album ini..."
                className="input-field resize-none"
                rows={3}
                maxLength={300}
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-body font-medium mb-2 uppercase tracking-widest" style={{ color: '#9e7452' }}>
                <Palette size={12} /> Warna Cover
              </label>
              <div className="flex gap-2 flex-wrap">
                {COVER_COLORS.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setCoverColor(color.id)}
                    className="w-9 h-9 rounded-lg transition-all duration-200"
                    style={{
                      background: getCoverGradient(color.id),
                      transform: coverColor === color.id ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: coverColor === color.id ? `0 0 0 2px #0d0905, 0 0 0 4px ${color.from}` : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400 font-body">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">
                Batal
              </button>
              <button type="submit" disabled={loading} className="btn-gold flex-1" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Menyimpan...' : album ? 'Simpan Perubahan' : 'Buat Album'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
