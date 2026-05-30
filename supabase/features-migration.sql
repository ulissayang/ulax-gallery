-- ============================================================
-- Migration: New Features
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Tambah kolom ke media_items
ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS is_favorite  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS taken_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location     TEXT,
  ADD COLUMN IF NOT EXISTS width        INTEGER,
  ADD COLUMN IF NOT EXISTS height       INTEGER;

-- Tambah kolom ke albums  
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS cover_item_id UUID REFERENCES public.media_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count   INTEGER DEFAULT 0;

-- Tabel share links
CREATE TABLE IF NOT EXISTS public.share_links (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  album_id    UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ,
  view_count  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_links_owner" ON public.share_links
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_media_favorite ON public.media_items(album_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_media_tags ON public.media_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_share_token ON public.share_links(token);
