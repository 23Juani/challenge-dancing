/**
 * Overlay de alerta a pantalla completa, disparado cuando llega un `live_alert`
 * por /ws/alerts (p.ej. desde el puerto de demostracion en tiempo real).
 */
export function mountAlertOverlay(container) {
  let timeoutId = null;

  function show(assessment) {
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="alert-overlay__title">⚠ ALERTA DE DESLIZAMIENTO DETECTADA</div>
      <div class="alert-overlay__subtitle">
        ${assessment.zone_name} — Desplazamiento: ${assessment.displacement_mm_month.toFixed(1)} mm/mes,
        lluvia 24h: ${assessment.rain_24h_mm.toFixed(1)} mm. Nivel: ${assessment.risk_level.toUpperCase()}.
        Siga las recomendaciones de evacuacion y desvio.
      </div>
      <button class="alert-overlay__close" id="alert-overlay-close">Entendido</button>
    `;
    container.querySelector('#alert-overlay-close').addEventListener('click', hide);

    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(hide, 12000);

    try {
      const audio = new AudioContext();
      const osc = audio.createOscillator();
      osc.frequency.value = 880;
      osc.connect(audio.destination);
      osc.start();
      setTimeout(() => osc.stop(), 350);
    } catch {
      // Silencioso si el navegador bloquea audio sin interaccion previa.
    }
  }

  function hide() {
    container.classList.add('hidden');
  }

  return { show, hide };
}
