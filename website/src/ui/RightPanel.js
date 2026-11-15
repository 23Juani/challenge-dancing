/**
 * Panel derecho: datos en vivo de la zona seleccionada, estado de monitoreo y
 * evaluacion de riesgo (gauge + metricas + minigrafico de tendencia), todo
 * proveniente del backend (ningun calculo se hace en el frontend).
 */
const RISK_COLORS = {
  seguro: '#22c55e',
  precaucion: '#eab308',
  alerta: '#f97316',
  critico: '#ef4444',
};

const RISK_LABELS = {
  seguro: 'Seguro',
  precaucion: 'Precaucion',
  alerta: 'Alerta',
  critico: 'Alto Riesgo',
};

export function mountRightPanel(container, store) {
  container.innerHTML = `
    <h3 class="panel__title">🎯 Area Seleccionada</h3>
    <div id="rp-empty" class="info-line">Selecciona una zona en el mapa o en el panel para ver sus datos.</div>
    <div id="rp-content" style="display:none">
      <div class="selected-zone__name" id="rp-name"></div>
      <div class="info-line"><span>📍 Coordenadas</span><b id="rp-coords"></b></div>
      <div class="info-line"><span>⛰ Elevacion</span><b id="rp-elev"></b></div>
      <div class="info-line"><span>📐 Pendiente</span><b id="rp-slope"></b></div>
      <div class="info-line"><span>🪨 Geologia</span><b id="rp-geology"></b></div>

      <hr class="section-divider" />
      <h3 class="panel__title">🛰 Estado de Monitoreo</h3>
      <div class="monitor-status">
        <div class="monitor-status__row"><span class="monitor-status__ok">●</span> Satelite: Activo</div>
        <div class="monitor-status__row" id="rp-disp"></div>
        <div class="monitor-status__row" id="rp-rain"></div>
        <div class="monitor-status__row"><span class="monitor-status__ok">●</span> Estaciones: 3/3 activas</div>
      </div>

      <hr class="section-divider" />
      <h3 class="panel__title">⚠ Evaluacion de Riesgo</h3>
      <div class="risk-gauge">
        <div class="risk-gauge__ring" id="rp-gauge">—</div>
        <div class="risk-gauge__metrics">
          <div class="info-line"><span>Exposicion</span><b id="rp-exposure"></b></div>
          <div class="info-line"><span>Confianza</span><b id="rp-confidence"></b></div>
          <div class="info-line"><span>Prioridad</span><b id="rp-priority"></b></div>
        </div>
      </div>
      <svg class="trend-sparkline" id="rp-trend" viewBox="0 0 240 46" preserveAspectRatio="none"></svg>
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

    container.querySelector('#rp-name').textContent = assessment.zone_name;
    container.querySelector('#rp-coords').textContent = `${assessment.center.lat.toFixed(4)}°, ${assessment.center.lon.toFixed(4)}°`;
    container.querySelector('#rp-elev').textContent = `${Math.round(assessment.elevation_m)} m`;
    container.querySelector('#rp-slope').textContent = `${assessment.slope_deg.toFixed(1)}%`;
    container.querySelector('#rp-geology').textContent = assessment.geology;

    container.querySelector('#rp-disp').innerHTML =
      `<span class="monitor-status__ok">↗</span> Desplazamiento reciente: ↑ ${assessment.displacement_mm_month.toFixed(1)} mm/mes`;
    container.querySelector('#rp-rain').innerHTML =
      `<span class="monitor-status__ok">☔</span> Lluvia (ult. 24h): ${assessment.rain_24h_mm.toFixed(1)} mm`;

    const gauge = container.querySelector('#rp-gauge');
    const color = RISK_COLORS[assessment.risk_level] ?? '#888';
    gauge.style.borderColor = color;
    gauge.innerHTML = `${RISK_LABELS[assessment.risk_level] ?? assessment.risk_level}`;

    container.querySelector('#rp-exposure').textContent = assessment.exposure;
    container.querySelector('#rp-confidence').textContent = `${assessment.confidence_pct.toFixed(0)} %`;
    container.querySelector('#rp-priority').textContent = capitalize(assessment.priority);

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
  const h = 46;
  const values = trend.map((t) => t.displacement_mm);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * (h - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  svg.innerHTML = `
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />
  `;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
