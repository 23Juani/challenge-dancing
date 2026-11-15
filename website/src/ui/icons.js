/**
 * Iconos SVG vectoriales optimizados para el HUD de TERRA-SAR y la landing Hiko.
 */

export const icons = {
  // Logo de montaña poligonal azul TERRA-SAR
  logoMountain: `
    <svg viewBox="0 0 44 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="hud-icon logo-svg">
      <path d="M2 28L18 4L26 15L34 6L42 28H2Z" fill="url(#mountGrad1)"/>
      <path d="M18 4L24 16L12 28H2L18 4Z" fill="url(#mountGrad2)" opacity="0.9"/>
      <path d="M26 15L34 6L42 28H30L26 15Z" fill="url(#mountGrad3)" opacity="0.85"/>
      <path d="M18 4L22 10L16 12L18 4Z" fill="#E0F2FE"/>
      <path d="M34 6L37 11L32 12L34 6Z" fill="#E0F2FE"/>
      <defs>
        <linearGradient id="mountGrad1" x1="2" y1="4" x2="42" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0284C7"/>
          <stop offset="1" stop-color="#0369A1"/>
        </linearGradient>
        <linearGradient id="mountGrad2" x1="2" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#38BDF8"/>
          <stop offset="1" stop-color="#0284C7"/>
        </linearGradient>
        <linearGradient id="mountGrad3" x1="26" y1="6" x2="42" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0EA5E9"/>
          <stop offset="1" stop-color="#075985"/>
        </linearGradient>
      </defs>
    </svg>
  `,

  // Brújula Norte (N)
  compass: `
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="hud-icon compass-svg">
      <circle cx="18" cy="18" r="16" fill="rgba(10, 18, 30, 0.7)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
      <path d="M18 6L21 17H15L18 6Z" fill="#EF4444"/>
      <path d="M18 30L15 19H21L18 30Z" fill="#94A3B8"/>
      <circle cx="18" cy="18" r="2" fill="#FFFFFF"/>
      <text x="18" y="5" text-anchor="middle" fill="#E2E8F0" font-size="8" font-weight="800" font-family="sans-serif">N</text>
    </svg>
  `,

  // Retícula / Target
  target: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>
  `,

  // Lápiz de edición
  pencil: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
  `,

  // Ojo visible
  eye: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  `,

  // Ojo oculto
  eyeOff: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>
  `,

  // Tabs
  tabOverview: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/></svg>
  `,
  tabMonitoring: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  `,
  tabRisk: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  `,
  tabSimulation: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  `,
  tabPrioritization: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
  `,

  // Usuario
  user: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  `,

  // Capas individuales
  layerTerrain: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
  `,
  layerSatellite: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
  `,
  layerInsar: `
    <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2" class="hud-icon"><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="5" stroke="#EF4444"/><circle cx="12" cy="12" r="1.5" fill="#EF4444"/></svg>
  `,
  layerRain: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6M8 14v6M12 16v6"/></svg>
  `,
  layerStations: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M12 12h.01M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19M12 12v6"/></svg>
  `,
  layerGeology: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
  `,
  layerUrban: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><rect width="8" height="18" x="3" y="3" rx="1"/><rect width="8" height="12" x="13" y="9" rx="1"/><path d="M7 8h.01M7 12h.01M7 16h.01M17 14h.01M17 17h.01"/></svg>
  `,
  layerBuildings: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  `,
  layerScenarios: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>
  `,

  // Checkmark cian
  check: `
    <svg viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="3" class="hud-icon check-svg"><polyline points="20 6 9 17 4 12"/></svg>
  `,

  // Home para centro del D-Pad
  home: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="hud-icon"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
  `,

  // Redes sociales para landing Hiko
  instagram: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="social-icon"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
  `,
  xTwitter: `
    <svg viewBox="0 0 24 24" fill="currentColor" class="social-icon"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  `,
  facebook: `
    <svg viewBox="0 0 24 24" fill="currentColor" class="social-icon"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  `,
};
