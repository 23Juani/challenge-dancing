/**
 * Barra superior HUD de TERRA-SAR (Image 2):
 * - Logo de montaña poligonal + nombre + subtítulo "TERRITORIAL INTELLIGENCE SYSTEM"
 * - Pestañas con iconos: Overview, Monitoring, Risk Analysis, Simulation, Resource Prioritization
 * - Widget de ubicación (LA PAZ, BOLIVIA) + timestamp + estado operativo verde + avatar de usuario
 */
import { SOLUTION_NAME, BASE_LOCATION_LABEL } from '../config.js';
import { icons } from './icons.js';

const TABS = [
  { id: 'Overview', label: 'Overview', icon: icons.tabOverview },
  { id: 'Monitoring', label: 'Monitoring', icon: icons.tabMonitoring },
  { id: 'Risk Analysis', label: 'Risk Analysis', icon: icons.tabRisk },
  { id: 'Simulation', label: 'Simulation', icon: icons.tabSimulation },
  { id: 'Resource Prioritization', label: 'Resource Prioritization', icon: icons.tabPrioritization },
];

export function mountTopBar(container, store) {
  const brandTitle = SOLUTION_NAME ? escapeHtml(SOLUTION_NAME) : 'TERRA-SAR';

  container.innerHTML = `
    <div class="topbar__brand">
      <div class="topbar__logo">${icons.logoMountain}</div>
      <div class="topbar__titles">
        <span class="topbar__solution-name" id="solution-name">${brandTitle}</span>
        <span class="topbar__tagline">TERRITORIAL INTELLIGENCE SYSTEM</span>
      </div>
    </div>

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

    <div class="topbar__right">
      <div class="topbar__location">
        <span class="topbar__location-pin">📍</span>
        <div class="topbar__location-text">
          <b>${BASE_LOCATION_LABEL}</b>
          <span id="topbar-timestamp">Últ. actualización: 14/06/2026 16:32</span>
        </div>
      </div>
      <div class="topbar__status">
        <span class="status-dot"></span>
        <span id="topbar-status-label">Sistema Operativo</span>
      </div>
      <button class="topbar__view-btn liquid-pill" id="btn-topbar-viewmode" title="Alternar Vista Plana 2D y Google Earth 3D">
        🚀 Google Earth 3D
      </button>
      <button class="topbar__theme-btn liquid-pill" id="btn-toggle-theme" title="Alternar Modo Claro / Oscuro">
        ☀️ Modo Claro
      </button>
      <button class="topbar__info-btn liquid-pill" id="btn-toggle-info" title="Información del Proyecto y Misión NISAR">
        ℹ Misión
      </button>
      <div class="topbar__user" title="Perfil de usuario">
        ${icons.user}
      </div>
    </div>
  `;

  const viewBtn = container.querySelector('#btn-topbar-viewmode');
  viewBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggle-viewmode'));
  });

  window.addEventListener('viewmode-changed', (e) => {
    const mode = e.detail?.mode ?? '3d';
    if (viewBtn) {
      viewBtn.textContent = mode === 'flat' ? '🚀 Google Earth 3D' : '🗺 Vista Plana 2D';
    }
  });

  const themeBtn = container.querySelector('#btn-toggle-theme');
  themeBtn?.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const nextTheme = isLight ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    themeBtn.textContent = isLight ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextTheme } }));
  });

  container.querySelector('#btn-toggle-info')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('toggle-landing'));
  });

  const tabsEl = container.querySelector('#topbar-tabs');
  tabsEl.addEventListener('click', (e) => {
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
