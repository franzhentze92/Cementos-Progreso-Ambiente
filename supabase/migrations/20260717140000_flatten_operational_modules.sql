-- Migra RBAC de módulos por proyecto → módulos funcionales + filtro proyecto.*
-- Antes: operaciones.agroprogreso.monitoreo-ambiental
-- Ahora:  operaciones.monitoreo-ambiental + proyecto.agroprogreso (si aplica)

-- 1) Insertar IDs flat derivados de legacy
INSERT INTO app_role_modules (role_code, module_id)
SELECT DISTINCT
  role_code,
  regexp_replace(
    module_id,
    '^(operaciones|entrada-datos)\.(agroprogreso|planta-alicon|descarga-barcos)\.',
    '\1.'
  )
FROM app_role_modules
WHERE module_id ~ '^(operaciones|entrada-datos)\.(agroprogreso|planta-alicon|descarga-barcos)\.'
ON CONFLICT DO NOTHING;

-- 2) Insertar restricciones de proyecto a partir de scopes legacy
INSERT INTO app_role_modules (role_code, module_id)
SELECT DISTINCT
  role_code,
  'proyecto.' || (regexp_match(
    module_id,
    '^(operaciones|entrada-datos)\.(agroprogreso|planta-alicon|descarga-barcos)\.'
  ))[2]
FROM app_role_modules
WHERE module_id ~ '^(operaciones|entrada-datos)\.(agroprogreso|planta-alicon|descarga-barcos)\.'
ON CONFLICT DO NOTHING;

-- 3) Roles con acceso amplio (Admin / Gerencia): sin restricción de proyecto
--    (borrar proyecto.* para que vean todos los aplicables)
DELETE FROM app_role_modules
WHERE role_code IN ('Admin', 'Administrador', 'Gerencia')
  AND module_id LIKE 'proyecto.%';

-- 4) Eliminar IDs legacy por proyecto
DELETE FROM app_role_modules
WHERE module_id ~ '^(operaciones|entrada-datos)\.(agroprogreso|planta-alicon|descarga-barcos)\.';
