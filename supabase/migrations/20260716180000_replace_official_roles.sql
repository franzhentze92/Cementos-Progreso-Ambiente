-- Roles oficiales: Admin, Gerencia, Gestor Alicón, Gestor Agroprogreso

INSERT INTO app_roles (code, label, description, sort_order, permissions) VALUES
  ('Admin', 'Admin', 'Acceso total a dashboard, reportes, entrada de datos, mapa y chatbot.', 1, '["*"]'::jsonb),
  ('Gerencia', 'Gerencia', 'Solo dashboard, reportes (operaciones), mapa, perfil y chatbot. Sin entrada de datos.', 2, '["dashboard:read","reportes:read","mapa:read","chatbot:use"]'::jsonb),
  ('Gestor_Datos_Alicon', 'Gestor de Datos Alicón', 'Solo entrada de datos de Planta Alicón y perfil. Sin reportes, dashboard, mapa ni chatbot.', 3, '["entrada:write"]'::jsonb),
  ('Gestor_Datos_Agroprogreso', 'Gestor de Datos Agroprogreso', 'Solo entrada de datos de Agroprogreso y perfil. Sin reportes, dashboard, mapa ni chatbot.', 4, '["entrada:write"]'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  permissions = EXCLUDED.permissions;

UPDATE app_users SET role_code = 'Admin' WHERE role_code IN ('Administrador', 'Operador');
UPDATE app_users SET role_code = 'Gerencia' WHERE role_code IN ('Consulta');

DELETE FROM app_role_modules;

INSERT INTO app_role_modules (role_code, module_id)
SELECT 'Admin', m FROM unnest(ARRAY[
  'dashboard','mapa','perfil','chatbot',
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
SELECT 'Gerencia', m FROM unnest(ARRAY[
  'dashboard','mapa','perfil','chatbot',
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

INSERT INTO app_role_modules (role_code, module_id)
SELECT 'Gestor_Datos_Alicon', m FROM unnest(ARRAY[
  'perfil',
  'entrada-datos.planta-alicon.incidentes-ambientales',
  'entrada-datos.planta-alicon.inspeccion-ambiental',
  'entrada-datos.planta-alicon.monitoreo-ambiental',
  'entrada-datos.planta-alicon.huella-de-carbono'
]) AS m
ON CONFLICT DO NOTHING;

INSERT INTO app_role_modules (role_code, module_id)
SELECT 'Gestor_Datos_Agroprogreso', m FROM unnest(ARRAY[
  'perfil',
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
  'entrada-datos.agroprogreso.gestion-de-tramites'
]) AS m
ON CONFLICT DO NOTHING;

DELETE FROM app_roles WHERE code IN ('Administrador', 'Operador', 'Consulta');
