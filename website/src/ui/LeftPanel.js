/**
 * Panel izquierdo: "CAPAS TERRITORIALES" (Image 2)
 * Lista interactiva de las 9 capas territoriales con iconos SVG dedicados,
 * toggles de visibilidad (ojo) e indicadores de estado cyan/color.
 */
import { icons } from './icons.js';

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

export function mountLeftPanel(container, store, { onToggleLayer }) {
  container.innerHTML = `
    <div class="panel__header">
      <div class="panel__header-title">
        <span class="panel__header-icon">${icons.tabPrioritization}</span>
        <span>CAPAS TERRITORIALES</span>
      </div>
      <button class="panel__header-btn" title="Minimizar panel">▲</button>
    </div>
    <div id="layer-list" class="layer-list"></div>
  `;

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
