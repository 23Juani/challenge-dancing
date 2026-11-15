/**
 * Generador procedural de textura ortofoto satelital de alta resolución (2048x2048),
 * reproduciendo el aspecto satelital de La Paz, El Alto y la cumbre nevada del Illimani.
 */
import * as THREE from 'three';

export function createSatelliteTexture() {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 1. Base topográfica general: tonos tierra andinos, laderas ocres y sombras
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#3a3228'); // Ladera árida alta
  bgGrad.addColorStop(0.3, '#5c4e3c'); // Ocre andino
  bgGrad.addColorStop(0.5, '#423b32'); // Valle medio
  bgGrad.addColorStop(0.7, '#6b5842'); // Talud rocoso
  bgGrad.addColorStop(1, '#2c251e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Ruido geológico de alta frecuencia (rocas, erosión, estrías)
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < data.length; i += 4) {
    const grain = (rnd() - 0.5) * 35;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain * 0.9));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain * 0.7));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Cuenca urbana de La Paz (cuadrícula densa en el centro y fondo de cuenca)
  ctx.save();
  const cityCenterX = size * 0.48;
  const cityCenterY = size * 0.58;
  const cityRadius = size * 0.28;

  const cityMask = ctx.createRadialGradient(
    cityCenterX,
    cityCenterY,
    10,
    cityCenterX,
    cityCenterY,
    cityRadius
  );
  cityMask.addColorStop(0, 'rgba(150, 140, 130, 0.85)');
  cityMask.addColorStop(0.6, 'rgba(120, 110, 100, 0.6)');
  cityMask.addColorStop(1, 'rgba(100, 90, 80, 0)');
  ctx.fillStyle = cityMask;
  ctx.fillRect(0, 0, size, size);

  // Cuadrícula urbana estilizada
  ctx.strokeStyle = 'rgba(70, 65, 60, 0.35)';
  ctx.lineWidth = 1.5;
  const step = 8;
  ctx.beginPath();
  for (let x = cityCenterX - cityRadius; x < cityCenterX + cityRadius; x += step) {
    ctx.moveTo(x, cityCenterY - cityRadius * 0.7);
    ctx.lineTo(x, cityCenterY + cityRadius * 0.7);
  }
  for (let y = cityCenterY - cityRadius * 0.7; y < cityCenterY + cityRadius * 0.7; y += step) {
    ctx.moveTo(cityCenterX - cityRadius, y);
    ctx.lineTo(cityCenterX + cityRadius, y);
  }
  ctx.stroke();
  ctx.restore();

  // 4. Glaciar y cumbre nevada del Illimani (extremo superior derecho)
  ctx.save();
  const peakX = size * 0.78;
  const peakY = size * 0.22;
  const snowGrad = ctx.createRadialGradient(peakX, peakY, 5, peakX, peakY, size * 0.18);
  snowGrad.addColorStop(0, '#ffffff');
  snowGrad.addColorStop(0.35, '#f0f9ff');
  snowGrad.addColorStop(0.7, '#bae6fd');
  snowGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = snowGrad;
  ctx.beginPath();
  ctx.arc(peakX, peakY, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}
