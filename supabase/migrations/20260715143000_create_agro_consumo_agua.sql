-- AGRO Consumo de agua (Desempeño Ambiental.xlsx · hoja AGRO Consumo de agua)

CREATE TABLE IF NOT EXISTS agro_consumo_agua (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  sede text NOT NULL,
  sitio_consumo text NOT NULL,
  consumo_m3 numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT agro_consumo_agua_fecha_sede_sitio_key UNIQUE (fecha, sede, sitio_consumo)
);

CREATE INDEX IF NOT EXISTS agro_consumo_agua_fecha_idx ON agro_consumo_agua (fecha DESC);
CREATE INDEX IF NOT EXISTS agro_consumo_agua_sede_idx ON agro_consumo_agua (sede);

ALTER TABLE agro_consumo_agua ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_consumo_agua_all ON agro_consumo_agua;
CREATE POLICY agro_consumo_agua_all ON agro_consumo_agua
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_consumo_agua()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_consumo_agua_updated_at ON agro_consumo_agua;
CREATE TRIGGER agro_consumo_agua_updated_at
  BEFORE UPDATE ON agro_consumo_agua
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_consumo_agua();
