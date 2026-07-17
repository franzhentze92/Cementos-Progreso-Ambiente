-- Fase 3: Intensidad carbono / escenarios + Circularidad + Expedientes + RBAC

-- ── Escenarios de intensidad carbono (qué pasa si…) ───────────────────────
CREATE TABLE IF NOT EXISTS carbon_escenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  nombre text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  anio_base integer NOT NULL,
  planta text NOT NULL DEFAULT 'Alicon',
  -- Deltas porcentuales vs línea base (-50 … +50 típico)
  delta_produccion_pct numeric NOT NULL DEFAULT 0,
  delta_electricidad_pct numeric NOT NULL DEFAULT 0,
  delta_diesel_pct numeric NOT NULL DEFAULT 0,
  delta_clinker_pct numeric NOT NULL DEFAULT 0,
  delta_agua_pct numeric NOT NULL DEFAULT 0,
  -- Factores de emisión editables (kg CO2e por unidad)
  ef_electricidad_kg_kwh numeric NOT NULL DEFAULT 0.45,
  ef_diesel_kg_gal numeric NOT NULL DEFAULT 10.21,
  meta_intensidad_kg_t numeric,
  responsable text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Borrador',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carbon_escenarios_anio_idx ON carbon_escenarios (anio_base);
CREATE INDEX IF NOT EXISTS carbon_escenarios_estado_idx ON carbon_escenarios (estado);

ALTER TABLE carbon_escenarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS carbon_escenarios_all ON carbon_escenarios;
CREATE POLICY carbon_escenarios_all ON carbon_escenarios
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_carbon_escenarios()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS carbon_escenarios_updated_at ON carbon_escenarios;
CREATE TRIGGER carbon_escenarios_updated_at
  BEFORE UPDATE ON carbon_escenarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_carbon_escenarios();

-- ── Circularidad: gestores / manifiestos / valorización ───────────────────
CREATE TABLE IF NOT EXISTS circularidad_flujos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  sede text NOT NULL DEFAULT '',
  tipo_residuo text NOT NULL DEFAULT '',
  clasificacion text NOT NULL DEFAULT 'Ordinario',
  ruta text NOT NULL DEFAULT 'Reciclaje',
  gestor text NOT NULL DEFAULT '',
  manifiesto text NOT NULL DEFAULT '',
  cantidad_lbs numeric,
  costo_gtq numeric,
  fecha date,
  valorizado boolean NOT NULL DEFAULT true,
  estado text NOT NULL DEFAULT 'Registrado',
  evidencia_url text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circularidad_sede_idx ON circularidad_flujos (sede);
CREATE INDEX IF NOT EXISTS circularidad_ruta_idx ON circularidad_flujos (ruta);
CREATE INDEX IF NOT EXISTS circularidad_fecha_idx ON circularidad_flujos (fecha);

ALTER TABLE circularidad_flujos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS circularidad_flujos_all ON circularidad_flujos;
CREATE POLICY circularidad_flujos_all ON circularidad_flujos
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_circularidad()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS circularidad_updated_at ON circularidad_flujos;
CREATE TRIGGER circularidad_updated_at
  BEFORE UPDATE ON circularidad_flujos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_circularidad();

-- ── Expedientes documentales ambientales ──────────────────────────────────
CREATE TABLE IF NOT EXISTS expedientes_ambientales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  titulo text NOT NULL,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  sitio text NOT NULL DEFAULT '',
  tema text NOT NULL DEFAULT 'General',
  tipo_documento text NOT NULL DEFAULT 'Otro',
  version text NOT NULL DEFAULT '1.0',
  fecha_documento date,
  responsable text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Vigente',
  archivo_url text NOT NULL DEFAULT '',
  archivo_nombre text NOT NULL DEFAULT '',
  modulo_ligado text NOT NULL DEFAULT '',
  ref_ligada text NOT NULL DEFAULT '',
  tags text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expedientes_sitio_idx ON expedientes_ambientales (sitio);
CREATE INDEX IF NOT EXISTS expedientes_tema_idx ON expedientes_ambientales (tema);
CREATE INDEX IF NOT EXISTS expedientes_tipo_idx ON expedientes_ambientales (tipo_documento);
CREATE INDEX IF NOT EXISTS expedientes_estado_idx ON expedientes_ambientales (estado);

ALTER TABLE expedientes_ambientales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS expedientes_ambientales_all ON expedientes_ambientales;
CREATE POLICY expedientes_ambientales_all ON expedientes_ambientales
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_expedientes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expedientes_updated_at ON expedientes_ambientales;
CREATE TRIGGER expedientes_updated_at
  BEFORE UPDATE ON expedientes_ambientales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_expedientes();

-- ── RBAC Fase 3 ───────────────────────────────────────────────────────────
INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'intensidad'),
  ('Admin', 'circularidad'),
  ('Admin', 'expedientes'),
  ('Gerencia', 'intensidad'),
  ('Gerencia', 'circularidad'),
  ('Gerencia', 'expedientes'),
  ('Gestor_Datos_Alicon', 'intensidad'),
  ('Gestor_Datos_Alicon', 'circularidad'),
  ('Gestor_Datos_Alicon', 'expedientes'),
  ('Gestor_Datos_Agroprogreso', 'intensidad'),
  ('Gestor_Datos_Agroprogreso', 'circularidad'),
  ('Gestor_Datos_Agroprogreso', 'expedientes')
ON CONFLICT DO NOTHING;
