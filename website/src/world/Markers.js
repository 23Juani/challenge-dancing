/**
 * Marcadores 3D flotantes (CSS2DRenderer) con cotas de elevacion y etiquetas de
 * alerta sobre las zonas de monitoreo, p.ej. "Desplazamiento: ↑ 12 mm/mes".
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export function createZoneMarker(zone, assessment) {
  const el = document.createElement('div');
  el.className = `zone-marker risk-${assessment?.risk_level ?? 'seguro'}`;

  const arrow = (assessment?.displacement_mm_month ?? 0) > 0 ? '↑' : '↓';
  el.innerHTML = `
    <div class="zone-marker__name">${zone.name}</div>
    <div class="zone-marker__elev">${Math.round(zone.elevation_m)} m</div>
    ${
      assessment
        ? `<div class="zone-marker__alert">Desplazamiento: ${arrow} ${assessment.displacement_mm_month.toFixed(1)} mm/mes</div>`
        : ''
    }
  `;

  const label = new CSS2DObject(el);
  label.layers.set(0);
  return label;
}

export function createPeakLabel(name, elevationM) {
  const el = document.createElement('div');
  el.className = 'peak-marker';
  el.innerHTML = `<span class="peak-marker__name">${name}</span><span class="peak-marker__elev">${Math.round(
    elevationM,
  )} m</span>`;
  return new CSS2DObject(el);
}

export function createStationMarker() {
  const geometry = new THREE.ConeGeometry(1.2, 3, 6);
  const material = new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x3b2a6b, emissiveIntensity: 0.4 });
  return new THREE.Mesh(geometry, material);
}
