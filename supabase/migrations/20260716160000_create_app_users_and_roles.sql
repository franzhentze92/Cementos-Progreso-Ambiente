-- Roles y usuarios de la aplicación (sin Supabase Auth).
-- Login simulado valida contra app_users; la sesión vive en localStorage.

CREATE TABLE IF NOT EXISTS app_roles (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  password text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  role_code text NOT NULL REFERENCES app_roles(code),
  department text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_users_username_key UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS app_users_role_idx ON app_users (role_code);
CREATE INDEX IF NOT EXISTS app_users_active_idx ON app_users (active);
CREATE INDEX IF NOT EXISTS app_users_email_idx ON app_users (email);

ALTER TABLE app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_roles_all ON app_roles;
CREATE POLICY app_roles_all ON app_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS app_users_all ON app_users;
CREATE POLICY app_users_all ON app_users
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_app_users()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_users_updated_at ON app_users;
CREATE TRIGGER app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_app_users();

INSERT INTO app_roles (code, label, description, sort_order, permissions) VALUES
  (
    'Administrador',
    'Administrador',
    'Acceso completo: reportes, captura, mapa y gestión de usuarios.',
    1,
    '["*"]'::jsonb
  ),
  (
    'Operador',
    'Operador',
    'Consulta reportes y captura datos operativos. Sin gestión de usuarios.',
    2,
    '["dashboard:read","reportes:read","entrada:write","mapa:read"]'::jsonb
  ),
  (
    'Consulta',
    'Consulta',
    'Solo lectura de dashboard, reportes y mapa.',
    3,
    '["dashboard:read","reportes:read","mapa:read"]'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  permissions = EXCLUDED.permissions;

INSERT INTO app_users (username, password, name, email, role_code, department, active)
VALUES (
  'lpaniagua@cempro.com',
  'Javier123!!',
  'L. Paniagua',
  'lpaniagua@cempro.com',
  'Administrador',
  'Gestión Ambiental',
  true
)
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role_code = EXCLUDED.role_code,
  department = EXCLUDED.department,
  active = EXCLUDED.active,
  password = EXCLUDED.password;
