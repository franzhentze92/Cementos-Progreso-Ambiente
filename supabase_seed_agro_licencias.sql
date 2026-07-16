DELETE FROM agro_licencias_ambientales WHERE unidad_negocio = 'Agroprogreso';
INSERT INTO agro_licencias_ambientales (
  unidad_negocio, planta_sede, licencia, expediente, categoria,
  vigencia, vigencia_inicio, vigencia_fin, estado, latitud, longitud
) VALUES
('Agroprogreso', 'Agro San Miguel', 'Agro SM', 'DABI-1945-2021', 'C', 'Del 27/01/2022 al 26/01/2027', '2022-01-27', '2027-01-26', 'VIGENTE', 14.813632, -90.278771),
('Agroprogreso', 'Aprovechamiento forestal Helios', 'Aprovechamiento forestal Helios', 'CR-E-2442-2023', 'CR', 'NO APLICA', NULL, NULL, 'VIGENTE', 14.735452, -90.703316),
('Agroprogreso', 'Agro San Miguel', 'Aserradero Móvil', 'EAI-6624-2022', 'C+PGA', 'NO APLICA', NULL, NULL, 'VIGENTE', 14.813632, -90.278771),
('Agroprogreso', 'Finca La Marina', 'Finca La Marina', 'CR-F-0524-2025', 'CR', 'NO APLICA', NULL, NULL, 'VIGENTE', 14.55, -90.65),
('Agroprogreso', 'Finca El Pilar', 'Unificación Finca El Pilar', 'APGA-F-0027-2025', 'B2', 'Del 6/01/2026 al 5/01/2031', '2026-01-06', '2031-01-05', 'VIGENTE', 14.707722, -90.713167),
('Agroprogreso', 'Finca El Pilar', 'Almacenamiento de combustible Finca El Pilar', 'EAI-F-8308-2025', 'C', 'NO APLICA', NULL, NULL, 'VIGENTE', 14.707722, -90.713167),
('Agroprogreso', 'Finca El Pilar', 'Proyecto Carbonero Finca El Pilar', '', '', 'NO APLICA', NULL, NULL, 'EN PROCESO', 14.707722, -90.713167),
('Agroprogreso', 'Finca El Pilar', 'Finca El Pilar', 'DABI-1734-2021', 'B2', 'Del 27/04/2022 al 26/04/2027', '2022-04-27', '2027-04-26', 'DESISTIDO', 14.707722, -90.713167),
('Agroprogreso', 'Finca El Pilar', 'Instalación malla comunitaria fase 1', 'CR-E-3423-2021', 'CR', 'NO APLICA', NULL, NULL, 'DESISTIDO', 14.707722, -90.713167),
('Agroprogreso', 'Finca El Pilar', 'Instalación malla comunitaria fase 2', 'CR-E-1875-2022', 'CR', 'NO APLICA', NULL, NULL, 'DESISTIDO', 14.707722, -90.713167),
('Agroprogreso', 'Saquipec', 'Saquipec', 'APGA-0107-2017', 'A', 'Del 14/02/2026 al 13/02/2029', '2026-02-14', '2029-02-13', 'VIGENTE', 14.62, -90.58);
