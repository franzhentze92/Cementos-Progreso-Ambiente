-- NDA General · AGRO NDA · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_nda_general (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  semana integer,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  planta_sede text NOT NULL,
  nota_ida numeric,
  casco_verde numeric,
  incidentes numeric,
  compromisos numeric,
  nda numeric,
  proyecto_matriz text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT agro_nda_general_fecha_sede_uq UNIQUE (fecha, planta_sede)
);

CREATE INDEX IF NOT EXISTS agro_nda_gen_fecha_idx ON agro_nda_general (fecha);
CREATE INDEX IF NOT EXISTS agro_nda_gen_sede_idx ON agro_nda_general (planta_sede);

ALTER TABLE agro_nda_general ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_nda_gen_all ON agro_nda_general;
CREATE POLICY agro_nda_gen_all ON agro_nda_general
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_nda_gen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_nda_gen_updated_at ON agro_nda_general;
CREATE TRIGGER agro_nda_gen_updated_at
  BEFORE UPDATE ON agro_nda_general
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_nda_gen();
