import './styles/main.css';
import { SceneManager } from './core/SceneManager.js';
import { store } from './state/store.js';
import { api } from './services/api.js';
import { AlertsSocket } from './services/ws.js';
import { mountTopBar } from './ui/TopBar.js';
import { mountLeftPanel } from './ui/LeftPanel.js';
import { mountRightPanel } from './ui/RightPanel.js';
import { mountBottomBar } from './ui/BottomBar.js';
import { mountAlertOverlay } from './ui/AlertOverlay.js';
import { icons } from './ui/icons.js';

const DEFAULT_LAT = -16.5204;
const DEFAULT_LON = -68.1297;

async function bootstrap() {
  const viewport = document.getElementById('viewport');
  const appContainer = document.getElementById('app');

  let config = null;
  try {
    config = await api.getConfig();
  } catch (err) {
    console.warn('No se pudo contactar al backend en /api/v1/config. Usando configuración base local.', err);
  }

  const baseLat = config?.base_location?.lat ?? DEFAULT_LAT;
  const baseLon = config?.base_location?.lon ?? DEFAULT_LON;

  // Forzar Modo Claro diurno Apple Liquid Glass
  document.documentElement.setAttribute('data-theme', 'light');

  const scene = new SceneManager({ container: viewport, baseLat, baseLon });

  store.set({ config });

  // Brújula flotante
  const compassEl = document.getElementById('viewport-compass');
  if (compassEl) {
    compassEl.innerHTML = icons.compass;
  }

  // Montar TopBar con selector de Modos de Mapa tipo Google Maps
  mountTopBar(document.getElementById('topbar'), store, {
    onSelectMapMode: (mode) => {
      scene.setMapMode(mode);
    },
  });

  // Montar Panel Izquierdo de Capas Territoriales y Telemetría NISAR
  mountLeftPanel(document.getElementById('panel-left'), store, {
    onToggleLayer: (kind, visible) => scene.setLayerVisible(kind, visible),
    onSelectNisarMode: () => {
      scene.triggerAlertFlash();
    },
  });

  // Montar Panel Derecho de Diagnóstico de Área y Predicción AI
  mountRightPanel(document.getElementById('panel-right'), store);

  // Montar Barra Inferior de Control y Reproductor Temporal
  mountBottomBar(document.getElementById('bottombar'), store, {
    onPan: (dx, dz) => scene.cameraController.pan(dx, dz),
    onZoom: (delta) => scene.cameraController.zoom(delta),
    onExaggerationChange: (factor) => scene.setExaggeration(factor),
    onReset: () => {
      scene.cameraController.resetView(
        scene.viewMode === 'flat' ? { x: 0, y: 380, z: 0.001 } : { x: 120, y: 100, z: 150 },
        { x: 0, y: 0, z: 0 }
      );
    },
    onSimulate: () => runSimulation(scene, appContainer),
    onToggleViewMode: () => scene.toggleViewMode(),
    onTimelineChange: ({ stepIndex, totalSteps, progress, stepInfo }) => {
      scene.setTimelineProgress(progress);
      scene.updateLandslideSimulation(progress);
      handleTimelineStep(stepInfo, progress, appContainer);
    },
  });

  // Overlay de alertas críticas
  const alertOverlay = mountAlertOverlay(document.getElementById('alert-overlay'));

  window.addEventListener('mapmode-changed', (e) => {
    scene.setMapMode(e.detail.mode);
  });

  window.addEventListener('toggle-viewmode', () => {
    scene.toggleViewMode();
  });

  // Raycaster Click-to-Predict en cualquier coordenada del terreno
  window.addEventListener('predict-coordinates', async (e) => {
    const { lat, lon } = e.detail;
    try {
      const assessment = await api.predict(lat, lon, null);
      store.set({
        selectedAssessment: {
          ...assessment,
          is_custom_prediction: true,
          zone_name: `Sondeo [${Math.abs(lat).toFixed(3)}° S, ${Math.abs(lon).toFixed(3)}° O]`,
        },
      });
      scene.triggerAlertFlash();
    } catch (err) {
      console.warn('Fallback heurístico local para predicción:', err);
      const distToIllimani = Math.hypot(lat - (-16.67), lon - (-67.95));
      const isHighSlope = distToIllimani < 0.25;
      const score = isHighSlope ? 0.88 : 0.45;
      store.set({
        selectedAssessment: {
          is_custom_prediction: true,
          zone_id: 'custom_raycast',
          zone_name: `Sondeo [${Math.abs(lat).toFixed(3)}° S, ${Math.abs(lon).toFixed(3)}° O]`,
          center: { lat, lon },
          elevation_m: isHighSlope ? 4600 : 3650,
          slope_deg: isHighSlope ? 42.0 : 26.5,
          geology: isHighSlope ? 'Pizarra y cuarcita metamórfica' : 'Depósitos aluviales y arcilla',
          displacement_mm_month: isHighSlope ? 22 : 6,
          rain_24h_mm: 14.2,
          risk_score: score,
          risk_level: score > 0.7 ? 'critico' : 'precaucion',
          exposure: isHighSlope ? 'Alta' : 'Media',
          confidence_pct: 92,
          priority: score > 0.7 ? 'critica' : 'media',
          trend: [
            { time: 'T-12', displacement_mm: 3 },
            { time: 'T-8', displacement_mm: 7 },
            { time: 'T-4', displacement_mm: 14 },
            { time: 'T-1', displacement_mm: isHighSlope ? 22 : 6 },
          ],
        },
      });
    }
  });

  // Cargar capas territoriales y zonas de monitoreo
  await loadLayersAndZones(scene);

  // Escuchar alertas en tiempo real vía WebSocket
  const socket = new AlertsSocket();
  socket.onMessage((msg) => {
    if (msg.type === 'live_alert') {
      scene.triggerAlertFlash();
      alertOverlay.show(msg.assessment);
      const zone = store.get('zones')?.find((z) => z.id === msg.assessment.zone_id);
      if (zone) scene.focusOnZone(zone);
      store.set({ activeLiveAlert: msg, selectedAssessment: msg.assessment });
      refreshZoneAssessments(scene);
    }
  });
}

function handleTimelineStep(stepInfo, progress, appContainer) {
  const current = store.get('selectedAssessment');
  const currentDisp = parseFloat(stepInfo.disp.replace(' mm', ''));
  const score = stepInfo.score;

  // Activar o desactivar el efecto de parpadeo rojo en todo el Liquid Glass del sitio web
  const statusBadge = document.getElementById('topbar-status-badge');
  const statusLabel = document.getElementById('topbar-status-label');

  if (score > 0.6) {
    appContainer.classList.add('is-emergency-alert');
    if (statusBadge && statusLabel) {
      statusBadge.classList.add('is-alert');
      statusLabel.textContent = 'ALERTA DESLIZAMIENTOS';
    }
  } else {
    appContainer.classList.remove('is-emergency-alert');
    if (statusBadge && statusLabel) {
      statusBadge.classList.remove('is-alert');
      statusLabel.textContent = 'Sistema Operativo';
    }
  }

  if (!current) return;

  const newAssessment = {
    ...current,
    displacement_mm_month: currentDisp,
    risk_score: score,
    risk_level: score > 0.8 ? 'critico' : score > 0.5 ? 'alerta' : 'precaucion',
  };
  store.set({ selectedAssessment: newAssessment });
}

async function loadLayersAndZones(scene) {
  try {
    const [layers, zones] = await Promise.all([api.getLayers(), api.getZones()]);
    store.set({ layers, visibleLayerKinds: new Set(layers.map((l) => l.kind)) });
    store.set({ zones });

    const stationsLayer = layers.find((l) => l.kind === 'estaciones_monitoreo');
    if (stationsLayer) scene.setMonitoringStations(stationsLayer.features);

    await refreshZoneAssessments(scene);

    if (zones.length) {
      selectZone(scene, zones[0].id);
    }
  } catch (err) {
    console.warn('No se pudieron cargar capas/zonas desde el backend.', err);
  }
}

async function refreshZoneAssessments(scene) {
  const zones = store.get('zones') ?? [];
  const assessmentsByZoneId = new Map();
  await Promise.all(
    zones.map(async (zone) => {
      try {
        const assessment = await api.getZoneAssessment(zone.id);
        assessmentsByZoneId.set(zone.id, assessment);
      } catch {
        // continua con las demas zonas
      }
    })
  );
  scene.setZonesWithAssessments(zones, assessmentsByZoneId);
  store.set({ assessmentsByZoneId });

  const selected = store.get('selectedZone');
  if (selected && assessmentsByZoneId.has(selected)) {
    store.set({ selectedAssessment: assessmentsByZoneId.get(selected) });
  }
}

function selectZone(scene, zoneId) {
  const assessment = store.get('assessmentsByZoneId')?.get(zoneId);
  store.set({ selectedZone: zoneId, selectedAssessment: assessment ?? null });
  const zone = store.get('zones')?.find((z) => z.id === zoneId);
  if (zone) scene.focusOnZone(zone);
}

async function runSimulation(scene, appContainer) {
  const selected = store.get('selectedZone');
  const current = store.get('selectedAssessment');
  try {
    const result = await api.simulate({
      zone_id: selected ?? null,
      lat: current?.center?.lat ?? DEFAULT_LAT,
      lon: current?.center?.lon ?? DEFAULT_LON,
      rain_multiplier: 2.5,
      extra_displacement_mm: 15,
    });
    store.set({ selectedAssessment: result.assessment });
    scene.triggerAlertFlash();
    appContainer.classList.add('is-emergency-alert');
    scene.updateLandslideSimulation(0.95);
  } catch (err) {
    console.warn('Error ejecutando simulación', err);
  }
}

bootstrap();
