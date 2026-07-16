-- Licencias ambientales (C. Admin Licencias) · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_licencias_ambientales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  planta_sede text NOT NULL,
  licencia text NOT NULL,
  expediente text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT '',
  vigencia text NOT NULL DEFAULT '',
  vigencia_inicio date,
  vigencia_fin date,
  estado text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agro_licencias_sede_idx
  ON agro_licencias_ambientales (planta_sede);
CREATE INDEX IF NOT EXISTS agro_licencias_estado_idx
  ON agro_licencias_ambientales (estado);
CREATE INDEX IF NOT EXISTS agro_licencias_categoria_idx
  ON agro_licencias_ambientales (categoria);
CREATE INDEX IF NOT EXISTS agro_licencias_fin_idx
  ON agro_licencias_ambientales (vigencia_fin);

ALTER TABLE agro_licencias_ambientales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_licencias_all ON agro_licencias_ambientales;
CREATE POLICY agro_licencias_all ON agro_licencias_ambientales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_licencias()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_licencias_updated_at ON agro_licencias_ambientales;
CREATE TRIGGER agro_licencias_updated_at
  BEFORE UPDATE ON agro_licencias_ambientales
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_licencias();
