-- Compostaje desechos orgánicos · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_compostaje (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  finca text NOT NULL,
  toneladas numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT agro_compostaje_fecha_finca_uq UNIQUE (fecha, finca)
);

CREATE INDEX IF NOT EXISTS agro_compostaje_fecha_idx ON agro_compostaje (fecha);
CREATE INDEX IF NOT EXISTS agro_compostaje_finca_idx ON agro_compostaje (finca);

ALTER TABLE agro_compostaje ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_compostaje_all ON agro_compostaje;
CREATE POLICY agro_compostaje_all ON agro_compostaje
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_compostaje()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_compostaje_updated_at ON agro_compostaje;
CREATE TRIGGER agro_compostaje_updated_at
  BEFORE UPDATE ON agro_compostaje
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_compostaje();
