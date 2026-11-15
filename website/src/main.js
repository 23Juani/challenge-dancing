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

const DEFAULT_LAT = -16.5204;
const DEFAULT_LON = -68.1297;

async function bootstrap() {
  const viewport = document.getElementById('viewport');

  let config = null;
  try {
    config = await api.getConfig();
  } catch (err) {
    console.warn('No se pudo contactar al backend en /api/v1/config. Verifica que este corriendo.', err);
  }

  const baseLat = config?.base_location?.lat ?? DEFAULT_LAT;
  const baseLon = config?.base_location?.lon ?? DEFAULT_LON;

  const scene = new SceneManager({ container: viewport, baseLat, baseLon });

  store.set({ config });

  const alertOverlay = mountAlertOverlay(document.getElementById('alert-overlay'));

  mountTopBar(document.getElementById('topbar'), store);
  mountLeftPanel(document.getElementById('panel-left'), store, {
    onToggleLayer: (kind, visible) => scene.setLayerVisibility(kind, visible),
  });
  mountRightPanel(document.getElementById('panel-right'), store);
  mountBottomBar(document.getElementById('bottombar'), store, {
    onPan: (dx, dz) => scene.cameraController.pan(dx, dz),
    onZoom: (delta) => scene.cameraController.zoom(delta),
    onExaggerationChange: (factor) => scene.setTerrainExaggeration(factor),
    onReset: () => {
      scene.cameraController.controls.reset();
    },
    onSimulate: () => runSimulation(scene),
  });

  await loadLayersAndZones(scene);

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

async function loadLayersAndZones(scene) {
  try {
    const [layers, zones] = await Promise.all([api.getLayers(), api.getZones()]);
    store.set({ layers, visibleLayerKinds: new Set(layers.map((l) => l.kind)) });
    store.set({ zones });

    const stationsLayer = layers.find((l) => l.kind === 'estaciones_monitoreo');
    if (stationsLayer) scene.registerStationLayer(stationsLayer.features);

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
    }),
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

async function runSimulation(scene) {
  const selected = store.get('selectedZone');
  if (!selected) return;
  try {
    const result = await api.simulate({
      zone_id: selected,
      rain_multiplier: 2.5,
      extra_displacement_mm: 10,
    });
    store.set({ selectedAssessment: result.assessment });
    scene.triggerAlertFlash();
  } catch (err) {
    console.warn('Error ejecutando simulacion', err);
  }
}

bootstrap();
