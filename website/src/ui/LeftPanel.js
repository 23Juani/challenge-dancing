/**
 * Panel izquierdo: "CAPAS TERRITORIALES" + "TELEMETRÍA NISAR (Dancing with the SARs)"
 * Lista interactiva con toggles de visibilidad (ojo) e indicadores de estado,
 * más selector de polarización y coherencia radar de la misión NISAR de la NASA.
 */
import { icons } from './icons.js';
import { NISAR_TELEMETRY } from '../world/NisarModes.js';

const LAYER_ICONS = {
  terreno_elevacion: icons.layerTerrain,
  imagen_satelital: icons.layerSatellite,
  deformacion_insar: icons.layerInsar,
  monitoreo_lluvias: icons.layerRain,
  estaciones_monitoreo: icons.layerStations,
  susceptibilidad_geologica: icons.layerGeology,
  infraestructura_urbana: icons.layerUrban,
  edificaciones_expuestas: icons.layerBuildings,
  escenarios_riesgo: icons.layerScenarios,
};

export function mountLeftPanel(container, store, { onToggleLayer, onSelectNisarMode }) {
  container.innerHTML = `
    <!-- Misión NASA-ISRO NISAR Header (Dancing with the SARs) -->
    <div class="nisar-badge-box">
      <div class="nisar-badge-box__title">
        <span class="nisar-pulse-dot"></span>
        <span>MISIÓN NASA NISAR · BANDA L</span>
      </div>
      <div class="nisar-badge-box__meta">
        <span>Órbita <b>${NISAR_TELEMETRY.orbit}</b></span>
        <span>Track <b>${NISAR_TELEMETRY.track}</b></span>
        <span>Frame <b>${NISAR_TELEMETRY.frame}</b></span>
      </div>
      <div class="nisar-modes-pills" id="nisar-modes">
        ${NISAR_TELEMETRY.modes
          .map(
            (m, i) => `
              <button class="nisar-mode-pill${i === 0 ? ' is-active' : ''}" data-mode="${m.id}" title="${m.desc}">
                ${m.label.split(' ')[0]}
              </button>
            `
          )
          .join('')}
      </div>
    </div>

    <!-- Capas Territoriales (Image 2) -->
    <div class="panel__header">
      <div class="panel__header-title">
        <span class="panel__header-icon">${icons.tabPrioritization}</span>
        <span>CAPAS TERRITORIALES</span>
      </div>
    </div>

    <div id="layer-list" class="layer-list"></div>
  `;

  // Selector de modo NISAR
  const modesContainer = container.querySelector('#nisar-modes');
  modesContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.nisar-mode-pill');
    if (!btn) return;
    modesContainer.querySelectorAll('.nisar-mode-pill').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const modeId = btn.dataset.mode;
    store.set({ activeNisarMode: modeId });
    if (onSelectNisarMode) onSelectNisarMode(modeId);
  });

  const list = container.querySelector('#layer-list');

  const render = (layers) => {
    list.innerHTML = layers
      .map((layer) => {
        const iconSvg = LAYER_ICONS[layer.kind] ?? icons.layerTerrain;
        return `
          <div class="layer-row" data-kind="${layer.kind}">
            <button class="layer-row__eye" title="Alternar visibilidad">${icons.eye}</button>
            <span class="layer-row__kind-icon">${iconSvg}</span>
            <span class="layer-row__label">${layer.label}</span>
            <span class="layer-row__dot" style="background:${layer.color}"></span>
          </div>
        `;
      })
      .join('');
  };

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.layer-row');
    if (!row) return;

    const kind = row.dataset.kind;
    const hidden = row.classList.toggle('is-hidden');
    const eyeBtn = row.querySelector('.layer-row__eye');
    eyeBtn.innerHTML = hidden ? icons.eyeOff : icons.eye;

    const visibleKinds = new Set(store.get('visibleLayerKinds'));
    if (hidden) {
      visibleKinds.delete(kind);
    } else {
      visibleKinds.add(kind);
    }
    store.set({ visibleLayerKinds: visibleKinds });
    onToggleLayer(kind, !hidden);
  });

  store.subscribe((state, partial) => {
    if (partial.layers) render(state.layers);
  });
}
