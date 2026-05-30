import { useState, useRef, useEffect } from 'react'
import { Lock, Unlock, Eye, EyeOff, X, ShieldCheck, KeyRound, Trash2 } from 'lucide-react'
import { hashPin, verifyPin, grantAlbumUnlock } from '../lib/lockUtils'
import toast from 'react-hot-toast'

// ─── PIN Input Component ──────────────────────────────────────
function PinInput({ length = 6, onChange, disabled }) {
  const [pins, setPins] = useState(Array(length).fill(''))
  const inputs = useRef([])

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return // hanya angka
    const newPins = [...pins]
    newPins[i] = val.slice(-1)
    setPins(newPins)
    onChange(newPins.join(''))
    // Auto focus next
    if (val && i < length - 1) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !pins[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    const newPins = Array(length).fill('')
    pasted.split('').forEach((c, i) => { newPins[i] = c })
    setPins(newPins)
    onChange(newPins.join(''))
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
    e.preventDefault()
  }

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  return (
    <div className="flex gap-2 justify-center">
      {pins.map((pin, i) => (
        <input
          key={i}
          ref={el => inputs.current[i] = el}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={pin}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-11 h-12 text-center text-lg font-mono rounded-xl outline-none transition-all duration-200"
          style={{
            background: pin ? 'rgba(212,160,23,0.1)' : 'rgba(255,255,255,0.04)',
            border: pin ? '1px solid rgba(212,160,23,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: '#e8ddd3',
            caretColor: '#d4a017',
          }}
        />
      ))}
    </div>
  )
}

// ─── MODAL: Buka kunci album ──────────────────────────────────
export function UnlockModal({ isOpen, album, onUnlock, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 5

  useEffect(() => {
    if (isOpen) { setPin(''); setError(''); setAttempts(0) }
  }, [isOpen])

  const handleUnlock = async () => {
    if (pin.length < 4) { setError('PIN kurang dari 4 digit'); return }
    setLoading(true)
    setError('')

    try {
      const valid = await verifyPin(pin, album.lock_hash)
      if (valid) {
        grantAlbumUnlock(album.id)
        toast.success('Album berhasil dibuka! 🔓')
        onUnlock()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= maxAttempts) {
          setError(`PIN salah ${maxAttempts}x. Coba lagi nanti.`)
        } else {
          setError(`PIN salah. Sisa percobaan: ${maxAttempts - newAttempts}`)
        }
        setPin('')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !album) return null

  const isBlocked = attempts >= maxAttempts

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} />

      <div className="relative w-full max-w-sm card-glass rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(212,160,23,0.2)' }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #d4a017, #e8b84b)' }} />

        <div className="p-6 text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.25)' }}>
            <Lock size={28} style={{ color: '#d4a017' }} />
          </div>

          <h2 className="font-display text-2xl italic mb-1" style={{ color: '#faf4e8' }}>Album Terkunci</h2>
          <p className="text-sm font-body mb-1" style={{ color: '#9e7452' }}>
            <strong style={{ color: '#d4a017' }}>{album.title}</strong>
          </p>
          {album.lock_hint && (
            <p className="text-xs font-body mb-4 px-4 py-2 rounded-lg" style={{ color: '#b8987d', background: 'rgba(255,255,255,0.03)' }}>
              💡 Petunjuk: {album.lock_hint}
            </p>
          )}

          <p className="text-sm font-body mb-5" style={{ color: '#7c5632' }}>
            Masukkan PIN {album.lock_type === 'password' ? 'password' : '6 digit'} untuk membuka
          </p>

          {/* PIN Input */}
          {!isBlocked && (
            <div className="mb-4">
              <PinInput
                length={album.lock_type === 'password' ? 6 : 6}
                onChange={setPin}
                disabled={loading}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm font-body mb-4" style={{ color: '#fca5a5' }}>{error}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1 text-sm">Batal</button>
            {!isBlocked && (
              <button
                onClick={handleUnlock}
                disabled={pin.length < 4 || loading}
                className="btn-gold flex-1 text-sm flex items-center justify-center gap-2"
                style={{ opacity: (pin.length < 4 || loading) ? 0.6 : 1 }}
              >
                {loading ? 'Memverifikasi...' : <><Unlock size={14} /> Buka</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL: Set/ubah kunci album ──────────────────────────────
export function SetLockModal({ isOpen, album, onSave, onRemoveLock, onClose }) {
  const [mode, setMode] = useState('set') // set | verify-current
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [hint, setHint] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1=masukkan PIN, 2=konfirmasi PIN

  const isEditMode = !!album?.is_locked

  useEffect(() => {
    if (isOpen) {
      setPin(''); setConfirmPin(''); setCurrentPin('')
      setHint(album?.lock_hint || ''); setError('')
      setStep(1); setMode(isEditMode ? 'verify-current' : 'set')
    }
  }, [isOpen, album])

  const handleVerifyCurrent = async () => {
    if (!currentPin) { setError('Masukkan PIN saat ini'); return }
    setLoading(true)
    const valid = await verifyPin(currentPin, album.lock_hash)
    setLoading(false)
    if (!valid) { setError('PIN salah'); return }
    setMode('set'); setStep(1); setError('')
  }

  const handleSave = async () => {
    if (pin.length < 4) { setError('PIN minimal 4 digit'); return }
    if (pin !== confirmPin) { setError('PIN tidak cocok'); return }
    setLoading(true)
    try {
      const hash = await hashPin(pin)
      await onSave({ lockHash: hash, lockHint: hint, lockType: 'pin' })
      toast.success(isEditMode ? 'PIN berhasil diubah!' : 'Album berhasil dikunci! 🔒')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLock = async () => {
    setLoading(true)
    try {
      await onRemoveLock()
      toast.success('Kunci album dihapus')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={!loading ? onClose : undefined} />

      <div className="relative w-full max-w-sm card-glass rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(212,160,23,0.2)' }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #7c3aed, #d4a017)' }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <KeyRound size={18} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2 className="font-display text-lg italic" style={{ color: '#faf4e8' }}>
                  {isEditMode ? 'Ubah Kunci' : 'Kunci Album'}
                </h2>
                <p className="text-xs font-body" style={{ color: '#9e7452' }}>{album?.title}</p>
              </div>
            </div>
            <button onClick={!loading ? onClose : undefined} className="btn-ghost p-1.5 rounded-lg">
              <X size={16} />
            </button>
          </div>

          {/* Step: Verifikasi PIN lama */}
          {mode === 'verify-current' && (
            <div className="space-y-4">
              <p className="text-sm font-body text-center" style={{ color: '#9e7452' }}>
                Masukkan PIN saat ini untuk melanjutkan
              </p>
              <PinInput length={6} onChange={setCurrentPin} disabled={loading} />
              {error && <p className="text-sm font-body text-center" style={{ color: '#fca5a5' }}>{error}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="btn-ghost flex-1 text-sm">Batal</button>
                <button onClick={handleVerifyCurrent} disabled={loading || currentPin.length < 4}
                  className="btn-gold flex-1 text-sm" style={{ opacity: (loading || currentPin.length < 4) ? 0.6 : 1 }}>
                  {loading ? 'Memverifikasi...' : 'Lanjut'}
                </button>
              </div>
              {isEditMode && (
                <button onClick={handleRemoveLock} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-body transition-colors hover:bg-red-500/10"
                  style={{ color: '#ef4444' }}>
                  <Trash2 size={13} /> Hapus Kunci Album
                </button>
              )}
            </div>
          )}

          {/* Step 1: Buat PIN baru */}
          {mode === 'set' && step === 1 && (
            <div className="space-y-4">
              <p className="text-sm font-body text-center" style={{ color: '#9e7452' }}>
                Buat PIN 6 digit untuk mengunci album ini
              </p>
              <PinInput length={6} onChange={setPin} disabled={loading} />
              {error && <p className="text-sm font-body text-center" style={{ color: '#fca5a5' }}>{error}</p>}
              <button
                onClick={() => { if (pin.length < 4) { setError('Min. 4 digit'); return } setError(''); setStep(2) }}
                disabled={pin.length < 4}
                className="btn-gold w-full text-sm"
                style={{ opacity: pin.length < 4 ? 0.6 : 1 }}>
                Lanjut →
              </button>
            </div>
          )}

          {/* Step 2: Konfirmasi PIN */}
          {mode === 'set' && step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-body text-center" style={{ color: '#9e7452' }}>
                Konfirmasi PIN kamu
              </p>
              <PinInput length={6} onChange={setConfirmPin} disabled={loading} />

              {/* Petunjuk PIN (opsional) */}
              <div>
                <button onClick={() => setShowHint(!showHint)}
                  className="text-xs font-body w-full text-left" style={{ color: '#7c5632' }}>
                  {showHint ? '▼' : '▶'} Tambah petunjuk PIN (opsional)
                </button>
                {showHint && (
                  <input value={hint} onChange={e => setHint(e.target.value)}
                    placeholder="Mis. Tanggal ulang tahun, nama hewan peliharaan..."
                    className="input-field text-sm mt-2" maxLength={50} />
                )}
              </div>

              {error && <p className="text-sm font-body text-center" style={{ color: '#fca5a5' }}>{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setConfirmPin(''); setError('') }}
                  className="btn-ghost flex-1 text-sm">← Kembali</button>
                <button onClick={handleSave} disabled={confirmPin.length < 4 || loading}
                  className="btn-gold flex-1 text-sm flex items-center justify-center gap-2"
                  style={{ opacity: (confirmPin.length < 4 || loading) ? 0.6 : 1 }}>
                  {loading ? 'Menyimpan...' : <><ShieldCheck size={14} /> Kunci Album</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
