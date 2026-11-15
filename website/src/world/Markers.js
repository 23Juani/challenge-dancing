/**
 * Marcadores 3D flotantes (CSS2DRenderer) con cotas de elevación, etiquetas
 * y antenas de estaciones holográficas según la referencia Image 2.
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export function createZoneMarker(zone, assessment) {
  const el = document.createElement('div');
  el.className = `zone-callout risk-${assessment?.risk_level ?? 'seguro'}`;

  const disp = assessment?.displacement_mm_month ? assessment.displacement_mm_month.toFixed(0) : '12';

  el.innerHTML = `
    <div class="zone-callout__content">
      <div class="zone-callout__header">
        <span class="zone-callout__icon">⚠</span>
        <span class="zone-callout__title">${zone.name}</span>
      </div>
      <div class="zone-callout__body">
        Desplazamiento: <span class="zone-callout__arrow">↑</span> <span class="zone-callout__disp">${disp} mm/mes</span>
      </div>
    </div>
    <div class="zone-callout__pointer"></div>
  `;

  const label = new CSS2DObject(el);
  label.layers.set(0);
  return label;
}

export function createPeakLabel(name, elevationM) {
  const el = document.createElement('div');
  el.className = 'peak-callout';
  el.innerHTML = `
    <div class="peak-callout__box">
      <span class="peak-callout__pin">▲</span>
      <span class="peak-callout__name">${name}</span>
      <span class="peak-callout__elev">${elevationM.toLocaleString('es-BO')} m</span>
    </div>
  `;
  return new CSS2DObject(el);
}

export function createStationMarker() {
  const group = new THREE.Group();

  // Torre central cian
  const towerGeom = new THREE.CylinderGeometry(0.3, 0.8, 4, 6);
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.6,
  });
  const tower = new THREE.Mesh(towerGeom, towerMat);
  tower.position.y = 2;
  group.add(tower);

  // Anillos holográficos concéntricos en el suelo
  const ringGeom = new THREE.RingGeometry(1.8, 2.2, 24);
  ringGeom.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.y = 0.2;
  group.add(ring);

  return group;
}
