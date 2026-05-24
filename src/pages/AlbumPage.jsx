import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Play, ImageIcon, Trash2, Edit2, Grid3X3, LayoutList, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import StorageIndicator from '../components/StorageIndicator'
import UploadModal from '../components/UploadModal'
import MediaLightbox from '../components/MediaLightbox'
import useGalleryStore from '../store/galleryStore'
import { showConfirm } from '../components/Alert'
import { formatFileSize, isVideo, loadImageBlob } from '../lib/mega'
import { formatDistanceToNow } from '../lib/dateUtils'
import { supabase } from '../lib/supabase'

export default function AlbumPage() {
  const { albumId } = useParams()
  const navigate = useNavigate()
  const { currentAlbum, setCurrentAlbum, mediaItems, fetchMediaItems, deleteMediaItem, updateMediaItem, loading } = useGalleryStore()

  const [uploadOpen, setUploadOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [filter, setFilter] = useState('all') // all | image | video
  const [gridCols, setGridCols] = useState(3)
  const [editingItem, setEditingItem] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    // Fetch album info
    supabase.from('albums').select('*').eq('id', albumId).single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error('Album tidak ditemukan'); navigate('/'); return }
        setCurrentAlbum(data)
      })

    fetchMediaItems(albumId).catch(err => toast.error(err.message))
  }, [albumId])

  const handleDelete = async (item) => {
    try {
      await deleteMediaItem(item)
      toast.success('Media dihapus')
    } catch (err) {
      toast.error('Gagal menghapus: ' + err.message)
    }
  }

  const handleEditItem = async () => {
    if (!editingItem || !editTitle.trim()) return
    try {
      await updateMediaItem(editingItem.id, { title: editTitle.trim() })
      toast.success('Judul diperbarui')
      setEditingItem(null)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filtered = mediaItems.filter(m => {
    if (filter === 'image') return !isVideo(m.mime_type)
    if (filter === 'video') return isVideo(m.mime_type)
    return true
  })

  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5',
  }[gridCols]

  return (
    <div className="min-h-screen">
      <Navbar
        title={currentAlbum?.title || 'Album'}
        subtitle={`${mediaItems.length} media`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Back + header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-body mb-4 transition-colors group"
            style={{ color: '#9e7452' }}
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform" />
            Kembali ke semua album
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl italic" style={{ color: '#faf4e8' }}>
                {currentAlbum?.title}
              </h1>
              {currentAlbum?.description && (
                <p className="mt-1 text-sm font-body" style={{ color: '#9e7452' }}>{currentAlbum.description}</p>
              )}
              <div className="deco-line w-24 mt-3" />
              <p className="mt-2 text-xs font-mono" style={{ color: '#5e3f24' }}>
                Dibuat {currentAlbum ? formatDistanceToNow(currentAlbum.created_at) : '...'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap self-start sm:self-auto">
              <StorageIndicator />
              <button onClick={() => setUploadOpen(true)} className="btn-gold flex items-center gap-2">
                <Upload size={15} />
                Upload Media
              </button>
            </div>
          </div>
        </div>

        {/* Controls bar */}
        {mediaItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { id: 'all', label: 'Semua', count: mediaItems.length },
                { id: 'image', label: 'Foto', count: mediaItems.filter(m => !isVideo(m.mime_type)).length },
                { id: 'video', label: 'Video', count: mediaItems.filter(m => isVideo(m.mime_type)).length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className="px-3 py-1.5 rounded-md text-xs font-body font-medium transition-all duration-200"
                  style={filter === tab.id
                    ? { background: '#d4a017', color: '#0d0905' }
                    : { color: '#9e7452' }
                  }
                >
                  {tab.label} {tab.count > 0 && <span className="opacity-70">({tab.count})</span>}
                </button>
              ))}
            </div>

            {/* Grid size */}
            <div className="flex items-center gap-1">
              {[2, 3, 4, 5].map(cols => (
                <button
                  key={cols}
                  onClick={() => setGridCols(cols)}
                  className="w-8 h-8 rounded-lg text-xs font-mono transition-all duration-200"
                  style={gridCols === cols
                    ? { background: 'rgba(212,160,23,0.2)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.3)' }
                    : { color: '#9e7452', border: '1px solid transparent' }
                  }
                >
                  {cols}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && mediaItems.length === 0 && (
          <div className={`grid ${gridClass} gap-2`}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl skeleton" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && mediaItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 animate-float" style={{ background: 'rgba(212,160,23,0.08)', border: '1px dashed rgba(212,160,23,0.25)' }}>
              <ImageIcon size={36} style={{ color: 'rgba(212,160,23,0.5)' }} />
            </div>
            <h2 className="font-display text-2xl italic mb-2" style={{ color: '#e8ddd3' }}>Album ini masih kosong</h2>
            <p className="text-sm font-body mb-6 max-w-xs" style={{ color: '#9e7452' }}>
              Upload foto dan video untuk mengisi album ini
            </p>
            <button onClick={() => setUploadOpen(true)} className="btn-gold flex items-center gap-2">
              <Upload size={15} />
              Upload Media Pertama
            </button>
          </div>
        )}

        {/* No filter results */}
        {!loading && mediaItems.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body" style={{ color: '#9e7452' }}>
              Tidak ada {filter === 'image' ? 'foto' : 'video'} di album ini
            </p>
          </div>
        )}

        {/* Media grid */}
        {filtered.length > 0 && (
          <div className={`grid ${gridClass} gap-2`}>
            {filtered.map((item, i) => (
              <MediaGridItem
                key={item.id}
                item={item}
                index={i}
                onOpen={() => setLightboxIndex(filtered.indexOf(item))}
                onEdit={() => { setEditingItem(item); setEditTitle(item.title || '') }}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Upload modal */}
      <UploadModal
        isOpen={uploadOpen}
        albumId={albumId}
        onClose={() => setUploadOpen(false)}
      />

      {/* Lightbox */}
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
          onEdit={(item) => { setEditingItem(item); setEditTitle(item.title || '') }}
        />
      )}

      {/* Edit title modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setEditingItem(null)} />
          <div className="relative w-full max-w-sm card-glass rounded-2xl p-6 page-enter">
            <h3 className="font-display text-xl italic mb-4" style={{ color: '#faf4e8' }}>Edit Judul</h3>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Judul foto/video"
              className="input-field mb-4"
              onKeyDown={e => e.key === 'Enter' && handleEditItem()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setEditingItem(null)} className="btn-ghost flex-1">Batal</button>
              <button onClick={handleEditItem} className="btn-gold flex-1">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Media Grid Item ───────────────────────────────────────────

function MediaGridItem({ item, index, onOpen, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [imgUrl, setImgUrl] = useState(null)
  const [imgError, setImgError] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const video = isVideo(item.mime_type)

  useEffect(() => {
    if (video) { setImgLoading(false); return }
    let blobUrl = null

    loadImageBlob(item.mega_node_id, item.storage_config_id || null)
      .then(url => { blobUrl = url; setImgUrl(url) })
      .catch(() => setImgError(true))
      .finally(() => setImgLoading(false))

    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [item.mega_node_id])

  return (
    <div
      className="media-card aspect-square group cursor-pointer"
      style={{ animationDelay: `${index * 0.03}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{
          background: video
            ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,7,100,0.4))'
            : 'linear-gradient(135deg, rgba(212,160,23,0.1), rgba(62,42,24,0.4))',
        }}
      >
        {video ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.4)' }}>
              <Play size={20} fill="#a78bfa" style={{ color: '#a78bfa' }} />
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: '#a78bfa' }}>VIDEO</span>
          </div>
        ) : imgLoading && !video ? (
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(212,160,23,0.3)', borderTopColor: '#d4a017' }} />
        ) : imgUrl && !imgError ? (
          <img
            src={imgUrl}
            alt={item.title || item.file_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImageIcon size={28} style={{ color: 'rgba(212,160,23,0.4)' }} />
        )}
      </div>

      <div className="overlay">
        <p className="text-sm font-body font-medium text-white line-clamp-1 mb-1">
          {item.title || item.file_name}
        </p>
        <p className="text-xs font-mono text-white/50">{formatFileSize(item.file_size)}</p>
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
            style={{ color: 'rgba(239,68,68,0.8)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
