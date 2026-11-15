/**
 * Barra inferior de control: D-pad de navegacion de camara, slider de exageracion
 * de terreno (1.0x-3.0x), contador de capas activas, linea de tiempo de
 * observaciones satelitales, botones de simulacion/reset y perfil de elevacion.
 */
export function mountBottomBar(container, store, { onPan, onZoom, onExaggerationChange, onReset, onSimulate }) {
  container.innerHTML = `
    <div class="dpad" id="dpad">
      <span></span><button data-dir="up">▲</button><span></span>
      <button data-dir="left">◀</button><button data-dir="center">⟲</button><button data-dir="right">▶</button>
    </div>

    <div class="control-block">
      <span class="control-block__label">🏔 Exageracion de Terreno</span>
      <input type="range" id="exaggeration" min="1" max="3" step="0.1" value="1" />
      <span class="control-block__value" id="exaggeration-value">1.0x</span>
    </div>

    <div class="control-block">
      <span class="control-block__label">Capas Activas</span>
      <span class="control-block__value" id="active-layers-count">0 / 9</span>
    </div>

    <div class="timeline">
      <span class="control-block__label">📅 Historial de Observaciones Satelitales</span>
      <div class="timeline__track"><div class="timeline__fill" id="timeline-fill" style="width:30%"></div></div>
      <div class="timeline__dates"><span>May 15</span><span>May 29</span><span>Jun 12</span></div>
    </div>

    <div class="action-buttons">
      <button class="btn btn--primary" id="btn-simulate">▶ Simular Escenario</button>
      <button class="btn btn--ghost" id="btn-reset">↺ Restablecer Vista</button>
    </div>

    <div class="elevation-profile" id="elevation-profile">
      <span>4.200 m</span><span>3.600 m</span><span>3.000 m</span>
    </div>
  `;

  container.querySelector('#dpad').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const dir = btn.dataset.dir;
    if (dir === 'up') onPan(0, -1);
    else if (dir === 'left') onPan(-1, 0);
    else if (dir === 'right') onPan(1, 0);
    else if (dir === 'center') onReset();
  });

  const exagInput = container.querySelector('#exaggeration');
  const exagValue = container.querySelector('#exaggeration-value');
  exagInput.addEventListener('input', () => {
    const factor = parseFloat(exagInput.value);
    exagValue.textContent = `${factor.toFixed(1)}x`;
    store.set({ terrainExaggeration: factor });
    onExaggerationChange(factor);
  });

  container.querySelector('#btn-reset').addEventListener('click', onReset);
  container.querySelector('#btn-simulate').addEventListener('click', onSimulate);

  const layersCountEl = container.querySelector('#active-layers-count');
  store.subscribe((state, partial) => {
    if (partial.visibleLayerKinds || partial.layers) {
      const total = state.layers?.length ?? 9;
      const active = state.visibleLayerKinds?.size ?? total;
      layersCountEl.textContent = `${active} / ${total}`;
    }
  });

  const _ = onZoom;
}
