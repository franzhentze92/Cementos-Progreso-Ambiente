-- Biblioteca de documentos del copiloto (uploads + overrides del catálogo estático)
CREATE TABLE IF NOT EXISTS biblioteca_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id text UNIQUE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  file_name text,
  storage_path text,
  file_url text,
  size_mb numeric(12, 2) NOT NULL DEFAULT 0,
  pages integer NOT NULL DEFAULT 0,
  char_count integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  note text,
  truncated boolean NOT NULL DEFAULT false,
  enabled_in_copilot boolean NOT NULL DEFAULT true,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS biblioteca_documentos_category_idx
  ON biblioteca_documentos (category);
CREATE INDEX IF NOT EXISTS biblioteca_documentos_deleted_idx
  ON biblioteca_documentos (is_deleted);

ALTER TABLE biblioteca_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS biblioteca_documentos_all ON biblioteca_documentos;
CREATE POLICY biblioteca_documentos_all ON biblioteca_documentos
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biblioteca-docs',
  'biblioteca-docs',
  true,
  41943040,
  ARRAY['application/pdf', 'application/x-pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS biblioteca_docs_public_read ON storage.objects;
CREATE POLICY biblioteca_docs_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'biblioteca-docs');

DROP POLICY IF EXISTS biblioteca_docs_public_insert ON storage.objects;
CREATE POLICY biblioteca_docs_public_insert ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'biblioteca-docs');

DROP POLICY IF EXISTS biblioteca_docs_public_update ON storage.objects;
CREATE POLICY biblioteca_docs_public_update ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'biblioteca-docs')
  WITH CHECK (bucket_id = 'biblioteca-docs');

DROP POLICY IF EXISTS biblioteca_docs_public_delete ON storage.objects;
CREATE POLICY biblioteca_docs_public_delete ON storage.objects
  FOR DELETE
  USING (bucket_id = 'biblioteca-docs');
