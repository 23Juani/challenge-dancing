/**
 * Panel izquierdo: lista interactiva de las 9 capas territoriales con toggles de
 * visibilidad, que activan/desactivan capas en la escena Three.js via callback.
 */
export function mountLeftPanel(container, store, { onToggleLayer }) {
  container.innerHTML = `
    <h3 class="panel__title">📍 Capas Territoriales</h3>
    <div id="layer-list"></div>
  `;
  const list = container.querySelector('#layer-list');

  const render = (layers) => {
    list.innerHTML = layers
      .map(
        (layer) => `
          <div class="layer-row" data-kind="${layer.kind}">
            <span class="layer-row__eye">👁</span>
            <span class="layer-row__label">${layer.label}</span>
            <span class="layer-row__dot" style="background:${layer.color}"></span>
          </div>
        `,
      )
      .join('');
  };

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.layer-row');
    if (!row) return;
    const kind = row.dataset.kind;
    const hidden = row.classList.toggle('is-hidden');
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
