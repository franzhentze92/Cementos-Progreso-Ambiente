-- Asignación de módulos/páginas por rol

CREATE TABLE IF NOT EXISTS app_role_modules (
  role_code text NOT NULL REFERENCES app_roles(code) ON DELETE CASCADE,
  module_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (role_code, module_id)
);

CREATE INDEX IF NOT EXISTS app_role_modules_module_idx ON app_role_modules (module_id);

ALTER TABLE app_role_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_role_modules_all ON app_role_modules;
CREATE POLICY app_role_modules_all ON app_role_modules
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO app_role_modules (role_code, module_id)
SELECT 'Administrador', m FROM unnest(ARRAY[
  'dashboard',
  'mapa',
  'perfil',
  'operaciones.agroprogreso.gestion-de-residuos',
  'operaciones.agroprogreso.consumo-de-agua',
  'operaciones.agroprogreso.inspeccion-ambiental',
  'operaciones.agroprogreso.incidentes-ambientales',
  'operaciones.agroprogreso.monitoreo-ambiental',
  'operaciones.agroprogreso.capacitaciones',
  'operaciones.agroprogreso.licencias-ambientales',
  'operaciones.agroprogreso.compostaje',
  'operaciones.agroprogreso.nda-casco-verde',
  'operaciones.agroprogreso.nda-general',
  'operaciones.agroprogreso.gestion-de-tramites',
  'operaciones.planta-alicon.inspeccion-ambiental',
  'operaciones.planta-alicon.incidentes-ambientales',
  'operaciones.planta-alicon.monitoreo-ambiental',
  'operaciones.planta-alicon.huella-de-carbono',
  'entrada-datos.agroprogreso.gestion-de-residuos',
  'entrada-datos.agroprogreso.consumo-de-agua',
  'entrada-datos.agroprogreso.inspeccion-ambiental',
  'entrada-datos.agroprogreso.incidentes-ambientales',
  'entrada-datos.agroprogreso.monitoreo-ambiental',
  'entrada-datos.agroprogreso.capacitaciones',
  'entrada-datos.agroprogreso.licencias-ambientales',
  'entrada-datos.agroprogreso.compostaje',
  'entrada-datos.agroprogreso.nda-casco-verde',
  'entrada-datos.agroprogreso.nda-general',
  'entrada-datos.agroprogreso.gestion-de-tramites',
  'entrada-datos.planta-alicon.incidentes-ambientales',
  'entrada-datos.planta-alicon.inspeccion-ambiental',
  'entrada-datos.planta-alicon.monitoreo-ambiental',
  'entrada-datos.planta-alicon.huella-de-carbono'
]) AS m
ON CONFLICT DO NOTHING;

INSERT INTO app_role_modules (role_code, module_id)
SELECT 'Operador', m FROM unnest(ARRAY[
  'dashboard',
  'mapa',
  'perfil',
  'operaciones.agroprogreso.gestion-de-residuos',
  'operaciones.agroprogreso.consumo-de-agua',
  'operaciones.agroprogreso.inspeccion-ambiental',
  'operaciones.agroprogreso.incidentes-ambientales',
  'operaciones.agroprogreso.monitoreo-ambiental',
  'operaciones.agroprogreso.capacitaciones',
  'operaciones.agroprogreso.licencias-ambientales',
  'operaciones.agroprogreso.compostaje',
  'operaciones.agroprogreso.nda-casco-verde',
  'operaciones.agroprogreso.nda-general',
  'operaciones.agroprogreso.gestion-de-tramites',
  'operaciones.planta-alicon.inspeccion-ambiental',
  'operaciones.planta-alicon.incidentes-ambientales',
  'operaciones.planta-alicon.monitoreo-ambiental',
  'operaciones.planta-alicon.huella-de-carbono',
  'entrada-datos.agroprogreso.gestion-de-residuos',
  'entrada-datos.agroprogreso.consumo-de-agua',
  'entrada-datos.agroprogreso.inspeccion-ambiental',
  'entrada-datos.agroprogreso.incidentes-ambientales',
  'entrada-datos.agroprogreso.monitoreo-ambiental',
  'entrada-datos.agroprogreso.capacitaciones',
  'entrada-datos.agroprogreso.licencias-ambientales',
  'entrada-datos.agroprogreso.compostaje',
  'entrada-datos.agroprogreso.nda-casco-verde',
  'entrada-datos.agroprogreso.nda-general',
  'entrada-datos.agroprogreso.gestion-de-tramites',
  'entrada-datos.planta-alicon.incidentes-ambientales',
  'entrada-datos.planta-alicon.inspeccion-ambiental',
  'entrada-datos.planta-alicon.monitoreo-ambiental',
  'entrada-datos.planta-alicon.huella-de-carbono'
]) AS m
ON CONFLICT DO NOTHING;

INSERT INTO app_role_modules (role_code, module_id)
SELECT 'Consulta', m FROM unnest(ARRAY[
  'dashboard',
  'mapa',
  'perfil',
  'operaciones.agroprogreso.gestion-de-residuos',
  'operaciones.agroprogreso.consumo-de-agua',
  'operaciones.agroprogreso.inspeccion-ambiental',
  'operaciones.agroprogreso.incidentes-ambientales',
  'operaciones.agroprogreso.monitoreo-ambiental',
  'operaciones.agroprogreso.capacitaciones',
  'operaciones.agroprogreso.licencias-ambientales',
  'operaciones.agroprogreso.compostaje',
  'operaciones.agroprogreso.nda-casco-verde',
  'operaciones.agroprogreso.nda-general',
  'operaciones.agroprogreso.gestion-de-tramites',
  'operaciones.planta-alicon.inspeccion-ambiental',
  'operaciones.planta-alicon.incidentes-ambientales',
  'operaciones.planta-alicon.monitoreo-ambiental',
  'operaciones.planta-alicon.huella-de-carbono'
]) AS m
ON CONFLICT DO NOTHING;
