import { useState } from 'react'
import { AlertTriangle, CheckCircle, Info, Trash2, X } from 'lucide-react'

// ─── Global Alert State ───────────────────────────────────────
let resolveRef = null

export function useAlert() {
  return { confirm: showConfirm, alert: showAlert, success: showSuccess }
}

// Simple event-based system
const listeners = new Set()
function emit(payload) {
  listeners.forEach(fn => fn(payload))
}

export function showConfirm({ title, message, confirmText = 'Ya, Lanjutkan', cancelText = 'Batal', danger = false }) {
  return new Promise((resolve) => {
    resolveRef = resolve
    emit({ type: 'confirm', title, message, confirmText, cancelText, danger, resolve })
  })
}

export function showAlert({ title, message, type = 'info' }) {
  return new Promise((resolve) => {
    emit({ type: 'alert', title, message, alertType: type, resolve })
  })
}

export function showSuccess(message) {
  return new Promise((resolve) => {
    emit({ type: 'alert', title: 'Berhasil', message, alertType: 'success', resolve })
  })
}

// ─── Alert Provider (taruh di App.jsx) ───────────────────────
export function AlertProvider() {
  const [dialog, setDialog] = useState(null)

  useState(() => {
    const handler = (payload) => setDialog(payload)
    listeners.add(handler)
    return () => listeners.delete(handler)
  })

  // Subscribe to events
  if (typeof window !== 'undefined' && !window.__alertListenerAdded) {
    window.__alertListenerAdded = true
  }

  const handleResolve = (value) => {
    if (dialog?.resolve) dialog.resolve(value)
    setDialog(null)
  }

  if (!dialog) return null

  const icons = {
    success: <CheckCircle size={22} style={{ color: '#4ade80' }} />,
    danger: <Trash2 size={22} style={{ color: '#ef4444' }} />,
    warning: <AlertTriangle size={22} style={{ color: '#f97316' }} />,
    info: <Info size={22} style={{ color: '#60a5fa' }} />,
  }

  const isConfirm = dialog.type === 'confirm'
  const iconType = dialog.danger ? 'danger' : dialog.alertType || 'info'

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={() => !isConfirm && handleResolve(false)}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm card-glass rounded-2xl overflow-hidden shadow-2xl"
        style={{
          border: dialog.danger
            ? '1px solid rgba(239,68,68,0.25)'
            : '1px solid rgba(212,160,23,0.15)',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Top accent line */}
        <div className="h-1" style={{
          background: dialog.danger
            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
            : dialog.alertType === 'success'
            ? 'linear-gradient(90deg, #4ade80, #22c55e)'
            : 'linear-gradient(90deg, #d4a017, #e8b84b)',
        }} />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
              background: dialog.danger
                ? 'rgba(239,68,68,0.12)'
                : dialog.alertType === 'success'
                ? 'rgba(74,222,128,0.12)'
                : 'rgba(212,160,23,0.12)',
            }}>
              {icons[iconType]}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg italic" style={{ color: '#faf4e8' }}>
                {dialog.title}
              </h3>
              {dialog.message && (
                <p className="text-sm font-body mt-1" style={{ color: '#9e7452' }}>
                  {dialog.message}
                </p>
              )}
            </div>
            {!isConfirm && (
              <button onClick={() => handleResolve(false)} className="shrink-0 p-1 rounded-lg hover:bg-white/5" style={{ color: '#7c5632' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Buttons */}
          <div className={`flex gap-3 ${isConfirm ? '' : 'justify-end'}`}>
            {isConfirm && (
              <button
                onClick={() => handleResolve(false)}
                className="btn-ghost flex-1 text-sm"
              >
                {dialog.cancelText || 'Batal'}
              </button>
            )}
            <button
              onClick={() => handleResolve(true)}
              className={`${isConfirm ? 'flex-1' : 'px-5'} py-2.5 rounded-lg text-sm font-body font-medium transition-all`}
              style={dialog.danger
                ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }
                : { background: 'linear-gradient(135deg, #d4a017, #e8b84b)', color: '#0d0905' }
              }
            >
              {isConfirm ? (dialog.confirmText || 'Ya') : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
