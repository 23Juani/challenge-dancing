/**
 * Barra inferior de control (Image 2 - TERRA-SAR):
 * - D-Pad de navegación con centro Home
 * - Slider de Exageración de Terreno (1.0x a 3.0x, default 1.8x)
 * - Selector de Capas Activas (7 / 9 ⌵)
 * - Línea de tiempo "Historial de Observaciones Satelitales" (May 15, May 29, Jun 12)
 * - Botones "▶ Simular Escenario" y "↺ Restablecer Vista"
 * - Perfil topográfico de elevación con cotas 4.200 m, 3.600 m, 3.000 m.
 */
import { icons } from './icons.js';

export function mountBottomBar(
  container,
  store,
  { onPan, onZoom, onExaggerationChange, onReset, onSimulate }
) {
  container.innerHTML = `
    <!-- D-Pad de navegación -->
    <div class="dpad-wrapper">
      <div class="dpad" id="dpad">
        <button class="dpad__btn dpad__btn--up" data-dir="up" title="Mover arriba">▲</button>
        <button class="dpad__btn dpad__btn--left" data-dir="left" title="Mover izquierda">◀</button>
        <button class="dpad__btn dpad__btn--center" data-dir="center" title="Vista inicial">${icons.home}</button>
        <button class="dpad__btn dpad__btn--right" data-dir="right" title="Mover derecha">▶</button>
        <button class="dpad__btn dpad__btn--down" data-dir="down" title="Mover abajo">▼</button>
      </div>
    </div>

    <!-- Exageración de Terreno -->
    <div class="control-block">
      <div class="control-block__header">
        <span class="control-block__icon">▲</span>
        <span class="control-block__label">Exageración de Terreno</span>
      </div>
      <div class="control-block__slider-row">
        <span class="control-block__val" id="exaggeration-value">1.8x</span>
        <input type="range" id="exaggeration" min="1.0" max="3.0" step="0.1" value="1.8" />
      </div>
    </div>

    <!-- Capas Activas -->
    <div class="control-block control-block--layers">
      <div class="control-block__header">
        <span class="control-block__icon">▦</span>
        <span class="control-block__label">Capas Activas</span>
      </div>
      <button class="layers-dropdown-btn" id="btn-layers-dropdown">
        <span id="active-layers-count">7 / 9</span>
        <span class="dropdown-chevron">⌵</span>
      </button>
    </div>

    <!-- Historial de Observaciones Satelitales -->
    <div class="control-block control-block--timeline">
      <div class="control-block__header">
        <span class="control-block__icon">📅</span>
        <span class="control-block__label">Historial de Observaciones Satelitales</span>
      </div>
      <div class="satellite-timeline">
        <div class="satellite-timeline__track">
          <div class="satellite-timeline__fill" style="width: 85%;"></div>
          <span class="satellite-timeline__dot is-active" style="left: 10%;"></span>
          <span class="satellite-timeline__dot is-active" style="left: 50%;"></span>
          <span class="satellite-timeline__dot is-active is-current" style="left: 85%;"></span>
        </div>
        <div class="satellite-timeline__labels">
          <span>May 15</span>
          <span>May 29</span>
          <span class="satellite-timeline__date-select">Jun 12 ⌵</span>
        </div>
      </div>
    </div>

    <!-- Botones de Acción -->
    <div class="action-buttons-group">
      <button class="btn btn--simulate" id="btn-simulate">
        ▶ Simular Escenario
      </button>
      <button class="btn btn--reset" id="btn-reset">
        ↺ Restablecer Vista
      </button>
    </div>

    <!-- Perfil Topográfico de Elevación -->
    <div class="elevation-profile-widget">
      <div class="elevation-profile-widget__labels">
        <span>4.200 m</span>
        <span>3.600 m</span>
        <span>3.000 m</span>
      </div>
      <svg class="elevation-profile-widget__chart" viewBox="0 0 110 52" preserveAspectRatio="none">
        <path d="M0,45 Q20,40 38,28 Q55,4 68,10 Q80,22 95,35 L110,48" fill="none" stroke="rgba(34, 211, 238, 0.4)" stroke-width="1.5"/>
        <path d="M0,45 Q20,40 38,28 Q55,4 68,10 Q80,22 95,35 L110,48 L110,52 L0,52 Z" fill="url(#elevGrad)" opacity="0.25"/>
        <circle cx="68" cy="10" r="3" fill="#F97316"/>
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#22D3EE"/>
            <stop offset="1" stop-color="transparent"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  `;

  // Eventos D-Pad
  container.querySelector('#dpad').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const dir = btn.dataset.dir;
    if (dir === 'up') onPan(0, -1);
    else if (dir === 'down') onPan(0, 1);
    else if (dir === 'left') onPan(-1, 0);
    else if (dir === 'right') onPan(1, 0);
    else if (dir === 'center') onReset();
  });

  // Slider Exageración
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
