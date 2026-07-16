-- Inspecciones de campo (captura conversacional por área + foto + clasificación)

CREATE TABLE IF NOT EXISTS inspeccion_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_sede text NOT NULL,
  unidad_negocio text NOT NULL,
  nombre text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT inspeccion_areas_unique UNIQUE (planta_sede, unidad_negocio, nombre)
);

CREATE INDEX IF NOT EXISTS inspeccion_areas_planta_idx
  ON inspeccion_areas (planta_sede, unidad_negocio);

ALTER TABLE inspeccion_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inspeccion_areas_all ON inspeccion_areas;
CREATE POLICY inspeccion_areas_all ON inspeccion_areas
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS inspecciones_campo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  unidad_negocio text NOT NULL,
  planta_sede text NOT NULL,
  responsable text NOT NULL DEFAULT '',
  comentario_general text NOT NULL DEFAULT '',
  nota_general text NOT NULL DEFAULT '',
  resultado_general numeric,
  nivel_riesgo text NOT NULL DEFAULT '',
  requiere_accion_inmediata text NOT NULL DEFAULT 'No',
  num_hallazgos integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'en_curso',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inspecciones_campo_fecha_idx
  ON inspecciones_campo (fecha DESC);
CREATE INDEX IF NOT EXISTS inspecciones_campo_planta_idx
  ON inspecciones_campo (planta_sede, unidad_negocio);
CREATE INDEX IF NOT EXISTS inspecciones_campo_estado_idx
  ON inspecciones_campo (estado);

ALTER TABLE inspecciones_campo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inspecciones_campo_all ON inspecciones_campo;
CREATE POLICY inspecciones_campo_all ON inspecciones_campo
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_inspecciones_campo()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspecciones_campo_updated_at ON inspecciones_campo;
CREATE TRIGGER inspecciones_campo_updated_at
  BEFORE UPDATE ON inspecciones_campo
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_inspecciones_campo();

CREATE TABLE IF NOT EXISTS inspeccion_hallazgos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspeccion_id uuid NOT NULL REFERENCES inspecciones_campo(id) ON DELETE CASCADE,
  area_id uuid REFERENCES inspeccion_areas(id) ON DELETE SET NULL,
  area_nombre text NOT NULL,
  clasificacion text NOT NULL,
  comentario text NOT NULL DEFAULT '',
  foto_urls text[] NOT NULL DEFAULT '{}',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT inspeccion_hallazgos_clasificacion_chk CHECK (
    clasificacion IN ('buena_practica', 'situacion_riesgo', 'observacion_general')
  )
);

CREATE INDEX IF NOT EXISTS inspeccion_hallazgos_inspeccion_idx
  ON inspeccion_hallazgos (inspeccion_id);

ALTER TABLE inspeccion_hallazgos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inspeccion_hallazgos_all ON inspeccion_hallazgos;
CREATE POLICY inspeccion_hallazgos_all ON inspeccion_hallazgos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Bucket de fotos (público de lectura para URLs directas en reportes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspeccion-fotos',
  'inspeccion-fotos',
  true,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS inspeccion_fotos_public_read ON storage.objects;
CREATE POLICY inspeccion_fotos_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'inspeccion-fotos');

DROP POLICY IF EXISTS inspeccion_fotos_public_insert ON storage.objects;
CREATE POLICY inspeccion_fotos_public_insert ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'inspeccion-fotos');

DROP POLICY IF EXISTS inspeccion_fotos_public_update ON storage.objects;
CREATE POLICY inspeccion_fotos_public_update ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'inspeccion-fotos')
  WITH CHECK (bucket_id = 'inspeccion-fotos');

DROP POLICY IF EXISTS inspeccion_fotos_public_delete ON storage.objects;
CREATE POLICY inspeccion_fotos_public_delete ON storage.objects
  FOR DELETE
  USING (bucket_id = 'inspeccion-fotos');
