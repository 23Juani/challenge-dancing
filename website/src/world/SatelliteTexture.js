/**
 * Generador procedural de texturas de alta resolución (2048x2048)
 * para los Modos de Mapa tipo Google Maps:
 * 1. Satelital (Satelite / Ortofoto hiperrealista)
 * 2. Relieve / Terreno (Topográfico con curvas de nivel e hipsometría)
 * 3. Híbrido (Satelital + Red vial iluminada y etiquetas de delimitación)
 */
import * as THREE from 'three';

export function createSatelliteTexture() {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 1. Base topográfica general
  const bgGrad = ctx.createLinearGradient(0, size, size, 0);
  bgGrad.addColorStop(0, '#5a4c38'); // Altiplano sur ocre
  bgGrad.addColorStop(0.35, '#483f34'); // Piedemonte andino
  bgGrad.addColorStop(0.55, '#3b4731'); // Valles interandinos
  bgGrad.addColorStop(0.8, '#244820'); // Yungas / bosque húmedo
  bgGrad.addColorStop(1, '#1b3a16'); // Amazonía norte
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Ruido geológico de alta frecuencia
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  let seed = 20261114;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < data.length; i += 4) {
    const grain = (rnd() - 0.5) * 32;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain * 0.95));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain * 0.8));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Lago Titicaca (Noroeste)
  ctx.save();
  const lakeGrad = ctx.createRadialGradient(size * 0.16, size * 0.22, 10, size * 0.16, size * 0.22, size * 0.26);
  lakeGrad.addColorStop(0, '#0c3558');
  lakeGrad.addColorStop(0.65, '#124c7a');
  lakeGrad.addColorStop(0.88, '#1e729a');
  lakeGrad.addColorStop(0.96, '#a89462');
  lakeGrad.addColorStop(1, 'rgba(168, 148, 98, 0)');
  ctx.fillStyle = lakeGrad;
  ctx.beginPath();
  ctx.ellipse(size * 0.18, size * 0.22, size * 0.22, size * 0.16, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Los Yungas y Caranavi
  ctx.save();
  const yungasGrad = ctx.createRadialGradient(size * 0.82, size * 0.45, 20, size * 0.82, size * 0.45, size * 0.35);
  yungasGrad.addColorStop(0, 'rgba(28, 77, 34, 0.85)');
  yungasGrad.addColorStop(0.5, 'rgba(40, 94, 46, 0.65)');
  yungasGrad.addColorStop(1, 'rgba(40, 94, 46, 0)');
  ctx.fillStyle = yungasGrad;
  ctx.beginPath();
  ctx.ellipse(size * 0.82, size * 0.45, size * 0.32, size * 0.42, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Cuenca urbana de La Paz y El Alto
  ctx.save();
  const cityCenterX = size * 0.48;
  const cityCenterY = size * 0.58;
  const cityRadius = size * 0.18;

  const cityMask = ctx.createRadialGradient(cityCenterX, cityCenterY, 5, cityCenterX, cityCenterY, cityRadius);
  cityMask.addColorStop(0, 'rgba(152, 142, 132, 0.9)');
  cityMask.addColorStop(0.7, 'rgba(128, 118, 108, 0.65)');
  cityMask.addColorStop(1, 'rgba(100, 90, 80, 0)');
  ctx.fillStyle = cityMask;
  ctx.beginPath();
  ctx.arc(cityCenterX, cityCenterY, cityRadius, 0, Math.PI * 2);
  ctx.fill();

  // Trazado urbano
  ctx.strokeStyle = 'rgba(75, 70, 65, 0.38)';
  ctx.lineWidth = 1.4;
  const step = 9;
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

  // 6. Glaciares Cordillera Real: Huayna Potosí e Illimani
  renderGlaciers(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

/** Modo Terreno / Relieve estilo Google Maps: topografía hipsométrica con curvas de nivel */
export function createTerrainReliefTexture() {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Gradiente hipsométrico Google Maps (verde valles -> crema altiplano -> marrón cordillera)
  const bgGrad = ctx.createLinearGradient(0, size, size, 0);
  bgGrad.addColorStop(0, '#f2ece4'); // Altiplano crema
  bgGrad.addColorStop(0.35, '#e4dbc9'); // Piedemonte
  bgGrad.addColorStop(0.6, '#cbd8bf'); // Valles interandinos verde suave
  bgGrad.addColorStop(0.85, '#9fb896'); // Yungas verde bosque
  bgGrad.addColorStop(1, '#81a37c'); // Amazonía
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Lago Titicaca en modo relieve (azul claro tipo Google Maps)
  ctx.save();
  const lakeGrad = ctx.createRadialGradient(size * 0.16, size * 0.22, 10, size * 0.16, size * 0.22, size * 0.26);
  lakeGrad.addColorStop(0, '#a4c2f4');
  lakeGrad.addColorStop(0.85, '#c9daf8');
  lakeGrad.addColorStop(1, 'rgba(201, 218, 248, 0)');
  ctx.fillStyle = lakeGrad;
  ctx.beginPath();
  ctx.ellipse(size * 0.18, size * 0.22, size * 0.22, size * 0.16, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Curvas de nivel topográficas concéntricas
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 110, 95, 0.18)';
  ctx.lineWidth = 1.0;
  for (let r = 50; r < size * 1.2; r += 28) {
    ctx.beginPath();
    ctx.ellipse(size * 0.58, size * 0.52, r, r * 0.85, 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Glaciares en cumbres
  renderGlaciers(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

/** Modo Híbrido: Satelital + Red Vial y Autopistas Iluminadas + Delimitaciones Vectoriales */
export function createHybridTexture() {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base satelital
  const satCanvas = createSatelliteTexture().image;
  ctx.drawImage(satCanvas, 0, 0);

  // Red vial principal de La Paz y carreteras nacionales
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f59e0b'; // Carreteras principales naranja ámbar Google Maps
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 4;

  const cityCenterX = size * 0.48;
  const cityCenterY = size * 0.58;

  // Autopista La Paz - El Alto
  ctx.beginPath();
  ctx.moveTo(cityCenterX - size * 0.12, cityCenterY - size * 0.05);
  ctx.quadraticCurveTo(cityCenterX - size * 0.04, cityCenterY - size * 0.02, cityCenterX, cityCenterY);
  // Av. Costanera hacia Zona Sur
  ctx.quadraticCurveTo(cityCenterX + size * 0.04, cityCenterY + size * 0.08, cityCenterX + size * 0.08, cityCenterY + size * 0.14);
  ctx.stroke();

  // Ruta 3 hacia los Yungas / Caranavi
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(cityCenterX, cityCenterY);
  ctx.quadraticCurveTo(cityCenterX + size * 0.12, cityCenterY - size * 0.1, size * 0.78, size * 0.42);
  ctx.lineTo(size * 0.88, size * 0.35);
  ctx.stroke();

  // Ruta hacia Copacabana / Titicaca
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cityCenterX - size * 0.12, cityCenterY - size * 0.05);
  ctx.quadraticCurveTo(size * 0.28, size * 0.35, size * 0.18, size * 0.25);
  ctx.stroke();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

function renderGlaciers(ctx, size) {
  // Glaciar Huayna Potosí
  ctx.save();
  const hpX = size * 0.49;
  const hpY = size * 0.34;
  const hpGrad = ctx.createRadialGradient(hpX, hpY, 2, hpX, hpY, size * 0.08);
  hpGrad.addColorStop(0, '#ffffff');
  hpGrad.addColorStop(0.5, '#e0f2fe');
  hpGrad.addColorStop(0.85, '#bae6fd');
  hpGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = hpGrad;
  ctx.beginPath();
  ctx.arc(hpX, hpY, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Glaciar Illimani
  const illiX = size * 0.68;
  const illiY = size * 0.64;
  const illiGrad = ctx.createRadialGradient(illiX, illiY, 4, illiX, illiY, size * 0.12);
  illiGrad.addColorStop(0, '#ffffff');
  illiGrad.addColorStop(0.45, '#e0f2fe');
  illiGrad.addColorStop(0.8, '#bae6fd');
  illiGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = illiGrad;
  ctx.beginPath();
  ctx.arc(illiX, illiY, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
