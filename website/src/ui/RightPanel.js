/**
 * Panel derecho: "ÁREA SELECCIONADA" y "SONDEO PREDICTIVO AI" (Liquid Glass HUD)
 * - Muestra telemetría en vivo de zonas departamentales o de coordenadas clickeadas por Raycaster.
 * - Conectado al modelo heurístico / SOUP para predecir deslizamientos en tiempo real.
 * - Reactivo a la reproducción de la línea de tiempo satelital (avanza métricas y curva de tendencia).
 */
import { icons } from './icons.js';

const RISK_COLORS = {
  seguro: '#22c55e',
  precaucion: '#eab308',
  alerta: '#f97316',
  critico: '#ef4444',
};

const RISK_LABELS = {
  seguro: 'Seguro',
  precaucion: 'Precaución',
  alerta: 'Alerta',
  critico: 'Alto Riesgo',
};

export function mountRightPanel(container, store) {
  container.innerHTML = `
    <!-- Encabezado del área seleccionada -->
    <div class="panel__header">
      <div class="panel__header-title">
        <span class="panel__header-icon">${icons.target}</span>
        <span id="rp-panel-title">ÁREA SELECCIONADA</span>
      </div>
      <span class="liquid-pill" id="rp-mode-tag" style="font-size:10px; padding:2px 8px; color:var(--neon-cyan);">ZONA</span>
    </div>

    <div id="rp-empty" class="info-empty">
      Toca cualquier punto del Departamento de La Paz o una zona para activar la predicción con IA.
    </div>

    <div id="rp-content" style="display:none">
      <div class="selected-zone__header">
        <h2 class="selected-zone__name" id="rp-name">Zona de Monitoreo</h2>
        <button class="selected-zone__edit-btn liquid-pill" title="Sondeo">${icons.pencil}</button>
      </div>

      <div class="zone-details">
        <div class="info-line">
          <span class="info-line__label">📍 Coordenadas:</span>
          <b class="info-line__value" id="rp-coords">16.5204° S, 68.1297° O</b>
        </div>
        <div class="info-line">
          <span class="info-line__label">⛰ Elevación:</span>
          <b class="info-line__value" id="rp-elev">3.760 m</b>
        </div>
        <div class="info-line">
          <span class="info-line__label">📐 Pendiente:</span>
          <b class="info-line__value" id="rp-slope">32.5 %</b>
        </div>
        <div class="info-line">
          <span class="info-line__label">🪨 Geología:</span>
          <b class="info-line__value" id="rp-geology">Depósitos coluviales</b>
        </div>
      </div>

      <hr class="section-divider" />

      <!-- Subsección: Estado de Monitoreo -->
      <div class="panel__subheading">
        <span class="status-dot-sm"></span>
        <span>TELEMETRÍA MULTI-SENSOR</span>
      </div>
      <div class="monitor-status">
        <div class="monitor-status__row">
          <span class="monitor-status__icon">🛰</span>
          <span class="monitor-status__label">Satélite Radar:</span>
          <span class="monitor-status__val cyan-highlight">NISAR Banda L (RRSD) ✓</span>
        </div>
        <div class="monitor-status__row">
          <span class="monitor-status__icon">↗</span>
          <span class="monitor-status__label">Desplazamiento LOS:</span>
          <span class="monitor-status__val red-highlight" id="rp-disp">↑ 12 mm/mes</span>
        </div>
        <div class="monitor-status__row">
          <span class="monitor-status__icon">💧</span>
          <span class="monitor-status__label">Lluvia (últ. 24h):</span>
          <span class="monitor-status__val cyan-highlight" id="rp-rain">8.4 mm</span>
        </div>
        <div class="monitor-status__row">
          <span class="monitor-status__icon">🌊</span>
          <span class="monitor-status__label">Dieléctrica (ε_r):</span>
          <span class="monitor-status__val red-highlight" id="rp-dielectric">31.4 (Saturado)</span>
        </div>
        <div class="monitor-status__row">
          <span class="monitor-status__icon">📉</span>
          <span class="monitor-status__label">Coherencia InSAR (γ):</span>
          <span class="monitor-status__val red-highlight" id="rp-coherence">0.28 (Inestable)</span>
        </div>
      </div>

      <hr class="section-divider" />

      <!-- Subsección: Evaluación de Riesgo -->
      <div class="panel__subheading">
        <span class="warn-dot-sm">⚠</span>
        <span>PREDICCIÓN DE DESASTRE (IA)</span>
      </div>

      <div class="risk-gauge-block">
        <div class="risk-donut" id="rp-donut">
          <div class="risk-donut__halo"></div>
          <div class="risk-donut__inner">
            <span class="risk-donut__text" id="rp-gauge-text">Alto<br />Riesgo</span>
          </div>
        </div>
        <div class="risk-metrics">
          <div class="metric-row">
            <span class="metric-icon">📦</span>
            <span class="metric-label">Exposición:</span>
            <b class="metric-value" id="rp-exposure">Alta</b>
          </div>
          <div class="metric-row">
            <span class="metric-icon">🛡</span>
            <span class="metric-label">Confianza:</span>
            <b class="metric-value" id="rp-confidence">92 %</b>
          </div>
          <div class="metric-row">
            <span class="metric-icon">⚠</span>
            <span class="metric-label">Prioridad:</span>
            <b class="metric-value red-highlight" id="rp-priority">Crítica</b>
          </div>
          <div class="metric-row">
            <span class="metric-icon">⏳</span>
            <span class="metric-label">Fallo en 24h:</span>
            <b class="metric-value red-highlight" id="rp-failure-prob">78 %</b>
          </div>
        </div>
      </div>

      <!-- Minigráfico de curva de tendencia temporal -->
      <div class="sparkline-container liquid-pill" style="border-radius:12px; margin-top:10px;">
        <svg class="trend-sparkline" id="rp-trend" viewBox="0 0 240 54" preserveAspectRatio="none"></svg>
      </div>
    </div>
  `;

  const empty = container.querySelector('#rp-empty');
  const content = container.querySelector('#rp-content');

  const render = (assessment) => {
    if (!assessment) {
      empty.style.display = 'block';
      content.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    content.style.display = 'block';

    const isCustom = assessment.is_custom_prediction === true;
    container.querySelector('#rp-panel-title').textContent = isCustom ? 'PREDICCIÓN EN VIVO (IA)' : 'ÁREA SELECCIONADA';
    container.querySelector('#rp-mode-tag').textContent = isCustom ? 'RAYCAST AI' : 'ZONA';

    container.querySelector('#rp-name').textContent = assessment.zone_name;
    container.querySelector('#rp-coords').textContent = `${Math.abs(assessment.center.lat).toFixed(4)}° S, ${Math.abs(assessment.center.lon).toFixed(4)}° O`;
    container.querySelector('#rp-elev').textContent = `${Math.round(assessment.elevation_m).toLocaleString('es-BO')} m`;
    container.querySelector('#rp-slope').textContent = `${assessment.slope_deg.toFixed(1)} %`;
    container.querySelector('#rp-geology').textContent = assessment.geology;

    container.querySelector('#rp-disp').textContent = `↑ ${assessment.displacement_mm_month.toFixed(0)} mm/mes`;
    container.querySelector('#rp-rain').textContent = `${assessment.rain_24h_mm.toFixed(1)} mm`;

    const gaugeText = container.querySelector('#rp-gauge-text');
    const color = RISK_COLORS[assessment.risk_level] ?? '#ef4444';
    const label = RISK_LABELS[assessment.risk_level] ?? 'Alto Riesgo';
    gaugeText.innerHTML = label.replace(' ', '<br />');

    const donut = container.querySelector('#rp-donut');
    donut.style.setProperty('--donut-color', color);

    container.querySelector('#rp-exposure').textContent = assessment.exposure;
    container.querySelector('#rp-confidence').textContent = `${assessment.confidence_pct.toFixed(0)} %`;
    container.querySelector('#rp-priority').textContent = capitalize(assessment.priority);

    // Estimación de probabilidad de falla en 24h
    const failProb = Math.min(99, Math.round(assessment.risk_score * 85 + (assessment.rain_24h_mm > 15 ? 12 : 0)));
    container.querySelector('#rp-failure-prob').textContent = `${failProb} %`;

    renderSparkline(container.querySelector('#rp-trend'), assessment.trend, color);
  };

  store.subscribe((state, partial) => {
    if ('selectedAssessment' in partial) render(state.selectedAssessment);
  });
}

function renderSparkline(svg, trend, color) {
  if (!trend?.length) {
    svg.innerHTML = '';
    return;
  }
  const w = 240;
  const h = 54;
  const values = trend.map((t) => t.displacement_mm);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 12) + 6;
    const y = h - ((v - min) / (max - min)) * (h - 16) - 8;
    return { x, y };
  });

  const pointsStr = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const circles = coords
    .map(
      (c) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.8" fill="${color}" stroke="#ffffff" stroke-width="1.2" />`
    )
    .join('');

  svg.innerHTML = `
    <line x1="0" y1="${h - 2}" x2="${w}" y2="${h - 2}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
    <polyline points="${pointsStr}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    ${circles}
  `;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
