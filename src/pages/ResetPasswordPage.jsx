import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const { updatePassword } = useAuthStore()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase sets session from URL hash automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Ready to reset
      }
    })
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Password tidak cocok'); return }
    if (password.length < 8) { setError('Password minimal 8 karakter'); return }
    setLoading(true)
    try {
      await updatePassword(password)
      setDone(true)
      toast.success('Password berhasil diubah!')
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.message || 'Gagal mengubah password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0d0905' }}>
      <div className="w-full max-w-sm card-glass rounded-2xl p-8 page-enter" style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#d4a017' }} />
            <h2 className="font-display text-2xl italic mb-2" style={{ color: '#faf4e8' }}>Berhasil!</h2>
            <p className="text-sm font-body" style={{ color: '#9e7452' }}>Mengalihkan ke galeri...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="font-display text-2xl italic" style={{ color: '#faf4e8' }}>Password Baru</h2>
              <p className="text-sm mt-2 font-body" style={{ color: '#9e7452' }}>Buat password baru yang kuat</p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-body font-medium mb-1.5 uppercase tracking-widest" style={{ color: '#9e7452' }}>Password Baru</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Min. 8 karakter" required className="input-field pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-body font-medium mb-1.5 uppercase tracking-widest" style={{ color: '#9e7452' }}>Konfirmasi Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                  <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} placeholder="Ulangi password" required className="input-field pl-10" />
                </div>
              </div>

              {error && <p className="text-sm text-red-400 font-body">{error}</p>}

              <button type="submit" disabled={loading} className="btn-gold w-full mt-2" style={{ opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
