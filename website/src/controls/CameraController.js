/**
 * Controlador de cámara: envoltorio sobre MapControls (orbit amortiguado estilo Google Earth)
 * con soporte para vuelos cinemáticos suaves (flyTo), D-pad y transición Plano 2D <-> 3D.
 */
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new MapControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 850;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 0, 0);

    this.isFlying = false;
    this.flyStart = 0;
    this.flyDuration = 1800;
    this.startPos = new THREE.Vector3();
    this.endPos = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
  }

  update() {
    if (this.isFlying) {
      const now = performance.now();
      const progress = Math.min((now - this.flyStart) / this.flyDuration, 1.0);
      // Easing suave (easeInOutCubic)
      const t = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startPos, this.endPos, t);
      this.controls.target.lerpVectors(this.startTarget, this.endTarget, t);

      if (progress >= 1.0) {
        this.isFlying = false;
      }
    }
    this.controls.update();
  }

  flyTo(endPosition, endTarget, durationMs = 1800) {
    this.startPos.copy(this.camera.position);
    this.endPos.copy(endPosition);
    this.startTarget.copy(this.controls.target);
    this.endTarget.copy(endTarget);
    this.flyStart = performance.now();
    this.flyDuration = durationMs;
    this.isFlying = true;
  }

  pan(dx, dz) {
    const speed = this.controls.object.position.distanceTo(this.controls.target) * 0.02;
    this.controls.target.x += dx * speed;
    this.controls.target.z += dz * speed;
    this.controls.object.position.x += dx * speed;
    this.controls.object.position.z += dz * speed;
  }

  zoom(delta) {
    const dir = this.controls.object.position.clone().sub(this.controls.target).normalize();
    this.controls.object.position.addScaledVector(dir, delta);
  }

  resetView(defaultPosition, defaultTarget) {
    this.isFlying = false;
    this.controls.object.position.copy(defaultPosition);
    this.controls.target.copy(defaultTarget);
    this.controls.update();
  }
}
