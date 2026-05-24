import { useEffect, useState } from 'react'
import { Plus, Images, Search, SortAsc } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AlbumCard from '../components/AlbumCard'
import AlbumModal from '../components/AlbumModal'
import useGalleryStore from '../store/galleryStore'
import { showConfirm } from '../components/Alert'

export default function GalleryPage() {
  const { albums, fetchAlbums, createAlbum, updateAlbum, deleteAlbum, loading } = useGalleryStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAlbums().catch(err => toast.error(err.message))
  }, [])

  const handleSave = async (data) => {
    if (editingAlbum) {
      await updateAlbum(editingAlbum.id, {
        title: data.title,
        description: data.description,
        cover_color: data.coverColor,
      })
      toast.success('Album berhasil diperbarui')
    } else {
      await createAlbum(data)
      toast.success('Album baru dibuat!')
    }
  }

  const handleDelete = async (album) => {
    const ok = await showConfirm({
      title: 'Hapus Album',
      message: `Hapus album "${album.title}"? Semua foto dan video di dalamnya akan ikut terhapus permanen.`,
      confirmText: 'Ya, Hapus',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteAlbum(album.id)
      toast.success('Album dihapus')
    } catch (err) {
      toast.error('Gagal menghapus album: ' + err.message)
    }
  }

  const openCreate = () => { setEditingAlbum(null); setModalOpen(true) }
  const openEdit = (album) => { setEditingAlbum(album); setModalOpen(true) }

  const filtered = albums.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalMedia = albums.reduce((sum, a) => sum + (a.media_items?.[0]?.count ?? 0), 0)

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-enter">
        {/* Hero header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] mb-2" style={{ color: '#d4a017' }}>Galeri Pribadi</p>
              <h1 className="font-display text-4xl md:text-5xl italic" style={{ color: '#faf4e8', lineHeight: 1.1 }}>
                Album-album<br />
                <span style={{ color: '#d4a017' }}>kenangan</span>
              </h1>
              <div className="deco-line w-32 mt-4" />
              <p className="mt-3 text-sm font-body" style={{ color: '#9e7452' }}>
                {albums.length} album · {totalMedia} media tersimpan
              </p>
            </div>

            <button onClick={openCreate} className="btn-gold flex items-center gap-2 self-start sm:self-auto">
              <Plus size={16} />
              Album Baru
            </button>
          </div>

          {/* Search */}
          {albums.length > 0 && (
            <div className="relative mt-6 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari album..."
                className="input-field pl-10 text-sm"
              />
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && albums.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-xl skeleton" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && albums.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 animate-float" style={{ background: 'rgba(212,160,23,0.08)', border: '1px dashed rgba(212,160,23,0.25)' }}>
              <Images size={36} style={{ color: 'rgba(212,160,23,0.5)' }} />
            </div>
            <h2 className="font-display text-2xl italic mb-2" style={{ color: '#e8ddd3' }}>Belum ada album</h2>
            <p className="text-sm font-body mb-6 max-w-xs" style={{ color: '#9e7452' }}>
              Buat album pertamamu dan mulai simpan kenangan berharga
            </p>
            <button onClick={openCreate} className="btn-gold flex items-center gap-2">
              <Plus size={16} />
              Buat Album Pertama
            </button>
          </div>
        )}

        {/* No results */}
        {!loading && albums.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="font-body" style={{ color: '#9e7452' }}>Tidak ada album yang cocok dengan "<strong>{search}</strong>"</p>
          </div>
        )}

        {/* Album grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((album, i) => (
              <div key={album.id} style={{ animationDelay: `${i * 0.05}s` }} className="animate-fade-in">
                <AlbumCard
                  album={album}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}

            {/* Add album card */}
            <button
              onClick={openCreate}
              className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 group"
              style={{ borderColor: 'rgba(212,160,23,0.15)', color: '#9e7452' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-gold-500/10" style={{ background: 'rgba(212,160,23,0.05)' }}>
                <Plus size={20} className="group-hover:text-gold-400 transition-colors" style={{ color: '#9e7452' }} />
              </div>
              <span className="text-xs font-body group-hover:text-gold-400 transition-colors">Album Baru</span>
            </button>
          </div>
        )}
      </main>
      <Footer />

      {/* Album modal */}
      <AlbumModal
        isOpen={modalOpen}
        album={editingAlbum}
        onClose={() => { setModalOpen(false); setEditingAlbum(null) }}
        onSave={handleSave}
      />
    </div>
  )
}
