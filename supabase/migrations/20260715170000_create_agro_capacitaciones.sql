-- Capacitaciones (hoja Ejecuciones · Desempeño Ambiental.xlsx) · Agroprogreso

CREATE TABLE IF NOT EXISTS agro_capacitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL,
  unidad_negocio text NOT NULL DEFAULT 'Agroprogreso',
  planta_sede text NOT NULL,
  tipo_ejecucion text NOT NULL DEFAULT 'Capacitaciones',
  detalle text NOT NULL DEFAULT '',
  publico_objetivo text NOT NULL DEFAULT '',
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  estado text NOT NULL DEFAULT '',
  comentarios text NOT NULL DEFAULT '',
  latitud numeric,
  longitud numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agro_capacitaciones_inicio_idx
  ON agro_capacitaciones (fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS agro_capacitaciones_sede_idx
  ON agro_capacitaciones (planta_sede);
CREATE INDEX IF NOT EXISTS agro_capacitaciones_estado_idx
  ON agro_capacitaciones (estado);
CREATE INDEX IF NOT EXISTS agro_capacitaciones_detalle_idx
  ON agro_capacitaciones (detalle);
CREATE INDEX IF NOT EXISTS agro_capacitaciones_anio_idx
  ON agro_capacitaciones (anio);

ALTER TABLE agro_capacitaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agro_capacitaciones_all ON agro_capacitaciones;
CREATE POLICY agro_capacitaciones_all ON agro_capacitaciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_agro_capacitaciones()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agro_capacitaciones_updated_at ON agro_capacitaciones;
CREATE TRIGGER agro_capacitaciones_updated_at
  BEFORE UPDATE ON agro_capacitaciones
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_agro_capacitaciones();
