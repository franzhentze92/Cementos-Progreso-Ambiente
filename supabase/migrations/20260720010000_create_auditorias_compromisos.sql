-- Auditorías de compromisos ambientales (dictámenes IA persistidos)

CREATE TABLE IF NOT EXISTS auditorias_compromisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL DEFAULT '',
  titulo text NOT NULL DEFAULT '',
  dictamen_md text NOT NULL DEFAULT '',
  resumen text NOT NULL DEFAULT '',
  fuente text NOT NULL DEFAULT 'openai',
  estado text NOT NULL DEFAULT 'Borrador',
  generado_por text NOT NULL DEFAULT '',
  kpis jsonb NOT NULL DEFAULT '{}'::jsonb,
  mensajes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auditorias_compromisos_created_idx
  ON auditorias_compromisos (created_at DESC);
CREATE INDEX IF NOT EXISTS auditorias_compromisos_estado_idx
  ON auditorias_compromisos (estado);

ALTER TABLE auditorias_compromisos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auditorias_compromisos_all ON auditorias_compromisos;
CREATE POLICY auditorias_compromisos_all ON auditorias_compromisos
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_updated_at_auditorias_compromisos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditorias_compromisos_updated_at ON auditorias_compromisos;
CREATE TRIGGER auditorias_compromisos_updated_at
  BEFORE UPDATE ON auditorias_compromisos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_auditorias_compromisos();

-- RBAC opcional (si existe app_role_modules en el entorno)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_role_modules'
  ) THEN
    INSERT INTO app_role_modules (role_code, module_id)
    VALUES
      ('Admin', 'auditorias'),
      ('Gerencia', 'auditorias')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
