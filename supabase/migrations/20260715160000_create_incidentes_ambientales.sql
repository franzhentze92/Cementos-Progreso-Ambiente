-- Incidentes (Desempeño Ambiental.xlsx)

CREATE TABLE IF NOT EXISTS incidentes_ambientales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  anio_mes date NOT NULL,
  mes_texto text NOT NULL DEFAULT '',
  unidad_negocio text NOT NULL,
  planta_sede text NOT NULL,
  instrumento text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  valor_incidente numeric,
  estado text NOT NULL DEFAULT '',
  comentarios text NOT NULL DEFAULT '',
  acciones_realizadas text NOT NULL DEFAULT '',
  responsables text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidentes_ambientales_fecha_idx
  ON incidentes_ambientales (fecha DESC);
CREATE INDEX IF NOT EXISTS incidentes_ambientales_unidad_idx
  ON incidentes_ambientales (unidad_negocio);
CREATE INDEX IF NOT EXISTS incidentes_ambientales_sede_idx
  ON incidentes_ambientales (planta_sede);
CREATE INDEX IF NOT EXISTS incidentes_ambientales_anio_mes_idx
  ON incidentes_ambientales (anio_mes);
CREATE INDEX IF NOT EXISTS incidentes_ambientales_estado_idx
  ON incidentes_ambientales (estado);

ALTER TABLE incidentes_ambientales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incidentes_ambientales_all ON incidentes_ambientales;
CREATE POLICY incidentes_ambientales_all ON incidentes_ambientales
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_incidentes_ambientales()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS incidentes_ambientales_updated_at ON incidentes_ambientales;
CREATE TRIGGER incidentes_ambientales_updated_at
  BEFORE UPDATE ON incidentes_ambientales
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_incidentes_ambientales();
