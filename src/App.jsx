import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

import LoginPage from './pages/LoginPage'
import GalleryPage from './pages/GalleryPage'
import AlbumPage from './pages/AlbumPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SettingsPage from './pages/SettingsPage'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'
import { AlertProvider } from './components/Alert'

export default function App() {
  const { initialize, loading } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <BrowserRouter>
      <AlertProvider />
      {/* Grain overlay for texture */}
      <div className="grain-overlay" aria-hidden="true" />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1108',
            color: '#e8ddd3',
            border: '1px solid rgba(212,160,23,0.2)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#d4a017', secondary: '#0d0905' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0d0905' },
          },
        }}
      />

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <GalleryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/album/:albumId"
          element={
            <ProtectedRoute>
              <AlbumPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
