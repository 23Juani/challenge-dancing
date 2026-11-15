/**
 * Controlador de camara: envoltorio sobre MapControls (orbit amortiguado estilo
 * `slop-newyork`) con soporte para el D-pad de la barra inferior.
 */
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

export class CameraController {
  constructor(camera, domElement) {
    this.controls = new MapControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 420;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 0, 0);
  }

  update() {
    this.controls.update();
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
    this.controls.object.position.copy(defaultPosition);
    this.controls.target.copy(defaultTarget);
    this.controls.update();
  }
}
