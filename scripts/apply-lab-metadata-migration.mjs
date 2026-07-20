import fs from 'fs'
import pg from 'pg'

function loadEnv() {
  const env = {}
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

const env = loadEnv()
const password = env.SUPABASE_DB_PASSWORD || env.DATABASE_PASSWORD || ''
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || ''
const ref = 'lpvviyyarkmkputcgrgk'

const sql = `
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
`

const variants = []
if (password) {
  variants.push(
    {
      label: 'db-direct',
      host: `db.${ref}.supabase.co`,
      user: 'postgres',
      password,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    },
    {
      label: 'pooler',
      host: 'aws-0-us-east-1.pooler.supabase.com',
      user: `postgres.${ref}`,
      password,
      port: 6543,
      ssl: { rejectUnauthorized: false },
    },
  )
}
if (serviceKey) {
  variants.push({
    label: 'service-key-as-password',
    host: `db.${ref}.supabase.co`,
    user: 'postgres',
    password: serviceKey,
    port: 5432,
    ssl: { rejectUnauthorized: false },
  })
}

let applied = false
for (const cfg of variants) {
  const client = new pg.Client({
    ...cfg,
    connectionTimeoutMillis: 10000,
  })
  try {
    await client.connect()
    await client.query(sql)
    console.log('Applied via', cfg.label)
    applied = true
    await client.end()
    break
  } catch (err) {
    console.log('Fail', cfg.label, String(err.message).slice(0, 160))
    try {
      await client.end()
    } catch {
      /* ignore */
    }
  }
}

if (!applied) {
  console.error(
    'Could not apply migration. Add SUPABASE_DB_PASSWORD to .env (Database settings → Database password) and re-run.',
  )
  process.exit(1)
}
