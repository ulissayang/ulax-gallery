import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, ChevronLeft, ChevronRight, Download, Trash2,
  Play, Pause, Heart, Info, Share2, ZoomIn, ZoomOut,
  SkipBack, SkipForward, Volume2, VolumeX
} from 'lucide-react'
import { getCachedStreamUrl, formatFileSize, isVideo } from '../lib/b2.js'
import { showConfirm } from './Alert'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function MediaLightbox({
  items, initialIndex, onClose, onDelete, onToggleFavorite, onShare
}) {
  const [index, setIndex] = useState(initialIndex ?? 0)
  const [url, setUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isSlideshow, setIsSlideshow] = useState(false)
  const [slideshowInterval, setSlideshowInterval] = useState(null)
  const videoRef = useRef(null)
  const imgRef = useRef(null)

  const item = items[index]
  const videoFile = isVideo(item?.mime_type)

  // Load media
  useEffect(() => {
    if (!item) return
    setLoading(true)
    setError(null)
    setUrl(null)
    setZoom(1)
    let cancelled = false

    const load = async () => {
      try {
        const cacheKey = `img_${item.id}`
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const { url: cachedUrl, exp } = JSON.parse(cached)
          if (Date.now() < exp) {
            if (!cancelled) { setUrl(cachedUrl); setLoading(false) }
            return
          }
          localStorage.removeItem(cacheKey)
        }
        const signedUrl = await getCachedStreamUrl(item.mega_node_id, item.storage_config_id || null)
        localStorage.setItem(cacheKey, JSON.stringify({ url: signedUrl, exp: Date.now() + 50 * 60 * 1000 }))
        if (!cancelled) { setUrl(signedUrl); setLoading(false) }
      } catch (err) {
        if (!cancelled) { setError(err.message); setLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [item?.id])

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') { prev(); stopSlideshow() }
      if (e.key === 'ArrowRight') { next(); stopSlideshow() }
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4))
      if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.5))
      if (e.key === '0') setZoom(1)
      if (e.key === ' ' && videoFile) { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, items.length, videoFile])

  // Slideshow
  useEffect(() => {
    if (isSlideshow && !videoFile) {
      const id = setInterval(() => {
        setIndex(i => (i < items.length - 1 ? i + 1 : 0))
      }, 3000)
      setSlideshowInterval(id)
      return () => clearInterval(id)
    }
  }, [isSlideshow, videoFile, items.length])

  const prev = useCallback(() => setIndex(i => i > 0 ? i - 1 : items.length - 1), [items.length])
  const next = useCallback(() => setIndex(i => i < items.length - 1 ? i + 1 : 0), [items.length])
  const stopSlideshow = () => { setIsSlideshow(false); if (slideshowInterval) clearInterval(slideshowInterval) }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true) }
    else { videoRef.current.pause(); setIsPlaying(false) }
  }

  const handleDelete = async () => {
    const ok = await showConfirm({
      title: 'Hapus Media',
      message: `Hapus "${item.title || item.file_name}"? File akan dihapus permanen.`,
      confirmText: 'Ya, Hapus', danger: true,
    })
    if (!ok) return
    localStorage.removeItem(`img_${item.id}`)
    await onDelete(item)
    if (items.length <= 1) { onClose(); return }
    setIndex(i => Math.max(0, i - 1))
  }

  const handleDownload = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = item.file_name; a.target = '_blank'; a.click()
  }

  const handleFavorite = async () => {
    const newVal = !item.is_favorite
    await supabase.from('media_items').update({ is_favorite: newVal }).eq('id', item.id)
    onToggleFavorite?.(item.id, newVal)
    toast.success(newVal ? '❤️ Ditambah ke favorit' : 'Dihapus dari favorit')
  }

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col select-none" style={{ background: 'rgba(3,2,1,0.98)' }}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10" style={{ color: '#e8ddd3' }}>
            <X size={18} />
          </button>
          <div>
            <p className="font-body text-sm font-medium" style={{ color: '#e8ddd3' }}>{item.title || item.file_name}</p>
            <p className="text-xs font-mono" style={{ color: '#7c5632' }}>
              {index + 1}/{items.length} · {formatFileSize(item.file_size)}
              {item.width && ` · ${item.width}×${item.height}`}
            </p>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Favorite */}
          <button onClick={handleFavorite}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10">
            <Heart size={17} fill={item.is_favorite ? '#ef4444' : 'none'} style={{ color: item.is_favorite ? '#ef4444' : '#9e7452' }} />
          </button>
          {/* Share */}
          {onShare && (
            <button onClick={() => onShare(item)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10" style={{ color: '#9e7452' }}>
              <Share2 size={17} />
            </button>
          )}
          {/* Info */}
          <button onClick={() => setShowInfo(!showInfo)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: showInfo ? '#d4a017' : '#9e7452' }}>
            <Info size={17} />
          </button>
          {/* Download */}
          <button onClick={handleDownload} disabled={!url}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10" style={{ color: '#9e7452' }}>
            <Download size={17} />
          </button>
          {/* Delete */}
          <button onClick={handleDelete}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-500/15" style={{ color: '#ef4444' }}>
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* MAIN VIEWER */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Nav buttons */}
        {items.length > 1 && (
          <>
            <button onClick={() => { prev(); stopSlideshow() }}
              className="absolute left-3 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              <ChevronLeft size={22} />
            </button>
            <button onClick={() => { next(); stopSlideshow() }}
              className="absolute right-3 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Media */}
        <div className="w-full h-full flex items-center justify-center p-4 md:p-12">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(212,160,23,0.2)', borderTopColor: '#d4a017' }} />
              <p className="text-sm font-body" style={{ color: '#9e7452' }}>Memuat...</p>
            </div>
          )}
          {error && (
            <div className="text-center">
              <p className="text-red-400 font-body mb-3">{error}</p>
              <button onClick={() => { localStorage.removeItem(`img_${item.id}`); setLoading(true); setError(null); getCachedStreamUrl(item.mega_node_id).then(u => { setUrl(u); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) }) }}
                className="btn-ghost text-sm">Coba lagi</button>
            </div>
          )}
          {url && !loading && (
            videoFile ? (
              <video ref={videoRef} src={url} controls autoPlay muted={isMuted}
                className="max-h-[78vh] max-w-full rounded-xl shadow-2xl"
                onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
                style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s', cursor: zoom > 1 ? 'grab' : 'default' }}>
                <img ref={imgRef} src={url} alt={item.title || item.file_name}
                  className="max-h-[78vh] max-w-full rounded-xl shadow-2xl object-contain"
                  onError={() => { localStorage.removeItem(`img_${item.id}`); setUrl(null); setLoading(true); getCachedStreamUrl(item.mega_node_id).then(u => { setUrl(u); setLoading(false) }).catch(() => setError('Gagal memuat')) }} />
              </div>
            )
          )}
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="absolute right-0 top-0 bottom-0 w-64 overflow-y-auto p-5"
            style={{ background: 'rgba(13,9,5,0.92)', borderLeft: '1px solid rgba(212,160,23,0.1)', backdropFilter: 'blur(12px)' }}>
            <h3 className="font-display text-base italic mb-4" style={{ color: '#d4a017' }}>Info File</h3>
            <div className="space-y-3">
              {[
                { label: 'Nama', value: item.file_name },
                { label: 'Judul', value: item.title || '—' },
                { label: 'Tipe', value: item.mime_type },
                { label: 'Ukuran', value: formatFileSize(item.file_size) },
                item.width && { label: 'Dimensi', value: `${item.width} × ${item.height} px` },
                { label: 'Diupload', value: new Date(item.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs uppercase tracking-wider mb-0.5 font-body" style={{ color: '#5e3f24' }}>{label}</p>
                  <p className="text-sm font-body break-all" style={{ color: '#b8987d' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="shrink-0 pb-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
        {/* Zoom + Slideshow controls (foto only) */}
        {!videoFile && url && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: '#9e7452' }}>
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-mono w-12 text-center" style={{ color: '#7c5632' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: '#9e7452' }}>
              <ZoomIn size={15} />
            </button>
            <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <button onClick={() => setIsSlideshow(!isSlideshow)}
              className="px-3 py-1.5 rounded-lg text-xs font-body transition-all"
              style={{ background: isSlideshow ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)', color: isSlideshow ? '#d4a017' : '#9e7452', border: `1px solid ${isSlideshow ? 'rgba(212,160,23,0.3)' : 'transparent'}` }}>
              {isSlideshow ? '⏸ Stop Slideshow' : '▶ Slideshow'}
            </button>
          </div>
        )}

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div className="overflow-x-auto px-4">
            <div className="flex gap-2 w-max mx-auto">
              {items.map((it, i) => (
                <button key={it.id} onClick={() => { setIndex(i); stopSlideshow() }}
                  className="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center transition-all duration-200 relative"
                  style={{ border: i === index ? '2px solid #d4a017' : '2px solid transparent', opacity: i === index ? 1 : 0.45, transform: i === index ? 'scale(1.1)' : 'scale(1)', background: 'rgba(255,255,255,0.05)' }}>
                  {it.is_favorite && (
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }}>
                      <Heart size={7} fill="white" color="white" />
                    </div>
                  )}
                  {isVideo(it.mime_type) ? <Play size={14} style={{ color: '#a78bfa' }} /> : <span style={{ fontSize: 16 }}>🖼</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
