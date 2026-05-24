import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Edit2, Trash2, Images, Film } from 'lucide-react'

const COVER_COLORS = [
  { id: 'gold', from: '#d4a017', to: '#7c5632' },
  { id: 'rose', from: '#be185d', to: '#7c3aed' },
  { id: 'teal', from: '#0d9488', to: '#0c4a6e' },
  { id: 'slate', from: '#475569', to: '#0f172a' },
  { id: 'amber', from: '#d97706', to: '#92400e' },
  { id: 'violet', from: '#7c3aed', to: '#1e1b4b' },
]

export function getCoverGradient(colorId) {
  const found = COVER_COLORS.find(c => c.id === colorId) || COVER_COLORS[0]
  return `linear-gradient(135deg, ${found.from}, ${found.to})`
}

export { COVER_COLORS }

export default function AlbumCard({ album, onEdit, onDelete }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const count = album.media_items?.[0]?.count ?? 0

  return (
    <div className="group relative">
      {/* Card */}
      <button
        onClick={() => navigate(`/album/${album.id}`)}
        className="w-full text-left media-card aspect-square"
        style={{ background: getCoverGradient(album.cover_color) }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />

        {/* Pattern decoration */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />

        {/* Count badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-body font-medium" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.9)' }}>
          <Images size={11} />
          {count}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display text-lg italic text-white leading-tight mb-1 line-clamp-2">
            {album.title}
          </h3>
          {album.description && (
            <p className="text-xs font-body text-white/60 line-clamp-1">{album.description}</p>
          )}
          <p className="text-xs font-mono mt-2 text-white/40">
            {new Date(album.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </button>

      {/* Context menu button */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white' }}
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-40 rounded-xl overflow-hidden z-20 card-glass shadow-xl" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(album) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors hover:bg-white/5"
                  style={{ color: '#b8987d' }}
                >
                  <Edit2 size={13} /> Edit Album
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(album) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors hover:bg-red-500/10"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={13} /> Hapus Album
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
