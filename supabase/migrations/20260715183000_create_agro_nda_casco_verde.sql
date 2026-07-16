-- NDA Casco Verde · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_nda_casco_verde (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  semana integer,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  planta_sede text NOT NULL,
  tipo_inspeccion text NOT NULL DEFAULT 'Casco Verde',
  no_inspeccion integer,
  inspector text NOT NULL DEFAULT '',
  nota numeric,
  hallazgos_criticos integer NOT NULL DEFAULT 0,
  observaciones text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agro_nda_cv_fecha_idx ON agro_nda_casco_verde (fecha);
CREATE INDEX IF NOT EXISTS agro_nda_cv_sede_idx ON agro_nda_casco_verde (planta_sede);
CREATE INDEX IF NOT EXISTS agro_nda_cv_inspector_idx ON agro_nda_casco_verde (inspector);

ALTER TABLE agro_nda_casco_verde ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_nda_cv_all ON agro_nda_casco_verde;
CREATE POLICY agro_nda_cv_all ON agro_nda_casco_verde
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_nda_cv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_nda_cv_updated_at ON agro_nda_casco_verde;
CREATE TRIGGER agro_nda_cv_updated_at
  BEFORE UPDATE ON agro_nda_casco_verde
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_nda_cv();
