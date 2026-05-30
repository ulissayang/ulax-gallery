import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Play, ImageIcon, Heart, Search, Grid2X2, Grid3X3, LayoutGrid, Filter, Share2, Download, Archive } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import UploadModal from '../components/UploadModal'
import MediaLightbox from '../components/MediaLightbox'
import StorageIndicator from '../components/StorageIndicator'
import { showConfirm } from '../components/Alert'
import useGalleryStore from '../store/galleryStore'
import { formatFileSize, isVideo, getCachedStreamUrl } from '../lib/b2.js'
import { formatDistanceToNow } from '../lib/dateUtils'
import { supabase } from '../lib/supabase'
import { createShareLink, buildShareUrl } from '../lib/shareUtils'

// ─── Media Grid Item ──────────────────────────────────────────
function MediaGridItem({ item, onOpen, isFav, onToggleFav }) {
  const [imgUrl, setImgUrl] = useState(null)
  const [imgError, setImgError] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const video = isVideo(item.mime_type)

  useEffect(() => {
    if (video) { setImgLoading(false); return }
    let cancelled = false
    const load = async () => {
      try {
        const cacheKey = `img_${item.id}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const { url, exp } = JSON.parse(cached)
          if (Date.now() < exp) { if (!cancelled) { setImgUrl(url); setImgLoading(false) }; return }
          localStorage.removeItem(cacheKey)
        }
        const url = await getCachedStreamUrl(item.mega_node_id, item.storage_config_id || null)
        localStorage.setItem(cacheKey, JSON.stringify({ url, exp: Date.now() + 50 * 60 * 1000 }))
        if (!cancelled) { setImgUrl(url); setImgLoading(false) }
      } catch { if (!cancelled) { setImgError(true); setImgLoading(false) } }
    }
    load()
    return () => { cancelled = true }
  }, [item.id])

  return (
    <div className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer"
      style={{ border: '1px solid transparent', transition: 'all 0.3s' }}
      onClick={onOpen}>
      {/* Media content */}
      <div className="w-full h-full flex items-center justify-center"
        style={{ background: video ? 'linear-gradient(135deg,rgba(139,92,246,.2),rgba(59,7,100,.4))' : 'linear-gradient(135deg,rgba(212,160,23,.08),rgba(62,42,24,.3))' }}>
        {imgLoading && !video && <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(212,160,23,.2)', borderTopColor: '#d4a017' }} />}
        {video ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,.3)', border: '1px solid rgba(139,92,246,.4)' }}>
              <Play size={18} fill="#a78bfa" style={{ color: '#a78bfa' }} />
            </div>
          </div>
        ) : imgUrl && !imgError ? (
          <img src={imgUrl} alt={item.title || item.file_name} className="w-full h-full object-cover"
            onError={() => { localStorage.removeItem(`img_${item.id}`); setImgUrl(null); setImgError(true) }} />
        ) : imgError ? (
          <ImageIcon size={24} style={{ color: 'rgba(212,160,23,.3)' }} />
        ) : null}
      </div>

      {/* Hover overlay — hanya info, tidak ada tombol duplikat */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.4) 60%, transparent 100%)' }}>
        <p className="text-xs font-body font-medium text-white truncate">{item.title || item.file_name}</p>
        <p className="text-xs font-mono text-white/50 mt-0.5">{formatFileSize(item.file_size)}</p>
      </div>

      {/* Favorite badge */}
      {isFav && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(239,68,68,.9)' }}>
          <Heart size={11} fill="white" color="white" />
        </div>
      )}

      {/* Video badge */}
      {video && (
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-xs font-mono z-10"
          style={{ background: 'rgba(0,0,0,.6)', color: '#a78bfa' }}>VIDEO</div>
      )}

      {/* Hover border */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ border: '2px solid rgba(212,160,23,.6)', boxShadow: '0 0 20px rgba(212,160,23,.15)' }} />
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function AlbumPage() {
  const { albumId } = useParams()
  const navigate = useNavigate()
  const { currentAlbum, setCurrentAlbum, mediaItems, fetchMediaItems, deleteMediaItem, updateMediaItem, loading } = useGalleryStore()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [gridCols, setGridCols] = useState(3)
  const [search, setSearch] = useState('')
  const [editingTitle, setEditingTitle] = useState(null)
  const [localFavs, setLocalFavs] = useState({})

  useEffect(() => {
    supabase.from('albums').select('*').eq('id', albumId).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error('Album tidak ditemukan'); navigate('/'); return }
        setCurrentAlbum(data)
      })
    fetchMediaItems(albumId).catch(err => toast.error(err.message))
  }, [albumId])

  // Init favs from items
  useEffect(() => {
    const favMap = {}
    mediaItems.forEach(m => { favMap[m.id] = m.is_favorite })
    setLocalFavs(favMap)
  }, [mediaItems])

  const handleDelete = async (item) => {
    try { await deleteMediaItem(item); toast.success('Media dihapus') }
    catch (err) { toast.error('Gagal: ' + err.message) }
  }

  const handleToggleFavorite = async (itemId, newVal) => {
    setLocalFavs(prev => ({ ...prev, [itemId]: newVal }))
    await updateMediaItem(itemId, { is_favorite: newVal })
  }

  const handleShare = async (item) => {
    if (item) {
      // Share single item - salin URL langsung
      try {
        const url = await getCachedStreamUrl(item.mega_node_id, item.storage_config_id)
        await navigator.clipboard.writeText(url)
        toast.success('Link foto disalin!')
      } catch { toast.error('Gagal salin link') }
      return
    }
    // Share album
    try {
      const link = await createShareLink(albumId, 24)
      const url = buildShareUrl(link.token)
      await navigator.clipboard.writeText(url)
      toast.success('Link album disalin! Berlaku 24 jam')
    } catch { toast.error('Gagal buat link') }
  }

  // Filter & sort
  const filtered = mediaItems
    .filter(m => {
      if (filter === 'image') return !isVideo(m.mime_type)
      if (filter === 'video') return isVideo(m.mime_type)
      if (filter === 'favorite') return localFavs[m.id]
      return true
    })
    .filter(m => !search || (m.title || m.file_name).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'largest') return b.file_size - a.file_size
      if (sortBy === 'name') return (a.title || a.file_name).localeCompare(b.title || b.file_name)
      return 0
    })

  const gridClass = { 2: 'grid-cols-2', 3: 'grid-cols-2 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4', 5: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5' }[gridCols]
  const favCount = Object.values(localFavs).filter(Boolean).length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter w-full">

        {/* Back */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-body mb-6 group" style={{ color: '#9e7452' }}>
          <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
          Kembali
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl italic" style={{ color: '#faf4e8' }}>{currentAlbum?.title}</h1>
            {currentAlbum?.description && <p className="mt-1 text-sm font-body" style={{ color: '#9e7452' }}>{currentAlbum.description}</p>}
            <div className="deco-line w-24 mt-3" />
            <p className="mt-2 text-xs font-mono" style={{ color: '#5e3f24' }}>
              {mediaItems.length} media · {favCount > 0 ? `${favCount} favorit · ` : ''}{currentAlbum ? formatDistanceToNow(currentAlbum.created_at) : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
            <StorageIndicator />
            <button onClick={() => handleShare(null)} className="btn-ghost flex items-center gap-2 text-sm">
              <Share2 size={14} /> Bagikan
            </button>
            <button onClick={() => setUploadOpen(true)} className="btn-gold flex items-center gap-2">
              <Upload size={15} /> Upload
            </button>
          </div>
        </div>

        {/* Controls */}
        {mediaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-40 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari media..."
                className="input-field pl-9 text-sm py-2" />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'image', label: 'Foto' },
                { id: 'video', label: 'Video' },
                { id: 'favorite', label: '❤️' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setFilter(tab.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-body font-medium transition-all"
                  style={filter === tab.id ? { background: '#d4a017', color: '#0d0905' } : { color: '#9e7452' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="text-xs font-body px-3 py-2 rounded-lg outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9e7452' }}>
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="largest">Terbesar</option>
              <option value="name">Nama</option>
            </select>

            {/* Grid size */}
            <div className="flex items-center gap-1">
              {[{ cols: 2, Icon: Grid2X2 }, { cols: 3, Icon: Grid3X3 }, { cols: 4, Icon: LayoutGrid }].map(({ cols, Icon }) => (
                <button key={cols} onClick={() => setGridCols(cols)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={gridCols === cols ? { background: 'rgba(212,160,23,.2)', color: '#d4a017' } : { color: '#7c5632' }}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && mediaItems.length === 0 && (
          <div className={`grid ${gridClass} gap-2`}>
            {[...Array(9)].map((_, i) => <div key={i} className="aspect-square rounded-xl skeleton" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && mediaItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 animate-float"
              style={{ background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.25)' }}>
              <ImageIcon size={36} style={{ color: 'rgba(212,160,23,.5)' }} />
            </div>
            <h2 className="font-display text-2xl italic mb-2" style={{ color: '#e8ddd3' }}>Album masih kosong</h2>
            <p className="text-sm font-body mb-6" style={{ color: '#9e7452' }}>Upload foto dan video untuk memulai</p>
            <button onClick={() => setUploadOpen(true)} className="btn-gold flex items-center gap-2">
              <Upload size={15} /> Upload Sekarang
            </button>
          </div>
        )}

        {/* No filter results */}
        {!loading && mediaItems.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body" style={{ color: '#9e7452' }}>Tidak ada media yang cocok</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className={`grid ${gridClass} gap-2`}>
            {filtered.map((item, i) => (
              <MediaGridItem key={item.id} item={item}
                isFav={!!localFavs[item.id]}
                onOpen={() => setLightboxIndex(i)}
                onToggleFav={(id, val) => handleToggleFavorite(id, val)}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      <UploadModal isOpen={uploadOpen} albumId={albumId} onClose={() => setUploadOpen(false)} />

      {lightboxIndex !== null && (
        <MediaLightbox
          items={filtered}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDelete={async (item) => {
            await handleDelete(item)
            if (filtered.length <= 1) setLightboxIndex(null)
            else setLightboxIndex(i => Math.min(i, filtered.length - 2))
          }}
          onToggleFavorite={handleToggleFavorite}
          onShare={handleShare}
        />
      )}

      {/* Edit title modal */}
      {editingTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)' }} onClick={() => setEditingTitle(null)} />
          <div className="relative w-full max-w-sm card-glass rounded-2xl p-6 page-enter">
            <h3 className="font-display text-xl italic mb-4" style={{ color: '#faf4e8' }}>Edit Judul</h3>
            <input type="text" defaultValue={editingTitle.title || ''}
              id="edit-title-input" placeholder="Judul foto/video" className="input-field mb-4"
              onKeyDown={async (e) => { if (e.key === 'Enter') { await updateMediaItem(editingTitle.id, { title: e.target.value }); toast.success('Judul diperbarui'); setEditingTitle(null) } }}
              autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setEditingTitle(null)} className="btn-ghost flex-1">Batal</button>
              <button onClick={async () => { const val = document.getElementById('edit-title-input').value; await updateMediaItem(editingTitle.id, { title: val }); toast.success('Judul diperbarui'); setEditingTitle(null) }} className="btn-gold flex-1">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
