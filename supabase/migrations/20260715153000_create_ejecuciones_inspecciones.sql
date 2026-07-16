-- Ejecuciones inspecciones (Desempeño Ambiental.xlsx)

CREATE TABLE IF NOT EXISTS ejecuciones_inspecciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia integer NOT NULL,
  mes text NOT NULL,
  anio integer NOT NULL,
  semana integer,
  fecha date NOT NULL,
  unidad_negocio text NOT NULL,
  planta_sede text NOT NULL,
  responsable text NOT NULL DEFAULT '',
  resultado_general numeric,
  num_hallazgos integer,
  nivel_riesgo text NOT NULL DEFAULT '',
  requiere_accion_inmediata text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  informe text NOT NULL DEFAULT 'Abrir informe',
  link text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ejecuciones_inspecciones_natural_key UNIQUE (
    fecha, planta_sede, unidad_negocio
  )
);

CREATE INDEX IF NOT EXISTS ejecuciones_inspecciones_fecha_idx
  ON ejecuciones_inspecciones (fecha DESC);
CREATE INDEX IF NOT EXISTS ejecuciones_inspecciones_unidad_idx
  ON ejecuciones_inspecciones (unidad_negocio);
CREATE INDEX IF NOT EXISTS ejecuciones_inspecciones_sede_idx
  ON ejecuciones_inspecciones (planta_sede);
CREATE INDEX IF NOT EXISTS ejecuciones_inspecciones_anio_mes_idx
  ON ejecuciones_inspecciones (anio, mes);

ALTER TABLE ejecuciones_inspecciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ejecuciones_inspecciones_all ON ejecuciones_inspecciones;
CREATE POLICY ejecuciones_inspecciones_all ON ejecuciones_inspecciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_ejecuciones_inspecciones()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ejecuciones_inspecciones_updated_at ON ejecuciones_inspecciones;
CREATE TRIGGER ejecuciones_inspecciones_updated_at
  BEFORE UPDATE ON ejecuciones_inspecciones
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_ejecuciones_inspecciones();
