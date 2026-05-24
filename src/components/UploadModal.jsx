import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, ImageIcon, Film, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { uploadToMega, formatFileSize, isVideo } from '../lib/mega'
import useGalleryStore from '../store/galleryStore'
import toast from 'react-hot-toast'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ACCEPTED_TYPES = {
  'image/jpeg': [], 'image/png': [], 'image/webp': [],
  'image/gif': [], 'image/heic': [], 'image/heif': [],
  'video/mp4': [], 'video/quicktime': [], 'video/webm': [],
  'video/x-matroska': [], 'video/avi': [],
}

export default function UploadModal({ isOpen, albumId, onClose }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const { addMediaItem, setUploadProgress, clearUploadProgress } = useGalleryStore()

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file ditolak (format tidak didukung atau terlalu besar)`)
    }
    const newFiles = accepted.map(f => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      status: 'pending',
      progress: 0,
      error: null,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  })

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id))

  const startUpload = async () => {
    const pending = files.filter(f => f.status === 'pending')
    if (!pending.length) return

    setUploading(true)

    for (const fileItem of pending) {
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' } : f))

      try {
        const result = await uploadToMega(
          fileItem.file,
          albumId,
          (progress) => {
            setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress } : f))
            setUploadProgress(fileItem.id, progress)
          }
        )

        await addMediaItem({
          album_id: albumId,
          mega_node_id: result.nodeId, // sekarang berisi storage path
          file_name: fileItem.file.name,
          file_size: fileItem.file.size,
          mime_type: fileItem.file.type,
          type: isVideo(fileItem.file.type) ? 'video' : 'image',
          title: fileItem.file.name.replace(/\.[^/.]+$/, ''),
        })

        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'done', progress: 100 } : f))
        clearUploadProgress(fileItem.id)

      } catch (err) {
        console.error('Upload error:', err)
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: err.message } : f))
        clearUploadProgress(fileItem.id)
      }
    }

    setUploading(false)
    const doneCount = files.filter(f => f.status === 'done').length
    if (doneCount > 0) toast.success(`${pending.length} file berhasil diupload!`)
  }

  const handleClose = () => {
    if (uploading) return
    setFiles([])
    onClose()
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const hasPending = files.some(f => f.status === 'pending')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }} onClick={handleClose} />

      <div className="relative w-full max-w-lg card-glass rounded-2xl overflow-hidden shadow-2xl page-enter" style={{ border: '1px solid rgba(212,160,23,0.15)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(212,160,23,0.1)' }}>
          <div className="flex items-center gap-2">
            <Upload size={18} style={{ color: '#d4a017' }} />
            <h2 className="font-display text-lg italic" style={{ color: '#faf4e8' }}>Upload Media</h2>
          </div>
          <button onClick={handleClose} disabled={uploading} className="btn-ghost p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Dropzone */}
          {!uploading && (
            <div
              {...getRootProps()}
              className="relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center py-10 px-6"
              style={{
                borderColor: isDragActive ? '#d4a017' : 'rgba(212,160,23,0.2)',
                background: isDragActive ? 'rgba(212,160,23,0.05)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)' }}>
                  <Upload size={22} style={{ color: isDragActive ? '#d4a017' : '#9e7452' }} />
                </div>
                <div>
                  <p className="font-body font-medium" style={{ color: '#e8ddd3' }}>
                    {isDragActive ? 'Lepas file di sini!' : 'Drag & drop atau klik untuk memilih'}
                  </p>
                  <p className="text-sm mt-1 font-body" style={{ color: '#9e7452' }}>
                    Foto & Video • Maks. 500MB per file
                  </p>
                  <p className="text-xs mt-1 font-body" style={{ color: '#5e3f24' }}>
                    JPG, PNG, WEBP, GIF, HEIC, MP4, MOV, MKV, WebM
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {files.map(fileItem => (
                <div key={fileItem.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: isVideo(fileItem.file.type) ? 'rgba(139,92,246,0.15)' : 'rgba(212,160,23,0.1)' }}>
                    {isVideo(fileItem.file.type)
                      ? <Film size={16} style={{ color: '#a78bfa' }} />
                      : <ImageIcon size={16} style={{ color: '#d4a017' }} />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body truncate" style={{ color: '#e8ddd3' }}>{fileItem.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono" style={{ color: '#9e7452' }}>{formatFileSize(fileItem.file.size)}</span>
                      {fileItem.status === 'uploading' && (
                        <span className="text-xs font-body" style={{ color: '#d4a017' }}>{fileItem.progress}%</span>
                      )}
                      {fileItem.status === 'error' && (
                        <span className="text-xs text-red-400 font-body truncate">{fileItem.error}</span>
                      )}
                    </div>
                    {fileItem.status === 'uploading' && (
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${fileItem.progress}%`, background: 'linear-gradient(90deg, #d4a017, #e8b84b)' }} />
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {fileItem.status === 'pending' && !uploading && (
                      <button onClick={() => removeFile(fileItem.id)} className="text-ink-500 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                    {fileItem.status === 'uploading' && <Loader size={16} className="animate-spin" style={{ color: '#d4a017' }} />}
                    {fileItem.status === 'done' && <CheckCircle size={16} style={{ color: '#4ade80' }} />}
                    {fileItem.status === 'error' && <AlertCircle size={16} style={{ color: '#ef4444' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {allDone ? (
              <button onClick={handleClose} className="btn-gold flex-1">Selesai ✓</button>
            ) : (
              <>
                <button onClick={handleClose} disabled={uploading} className="btn-ghost flex-1">Batal</button>
                <button
                  onClick={startUpload}
                  disabled={!hasPending || uploading}
                  className="btn-gold flex-1 flex items-center justify-center gap-2"
                  style={{ opacity: (!hasPending || uploading) ? 0.5 : 1 }}
                >
                  {uploading
                    ? <><Loader size={15} className="animate-spin" /> Mengupload...</>
                    : <><Upload size={15} /> Upload {hasPending ? `(${files.filter(f => f.status === 'pending').length})` : ''}</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
