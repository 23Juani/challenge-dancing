/**
 * Barra superior HUD de TERRA-SAR con estética Apple Liquid Glass (Modo Claro):
 * - Logo TERRA-SAR + subtítulo "TERRITORIAL INTELLIGENCE SYSTEM"
 * - Selector de Modos de Mapa tipo Google Maps: [🛰 Satelital] [⛰ Relieve] [🗺 Híbrido]
 * - Pestañas de control territorial (Overview, Monitoring, Risk Analysis, Simulation)
 * - Telemetría de ubicación (LA PAZ, BOLIVIA) + timestamp + estado operativo
 * - Toggle de perspectiva cinemática 2D / 3D Google Earth
 */
import { SOLUTION_NAME, BASE_LOCATION_LABEL } from '../config.js';
import { icons } from './icons.js';

const TABS = [
  { id: 'Overview', label: 'Overview', icon: icons.tabOverview },
  { id: 'Monitoring', label: 'Monitoreo', icon: icons.tabMonitoring },
  { id: 'Risk Analysis', label: 'Riesgo Deslizamiento', icon: icons.tabRisk },
  { id: 'Simulation', label: 'Simulación IA', icon: icons.tabSimulation },
];

const MAP_MODES = [
  { id: 'satellite', label: '🛰 Satelital', desc: 'Ortofoto satelital fotorrealista' },
  { id: 'terrain', label: '⛰ Relieve', desc: 'Mapa topográfico con curvas de nivel' },
  { id: 'hybrid', label: '🗺 Híbrido', desc: 'Satelital + Red vial y delimitaciones' },
];

export function mountTopBar(container, store, { onSelectMapMode }) {
  const brandTitle = SOLUTION_NAME ? escapeHtml(SOLUTION_NAME) : 'TERRA-SAR';

  container.innerHTML = `
    <div class="topbar__brand">
      <div class="topbar__logo">${icons.logoMountain}</div>
      <div class="topbar__titles">
        <span class="topbar__solution-name" id="solution-name">${brandTitle}</span>
        <span class="topbar__tagline">TERRITORIAL INTELLIGENCE SYSTEM</span>
      </div>
    </div>

    <!-- Selector de Modos de Mapa tipo Google Maps -->
    <div class="map-modes-group liquid-pill" id="map-modes-group" title="Modos de Mapa tipo Google Maps">
      ${MAP_MODES.map(
        (m, idx) => `
          <button class="map-mode-btn${idx === 0 ? ' is-active' : ''}" data-mode="${m.id}" title="${m.desc}">
            ${m.label}
          </button>
        `
      ).join('')}
    </div>

    <!-- Pestañas HUD -->
    <nav class="topbar__tabs" id="topbar-tabs">
      ${TABS.map(
        (t, i) => `
          <button class="topbar__tab${i === 0 ? ' is-active' : ''}" data-tab="${t.id}">
            <span class="topbar__tab-icon">${t.icon}</span>
            <span class="topbar__tab-text">${t.label}</span>
          </button>
        `,
      ).join('')}
    </nav>

    <!-- Indicadores de Ubicación y Estado -->
    <div class="topbar__right">
      <div class="topbar__location">
        <span class="topbar__location-pin">📍</span>
        <div class="topbar__location-text">
          <b>${BASE_LOCATION_LABEL}</b>
          <span id="topbar-timestamp">Últ. actualización: 14/06/2026 16:32</span>
        </div>
      </div>
      <div class="topbar__status" id="topbar-status-badge">
        <span class="status-dot"></span>
        <span id="topbar-status-label">Sistema Operativo</span>
      </div>
      <button class="topbar__view-btn liquid-pill" id="btn-topbar-viewmode" title="Alternar Vista Plana 2D y Google Earth 3D">
        🏔 Google Earth 3D
      </button>
      <div class="topbar__user" title="Perfil de Operador Territorial">
        ${icons.user}
      </div>
    </div>
  `;

  // Selector de Modos de Mapa tipo Google Maps
  const mapModesEl = container.querySelector('#map-modes-group');
  mapModesEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.map-mode-btn');
    if (!btn) return;
    mapModesEl.querySelectorAll('.map-mode-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const mode = btn.dataset.mode;
    store.set({ activeMapMode: mode });
    if (onSelectMapMode) onSelectMapMode(mode);
    window.dispatchEvent(new CustomEvent('mapmode-changed', { detail: { mode } }));
  });

  const viewBtn = container.querySelector('#btn-topbar-viewmode');
  viewBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggle-viewmode'));
  });

  window.addEventListener('viewmode-changed', (e) => {
    const mode = e.detail?.mode ?? '3d';
    if (viewBtn) {
      viewBtn.textContent = mode === 'flat' ? '🏔 Google Earth 3D' : '🗺 Vista Plana 2D';
    }
  });

  const tabsEl = container.querySelector('#topbar-tabs');
  tabsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.topbar__tab');
    if (!btn) return;
    tabsEl.querySelectorAll('.topbar__tab').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    store.set({ activeTab: btn.dataset.tab });
  });

  const tsEl = container.querySelector('#topbar-timestamp');
  const updateClock = () => {
    const now = new Date();
    tsEl.textContent = `Últ. actualización: ${now.toLocaleDateString('es-BO')} ${now.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };
  updateClock();
  setInterval(updateClock, 1000 * 30);

  const statusLabel = container.querySelector('#topbar-status-label');
  store.subscribe((state) => {
    if (state.config) {
      statusLabel.textContent =
        state.config.operational_status === 'operativo' ? 'Sistema Operativo' : 'Degradado';
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
