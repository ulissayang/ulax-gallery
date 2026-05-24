-- ============================================================
-- Migration: Tambah tabel storage_configs
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabel storage configs
CREATE TABLE IF NOT EXISTS public.storage_configs (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  provider      TEXT NOT NULL DEFAULT 'b2',
  endpoint      TEXT NOT NULL,
  bucket_name   TEXT NOT NULL,
  region        TEXT NOT NULL DEFAULT 'us-east-005',
  key_id        TEXT NOT NULL,
  app_key       TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT false,
  total_bytes   BIGINT DEFAULT 10737418240,  -- 10GB default
  used_bytes    BIGINT DEFAULT 0,
  color         TEXT DEFAULT 'gold',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.storage_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_configs_owner" ON public.storage_configs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER trg_storage_configs_updated_at
  BEFORE UPDATE ON public.storage_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger set user_id
CREATE TRIGGER trg_storage_configs_user_id
  BEFORE INSERT ON public.storage_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- Index
CREATE INDEX IF NOT EXISTS idx_storage_configs_user ON public.storage_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_configs_active ON public.storage_configs(user_id, is_active);

-- Tambah kolom ke media_items untuk track file ada di storage mana
ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS storage_config_id UUID REFERENCES public.storage_configs(id) ON DELETE SET NULL;

-- Function: set only one active config per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.storage_configs
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_single_active_storage
  AFTER INSERT OR UPDATE ON public.storage_configs
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_storage();

-- ─── Pastikan app_key tidak kosong ───────────────────────────
ALTER TABLE public.storage_configs
  ADD CONSTRAINT check_key_id_not_empty CHECK (char_length(key_id) > 0),
  ADD CONSTRAINT check_app_key_not_empty CHECK (char_length(app_key) > 0);

-- ─── View untuk stats per storage ────────────────────────────
CREATE OR REPLACE VIEW public.storage_stats AS
SELECT
  sc.id,
  sc.name,
  sc.user_id,
  sc.is_active,
  sc.total_bytes,
  sc.used_bytes,
  sc.color,
  COUNT(mi.id) as file_count,
  COALESCE(SUM(mi.file_size), 0) as actual_used_bytes
FROM public.storage_configs sc
LEFT JOIN public.media_items mi ON mi.storage_config_id = sc.id
GROUP BY sc.id, sc.name, sc.user_id, sc.is_active, sc.total_bytes, sc.used_bytes, sc.color;
