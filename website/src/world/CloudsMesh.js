/**
 * Capa atmosférica de nubes procedurales andinas:
 * - Se desplaza lentamente con los vientos alisios orientales.
 * - Flota a altitud intermedia sobre los valles de Yungas y bordea las cimas nevadas.
 * - Brinda profundidad y realismo similar a Google Earth.
 */
import * as THREE from 'three';

export class CloudsMesh {
  constructor({ size = 620 }) {
    const geometry = new THREE.PlaneGeometry(size * 1.1, size * 1.1, 48, 48);
    geometry.rotateX(-Math.PI / 2);

    this.uniforms = {
      uTime: { value: 0 },
      uCloudColor: { value: new THREE.Color(0xffffff) },
      uDensity: { value: 0.38 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uCloudColor;
        uniform float uDensity;
        varying vec2 vUv;

        // Hash / noise simple
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = p * 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // Viento hacia el Noroeste (típico Yungas hacia la cuenca)
          vec2 uvWind = vUv * 4.5 + vec2(-uTime * 0.012, uTime * 0.008);
          float n = fbm(uvWind);

          // Mascara para dispersión de nubes (espacios despejados)
          float alpha = smoothstep(0.48, 0.72, n) * uDensity;

          // Desvanecer bordes del mapa
          vec2 distFromCenter = abs(vUv - vec2(0.5)) * 2.0;
          float edgeFade = (1.0 - smoothstep(0.7, 1.0, max(distFromCenter.x, distFromCenter.y)));
          alpha *= edgeFade;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(uCloudColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.y = 26; // Altura sobre los valles y cuenca
    this.mesh.renderOrder = 4;
  }

  update(timeSeconds) {
    this.uniforms.uTime.value = timeSeconds;
  }

  setTheme(theme) {
    if (theme === 'light') {
      this.uniforms.uCloudColor.value.set(0xffffff);
      this.uniforms.uDensity.value = 0.42;
    } else {
      this.uniforms.uCloudColor.value.set(0x94a3b8);
      this.uniforms.uDensity.value = 0.28;
    }
  }

  setVisible(visible) {
    this.mesh.visible = visible;
  }
}
