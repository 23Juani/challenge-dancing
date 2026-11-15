/**
 * Malla de elevación procedural del DEPARTAMENTO DE LA PAZ completo:
 * - Lago Titicaca en el Noroeste (gran depresión lacustre plana)
 * - Cordillera Real: Cadena montañosa continua con Huayna Potosí (6.088 m) e Illimani (6.462 m)
 * - Altiplano: Meseta elevada al Oeste (El Alto ~4.150 m)
 * - Cuenca urbana de La Paz (depresión central ~3.600 m)
 * - Los Yungas y Piedemonte: Descenso abrupto oriental hacia selva y valles húmedos (~1.500 - 900 m)
 */
import * as THREE from 'three';
import { makeProjector, ELEVATION_SCALE } from './geo.js';
import { createSatelliteTexture } from './SatelliteTexture.js';

const SIZE = 620; // Extensión amplia para todo el Departamento de La Paz
const SEGMENTS = 260;

function valueNoise(x, z, seed = 1) {
  const s = Math.sin(x * 12.9898 * seed + z * 78.233 * seed) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x, z, scale, seed) {
  const fx = x / scale;
  const fz = z / scale;
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const tx = fx - x0;
  const tz = fz - z0;
  const a = valueNoise(x0, z0, seed);
  const b = valueNoise(x0 + 1, z0, seed);
  const c = valueNoise(x0, z0 + 1, seed);
  const d = valueNoise(x0 + 1, z0 + 1, seed);
  const u = tx * tx * (3 - 2 * tx);
  const v = tz * tz * (3 - 2 * tz);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fractalNoise(x, z) {
  let total = 0;
  let amp = 1;
  let freq = 1;
  let maxAmp = 0;
  for (let o = 0; o < 4; o++) {
    total += smoothNoise(x * freq, z * freq, 80, o + 1) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / maxAmp;
}

export class TerrainMesh {
  constructor({ baseLat, baseLon }) {
    this.project = makeProjector(baseLat, baseLon);

    const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const baseHeights = new Float32Array(posAttr.count);

    // Hitos departamentales proyectados a coordenadas locales
    const illimani = this.project(-16.5204 - 0.15, -68.1297 + 0.18);
    const huaynaPotosi = this.project(-16.5204 + 0.25, -68.1297 - 0.02);
    const titicaca = this.project(-16.5204 + 0.36, -68.1297 - 0.95);
    const yungas = this.project(-16.5204 + 0.35, -68.1297 + 0.45);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // 1. Altiplano: Meseta base (~4.000 m) al oeste
      const altiplano = THREE.MathUtils.smoothstep(-x, -30, 180) * 16;

      // 2. Cuenca de La Paz: Cañón central excavado
      const basinDepth = -Math.exp(-((x * x) / 5000 + (z * z) / 8000)) * 26;

      // 3. Cordillera Real: Cadena continua con Illimani y Huayna Potosí
      const dIllimani = Math.hypot(x - illimani.x, z - illimani.z);
      const illimaniPeak = Math.exp(-(dIllimani * dIllimani) / 1200) * 75;

      const dHp = Math.hypot(x - huaynaPotosi.x, z - huaynaPotosi.z);
      const hpPeak = Math.exp(-(dHp * dHp) / 1100) * 68;

      // 4. Lago Titicaca: Espejo de agua plano deprimido al noroeste
      const dTiticaca = Math.hypot(x - titicaca.x, z - titicaca.z);
      const titicacaBasin = -Math.exp(-(dTiticaca * dTiticaca) / 9000) * 18;

      // 5. Los Yungas: Fuerte caída oriental hacia los valles tropicales y Caranavi
      const dYungas = Math.hypot(x - yungas.x, z - yungas.z);
      const yungasDrop = -Math.exp(-(dYungas * dYungas) / 12000) * 32;

      const noise = (fractalNoise(x, z) - 0.5) * 8;

      baseHeights[i] = altiplano + basinDepth + illimaniPeak + hpPeak + titicacaBasin + yungasDrop + noise + 8;
    }

    this.geometry = geometry;
    this.baseHeights = baseHeights;

    const satTexture = createSatelliteTexture();

    const material = new THREE.MeshStandardMaterial({
      map: satTexture,
      roughness: 0.88,
      metalness: 0.12,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    this.heatOverlayGeometry = geometry.clone();
    this.applyExaggeration(1.8);
  }

  /** Aplica la exageracion vertical (1.0x a 3.0x) deformando la escala Y en tiempo real. */
  applyExaggeration(factor) {
    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, this.baseHeights[i] * ELEVATION_SCALE * 40 * factor);
    }
    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    const heatPos = this.heatOverlayGeometry.attributes.position;
    for (let i = 0; i < heatPos.count; i++) {
      heatPos.setY(i, posAttr.getY(i) + 0.4);
    }
    heatPos.needsUpdate = true;
    this.heatOverlayGeometry.computeVertexNormals();
  }

  heightAt(x, z) {
    const posAttr = this.geometry.attributes.position;
    let best = 0;
    let bestD = Infinity;
    const step = 9;
    for (let i = 0; i < posAttr.count; i += step) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const d = (vx - x) * (vx - x) + (vz - z) * (vz - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return posAttr.getY(best);
  }
}
