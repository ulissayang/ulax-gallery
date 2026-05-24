export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0d0905' }}>
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo mark */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-gold-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-gold-500/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-8 h-8 animate-float" fill="none">
              <path d="M4 8h24M4 16h24M4 24h24" stroke="#d4a017" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="16" r="6" stroke="#d4a017" strokeWidth="1.5" fill="none" />
              <circle cx="16" cy="16" r="2" fill="#d4a017" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="font-display text-xl text-gold-400 italic">MyGallery</p>
          <p className="text-ink-400 text-xs mt-1 font-body">Memuat galeri pribadi...</p>
        </div>
      </div>
    </div>
  )
}
