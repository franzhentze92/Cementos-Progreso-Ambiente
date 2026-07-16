-- Seed Ejecuciones Moni · Planta Alicón (sedes Alicon / Subestación Alicon)
INSERT INTO ejecuciones_monitoreos (
  anio, unidad_negocio, planta_sede, tipo_monitoreo, parametro, puntos,
  referencia, comparacion, motivo, fecha_inicio, fecha_fin, estado, comentarios
) VALUES
(2026, 'Cementos Progreso', 'Alicon', 'Interno', 'MP, Gases, ruido', 2, '', 'OMS', 'Control', '2026-06-08', '2026-06-09', 'Ejecutado', 'Control'),
(2026, 'Cementos Progreso', 'Subestación Alicon', 'Interno', 'MP, Gases, ruido', 1, '', 'OMS', 'Compromiso ambiental', '2026-06-08', '2026-06-09', 'Ejecutado', 'Compromiso según plan de manejo '),
(2026, 'Cementos Progreso', 'Alicon', 'Externo', 'ARO', 1, 'Salida PTAR Alicon', 'Reuso', 'Compromiso ambiental', '2026-03-23', '2026-03-24', 'Ejecutado', 'Sin metales. Informe con cambios'),
(2026, 'Cementos Progreso', 'Alicon', 'Externo', 'ARO', 1, 'Salida PTAR Alicon', 'Reuso', 'Compromiso ambiental', '2026-07-01', '2026-07-28', 'Programado', 'Sin metales'),
(2026, 'Cementos Progreso', 'Alicon', 'Externo', 'ARE', 1, 'Salida lagunas', 'Cuerpo receptor', 'Compromiso ambiental', '2026-03-23', '2026-03-24', 'Ejecutado', 'Con metales'),
(2026, 'Cementos Progreso', 'Alicon', 'Externo', 'ARE', 1, 'Salida lagunas', 'Cuerpo receptor', 'Compromiso ambiental', '2026-07-01', '2026-07-28', 'Ejecutado', 'Sin metales. Informe con cambios')
ON CONFLICT (fecha_inicio, planta_sede, parametro, tipo_monitoreo) DO NOTHING;
