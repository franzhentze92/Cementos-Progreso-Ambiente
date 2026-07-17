-- Fase 4: Analista semanal (briefings predictivos) + RBAC

CREATE TABLE IF NOT EXISTS briefings_semanales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  semana_inicio date NOT NULL,
  semana_fin date NOT NULL,
  titulo text NOT NULL DEFAULT '',
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  resumen text NOT NULL DEFAULT '',
  borrador_md text NOT NULL DEFAULT '',
  kpis jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado text NOT NULL DEFAULT 'Borrador',
  generado_por text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT briefings_semana_inicio_unique UNIQUE (semana_inicio)
);

CREATE INDEX IF NOT EXISTS briefings_semana_idx ON briefings_semanales (semana_inicio DESC);
CREATE INDEX IF NOT EXISTS briefings_estado_idx ON briefings_semanales (estado);

ALTER TABLE briefings_semanales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS briefings_semanales_all ON briefings_semanales;
CREATE POLICY briefings_semanales_all ON briefings_semanales
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_briefings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS briefings_updated_at ON briefings_semanales;
CREATE TRIGGER briefings_updated_at
  BEFORE UPDATE ON briefings_semanales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_briefings();

-- RBAC Fase 4
INSERT INTO app_role_modules (role_code, module_id)
VALUES
  ('Admin', 'analista'),
  ('Gerencia', 'analista'),
  ('Gestor_Datos_Alicon', 'analista'),
  ('Gestor_Datos_Agroprogreso', 'analista')
ON CONFLICT DO NOTHING;
