import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { deleteFromMega } from '../lib/mega'

const useGalleryStore = create((set, get) => ({
  albums: [],
  currentAlbum: null,
  mediaItems: [],
  loading: false,
  uploadProgress: {},

  // ─── ALBUMS ───────────────────────────────────────────────

  fetchAlbums: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('albums')
      .select('*, media_items!media_items_album_id_fkey(count)')
      .order('created_at', { ascending: false })
    if (error) throw error
    set({ albums: data || [], loading: false })
    return data
  },

  createAlbum: async ({ title, description, coverColor }) => {
    const { data, error } = await supabase
      .from('albums')
      .insert({ title, description, cover_color: coverColor })
      .select()
      .single()
    if (error) throw error
    set(state => ({ albums: [data, ...state.albums] }))
    return data
  },

  updateAlbum: async (id, updates) => {
    const { data, error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set(state => ({
      albums: state.albums.map(a => a.id === id ? data : a),
      currentAlbum: state.currentAlbum?.id === id ? data : state.currentAlbum,
    }))
    return data
  },

  deleteAlbum: async (id) => {
    const { data: mediaItems } = await supabase
      .from('media_items')
      .select('mega_node_id')
      .eq('album_id', id)

    if (mediaItems?.length > 0) {
      await Promise.allSettled(
        mediaItems.map(item => deleteFromMega(item.mega_node_id))
      )
    }

    const { error } = await supabase.from('albums').delete().eq('id', id)
    if (error) throw error
    set(state => ({
      albums: state.albums.filter(a => a.id !== id),
      currentAlbum: state.currentAlbum?.id === id ? null : state.currentAlbum,
    }))
  },

  setCurrentAlbum: (album) => set({ currentAlbum: album, mediaItems: [] }),

  // ─── MEDIA ITEMS ──────────────────────────────────────────

  fetchMediaItems: async (albumId) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })
    if (error) throw error
    set({ mediaItems: data || [], loading: false })
    return data
  },

  addMediaItem: async (mediaData) => {
    const { data, error } = await supabase
      .from('media_items')
      .insert(mediaData)
      .select()
      .single()
    if (error) throw error
    set(state => ({ mediaItems: [data, ...state.mediaItems] }))
    return data
  },

  updateMediaItem: async (id, updates) => {
    const { data, error } = await supabase
      .from('media_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set(state => ({
      mediaItems: state.mediaItems.map(m => m.id === id ? data : m),
    }))
    return data
  },

  deleteMediaItem: async (item) => {
    await deleteFromMega(item.mega_node_id)
    const { error } = await supabase.from('media_items').delete().eq('id', item.id)
    if (error) throw error
    set(state => ({
      mediaItems: state.mediaItems.filter(m => m.id !== item.id),
    }))
  },

  setUploadProgress: (fileId, progress) => {
    set(state => ({ uploadProgress: { ...state.uploadProgress, [fileId]: progress } }))
  },

  clearUploadProgress: (fileId) => {
    set(state => {
      const next = { ...state.uploadProgress }
      delete next[fileId]
      return { uploadProgress: next }
    })
  },
}))

export default useGalleryStore
