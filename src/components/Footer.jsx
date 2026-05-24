export default function Footer() {
  const currentYear = new Date().getFullYear()
  const startYear = 2026

  return (
    <footer className="w-full mt-auto py-4 px-4" style={{ borderTop: '1px solid rgba(212,160,23,0.08)' }}>
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <p className="text-xs font-body text-center" style={{ color: '#5e3f24' }}>
          Dibuat dengan{' '}
          <span style={{ color: '#ef4444' }}>❤️</span>
          {' '}oleh{' '}
          <span style={{ color: '#d4a017' }} className="font-medium">Ulis Sayang</span>
          {' '}·{' '}
          {startYear === currentYear ? currentYear : `${startYear}–${currentYear}`}
        </p>
      </div>
    </footer>
  )
}
