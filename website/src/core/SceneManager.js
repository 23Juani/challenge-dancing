/**
 * SceneManager: orquesta la escena Three.js completa (terreno, capas, marcadores,
 * iluminacion, camara) y expone metodos de alto nivel usados por la UI (toggles de
 * capa, exageracion de terreno, foco en alerta en vivo).
 */
import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

import { TerrainMesh } from '../world/TerrainMesh.js';
import { createRiskHeatMaterial, updateHeatHotspots } from '../world/RiskShaders.js';
import { createZoneMarker, createPeakLabel, createStationMarker } from '../world/Markers.js';
import { createCityBlock } from '../world/Buildings.js';
import { CameraController } from '../controls/CameraController.js';
import { makeProjector } from '../world/geo.js';

const DEFAULT_CAMERA_POS = new THREE.Vector3(140, 110, 160);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

export class SceneManager {
  constructor({ container, baseLat, baseLon }) {
    this.container = container;
    this.baseLat = baseLat;
    this.baseLon = baseLon;
    this.project = makeProjector(baseLat, baseLon);
    this.clock = new THREE.Clock();

    this.zoneMeshes = new Map();
    this.layerGroups = new Map();

    this._initRenderer();
    this._initScene();
    this._initLights();
    this.terrain = new TerrainMesh({ baseLat, baseLon });
    this.terrain.applyExaggeration(1.8);
    this.scene.add(this.terrain.mesh);

    this.heatMaterial = createRiskHeatMaterial();
    this.heatMesh = new THREE.Mesh(this.terrain.heatOverlayGeometry, this.heatMaterial);
    this.scene.add(this.heatMesh);

    this.cityBlock = createCityBlock({ baseLat, baseLon, terrain: this.terrain });
    this.scene.add(this.cityBlock);

    this._addPeakLabels();

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.cameraController.resetView(DEFAULT_CAMERA_POS, DEFAULT_TARGET);

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
      2000,
    );
    this.camera.position.copy(DEFAULT_CAMERA_POS);
  }

  _initLights() {
    const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x0d1424, 0.65);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe9c4, 1.35);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    sun.shadow.camera.far = 600;
    this.scene.add(sun);
    this.sunLight = sun;

    const rim = new THREE.DirectionalLight(0x3fd0ff, 0.25);
    rim.position.set(-100, 60, -120);
    this.scene.add(rim);
  }

  _addPeakLabels() {
    const peaks = [
      { name: 'Illimani', lat: this.baseLat - 0.15, lon: this.baseLon + 0.18, elev: 6462 },
      { name: 'El Alto', lat: this.baseLat + 0.09, lon: this.baseLon - 0.02, elev: 4150 },
      { name: 'La Paz', lat: this.baseLat, lon: this.baseLon, elev: 3640 },
      { name: 'La Paz', lat: this.baseLat - 0.04, lon: this.baseLon + 0.03, elev: 3440 },
    ];
    peaks.forEach((p) => {
      const { x, z } = this.project(p.lat, p.lon);
      const y = this.terrain.heightAt(x, z) + 4;
      const label = createPeakLabel(p.name, p.elev);
      label.position.set(x, y, z);
      this.scene.add(label);
    });
  }

  /** Dibuja/actualiza las zonas de monitoreo como poligonos + marcador CSS2D. */
  setZonesWithAssessments(zones, assessmentsByZoneId) {
    this.zoneMeshes.forEach((group) => this.scene.remove(group));
    this.zoneMeshes.clear();

    const hotspots = [];

    zones.forEach((zone) => {
      const group = new THREE.Group();
      const assessment = assessmentsByZoneId.get(zone.id);

      const points = zone.polygon.map((p) => {
        const { x, z } = this.project(p.lat, p.lon);
        const y = this.terrain.heightAt(x, z) + 0.6;
        return new THREE.Vector3(x, y, z);
      });
      points.push(points[0]);
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const color = riskColor(assessment?.risk_level);
      const line = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color, dashSize: 2, gapSize: 1 }));
      line.computeLineDistances();
      group.add(line);

      const center = this.project(zone.center.lat, zone.center.lon);
      const centerY = this.terrain.heightAt(center.x, center.z) + 10;
      const marker = createZoneMarker(zone, assessment);
      marker.position.set(center.x, centerY, center.z);
      group.add(marker);

      this.scene.add(group);
      this.zoneMeshes.set(zone.id, group);

      if (assessment) {
        const radius = 8 + assessment.risk_score * 14;
        hotspots.push({ x: center.x, z: center.z, radius, intensity: assessment.risk_score });
      }
    });

    this._hotspots = hotspots;
  }

  /** Resalta una zona (p.ej. al llegar una alerta en vivo) con una animacion de foco. */
  focusOnZone(zone) {
    const { x, z } = this.project(zone.center.lat, zone.center.lon);
    const y = this.terrain.heightAt(x, z);
    this.cameraController.controls.target.set(x, y, z);
  }

  /** Vuelo cinematográfico desde la estratosfera hacia la vista operativa de La Paz */
  flyToOverview() {
    const startPos = new THREE.Vector3(260, 240, 320);
    this.camera.position.copy(startPos);
    const targetPos = DEFAULT_CAMERA_POS.clone();
    let progress = 0;

    const animateFly = () => {
      progress += 0.02;
      this.camera.position.lerpVectors(startPos, targetPos, THREE.MathUtils.smoothstep(progress, 0, 1));
      if (progress < 1) {
        requestAnimationFrame(animateFly);
      }
    };
    animateFly();
  }

  setTerrainExaggeration(factor) {
    this.terrain.applyExaggeration(factor);
  }

  setLayerVisibility(kind, visible) {
    const group = this.layerGroups.get(kind);
    if (group) group.visible = visible;
  }

  registerStationLayer(stations) {
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
