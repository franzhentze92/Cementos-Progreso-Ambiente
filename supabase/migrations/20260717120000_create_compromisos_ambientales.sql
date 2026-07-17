-- Compromisos Ambientales · registro maestro + evidencias + seguimiento + asignaciones

-- ── Compromisos (maestro) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compromisos_ambientales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  titulo text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  sitio text NOT NULL DEFAULT '',
  area_operativa text NOT NULL DEFAULT '',
  origen text NOT NULL DEFAULT 'Plan de manejo',
  origen_ref text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Monitoreo',
  responsable_principal text NOT NULL DEFAULT '',
  colaboradores text NOT NULL DEFAULT '',
  revisor text NOT NULL DEFAULT '',
  aprobador text NOT NULL DEFAULT '',
  fecha_inicio date,
  fecha_vencimiento date,
  proxima_ejecucion date,
  periodicidad text NOT NULL DEFAULT 'Única',
  prioridad text NOT NULL DEFAULT 'Media',
  criticidad text NOT NULL DEFAULT 'Media',
  estado text NOT NULL DEFAULT 'Pendiente',
  porcentaje_avance numeric NOT NULL DEFAULT 0,
  criterio_cumplimiento text NOT NULL DEFAULT '',
  evidencias_requeridas text NOT NULL DEFAULT '',
  alerta_dias integer NOT NULL DEFAULT 15,
  notas text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compromisos_estado_idx ON compromisos_ambientales (estado);
CREATE INDEX IF NOT EXISTS compromisos_sitio_idx ON compromisos_ambientales (sitio);
CREATE INDEX IF NOT EXISTS compromisos_unidad_idx ON compromisos_ambientales (unidad_negocio);
CREATE INDEX IF NOT EXISTS compromisos_responsable_idx ON compromisos_ambientales (responsable_principal);
CREATE INDEX IF NOT EXISTS compromisos_vencimiento_idx ON compromisos_ambientales (fecha_vencimiento);
CREATE INDEX IF NOT EXISTS compromisos_origen_idx ON compromisos_ambientales (origen);
CREATE INDEX IF NOT EXISTS compromisos_tipo_idx ON compromisos_ambientales (tipo);
CREATE INDEX IF NOT EXISTS compromisos_prioridad_idx ON compromisos_ambientales (prioridad);

ALTER TABLE compromisos_ambientales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compromisos_ambientales_all ON compromisos_ambientales;
CREATE POLICY compromisos_ambientales_all ON compromisos_ambientales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_compromisos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compromisos_updated_at ON compromisos_ambientales;
CREATE TRIGGER compromisos_updated_at
  BEFORE UPDATE ON compromisos_ambientales
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_compromisos();

-- ── Hitos / actividades ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compromisos_hitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compromiso_id uuid NOT NULL REFERENCES compromisos_ambientales (id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  fecha_objetivo date,
  estado text NOT NULL DEFAULT 'Pendiente',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compromisos_hitos_compromiso_idx
  ON compromisos_hitos (compromiso_id);

ALTER TABLE compromisos_hitos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compromisos_hitos_all ON compromisos_hitos;
CREATE POLICY compromisos_hitos_all ON compromisos_hitos
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_compromisos_hitos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compromisos_hitos_updated_at ON compromisos_hitos;
CREATE TRIGGER compromisos_hitos_updated_at
  BEFORE UPDATE ON compromisos_hitos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_compromisos_hitos();

-- ── Evidencias ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compromisos_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compromiso_id uuid NOT NULL REFERENCES compromisos_ambientales (id) ON DELETE CASCADE,
  titulo text NOT NULL,
  tipo_evidencia text NOT NULL DEFAULT 'Informe',
  descripcion text NOT NULL DEFAULT '',
  fecha_cumplimiento date,
  periodo text NOT NULL DEFAULT '',
  sitio text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  archivo_url text NOT NULL DEFAULT '',
  archivo_nombre text NOT NULL DEFAULT '',
  estado_revision text NOT NULL DEFAULT 'Pendiente de revisión',
  revisado_por text NOT NULL DEFAULT '',
  fecha_revision date,
  notas_revision text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  reemplaza_id uuid REFERENCES compromisos_evidencias (id) ON DELETE SET NULL,
  cargado_por text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compromisos_evidencias_compromiso_idx
  ON compromisos_evidencias (compromiso_id);
CREATE INDEX IF NOT EXISTS compromisos_evidencias_estado_idx
  ON compromisos_evidencias (estado_revision);
CREATE INDEX IF NOT EXISTS compromisos_evidencias_tipo_idx
  ON compromisos_evidencias (tipo_evidencia);

ALTER TABLE compromisos_evidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compromisos_evidencias_all ON compromisos_evidencias;
CREATE POLICY compromisos_evidencias_all ON compromisos_evidencias
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_compromisos_evidencias()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS compromisos_evidencias_updated_at ON compromisos_evidencias;
CREATE TRIGGER compromisos_evidencias_updated_at
  BEFORE UPDATE ON compromisos_evidencias
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_compromisos_evidencias();

-- ── Seguimiento (línea de tiempo) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compromisos_seguimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compromiso_id uuid NOT NULL REFERENCES compromisos_ambientales (id) ON DELETE CASCADE,
  tipo_evento text NOT NULL DEFAULT 'comentario',
  descripcion text NOT NULL DEFAULT '',
  comentario text NOT NULL DEFAULT '',
  porcentaje_avance numeric,
  estado_anterior text NOT NULL DEFAULT '',
  estado_nuevo text NOT NULL DEFAULT '',
  fecha_anterior date,
  fecha_nueva date,
  bloqueo text NOT NULL DEFAULT '',
  autor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compromisos_seguimiento_compromiso_idx
  ON compromisos_seguimiento (compromiso_id);
CREATE INDEX IF NOT EXISTS compromisos_seguimiento_tipo_idx
  ON compromisos_seguimiento (tipo_evento);
CREATE INDEX IF NOT EXISTS compromisos_seguimiento_created_idx
  ON compromisos_seguimiento (created_at DESC);

ALTER TABLE compromisos_seguimiento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compromisos_seguimiento_all ON compromisos_seguimiento;
CREATE POLICY compromisos_seguimiento_all ON compromisos_seguimiento
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Asignaciones / roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compromisos_asignaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compromiso_id uuid NOT NULL REFERENCES compromisos_ambientales (id) ON DELETE CASCADE,
  persona text NOT NULL,
  rol text NOT NULL DEFAULT 'Colaborador',
  sitio text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS compromisos_asignaciones_compromiso_idx
  ON compromisos_asignaciones (compromiso_id);
CREATE INDEX IF NOT EXISTS compromisos_asignaciones_persona_idx
  ON compromisos_asignaciones (persona);
CREATE INDEX IF NOT EXISTS compromisos_asignaciones_rol_idx
  ON compromisos_asignaciones (rol);

ALTER TABLE compromisos_asignaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compromisos_asignaciones_all ON compromisos_asignaciones;
CREATE POLICY compromisos_asignaciones_all ON compromisos_asignaciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── RBAC ───────────────────────────────────────────────────────────────────
INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'compromisos-ambientales.lista'),
  ('Admin', 'compromisos-ambientales.crear'),
  ('Admin', 'compromisos-ambientales.evidencias'),
  ('Admin', 'compromisos-ambientales.seguimiento'),
  ('Admin', 'compromisos-ambientales.responsables'),
  ('Gerencia', 'compromisos-ambientales.lista'),
  ('Gerencia', 'compromisos-ambientales.crear'),
  ('Gerencia', 'compromisos-ambientales.evidencias'),
  ('Gerencia', 'compromisos-ambientales.seguimiento'),
  ('Gerencia', 'compromisos-ambientales.responsables'),
  ('Gestor_Datos_Alicon', 'compromisos-ambientales.lista'),
  ('Gestor_Datos_Alicon', 'compromisos-ambientales.crear'),
  ('Gestor_Datos_Alicon', 'compromisos-ambientales.evidencias'),
  ('Gestor_Datos_Alicon', 'compromisos-ambientales.seguimiento'),
  ('Gestor_Datos_Alicon', 'compromisos-ambientales.responsables'),
  ('Gestor_Datos_Agroprogreso', 'compromisos-ambientales.lista'),
  ('Gestor_Datos_Agroprogreso', 'compromisos-ambientales.crear'),
  ('Gestor_Datos_Agroprogreso', 'compromisos-ambientales.evidencias'),
  ('Gestor_Datos_Agroprogreso', 'compromisos-ambientales.seguimiento'),
  ('Gestor_Datos_Agroprogreso', 'compromisos-ambientales.responsables')
ON CONFLICT DO NOTHING;
