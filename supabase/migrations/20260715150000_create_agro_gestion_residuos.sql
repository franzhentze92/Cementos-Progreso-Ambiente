-- AGRO Gestión de residuos fincas (Desempeño Ambiental.xlsx)

CREATE TABLE IF NOT EXISTS agro_gestion_residuos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  sede text NOT NULL,
  clasificacion_operativa text NOT NULL DEFAULT '',
  tipo_residuos text NOT NULL DEFAULT '',
  clasificacion_tecnica text NOT NULL DEFAULT '',
  cantidad_lbs numeric,
  ruta_gestion text NOT NULL DEFAULT '',
  gestor_planta text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT agro_gestion_residuos_natural_key UNIQUE (
    fecha, sede, clasificacion_operativa, tipo_residuos, gestor_planta
  )
);

CREATE INDEX IF NOT EXISTS agro_gestion_residuos_fecha_idx
  ON agro_gestion_residuos (fecha DESC);
CREATE INDEX IF NOT EXISTS agro_gestion_residuos_sede_idx
  ON agro_gestion_residuos (sede);
CREATE INDEX IF NOT EXISTS agro_gestion_residuos_ruta_idx
  ON agro_gestion_residuos (ruta_gestion);

ALTER TABLE agro_gestion_residuos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_gestion_residuos_all ON agro_gestion_residuos;
CREATE POLICY agro_gestion_residuos_all ON agro_gestion_residuos
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_gestion_residuos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_gestion_residuos_updated_at ON agro_gestion_residuos;
CREATE TRIGGER agro_gestion_residuos_updated_at
  BEFORE UPDATE ON agro_gestion_residuos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_gestion_residuos();
