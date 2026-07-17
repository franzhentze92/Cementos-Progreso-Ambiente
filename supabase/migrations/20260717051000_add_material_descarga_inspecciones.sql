-- Material descargado (Clinker / Coque) para inspecciones de Descarga Barcos

ALTER TABLE ejecuciones_inspecciones
  ADD COLUMN IF NOT EXISTS material_descarga text NOT NULL DEFAULT '';

ALTER TABLE inspecciones_campo
  ADD COLUMN IF NOT EXISTS material_descarga text NOT NULL DEFAULT '';

-- Permitir dos inspecciones el mismo día (Clinker y Coque)
ALTER TABLE ejecuciones_inspecciones
  DROP CONSTRAINT IF EXISTS ejecuciones_inspecciones_natural_key;

ALTER TABLE ejecuciones_inspecciones
  ADD CONSTRAINT ejecuciones_inspecciones_natural_key UNIQUE (
    fecha,
    planta_sede,
    unidad_negocio,
    material_descarga
  );

CREATE INDEX IF NOT EXISTS ejecuciones_inspecciones_material_idx
  ON ejecuciones_inspecciones (material_descarga);

CREATE INDEX IF NOT EXISTS inspecciones_campo_material_idx
  ON inspecciones_campo (material_descarga);
