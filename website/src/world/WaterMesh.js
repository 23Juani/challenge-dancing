/**
 * Malla y shader de agua procedural para el Lago Titicaca (3.812 m snm):
 * - Onda sinusoidal suave animada en tiempo real (uTime).
 * - Efecto Fresnel con reflejo solar especular brillante.
 * - Degradado batimétrico entre azul zafiro andino y turquesa litoral.
 */
import * as THREE from 'three';
import { makeProjector, ELEVATION_SCALE } from './geo.js';

export class WaterMesh {
  constructor({ baseLat, baseLon }) {
    this.project = makeProjector(baseLat, baseLon);

    // Coordenadas aproximadas del Lago Titicaca en la escena local
    const lakeCenter = this.project(baseLat + 0.36, baseLon - 0.95);

    // Radio aproximado del lago en la escena
    const lakeRadiusX = 140;
    const lakeRadiusZ = 120;

    const geometry = new THREE.PlaneGeometry(lakeRadiusX * 2, lakeRadiusZ * 2, 64, 64);
    geometry.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
      uWaterDeepColor: { value: new THREE.Color(0x0a2f52) },
      uWaterShallowColor: { value: new THREE.Color(0x1a7fa0) },
      uFoamColor: { value: new THREE.Color(0xd2f3fc) },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Ondulaciones dinámicas suaves
          float wave1 = sin(pos.x * 0.12 + uTime * 1.8) * cos(pos.z * 0.12 + uTime * 1.4) * 0.45;
          float wave2 = sin(pos.x * 0.25 - uTime * 2.2) * 0.2;
          pos.y += wave1 + wave2;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          vNormal = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDirection;
        uniform vec3 uWaterDeepColor;
        uniform vec3 uWaterShallowColor;
        uniform vec3 uFoamColor;

        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;

        void main() {
          vec2 center = vUv - vec2(0.5);
          float dist = length(center * vec2(1.1, 1.3));

          // Mascara elíptica suave para los bordes del lago
          if (dist > 0.48) {
            discard;
          }
          float edgeAlpha = smoothstep(0.48, 0.38, dist);

          // Fresnel y reflejo solar
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);

          vec3 halfDir = normalize(uSunDirection + viewDir);
          float spec = pow(max(dot(vec3(0.0, 1.0, 0.0), halfDir), 0.0), 64.0) * 1.8;

          // Color batimetrico
          vec3 waterCol = mix(uWaterDeepColor, uWaterShallowColor, (1.0 - dist * 2.0));
          vec3 finalColor = waterCol + fresnel * 0.35 + spec * uFoamColor;

          gl_FragColor = vec4(finalColor, 0.88 * edgeAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(lakeCenter.x, -2.5, lakeCenter.z); // En la depresión del Titicaca
    this.mesh.renderOrder = 3;
  }

  update(timeSeconds, sunDirection) {
    this.uniforms.uTime.value = timeSeconds;
    if (sunDirection) {
      this.uniforms.uSunDirection.value.copy(sunDirection).normalize();
    }
  }

  setTheme(theme) {
    if (theme === 'light') {
      this.uniforms.uWaterDeepColor.value.set(0x0e548a);
      this.uniforms.uWaterShallowColor.value.set(0x28a3c4);
    } else {
      this.uniforms.uWaterDeepColor.value.set(0x0a2f52);
      this.uniforms.uWaterShallowColor.value.set(0x1a7fa0);
    }
  }
}
