/**
 * Módulo de modos de adquisición y telemetría de radar NISAR (NASA-ISRO SAR)
 * Basado en las especificaciones del reto "Dancing with the SARs":
 * - Frecuencia A (Banda L, 24 cm): Penetración de dosel vegetal y humedad de suelo pre-falla (HH/VV/HV).
 * - Frecuencia B (Banda S, 9.3 cm): Dispersión superficial y cambios texturales.
 * - Parámetros geofísicos: Constante dieléctrica (ε_r), Coherencia temporal (γ) y Desplazamiento LOS InSAR (Δr).
 */

export const NISAR_TELEMETRY = {
  mission: 'NASA-ISRO NISAR',
  product: 'L0B / L2 InSAR Differential Deformation',
  orbit: 6791,
  track: '035',
  frame: '118',
  acquisitionUtc: '2026-11-13T10:25:17Z',
  centerFrequencyGHz: 1.25, // L-Band
  prfHz: 1650.0,
  targetRegion: 'Andes Centrales / Cuenca La Paz - Cotahuma',
  modes: [
    {
      id: 'insar_deformation',
      label: 'Deformación InSAR (Creep LOS)',
      desc: 'Mapeo milimétrico de cizallamiento plástico y reptación lenta antes del colapso.',
      band: 'Banda L (Fase desenrollada)',
      metric: 'mm/mes',
    },
    {
      id: 'soil_moisture_dielectric',
      label: 'Humedad y Dieléctrica (ε_r)',
      desc: 'Medición directa de saturación de agua libre en poros (ε_r > 25 = suelo saturado).',
      band: 'Banda L (HH / VV)',
      metric: 'ε_r (3-80)',
    },
    {
      id: 'vegetation_penetration',
      label: 'Penetración de Dosel (HV)',
      desc: 'Descomposición polarimétrica para ver a través de la vegetación en taludes boscosos.',
      band: 'Banda L (HV cross-pol)',
      metric: 'dB retrodispersión',
    },
    {
      id: 'interferometric_coherence',
      label: 'Coherencia Temporal (γ)',
      desc: 'Pérdida de coherencia interferométrica (γ < 0.35) indica desprendimiento activo.',
      band: 'Interferograma repetido (12 días)',
      metric: 'γ (0 - 1)',
    },
  ],
};
