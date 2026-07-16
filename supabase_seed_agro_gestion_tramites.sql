DELETE FROM agro_gestion_tramites;
INSERT INTO agro_gestion_tramites (
  fecha_solicitud, unidad_negocio, planta_sede, nombre_proyecto,
  estado, asignado_a, prioridad, observaciones, latitud, longitud
) VALUES
('2025-05-01', 'Agroprogreso', 'Finca El Pilar', 'Actualización ETAR', 'Cerrado', 'Fernanda Figueroa', 'Normal', 'ETAR Finca El Pilar', 14.707722, -90.713167),
('2025-11-06', 'Agroprogreso', 'Finca La Marina', 'Enmienda a compromisos', 'En proceso', 'Renato Arguera', 'Normal', 'Enmienda a compromiso XVII de resolución. A la espera de respuesta del MARN.', 14.55, -90.65),
('2025-12-16', 'Agroprogreso', 'Finca El Pilar', 'Instrumento Ambiental', 'En proceso', 'Fernanda Figueroa', 'Normal', 'Instrumento Almacenamiento de combustible. Ya se ingresó al MARN. A la espera de resolución.', 14.707722, -90.713167),
('2025-12-16', 'Agroprogreso', 'Finca El Pilar', 'Renovación Licencia', 'En proceso', 'Renato Arguera', 'Alta', 'Renovación de Licencia Ambiental finca El Pilar por actualización de instrumento (unificación). A la espera que el MARN entregue licencia.', 14.707722, -90.713167),
('2026-01-14', 'Agroprogreso', 'Finca El Pilar', 'Capacitaciones', 'En proceso', 'Marilyn', 'Normal', 'Pendiente que el corporativo confirme fechas de capacitaciones.', 14.707722, -90.713167),
('2025-12-16', 'Agroprogreso', 'Finca San Miguel', 'Actualización ETAR', 'En proceso', 'Fernanda Figueroa', 'Normal', 'Actualización ETAR Finca San Miguel. Únicamente queda pendiente la impresión del documento.', 14.813632, -90.278771);
