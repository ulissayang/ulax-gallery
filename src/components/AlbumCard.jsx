import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Edit2, Trash2, Images, Lock, Unlock, ShieldCheck } from 'lucide-react'
import { isAlbumUnlocked } from '../lib/lockUtils'

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

export default function AlbumCard({ album, onEdit, onDelete, onLock, onUnlock }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const count = album.media_items?.[0]?.count ?? 0
  const unlocked = isAlbumUnlocked(album.id)
  const isLocked = album.is_locked && !unlocked

  const handleClick = () => {
    if (isLocked) {
      onUnlock?.(album)
      return
    }
    navigate(`/album/${album.id}`)
  }

  return (
    <div className="group relative">
      <button
        onClick={handleClick}
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

        {/* LOCKED overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: 'rgba(212,160,23,0.2)', border: '1px solid rgba(212,160,23,0.4)' }}>
              <Lock size={24} style={{ color: '#d4a017' }} />
            </div>
            <p className="text-xs font-body font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>Ketuk untuk buka</p>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {album.is_locked && (
            <div className="flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: unlocked ? 'rgba(74,222,128,0.3)' : 'rgba(212,160,23,0.3)', backdropFilter: 'blur(8px)' }}>
              {unlocked
                ? <Unlock size={12} style={{ color: '#4ade80' }} />
                : <Lock size={12} style={{ color: '#d4a017' }} />
              }
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-body"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.9)' }}>
            <Images size={11} />
            {count}
          </div>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display text-lg italic text-white leading-tight mb-1 line-clamp-2">
            {album.title}
          </h3>
          {album.description && !isLocked && (
            <p className="text-xs font-body text-white/60 line-clamp-1">{album.description}</p>
          )}
          <p className="text-xs font-mono mt-2 text-white/40">
            {new Date(album.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </button>

      {/* Context menu */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', color: 'white' }}
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl overflow-hidden z-20 card-glass shadow-xl"
                style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(album) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors hover:bg-white/5"
                  style={{ color: '#b8987d' }}>
                  <Edit2 size={13} /> Edit Album
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onLock?.(album) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors hover:bg-white/5"
                  style={{ color: album.is_locked ? '#a78bfa' : '#60a5fa' }}>
                  {album.is_locked
                    ? <><ShieldCheck size={13} /> Ubah PIN</>
                    : <><Lock size={13} /> Kunci Album</>
                  }
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(album) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors hover:bg-red-500/10"
                  style={{ color: '#ef4444' }}>
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
