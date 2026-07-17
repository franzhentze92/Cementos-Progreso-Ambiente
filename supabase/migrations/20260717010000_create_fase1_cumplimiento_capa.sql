-- Fase 1: Compliance Hub + CAPA + RBAC para Exportes / Cumplimiento / CAPA

-- ── Cumplimiento / obligaciones regulatorias ───────────────────────────────
CREATE TABLE IF NOT EXISTS cumplimiento_obligaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  sitio text NOT NULL DEFAULT '',
  tipo_obligacion text NOT NULL DEFAULT 'Licencia',
  titulo text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  autoridad text NOT NULL DEFAULT '',
  instrumento text NOT NULL DEFAULT '',
  expediente text NOT NULL DEFAULT '',
  responsable text NOT NULL DEFAULT '',
  criticidad text NOT NULL DEFAULT 'Media',
  estado text NOT NULL DEFAULT 'Vigente',
  fecha_inicio date,
  fecha_vencimiento date,
  alerta_dias integer NOT NULL DEFAULT 90,
  evidencia_url text NOT NULL DEFAULT '',
  evidencia_nota text NOT NULL DEFAULT '',
  origen text NOT NULL DEFAULT 'manual',
  origen_ref text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cumplimiento_unidad_idx
  ON cumplimiento_obligaciones (unidad_negocio);
CREATE INDEX IF NOT EXISTS cumplimiento_estado_idx
  ON cumplimiento_obligaciones (estado);
CREATE INDEX IF NOT EXISTS cumplimiento_vencimiento_idx
  ON cumplimiento_obligaciones (fecha_vencimiento);
CREATE INDEX IF NOT EXISTS cumplimiento_sitio_idx
  ON cumplimiento_obligaciones (sitio);
CREATE INDEX IF NOT EXISTS cumplimiento_tipo_idx
  ON cumplimiento_obligaciones (tipo_obligacion);

ALTER TABLE cumplimiento_obligaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cumplimiento_obligaciones_all ON cumplimiento_obligaciones;
CREATE POLICY cumplimiento_obligaciones_all ON cumplimiento_obligaciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_cumplimiento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cumplimiento_updated_at ON cumplimiento_obligaciones;
CREATE TRIGGER cumplimiento_updated_at
  BEFORE UPDATE ON cumplimiento_obligaciones
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_cumplimiento();

-- ── CAPA (acciones correctivas / preventivas) ──────────────────────────────
CREATE TABLE IF NOT EXISTS capa_acciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  sitio text NOT NULL DEFAULT '',
  tipo_accion text NOT NULL DEFAULT 'Correctiva',
  origen_tipo text NOT NULL DEFAULT 'Inspección',
  origen_ref text NOT NULL DEFAULT '',
  hallazgo text NOT NULL,
  causa_raiz text NOT NULL DEFAULT '',
  accion text NOT NULL,
  responsable text NOT NULL DEFAULT '',
  verificador text NOT NULL DEFAULT '',
  prioridad text NOT NULL DEFAULT 'Media',
  estado text NOT NULL DEFAULT 'Abierta',
  fecha_apertura date NOT NULL DEFAULT CURRENT_DATE,
  fecha_compromiso date,
  fecha_cierre date,
  evidencia_url text NOT NULL DEFAULT '',
  evidencia_nota text NOT NULL DEFAULT '',
  verificacion text NOT NULL DEFAULT '',
  eficacia text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS capa_unidad_idx ON capa_acciones (unidad_negocio);
CREATE INDEX IF NOT EXISTS capa_estado_idx ON capa_acciones (estado);
CREATE INDEX IF NOT EXISTS capa_compromiso_idx ON capa_acciones (fecha_compromiso);
CREATE INDEX IF NOT EXISTS capa_origen_idx ON capa_acciones (origen_tipo);
CREATE INDEX IF NOT EXISTS capa_prioridad_idx ON capa_acciones (prioridad);
CREATE INDEX IF NOT EXISTS capa_sitio_idx ON capa_acciones (sitio);

ALTER TABLE capa_acciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capa_acciones_all ON capa_acciones;
CREATE POLICY capa_acciones_all ON capa_acciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_capa()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS capa_updated_at ON capa_acciones;
CREATE TRIGGER capa_updated_at
  BEFORE UPDATE ON capa_acciones
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_capa();

-- ── RBAC: módulos Fase 1 ───────────────────────────────────────────────────
INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'cumplimiento'),
  ('Admin', 'capa'),
  ('Admin', 'exportes'),
  ('Gerencia', 'cumplimiento'),
  ('Gerencia', 'capa'),
  ('Gerencia', 'exportes'),
  ('Gestor_Datos_Alicon', 'cumplimiento'),
  ('Gestor_Datos_Alicon', 'capa'),
  ('Gestor_Datos_Agroprogreso', 'cumplimiento'),
  ('Gestor_Datos_Agroprogreso', 'capa')
ON CONFLICT DO NOTHING;
