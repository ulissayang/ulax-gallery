import { useEffect, useState } from 'react'
import { Plus, Images, Search, Heart, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AlbumCard from '../components/AlbumCard'
import AlbumModal from '../components/AlbumModal'
import { UnlockModal, SetLockModal } from '../components/AlbumLockModal'
import { showConfirm } from '../components/Alert'
import useGalleryStore from '../store/galleryStore'
import { supabase } from '../lib/supabase'

export default function GalleryPage() {
  const { albums, fetchAlbums, createAlbum, updateAlbum, deleteAlbum, loading } = useGalleryStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [lockingAlbum, setLockingAlbum] = useState(null)
  const [unlockingAlbum, setUnlockingAlbum] = useState(null)

  useEffect(() => { fetchAlbums().catch(err => toast.error(err.message)) }, [])

  const handleSave = async (data) => {
    if (editingAlbum) {
      await updateAlbum(editingAlbum.id, { title: data.title, description: data.description, cover_color: data.coverColor })
      toast.success('Album diperbarui')
    } else {
      await createAlbum(data)
      toast.success('Album baru dibuat!')
    }
  }

  const handleDelete = async (album) => {
    const ok = await showConfirm({
      title: 'Hapus Album',
      message: `Hapus album "${album.title}"? Semua foto dan video di dalamnya akan terhapus permanen.`,
      confirmText: 'Ya, Hapus', danger: true,
    })
    if (!ok) return
    try { await deleteAlbum(album.id); toast.success('Album dihapus') }
    catch (err) { toast.error('Gagal: ' + err.message) }
  }

  const handleSetLock = async ({ lockHash, lockHint, lockType }) => {
    await supabase.from('albums').update({
      is_locked: true, lock_hash: lockHash, lock_hint: lockHint || null, lock_type: lockType,
    }).eq('id', lockingAlbum.id)
    await fetchAlbums()
  }

  const handleRemoveLock = async () => {
    await supabase.from('albums').update({ is_locked: false, lock_hash: null, lock_hint: null }).eq('id', lockingAlbum.id)
    await fetchAlbums()
  }

  // Sort & filter
  const filtered = albums
    .filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || (a.description || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      return 0
    })

  const totalMedia = albums.reduce((sum, a) => sum + (a.media_items?.[0]?.count ?? 0), 0)
  const lockedCount = albums.filter(a => a.is_locked).length

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">

        {/* Hero */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[.2em] mb-2" style={{ color: '#d4a017' }}>Galeri Pribadi</p>
              <h1 className="font-display text-4xl md:text-5xl italic" style={{ color: '#faf4e8', lineHeight: 1.1 }}>
                Album-album<br /><span style={{ color: '#d4a017' }}>kenangan</span>
              </h1>
              <div className="deco-line w-32 mt-4" />
              <div className="flex items-center gap-4 mt-3">
                <p className="text-sm font-body" style={{ color: '#9e7452' }}>{albums.length} album · {totalMedia} media</p>
                {lockedCount > 0 && (
                  <div className="flex items-center gap-1 text-xs font-body" style={{ color: '#7c5632' }}>
                    <Lock size={11} /> {lockedCount} terkunci
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => { setEditingAlbum(null); setModalOpen(true) }} className="btn-gold flex items-center gap-2 self-start sm:self-auto">
              <Plus size={16} /> Album Baru
            </button>
          </div>

          {/* Search & sort */}
          {albums.length > 0 && (
            <div className="flex items-center gap-3 mt-6 flex-wrap">
              <div className="relative flex-1 min-w-40 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari album..."
                  className="input-field pl-9 text-sm py-2" />
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="text-xs font-body px-3 py-2 rounded-lg outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9e7452' }}>
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="name">Nama A-Z</option>
              </select>
            </div>
          )}
        </div>

        {/* Skeleton */}
        {loading && albums.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="aspect-square rounded-xl skeleton" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && albums.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 animate-float"
              style={{ background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.25)' }}>
              <Images size={36} style={{ color: 'rgba(212,160,23,.5)' }} />
            </div>
            <h2 className="font-display text-2xl italic mb-2" style={{ color: '#e8ddd3' }}>Belum ada album</h2>
            <p className="text-sm font-body mb-6" style={{ color: '#9e7452' }}>Buat album pertama dan mulai simpan kenangan</p>
            <button onClick={() => setModalOpen(true)} className="btn-gold flex items-center gap-2">
              <Plus size={16} /> Buat Album Pertama
            </button>
          </div>
        )}

        {/* No results */}
        {!loading && albums.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body" style={{ color: '#9e7452' }}>Tidak ada album untuk "<strong>{search}</strong>"</p>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((album, i) => (
              <div key={album.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in">
                <AlbumCard album={album}
                  onEdit={(a) => { setEditingAlbum(a); setModalOpen(true) }}
                  onDelete={handleDelete}
                  onLock={(a) => setLockingAlbum(a)}
                  onUnlock={(a) => setUnlockingAlbum(a)}
                />
              </div>
            ))}
            {/* Add album card */}
            <button onClick={() => { setEditingAlbum(null); setModalOpen(true) }}
              className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 group"
              style={{ borderColor: 'rgba(212,160,23,.15)', color: '#9e7452' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                style={{ background: 'rgba(212,160,23,.05)' }}>
                <Plus size={20} className="group-hover:text-gold-400 transition-colors" />
              </div>
              <span className="text-xs font-body">Album Baru</span>
            </button>
          </div>
        )}
      </main>

      <Footer />

      <AlbumModal isOpen={modalOpen} album={editingAlbum}
        onClose={() => { setModalOpen(false); setEditingAlbum(null) }}
        onSave={handleSave} />

      <UnlockModal isOpen={!!unlockingAlbum} album={unlockingAlbum}
        onUnlock={() => { setUnlockingAlbum(null); if (unlockingAlbum) window.location.href = `/album/${unlockingAlbum.id}` }}
        onClose={() => setUnlockingAlbum(null)} />

      <SetLockModal isOpen={!!lockingAlbum} album={lockingAlbum}
        onSave={handleSetLock} onRemoveLock={handleRemoveLock}
        onClose={() => setLockingAlbum(null)} />
    </div>
  )
}
