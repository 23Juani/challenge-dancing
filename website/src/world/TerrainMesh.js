/**
 * Malla de elevacion procedural, estilizada sobre la topografia de La Paz / El Alto /
 * Illimani: cuenca urbana deprimida (La Paz), meseta elevada al norte (El Alto) y un
 * pico prominente al sureste (Illimani, 6462 m). No sustituye un DEM real; sirve como
 * base navegable y fluida para la demo (ver backend/README.md sobre el origen de datos).
 */
import * as THREE from 'three';
import { makeProjector, ELEVATION_SCALE } from './geo.js';

const SIZE = 420; // unidades de escena (lado del plano)
const SEGMENTS = 220;

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
    total += smoothNoise(x * freq, z * freq, 60, o + 1) * amp;
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

    // Illimani proyectado a coordenadas locales (pico prominente)
    const illimani = this.project(-16.5204 - 0.15, -68.1297 + 0.18);

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Meseta de El Alto: mas elevada hacia +z (norte en nuestra convencion local)
      const altiplanoPlateau = THREE.MathUtils.smoothstep(z, -10, 60) * 14;

      // Cuenca de La Paz: depresion central
      const basinDepth = -Math.exp(-((x * x) / 6000 + (z * z) / 9000)) * 22;

      // Pico de Illimani
      const dIllimani = Math.hypot(x - illimani.x, z - illimani.z);
      const illimaniPeak = Math.exp(-(dIllimani * dIllimani) / 900) * 70;

      const noise = (fractalNoise(x, z) - 0.5) * 6;

      baseHeights[i] = altiplanoPlateau + basinDepth + illimaniPeak + noise + 6;
    }

    this.geometry = geometry;
    this.baseHeights = baseHeights;

    const material = new THREE.MeshStandardMaterial({
      color: 0x30405a,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    this.heatOverlayGeometry = geometry.clone();
    this.applyExaggeration(1.0);
  }

  /** Aplica la exageracion vertical (1.0x a 3.0x) deformando la escala Y en tiempo real. */
  applyExaggeration(factor) {
    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setY(i, this.baseHeights[i] * ELEVATION_SCALE * 40 * factor);
    }
    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // Mantiene el overlay de calor pegado a la superficie del terreno.
    const heatPos = this.heatOverlayGeometry.attributes.position;
    for (let i = 0; i < heatPos.count; i++) {
      heatPos.setY(i, posAttr.getY(i) + 0.4);
    }
    heatPos.needsUpdate = true;
    this.heatOverlayGeometry.computeVertexNormals();
  }

  heightAt(x, z) {
    // Aproximacion rapida: busca el vertice mas cercano (suficiente para marcadores).
    const posAttr = this.geometry.attributes.position;
    let best = 0;
    let bestD = Infinity;
    const step = 7; // muestreo disperso para rendimiento
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
