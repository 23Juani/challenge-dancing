/**
 * Barra superior: logo, SOLUTION_NAME (puede estar vacio), pestanas, ubicacion con
 * timestamp e indicador de "Sistema Operativo".
 */
import { SOLUTION_NAME, BASE_LOCATION_LABEL } from '../config.js';

const TABS = ['Overview', 'Monitoring', 'Risk Analysis', 'Simulation', 'Resource Prioritization'];

export function mountTopBar(container, store) {
  container.innerHTML = `
    <div class="topbar__brand">
      <div class="topbar__logo"></div>
      <span class="topbar__solution-name" id="solution-name">${escapeHtml(SOLUTION_NAME)}</span>
    </div>
    <nav class="topbar__tabs" id="topbar-tabs">
      ${TABS.map(
        (t, i) => `<button class="topbar__tab${i === 0 ? ' is-active' : ''}" data-tab="${t}">${t}</button>`,
      ).join('')}
    </nav>
    <div class="topbar__right">
      <div class="topbar__location">
        <b>${BASE_LOCATION_LABEL}</b><br />
        <span id="topbar-timestamp"></span>
      </div>
      <div class="topbar__status">
        <span class="status-dot"></span>
        <span id="topbar-status-label">Sistema Operativo</span>
      </div>
    </div>
  `;

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
    tsEl.textContent = `Ult. actualizacion: ${now.toLocaleString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`;
  };
  updateClock();
  setInterval(updateClock, 1000 * 30);

  const statusLabel = container.querySelector('#topbar-status-label');
  store.subscribe((state) => {
    if (state.config) {
      statusLabel.textContent = state.config.operational_status === 'operativo' ? 'Sistema Operativo' : 'Degradado';
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
