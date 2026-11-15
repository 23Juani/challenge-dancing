/**
 * Utilidades de proyeccion geografica -> coordenadas locales de la escena Three.js.
 * Usa una proyeccion equirectangular simple (suficiente para el area reducida de
 * La Paz/El Alto) centrada en BASE_LOCATION, y una escala fija a unidades de escena.
 */
const EARTH_RADIUS_M = 6371000;
const SCENE_SCALE = 1 / 40; // metros -> unidades de escena

export function makeProjector(baseLat, baseLon) {
  const baseLatRad = (baseLat * Math.PI) / 180;

  return function project(lat, lon) {
    const dLat = ((lat - baseLat) * Math.PI) / 180;
    const dLon = ((lon - baseLon) * Math.PI) / 180;
    const x = dLon * Math.cos(baseLatRad) * EARTH_RADIUS_M * SCENE_SCALE;
    const z = -dLat * EARTH_RADIUS_M * SCENE_SCALE;
    return { x, z };
  };
}

export function makeUnprojector(baseLat, baseLon) {
  const baseLatRad = (baseLat * Math.PI) / 180;

  return function unproject(x, z) {
    const dLatRad = -z / (EARTH_RADIUS_M * SCENE_SCALE);
    const dLonRad = x / (Math.cos(baseLatRad) * EARTH_RADIUS_M * SCENE_SCALE);
    const lat = baseLat + (dLatRad * 180) / Math.PI;
    const lon = baseLon + (dLonRad * 180) / Math.PI;
    return { lat, lon };
  };
}

export const ELEVATION_SCALE = 1 / 40; // metros -> unidades de escena (eje Y)
