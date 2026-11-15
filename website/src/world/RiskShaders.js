/**
 * Shader personalizado GLSL para el mapa de calor de deformacion InSAR: zonas
 * con curvas de nivel isotérmicas concéntricas (amarillo -> naranja -> rojo),
 * núcleo pulsante de máxima deformación y perímetro punteado en cian brillante.
 */
import * as THREE from 'three';

export const MAX_HOTSPOTS = 8;

export function createRiskHeatMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uHotspotCount: { value: 0 },
    uHotspotCenters: { value: new Array(MAX_HOTSPOTS).fill(0).map(() => new THREE.Vector2(0, 0)) },
    uHotspotRadii: { value: new Float32Array(MAX_HOTSPOTS) },
    uHotspotIntensity: { value: new Float32Array(MAX_HOTSPOTS) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform int uHotspotCount;
      uniform vec2 uHotspotCenters[${MAX_HOTSPOTS}];
      uniform float uHotspotRadii[${MAX_HOTSPOTS}];
      uniform float uHotspotIntensity[${MAX_HOTSPOTS}];
      varying vec3 vWorldPos;

      vec3 heatColor(float t) {
        vec3 yellow = vec3(0.98, 0.82, 0.18);
        vec3 orange = vec3(0.976, 0.451, 0.086);
        vec3 red = vec3(0.937, 0.18, 0.18);
        if (t < 0.5) {
          return mix(yellow, orange, t * 2.0);
        } else {
          return mix(orange, red, (t - 0.5) * 2.0);
        }
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float alpha = 0.0;
        vec3 color = vec3(0.0);
        float ring = 0.0;

        for (int i = 0; i < ${MAX_HOTSPOTS}; i++) {
          if (i >= uHotspotCount) break;
          vec2 c = uHotspotCenters[i];
          float r = uHotspotRadii[i];
          float intensity = uHotspotIntensity[i];
          float d = length(p - c);

          if (d > r * 1.08) continue;

          float pulse = 0.75 + 0.25 * sin(uTime * 2.2 + float(i) * 1.5);
          float falloff = smoothstep(r, r * 0.1, d);

          // Curvas de nivel topográficas concéntricas (isolíneas térmicas InSAR)
          float contourPattern = abs(fract(d * 0.35 - uTime * 0.08) - 0.5) * 2.0;
          float isoline = smoothstep(0.15, 0.02, contourPattern) * 0.45;

          float a = (falloff * 0.65 + isoline * 0.35) * intensity * pulse;
          alpha = max(alpha, a * 0.78);

          vec3 baseHeat = heatColor(falloff * intensity);
          // Núcleo blanco/amarillo de deformación máxima en el centro
          float core = smoothstep(r * 0.2, 0.0, d);
          vec3 layerColor = mix(baseHeat, vec3(1.0, 0.96, 0.8), core * 0.8);
          layerColor += vec3(1.0, 0.8, 0.2) * isoline;

          color = mix(color, layerColor, step(0.001, a));

          // Perímetro exterior punteado en cian brillante
          float edge = smoothstep(r * 1.02, r * 0.98, d) - smoothstep(r * 0.98, r * 0.88, d);
          float angle = atan(p.y - c.y, p.x - c.x);
          float dash = step(0.45, fract(angle * 5.0 + uTime * 0.5));
          ring = max(ring, edge * dash);
        }

        vec3 cyan = vec3(0.14, 0.82, 0.93);
        vec3 finalColor = mix(color, cyan, ring);
        float finalAlpha = clamp(alpha + ring * 0.95, 0.0, 0.95);

        if (finalAlpha < 0.01) discard;
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
  });

  return material;
}

export function updateHeatHotspots(material, hotspots, elapsedSeconds) {
  const { uniforms } = material;
  uniforms.uTime.value = elapsedSeconds;
  uniforms.uHotspotCount.value = Math.min(hotspots.length, MAX_HOTSPOTS);
  hotspots.slice(0, MAX_HOTSPOTS).forEach((h, i) => {
    uniforms.uHotspotCenters.value[i].set(h.x, h.z);
    uniforms.uHotspotRadii.value[i] = h.radius;
    uniforms.uHotspotIntensity.value[i] = h.intensity;
  });
}
