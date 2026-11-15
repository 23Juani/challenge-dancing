/**
 * Infraestructura urbana y edificaciones estilizadas de baja poligonizacion, en
 * torno al centro de La Paz, usando InstancedMesh para mantener el rendimiento
 * fluido con cientos de bloques.
 */
import * as THREE from 'three';
import { makeProjector } from './geo.js';

export function createCityBlock({ baseLat, baseLon, terrain }) {
  const project = makeProjector(baseLat, baseLon);
  const count = 260;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x8a94a6, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let placed = 0;
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 1000) / 1000;
  };

  for (let i = 0; i < count; i++) {
    const angle = rnd() * Math.PI * 2;
    const radius = 6 + rnd() * 70;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.8;

    // Evita colocar edificios demasiado lejos de la cuenca urbana (fuera del valle).
    if (Math.hypot(x, z) > 85) continue;

    const height = 1.5 + rnd() * 6;
    const y = terrain.heightAt(x, z);

    dummy.position.set(x, y + height / 2, z);
    dummy.scale.set(1.2 + rnd() * 1.5, height, 1.2 + rnd() * 1.5);
    dummy.rotation.y = rnd() * Math.PI;
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;

  const _ = project;
  return mesh;
}

export function createRoadLine(points) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 40, 0.5, 6, false);
  const material = new THREE.MeshBasicMaterial({ color: 0x9aa7bd, transparent: true, opacity: 0.6 });
  return new THREE.Mesh(geometry, material);
}
