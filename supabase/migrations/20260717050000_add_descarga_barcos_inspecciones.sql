-- Descarga Barcos: módulo Inspecciones (operaciones + entrada) + RBAC

INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'operaciones.descarga-barcos.inspeccion-ambiental'),
  ('Admin', 'entrada-datos.descarga-barcos.inspeccion-ambiental'),
  ('Gerencia', 'operaciones.descarga-barcos.inspeccion-ambiental'),
  ('Gerencia', 'entrada-datos.descarga-barcos.inspeccion-ambiental'),
  ('Gestor_Datos_Alicon', 'entrada-datos.descarga-barcos.inspeccion-ambiental'),
  ('Gestor_Datos_Alicon', 'operaciones.descarga-barcos.inspeccion-ambiental'),
  ('Gestor_Datos_Agroprogreso', 'entrada-datos.descarga-barcos.inspeccion-ambiental'),
  ('Gestor_Datos_Agroprogreso', 'operaciones.descarga-barcos.inspeccion-ambiental')
ON CONFLICT DO NOTHING;
