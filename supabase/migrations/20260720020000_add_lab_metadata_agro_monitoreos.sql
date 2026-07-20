-- Metadatos de informes de laboratorio + clave única por unidad
ALTER TABLE agro_monitoreos_ambientales
  ADD COLUMN IF NOT EXISTS laboratorio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuente_informe text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medio text NOT NULL DEFAULT '';

UPDATE agro_monitoreos_ambientales
SET medio = tipo_agua
WHERE (medio IS NULL OR medio = '')
  AND tipo_agua IS NOT NULL
  AND tipo_agua <> '';

ALTER TABLE agro_monitoreos_ambientales
  DROP CONSTRAINT IF EXISTS agro_monitoreos_natural_key;

ALTER TABLE agro_monitoreos_ambientales
  ADD CONSTRAINT agro_monitoreos_natural_key UNIQUE (
    unidad_negocio, fecha, planta_sede, punto_muestreo, parametro
  );

CREATE INDEX IF NOT EXISTS agro_monitoreos_medio_idx
  ON agro_monitoreos_ambientales (medio);
CREATE INDEX IF NOT EXISTS agro_monitoreos_fuente_idx
  ON agro_monitoreos_ambientales (fuente_informe);
CREATE INDEX IF NOT EXISTS agro_monitoreos_unidad_idx
  ON agro_monitoreos_ambientales (unidad_negocio);
