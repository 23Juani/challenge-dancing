/**
 * Barra inferior de control (Liquid Glass HUD):
 * - D-Pad de navegación
 * - Slider de Exageración de Terreno (1.0x a 3.0x)
 * - Reproductor de Secuencia de Tiempo del Dataset (Play/Pause, Scrubber, Fechas NISAR)
 * - Botón Toggle Vista Plana 2D <-> Google Earth 3D
 * - Botón "▶ Simular Escenario" y "↺ Restablecer"
 * - Perfil topográfico de elevación
 */
import { icons } from './icons.js';

export const TIMELINE_STEPS = [
  { label: '15 May', full: '15 May 2026 — Línea base seca (0.2 mm/mes)', score: 0.15, disp: '1.2 mm' },
  { label: '29 May', full: '29 May 2026 — Órbita ascendente (1.1 mm/mes)', score: 0.22, disp: '2.4 mm' },
  { label: '12 Jun', full: '12 Jun 2026 — Detección de reptación inicial', score: 0.35, disp: '4.8 mm' },
  { label: '06 Jul', full: '06 Jul 2026 — Incremento humedad de talud', score: 0.45, disp: '6.5 mm' },
  { label: '18 Ago', full: '18 Ago 2026 — Anomalía dieléctrica precursora', score: 0.58, disp: '9.2 mm' },
  { label: '30 Sep', full: '30 Sep 2026 — Aceleración deformación (8 mm/mes)', score: 0.72, disp: '14.1 mm' },
  { label: '24 Oct', full: '24 Oct 2026 — Lluvia saturante severa', score: 0.85, disp: '19.8 mm' },
  { label: '13 Nov', full: '13 Nov 2026 — Adquisición NISAR L0B (Crítico)', score: 0.96, disp: '28.4 mm' },
];

export function mountBottomBar(
  container,
  store,
  { onPan, onZoom, onExaggerationChange, onReset, onSimulate, onToggleViewMode, onTimelineChange }
) {
  let isPlaying = false;
  let playInterval = null;
  let currentStep = TIMELINE_STEPS.length - 1;
  let playbackSpeed = 1; // 1x o 2x

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
        <span class="control-block__label">Relieve 3D</span>
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
        <span class="control-block__label">Capas</span>
      </div>
      <button class="layers-dropdown-btn liquid-pill" id="btn-layers-dropdown">
        <span id="active-layers-count">7 / 9</span>
        <span class="dropdown-chevron">⌵</span>
      </button>
    </div>

    <!-- Reproductor de Secuencia de Tiempo del Dataset -->
    <div class="control-block control-block--timeline">
      <div class="control-block__header" style="justify-content: space-between;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="control-block__icon">⏱</span>
          <span class="control-block__label">Secuencia Temporal Dataset</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button class="timeline-speed-btn liquid-pill" id="btn-timeline-speed" title="Velocidad">1x</button>
          <span class="timeline-status-badge" id="timeline-date-badge">13 Nov (NISAR)</span>
        </div>
      </div>
      
      <div class="timeline-player-row">
        <button class="timeline-play-btn liquid-pill" id="btn-timeline-play" title="Reproducir secuencia">▶</button>
        <button class="timeline-step-btn" id="btn-timeline-prev" title="Paso anterior">⏮</button>
        
        <div class="satellite-timeline" style="flex:1;">
          <input type="range" id="timeline-slider" min="0" max="${TIMELINE_STEPS.length - 1}" step="1" value="${currentStep}" class="timeline-scrubber" />
          <div class="satellite-timeline__labels" id="timeline-labels">
            ${TIMELINE_STEPS.map((s, idx) => `<span class="${idx === currentStep ? 'is-current' : ''}">${s.label}</span>`).join('')}
          </div>
        </div>

        <button class="timeline-step-btn" id="btn-timeline-next" title="Paso siguiente">⏭</button>
      </div>
    </div>

    <!-- Botones de Acción (Transición 2D/3D + Simulación) -->
    <div class="action-buttons-group">
      <button class="btn btn--earth liquid-pill" id="btn-toggle-viewmode" title="Alternar Vista Plana 2D y Google Earth 3D">
        🏔 Google Earth 3D
      </button>
      <button class="btn btn--simulate liquid-pill" id="btn-simulate">
        ▶ Simular
      </button>
      <button class="btn btn--reset liquid-pill" id="btn-reset">
        ↺ Reset
      </button>
    </div>

    <!-- Perfil Topográfico de Elevación -->
    <div class="elevation-profile-widget">
      <div class="elevation-profile-widget__labels">
        <span>6.462 m</span>
        <span>3.640 m</span>
        <span>970 m</span>
      </div>
      <svg class="elevation-profile-widget__chart" viewBox="0 0 110 52" preserveAspectRatio="none">
        <path d="M0,45 Q20,38 35,12 Q45,28 58,6 Q75,32 95,44 L110,48" fill="none" stroke="rgba(2, 132, 199, 0.7)" stroke-width="1.8"/>
        <path d="M0,45 Q20,38 35,12 Q45,28 58,6 Q75,32 95,44 L110,48 L110,52 L0,52 Z" fill="url(#elevGrad)" opacity="0.32"/>
        <circle cx="58" cy="6" r="3.5" fill="#EF4444"/>
        <defs>
          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop stop-color="#0284c7"/>
            <stop offset="1" stop-color="transparent"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  `;

  // D-Pad
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

  // Toggle Vista Plana 2D <-> Google Earth 3D
  const btnToggleView = container.querySelector('#btn-toggle-viewmode');
  btnToggleView.addEventListener('click', () => {
    if (onToggleViewMode) onToggleViewMode();
  });

  window.addEventListener('viewmode-changed', (e) => {
    const mode = e.detail?.mode ?? '3d';
    if (mode === 'flat') {
      btnToggleView.innerHTML = `🚀 Entrar Google Earth 3D`;
      btnToggleView.classList.add('is-flat-mode');
    } else {
      btnToggleView.innerHTML = `🗺 Vista Plana 2D`;
      btnToggleView.classList.remove('is-flat-mode');
    }
  });

  // Controles de Línea de Tiempo
  const btnPlay = container.querySelector('#btn-timeline-play');
  const btnPrev = container.querySelector('#btn-timeline-prev');
  const btnNext = container.querySelector('#btn-timeline-next');
  const btnSpeed = container.querySelector('#btn-timeline-speed');
  const slider = container.querySelector('#timeline-slider');
  const dateBadge = container.querySelector('#timeline-date-badge');
  const labelsContainer = container.querySelector('#timeline-labels');

  function updateTimelineView(step) {
    currentStep = step;
    slider.value = step;
    const info = TIMELINE_STEPS[step];
    dateBadge.textContent = info.label;

    // Actualizar labels visuales
    Array.from(labelsContainer.children).forEach((el, idx) => {
      el.className = idx === step ? 'is-current' : '';
    });

    if (onTimelineChange) {
      onTimelineChange({
        stepIndex: step,
        totalSteps: TIMELINE_STEPS.length,
        progress: step / (TIMELINE_STEPS.length - 1),
        stepInfo: info,
      });
    }
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      btnPlay.textContent = '⏸';
      btnPlay.classList.add('is-playing');
      const delay = Math.round(1500 / playbackSpeed);
      playInterval = setInterval(() => {
        let next = (currentStep + 1) % TIMELINE_STEPS.length;
        updateTimelineView(next);
      }, delay);
    } else {
      btnPlay.textContent = '▶';
      btnPlay.classList.remove('is-playing');
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
      }
    }
  }

  btnPlay.addEventListener('click', togglePlay);

  btnSpeed.addEventListener('click', () => {
    playbackSpeed = playbackSpeed === 1 ? 2 : 1;
    btnSpeed.textContent = `${playbackSpeed}x`;
    if (isPlaying) {
      togglePlay(); // reinicia intervalo con nueva velocidad
      togglePlay();
    }
  });

  btnPrev.addEventListener('click', () => {
    const prev = Math.max(0, currentStep - 1);
    updateTimelineView(prev);
  });

  btnNext.addEventListener('click', () => {
    const next = Math.min(TIMELINE_STEPS.length - 1, currentStep + 1);
    updateTimelineView(next);
  });

  slider.addEventListener('input', () => {
    updateTimelineView(parseInt(slider.value, 10));
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
