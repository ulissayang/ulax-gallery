import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail, Camera, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const { signIn, user, resetPassword } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (user) navigate('/')
  }, [user])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email atau password salah. Coba lagi.'
        : err.message || 'Terjadi kesalahan, coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!email) { setError('Masukkan email terlebih dahulu'); return }
    setLoading(true)
    try {
      await resetPassword(email)
      setResetSent(true)
      toast.success('Link reset password dikirim ke email kamu')
    } catch (err) {
      setError(err.message || 'Gagal mengirim email reset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Atmospheric background */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(212,160,23,0.05) 0%, transparent 50%), #0d0905' }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            background: '#d4a017',
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float ${4 + i}s ease-in-out infinite`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}

      {/* Decorative corner frames */}
      <div className="absolute top-8 left-8 w-16 h-16 opacity-20" style={{ borderTop: '2px solid #d4a017', borderLeft: '2px solid #d4a017' }} />
      <div className="absolute top-8 right-8 w-16 h-16 opacity-20" style={{ borderTop: '2px solid #d4a017', borderRight: '2px solid #d4a017' }} />
      <div className="absolute bottom-8 left-8 w-16 h-16 opacity-20" style={{ borderBottom: '2px solid #d4a017', borderLeft: '2px solid #d4a017' }} />
      <div className="absolute bottom-8 right-8 w-16 h-16 opacity-20" style={{ borderBottom: '2px solid #d4a017', borderRight: '2px solid #d4a017' }} />

      {/* Card */}
      <div className="relative w-full max-w-md page-enter">
        <div className="card-glass rounded-2xl p-8 shadow-2xl" style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,160,23,0.1)' }}>
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 mx-auto" style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.25)' }}>
              <Camera size={28} style={{ color: '#d4a017' }} />
            </div>
            <h1 className="font-display text-3xl italic mb-1" style={{ color: '#faf4e8' }}>
              MyGallery
            </h1>
            <div className="deco-line w-24 mx-auto my-3" />
            <p className="text-sm font-body" style={{ color: '#9e7452' }}>
              {forgotMode ? 'Reset password akun kamu' : 'Galeri Pribadi · Masuk untuk melanjutkan'}
            </p>
          </div>

          {/* Reset sent state */}
          {resetSent ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-4">📬</div>
              <p className="font-body mb-2" style={{ color: '#e8ddd3' }}>Email terkirim!</p>
              <p className="text-sm mb-6" style={{ color: '#9e7452' }}>Cek inbox <strong>{email}</strong> untuk link reset password.</p>
              <button onClick={() => { setForgotMode(false); setResetSent(false) }} className="btn-ghost text-sm">
                ← Kembali ke Login
              </button>
            </div>
          ) : (
            <form onSubmit={forgotMode ? handleReset : handleLogin} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-xs font-body font-medium mb-1.5" style={{ color: '#9e7452', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="kamu@email.com"
                    required
                    className="input-field pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password field */}
              {!forgotMode && (
                <div>
                  <label className="block text-xs font-body font-medium mb-1.5" style={{ color: '#9e7452', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7c5632' }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      required
                      className="input-field pl-10 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#7c5632' }}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg text-sm font-body" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full flex items-center justify-center gap-2 mt-2"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-ink-800/40 border-t-ink-800 rounded-full animate-spin" />
                    {forgotMode ? 'Mengirim...' : 'Masuk...'}
                  </>
                ) : (
                  forgotMode ? 'Kirim Link Reset' : 'Masuk ke Galeri'
                )}
              </button>

              {/* Toggle forgot */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setForgotMode(!forgotMode); setError('') }}
                  className="text-sm font-body transition-colors"
                  style={{ color: '#9e7452' }}
                >
                  {forgotMode ? '← Kembali ke Login' : 'Lupa password?'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs mt-6 font-body" style={{ color: '#5e3f24' }}>
          Akses terbatas • Galeri Pribadi
        </p>
      </div>
    </div>
  )
}
