/**
 * Shader personalizado GLSL para el mapa de calor de deformacion InSAR: zonas
 * naranjas/rojas pulsantes sobre la ladera, con perimetro punteado en cian.
 * Recibe un conjunto de "hotspots" (centro local x/z, radio, intensidad) y pinta
 * el terreno como un overlay aditivo encima del material base.
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
        // naranja -> rojo segun intensidad
        vec3 orange = vec3(0.976, 0.451, 0.086);
        vec3 red = vec3(0.937, 0.267, 0.267);
        return mix(orange, red, t);
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

          float pulse = 0.65 + 0.35 * sin(uTime * 2.0 + float(i) * 1.7);
          float falloff = smoothstep(r, r * 0.15, d);
          float a = falloff * intensity * pulse;
          alpha = max(alpha, a * 0.55);
          color = mix(color, heatColor(intensity), step(0.001, a));

          // Perimetro punteado en cian
          float edge = smoothstep(r * 1.02, r * 0.98, d) - smoothstep(r * 0.98, r * 0.9, d);
          float dash = step(0.5, fract(atan(p.y - c.y, p.x - c.x) * 6.0 + uTime));
          ring = max(ring, edge * dash);
        }

        vec3 cyan = vec3(0.1, 0.9, 0.95);
        vec3 finalColor = mix(color, cyan, ring);
        float finalAlpha = clamp(alpha + ring * 0.9, 0.0, 0.9);
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
