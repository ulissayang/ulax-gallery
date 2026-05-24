import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, Camera, ChevronDown } from 'lucide-react'
import { showConfirm } from './Alert'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function Navbar({ title = 'MyGallery', subtitle = null }) {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Tutup menu saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    const ok = await showConfirm({
      title: 'Keluar',
      message: 'Kamu akan keluar dari MyGallery. Sampai jumpa lagi! 👋',
      confirmText: 'Ya, Keluar',
    })
    if (!ok) return
    try {
      await signOut()
      navigate('/login')
      toast.success('Berhasil keluar')
    } catch {
      toast.error('Gagal keluar')
    }
  }

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(13,9,5,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212,160,23,0.1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 group"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.3)' }}
            >
              <Camera size={16} style={{ color: '#d4a017' }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg italic" style={{ color: '#d4a017' }}>
                {title}
              </span>
              {subtitle && (
                <span className="text-xs font-body" style={{ color: '#9e7452' }}>{subtitle}</span>
              )}
            </div>
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/5"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ background: 'rgba(212,160,23,0.2)', color: '#d4a017', border: '1px solid rgba(212,160,23,0.3)' }}
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-body hidden sm:block" style={{ color: '#b8987d' }}>
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown
                size={14}
                style={{
                  color: '#9e7452',
                  transition: 'transform 0.2s',
                  transform: menuOpen ? 'rotate(180deg)' : 'none'
                }}
              />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50 card-glass shadow-2xl"
                style={{ border: '1px solid rgba(212,160,23,0.15)' }}
              >
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: 'rgba(212,160,23,0.1)' }}
                >
                  <p className="text-xs font-body" style={{ color: '#9e7452' }}>Masuk sebagai</p>
                  <p className="text-sm font-medium truncate" style={{ color: '#e8ddd3' }}>
                    {user?.email}
                  </p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors hover:bg-white/5"
                    style={{ color: '#b8987d' }}
                  >
                    <Settings size={15} />
                    Pengaturan
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors hover:bg-red-500/10"
                    style={{ color: '#ef4444' }}
                  >
                    <LogOut size={15} />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
