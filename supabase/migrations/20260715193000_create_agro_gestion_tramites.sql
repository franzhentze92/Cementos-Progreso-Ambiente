-- Gestión de trámites · C. Admin corporativo · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_gestion_tramites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_solicitud date NOT NULL,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  planta_sede text NOT NULL,
  nombre_proyecto text NOT NULL,
  estado text NOT NULL DEFAULT 'En proceso',
  asignado_a text NOT NULL DEFAULT '',
  prioridad text NOT NULL DEFAULT 'Normal',
  observaciones text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agro_tramites_fecha_idx
  ON agro_gestion_tramites (fecha_solicitud);
CREATE INDEX IF NOT EXISTS agro_tramites_estado_idx
  ON agro_gestion_tramites (estado);
CREATE INDEX IF NOT EXISTS agro_tramites_sede_idx
  ON agro_gestion_tramites (planta_sede);
CREATE INDEX IF NOT EXISTS agro_tramites_prioridad_idx
  ON agro_gestion_tramites (prioridad);

ALTER TABLE agro_gestion_tramites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_tramites_all ON agro_gestion_tramites;
CREATE POLICY agro_tramites_all ON agro_gestion_tramites
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_tramites()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_tramites_updated_at ON agro_gestion_tramites;
CREATE TRIGGER agro_tramites_updated_at
  BEFORE UPDATE ON agro_gestion_tramites
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_tramites();
