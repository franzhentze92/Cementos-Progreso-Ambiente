-- Fase 2: Motor de metas + Umbrales de monitoreo + RBAC

-- ── Metas / KPIs ambientales ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metas_ambientales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  indicador text NOT NULL,
  categoria text NOT NULL DEFAULT 'Operativo',
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  sitio text NOT NULL DEFAULT '',
  unidad_medida text NOT NULL DEFAULT '',
  meta_valor numeric NOT NULL,
  valor_actual numeric,
  sentido text NOT NULL DEFAULT 'menor_mejor',
  periodo_anio integer NOT NULL,
  periodo_tipo text NOT NULL DEFAULT 'Anual',
  fecha_inicio date,
  fecha_fin date,
  responsable text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'En curso',
  umbral_atencion_pct numeric NOT NULL DEFAULT 85,
  umbral_critico_pct numeric NOT NULL DEFAULT 70,
  fuente_dato text NOT NULL DEFAULT 'manual',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS metas_anio_idx ON metas_ambientales (periodo_anio);
CREATE INDEX IF NOT EXISTS metas_unidad_idx ON metas_ambientales (unidad_negocio);
CREATE INDEX IF NOT EXISTS metas_estado_idx ON metas_ambientales (estado);
CREATE INDEX IF NOT EXISTS metas_categoria_idx ON metas_ambientales (categoria);

ALTER TABLE metas_ambientales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metas_ambientales_all ON metas_ambientales;
CREATE POLICY metas_ambientales_all ON metas_ambientales
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_metas()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS metas_updated_at ON metas_ambientales;
CREATE TRIGGER metas_updated_at
  BEFORE UPDATE ON metas_ambientales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_metas();

-- ── Umbrales de monitoreo (límites numéricos) ──────────────────────────────
CREATE TABLE IF NOT EXISTS monitoreo_umbrales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parametro text NOT NULL,
  tipo_agua text NOT NULL DEFAULT '',
  unidad_medida text NOT NULL DEFAULT '',
  operador text NOT NULL DEFAULT 'entre',
  limite_min numeric,
  limite_max numeric,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  autoridad_ref text NOT NULL DEFAULT '',
  criticidad text NOT NULL DEFAULT 'Media',
  activo boolean NOT NULL DEFAULT true,
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monitoreo_umbrales_uniq
  ON monitoreo_umbrales (unidad_negocio, parametro, tipo_agua);
CREATE INDEX IF NOT EXISTS monitoreo_umbrales_activo_idx
  ON monitoreo_umbrales (activo);

ALTER TABLE monitoreo_umbrales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS monitoreo_umbrales_all ON monitoreo_umbrales;
CREATE POLICY monitoreo_umbrales_all ON monitoreo_umbrales
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_umbrales()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS umbrales_updated_at ON monitoreo_umbrales;
CREATE TRIGGER umbrales_updated_at
  BEFORE UPDATE ON monitoreo_umbrales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_umbrales();

-- ── RBAC Fase 2 ────────────────────────────────────────────────────────────
INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'metas'),
  ('Admin', 'umbrales'),
  ('Gerencia', 'metas'),
  ('Gerencia', 'umbrales'),
  ('Gestor_Datos_Alicon', 'metas'),
  ('Gestor_Datos_Alicon', 'umbrales'),
  ('Gestor_Datos_Agroprogreso', 'metas'),
  ('Gestor_Datos_Agroprogreso', 'umbrales')
ON CONFLICT DO NOTHING;
