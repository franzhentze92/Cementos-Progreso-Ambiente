-- Monitoreos ambientales (Desempeño Ambiental.xlsx) · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_monitoreos_ambientales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  planta_sede text NOT NULL,
  punto_muestreo text NOT NULL,
  tipo_agua text NOT NULL DEFAULT '',
  parametro text NOT NULL,
  resultado numeric,
  unidad text NOT NULL DEFAULT '',
  limite_permisible text NOT NULL DEFAULT '',
  cumple text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT agro_monitoreos_natural_key UNIQUE (
    fecha, planta_sede, punto_muestreo, parametro
  )
);

CREATE INDEX IF NOT EXISTS agro_monitoreos_fecha_idx
  ON agro_monitoreos_ambientales (fecha DESC);
CREATE INDEX IF NOT EXISTS agro_monitoreos_sede_idx
  ON agro_monitoreos_ambientales (planta_sede);
CREATE INDEX IF NOT EXISTS agro_monitoreos_punto_idx
  ON agro_monitoreos_ambientales (punto_muestreo);
CREATE INDEX IF NOT EXISTS agro_monitoreos_cumple_idx
  ON agro_monitoreos_ambientales (cumple);

ALTER TABLE agro_monitoreos_ambientales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_monitoreos_all ON agro_monitoreos_ambientales;
CREATE POLICY agro_monitoreos_all ON agro_monitoreos_ambientales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_monitoreos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_monitoreos_updated_at ON agro_monitoreos_ambientales;
CREATE TRIGGER agro_monitoreos_updated_at
  BEFORE UPDATE ON agro_monitoreos_ambientales
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_monitoreos();
