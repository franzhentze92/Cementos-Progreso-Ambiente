-- Otorga acceso a Monitoreo en vivo (Kunak) para Admin y Gerencia

INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'monitoreo-en-vivo'),
  ('Gerencia', 'monitoreo-en-vivo')
ON CONFLICT DO NOTHING;
