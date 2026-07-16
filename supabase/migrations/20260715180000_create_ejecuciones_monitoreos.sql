-- Ejecuciones Moni (Desempeño Ambiental.xlsx) · Planta Alicón / Cementos Progreso

CREATE TABLE IF NOT EXISTS ejecuciones_monitoreos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL,
  unidad_negocio text NOT NULL DEFAULT 'Cementos Progreso',
  planta_sede text NOT NULL,
  tipo_monitoreo text NOT NULL DEFAULT '',
  parametro text NOT NULL DEFAULT '',
  puntos integer,
  referencia text NOT NULL DEFAULT '',
  comparacion text NOT NULL DEFAULT '',
  motivo text NOT NULL DEFAULT '',
  fecha_inicio date NOT NULL,
  fecha_fin date,
  estado text NOT NULL DEFAULT '',
  comentarios text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ejecuciones_monitoreos_natural_key UNIQUE (
    fecha_inicio, planta_sede, parametro, tipo_monitoreo
  )
);

CREATE INDEX IF NOT EXISTS ejecuciones_monitoreos_inicio_idx
  ON ejecuciones_monitoreos (fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS ejecuciones_monitoreos_unidad_idx
  ON ejecuciones_monitoreos (unidad_negocio);
CREATE INDEX IF NOT EXISTS ejecuciones_monitoreos_sede_idx
  ON ejecuciones_monitoreos (planta_sede);
CREATE INDEX IF NOT EXISTS ejecuciones_monitoreos_estado_idx
  ON ejecuciones_monitoreos (estado);
CREATE INDEX IF NOT EXISTS ejecuciones_monitoreos_anio_idx
  ON ejecuciones_monitoreos (anio);

ALTER TABLE ejecuciones_monitoreos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ejecuciones_monitoreos_all ON ejecuciones_monitoreos;
CREATE POLICY ejecuciones_monitoreos_all ON ejecuciones_monitoreos
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_ejecuciones_monitoreos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ejecuciones_monitoreos_updated_at ON ejecuciones_monitoreos;
CREATE TRIGGER ejecuciones_monitoreos_updated_at
  BEFORE UPDATE ON ejecuciones_monitoreos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_ejecuciones_monitoreos();
