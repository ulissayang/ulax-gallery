import { useState, useEffect } from 'react'
import { HardDrive, RefreshCw, AlertTriangle } from 'lucide-react'
import { checkStorageInfo } from '../lib/b2.js'

export default function StorageIndicator({ expanded = false }) {
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await checkStorageInfo()
      setInfo(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInfo() }, [])

  const getBarColor = (pct) => {
    if (pct >= 90) return '#ef4444'
    if (pct >= 70) return '#f97316'
    return '#d4a017'
  }

  // Compact mode (di header album)
  if (!expanded) {
    return (
      <div className="card-glass rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ border: '1px solid rgba(212,160,23,0.15)', minWidth: 220 }}>
        <HardDrive size={15} style={{ color: '#d4a017', flexShrink: 0 }} />

        {loading ? (
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 rounded-full skeleton" />
            <div className="h-1.5 w-20 rounded-full skeleton" />
          </div>
        ) : error ? (
          <span className="text-xs font-body" style={{ color: '#9e7452' }}>Storage offline</span>
        ) : info ? (
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-body" style={{ color: '#9e7452' }}>Storage</span>
              <span className="text-xs font-mono" style={{ color: getBarColor(info.usedPercent) }}>
                {info.usedPercent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(info.usedPercent, 100)}%`, background: `linear-gradient(90deg, #d4a017, ${getBarColor(info.usedPercent)})` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs font-mono" style={{ color: '#5e3f24' }}>{info.usedFormatted} terpakai</span>
              <span className="text-xs font-mono" style={{ color: '#5e3f24' }}>{info.totalFormatted}</span>
            </div>
          </div>
        ) : null}

        <button onClick={fetchInfo} disabled={loading} className="shrink-0 p-1 rounded transition-colors hover:bg-white/5" style={{ color: '#7c5632' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    )
  }

  // Expanded mode (di SettingsPage)
  return (
    <div className="space-y-4">
      {/* Total summary */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 rounded skeleton" />
            <div className="h-2 rounded skeleton w-3/4" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm font-body" style={{ color: '#f97316' }}>
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        ) : info ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-body font-medium" style={{ color: '#e8ddd3' }}>Total Semua Storage</span>
              <button onClick={fetchInfo} disabled={loading} className="p-1 rounded transition-colors hover:bg-white/5" style={{ color: '#7c5632' }}>
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Main progress bar */}
            <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(info.usedPercent, 100)}%`, background: `linear-gradient(90deg, #d4a017, ${getBarColor(info.usedPercent)})` }} />
            </div>

            <div className="flex justify-between text-xs font-mono" style={{ color: '#9e7452' }}>
              <span>{info.usedFormatted} terpakai</span>
              <span>{info.availableFormatted} tersisa dari {info.totalFormatted}</span>
            </div>

            {/* Warning kalau hampir penuh */}
            {info.usedPercent >= 80 && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs font-body"
                style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }}>
                <AlertTriangle size={12} />
                Storage {info.usedPercent >= 90 ? 'hampir penuh!' : 'mendekati batas.'} Segera tambah storage baru.
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Per storage breakdown */}
      {info?.perStorage?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-body uppercase tracking-widest" style={{ color: '#9e7452' }}>Detail per Storage</p>
          {info.perStorage.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <HardDrive size={14} style={{ color: s.isActive ? '#d4a017' : '#7c5632', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-body font-medium truncate" style={{ color: '#e8ddd3' }}>{s.name}</span>
                  {s.isActive && <span className="text-xs px-1.5 py-0.5 rounded font-body" style={{ background: 'rgba(212,160,23,0.15)', color: '#d4a017', fontSize: 10 }}>Aktif</span>}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${Math.min(s.usedPercent, 100)}%`, background: `linear-gradient(90deg, #d4a017, ${getBarColor(s.usedPercent)})` }} />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono" style={{ color: '#b8987d' }}>{s.usedFormatted}</p>
                <p className="text-xs font-mono" style={{ color: '#5e3f24' }}>/ {s.totalFormatted}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
