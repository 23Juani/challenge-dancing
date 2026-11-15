/**
 * SceneManager: orquesta la escena Three.js completa (terreno, agua del Titicaca, nubes,
 * capas InSAR, marcadores, iluminacion, camara) con soporte de transicion cinematica
 * Plano 2D <-> Google Earth 3D y Raycaster para prediccion interactiva de desastres.
 */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { TerrainMesh } from '../world/TerrainMesh.js';
import { WaterMesh } from '../world/WaterMesh.js';
import { CloudsMesh } from '../world/CloudsMesh.js';
import { createRiskHeatMaterial, updateHeatHotspots } from '../world/RiskShaders.js';
import { createZoneMarker, createPeakLabel, createStationMarker } from '../world/Markers.js';
import { createCityBlock } from '../world/Buildings.js';
import { CameraController } from '../controls/CameraController.js';
import { makeProjector, makeUnprojector } from '../world/geo.js';

const FLAT_CAMERA_POS = new THREE.Vector3(0, 380, 0.001);
const GOOGLE_EARTH_CAMERA_POS = new THREE.Vector3(120, 100, 150);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export class SceneManager {
  constructor({ container, baseLat, baseLon }) {
    this.container = container;
    this.baseLat = baseLat;
    this.baseLon = baseLon;
    this.project = makeProjector(baseLat, baseLon);
    this.unproject = makeUnprojector(baseLat, baseLon);
    this.clock = new THREE.Clock();

    this.zoneMeshes = new Map();
    this.layerGroups = new Map();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPos = { x: 0, y: 0 };

    this.viewMode = 'flat'; // Inicia en Modo Plano 2D Departamental
    this.morphProgress = 0.0;
    this.targetMorph = 0.0;

    this._initRenderer();
    this._initScene();
    this._initLights();

    // Terreno departamental
    this.terrain = new TerrainMesh({ baseLat, baseLon });
    this.terrain.setReliefMorph(0.0); // Inicialmente plano
    this.scene.add(this.terrain.mesh);

    // Lago Titicaca realista y dinámico
    this.water = new WaterMesh({ baseLat, baseLon });
    this.scene.add(this.water.mesh);

    // Capa de nubes atmosféricas
    this.clouds = new CloudsMesh({ size: 620 });
    this.scene.add(this.clouds.mesh);

    // Overlay de calor InSAR
    this.heatMaterial = createRiskHeatMaterial();
    this.heatMesh = new THREE.Mesh(this.terrain.heatOverlayGeometry, this.heatMaterial);
    this.scene.add(this.heatMesh);

    // Manzana urbana La Paz
    this.cityBlock = createCityBlock({ baseLat, baseLon, terrain: this.terrain });
    this.scene.add(this.cityBlock);

    this._addPeakLabels();

    // Baliza de prediccion interactiva (Click-to-Predict)
    this._initPredictionBeacon();

    // Controlador de cámara
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.cameraController.resetView(FLAT_CAMERA_POS, DEFAULT_TARGET);

    this._setupPointerEvents();
    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);
    this.scene.fog = new THREE.FogExp2(0x0a1222, 0.0022);

    this.camera = new THREE.PerspectiveCamera(
      42,
      this.container.clientWidth / this.container.clientHeight,
      0.5,
      2500,
    );
    this.camera.position.copy(FLAT_CAMERA_POS);
  }

  _initLights() {
    const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x0d1424, 0.65);
    this.scene.add(hemi);
    this.hemiLight = hemi;

    const sun = new THREE.DirectionalLight(0xffe9c4, 1.35);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -300;
    sun.shadow.camera.right = 300;
    sun.shadow.camera.top = 300;
    sun.shadow.camera.bottom = -300;
    sun.shadow.camera.far = 1200;
    this.scene.add(sun);
    this.sunLight = sun;

    const rim = new THREE.DirectionalLight(0x3fd0ff, 0.25);
    rim.position.set(-100, 60, -120);
    this.scene.add(rim);
    this.rimLight = rim;
  }

  _initPredictionBeacon() {
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.visible = false;

    // Anillo exterior pulsante
    const ringGeo = new THREE.RingGeometry(1.5, 2.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide });
    this.beaconRing = new THREE.Mesh(ringGeo, ringMat);
    this.beaconGroup.add(this.beaconRing);

    // Eje vertical cian
    const cylGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 16);
    const cylMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const cyl = new THREE.Mesh(cylGeo, cylMat);
    cyl.position.y = 6;
    this.beaconGroup.add(cyl);

    // Esfera emisiva superior
    const sphereGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff3e00 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.y = 12;
    this.beaconGroup.add(sphere);

    // Etiqueta CSS2D
    const div = document.createElement('div');
    div.className = 'zone-callout zone-callout--beacon liquid-pill';
    div.innerHTML = `<span style="color:#22d3ee;font-weight:700;">📡 SONDEO AI</span><br/><span id="beacon-coord-text" style="font-size:10px;color:#cbd5e1;">Evaluando...</span>`;
    this.beaconLabel = new CSS2DObject(div);
    this.beaconLabel.position.set(0, 15, 0);
    this.beaconGroup.add(this.beaconLabel);

    this.scene.add(this.beaconGroup);
  }

  _setupPointerEvents() {
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (dist < 6) {
        this._handleTerrainClick(e);
      }
    });
  }

  _handleTerrainClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh, false);

    if (intersects.length > 0) {
      const hit = intersects[0].point;
      const { lat, lon } = this.unproject(hit.x, hit.z);

      this.beaconGroup.position.set(hit.x, hit.y + 0.2, hit.z);
      this.beaconGroup.visible = true;

      const textEl = document.getElementById('beacon-coord-text');
      if (textEl) {
        textEl.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
      }

      window.dispatchEvent(
        new CustomEvent('predict-coordinates', {
          detail: {
            lat,
            lon,
            x: hit.x,
            y: hit.y,
            z: hit.z,
          },
        }),
      );
    }
  }

  /**
   * Transición cinemática: sumergirse en la vista 3D Google Earth.
   * La malla de terreno eleva su relieve procedural y la cámara se inclina suavemente.
   */
  enterGoogleEarth3D() {
    this.targetMorph = 1.0;
    this.viewMode = '3d';
    this.cameraController.flyTo(GOOGLE_EARTH_CAMERA_POS, DEFAULT_TARGET, 2000);
    window.dispatchEvent(new CustomEvent('viewmode-changed', { detail: { mode: '3d' } }));
  }

  /**
   * Retorna a la vista de Mapa Plano 2D Departamental (visión cenital macro).
   */
  returnToFlatMap() {
    this.targetMorph = 0.0;
    this.viewMode = 'flat';
    this.cameraController.flyTo(FLAT_CAMERA_POS, DEFAULT_TARGET, 1800);
    window.dispatchEvent(new CustomEvent('viewmode-changed', { detail: { mode: 'flat' } }));
  }

  toggleViewMode() {
    if (this.viewMode === 'flat') {
      this.enterGoogleEarth3D();
    } else {
      this.returnToFlatMap();
    }
  }

  /** Alterna entre iluminación de Modo Claro (Google Earth diurno) y Modo Oscuro */
  setTheme(theme) {
    if (theme === 'light') {
      this.scene.background.set(0xd2e5f8);
      this.scene.fog.color.set(0xd2e5f8);
      this.scene.fog.density = 0.0011;
      this.sunLight.color.set(0xfff5e6);
      this.sunLight.intensity = 1.85;
      this.hemiLight.color.set(0xdbeefc);
      this.hemiLight.groundColor.set(0x8a765e);
      this.hemiLight.intensity = 0.95;
      this.rimLight.intensity = 0.15;
    } else {
      this.scene.background.set(0x070b14);
      this.scene.fog.color.set(0x0a1222);
      this.scene.fog.density = 0.0022;
      this.sunLight.color.set(0xffe9c4);
      this.sunLight.intensity = 1.35;
      this.hemiLight.color.set(0x8fb4ff);
      this.hemiLight.groundColor.set(0x0d1424);
      this.hemiLight.intensity = 0.65;
      this.rimLight.intensity = 0.25;
    }
    this.water.setTheme(theme);
    this.clouds.setTheme(theme);
  }

  _addPeakLabels() {
    const peaks = [
      { name: 'Illimani', lat: this.baseLat - 0.15, lon: this.baseLon + 0.18, elev: 6462 },
      { name: 'Huayna Potosí', lat: this.baseLat + 0.25, lon: this.baseLon - 0.02, elev: 6088 },
      { name: 'Lago Titicaca', lat: this.baseLat + 0.36, lon: this.baseLon - 0.95, elev: 3812 },
      { name: 'Coroico - Yungas', lat: this.baseLat + 0.33, lon: this.baseLon + 0.40, elev: 1750 },
      { name: 'Caranavi', lat: this.baseLat + 0.70, lon: this.baseLon + 0.56, elev: 970 },
      { name: 'El Alto', lat: this.baseLat + 0.01, lon: this.baseLon - 0.03, elev: 4150 },
      { name: 'La Paz Centro', lat: this.baseLat, lon: this.baseLon, elev: 3640 },
      { name: 'Valle de la Luna', lat: this.baseLat - 0.08, lon: this.baseLon + 0.04, elev: 3200 },
      { name: 'Apolo - Madidi', lat: this.baseLat + 1.80, lon: this.baseLon - 0.29, elev: 1450 },
    ];
    peaks.forEach((p) => {
      const { x, z } = this.project(p.lat, p.lon);
      const y = this.terrain.heightAt(x, z) + 4;
      const label = createPeakLabel(p.name, p.elev);
      label.position.set(x, y, z);
      this.scene.add(label);
    });
  }

  /** Dibuja/actualiza las zonas de monitoreo como polígonos + marcador CSS2D. */
  setZonesWithAssessments(zones, assessmentsByZoneId) {
    this.zoneMeshes.forEach((group) => this.scene.remove(group));
    this.zoneMeshes.clear();

    const hotspots = [];

    zones.forEach((zone) => {
      const assessment = assessmentsByZoneId?.[zone.id];
      const level = assessment?.risk_level ?? 'bajo';
      const colorHex = riskColor(level);

      const group = new THREE.Group();

      const shape = new THREE.Shape();
      zone.geometry.coordinates.forEach(([lat, lon], idx) => {
        const { x, z } = this.project(lat, lon);
        if (idx === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      shape.closePath();

      const polyGeo = new THREE.ShapeGeometry(shape);
      polyGeo.rotateX(-Math.PI / 2);

      const polyMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: level === 'critico' ? 0.38 : 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const polyMesh = new THREE.Mesh(polyGeo, polyMat);
      const center = this.project(zone.centroid.lat, zone.centroid.lon);
      const cy = this.terrain.heightAt(center.x, center.z);
      polyMesh.position.y = cy + 0.3;
      group.add(polyMesh);

      const marker = createZoneMarker(zone, assessment);
      marker.position.set(center.x, cy + 3.0, center.z);
      group.add(marker);

      this.scene.add(group);
      this.zoneMeshes.set(zone.id, group);

      const score = assessment?.risk_score ?? 0.2;
      hotspots.push({
        x: center.x,
        z: center.z,
        radius: 18 + score * 24,
        intensity: Math.min(1.0, score * 1.3),
      });
    });

    this._baseHotspots = hotspots;
    this._hotspots = hotspots;
  }

  /**
   * Modula el mapa de calor InSAR según el paso temporal activo en el reproductor.
   * En pasos tempranos (ej. Mayo) la deformación es leve; en pasos finales (Noviembre)
   * la zona en peligro crítico se expande y pulsa con fuerza.
   */
  setTimelineProgress(progressFactor) {
    if (!this._baseHotspots) return;
    const factor = THREE.MathUtils.clamp(progressFactor, 0.0, 1.0);

    this._hotspots = this._baseHotspots.map((h, i) => {
      // Las zonas críticas (ej. Cotahuma, Yungas) crecen exponencialmente hacia el final
      const isCritical = i === 0 || i === 1;
      const growth = isCritical ? 0.3 + factor * 1.2 : 0.6 + factor * 0.4;
      return {
        x: h.x,
        z: h.z,
        radius: h.radius * growth,
        intensity: Math.min(1.0, h.intensity * growth),
      };
    });
  }

  setLayerVisible(layerId, visible) {
    const group = this.layerGroups.get(layerId);
    if (group) group.visible = visible;

    if (layerId === 'riesgo_deslizamiento' || layerId === 'insar_deformacion') {
      this.heatMesh.visible = visible;
    }
  }

  setExaggeration(factor) {
    this.terrain.applyExaggeration(factor);
  }

  focusOnZone(zone) {
    const { x, z } = this.project(zone.centroid.lat, zone.centroid.lon);
    const y = this.terrain.heightAt(x, z);
    const target = new THREE.Vector3(x, y, z);
    const eye = target.clone().add(new THREE.Vector3(45, 38, 45));

    if (this.viewMode === 'flat') {
      this.enterGoogleEarth3D();
    }
    this.cameraController.flyTo(eye, target, 1600);
  }

  flyToOverview() {
    if (this.viewMode === 'flat') {
      this.enterGoogleEarth3D();
    } else {
      this.cameraController.flyTo(GOOGLE_EARTH_CAMERA_POS, DEFAULT_TARGET, 1600);
    }
  }

  setMonitoringStations(stations) {
    const existing = this.layerGroups.get('estaciones_monitoreo');
    if (existing) this.scene.remove(existing);

    const group = new THREE.Group();
    stations.forEach((s) => {
      const { x, z } = this.project(s.position.lat, s.position.lon);
      const y = this.terrain.heightAt(x, z);
      const mesh = createStationMarker();
      mesh.position.set(x, y + 1.5, z);
      group.add(mesh);
    });
    this.scene.add(group);
    this.layerGroups.set('estaciones_monitoreo', group);
  }

  triggerAlertFlash() {
    const original = this.sunLight.color.clone();
    const originalIntensity = this.sunLight.intensity;
    this.sunLight.color.set(0xff5c3c);
    this.sunLight.intensity = 2.4;
    setTimeout(() => {
      this.sunLight.color.copy(original);
      this.sunLight.intensity = originalIntensity;
    }, 900);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();

    // Interpolar transición de relieve 2D Plano <-> 3D Google Earth
    if (Math.abs(this.morphProgress - this.targetMorph) > 0.005) {
      this.morphProgress = THREE.MathUtils.lerp(this.morphProgress, this.targetMorph, 0.05);
      this.terrain.setReliefMorph(this.morphProgress);
    }

    // Actualizar shader del agua del Titicaca y nubes
    this.water.update(elapsed, this.sunLight.position);
    this.clouds.update(elapsed);

    // Pulsar baliza de predicción si está activa
    if (this.beaconGroup.visible) {
      const scale = 1.0 + Math.sin(elapsed * 4.0) * 0.15;
      this.beaconRing.scale.set(scale, scale, 1);
    }

    // Actualizar mapa de calor InSAR
    if (this._hotspots?.length) {
      updateHeatHotspots(this.heatMaterial, this._hotspots, elapsed);
    } else {
      updateHeatHotspots(this.heatMaterial, [], elapsed);
    }

    this.cameraController.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}

function riskColor(level) {
  switch (level) {
    case 'critico':
      return 0xef4444;
    case 'alerta':
      return 0xf97316;
    case 'precaucion':
      return 0xeab308;
    default:
      return 0x22d3ee;
  }
}
