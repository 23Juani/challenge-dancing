// Mapa con MapLibre GL (cargado desde CDN en index.html).
// Base clara de OpenFreeMap (Positron) + imagen satelital de Esri opcional.

declare global {
  interface Window {
    maplibregl: any;
  }
}

export function hayMapLibre() {
  return typeof window !== "undefined" && !!window.maplibregl;
}

export const ESTILO_CLARO = "https://tiles.openfreemap.org/styles/positron";

export function crearMapa(contenedor: HTMLElement, opciones: Record<string, any>) {
  const ml = window.maplibregl;
  const mapa = new ml.Map({
    container: contenedor,
    style: ESTILO_CLARO,
    attributionControl: { compact: true },
    ...opciones,
  });
  mapa.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
  mapa.addControl(new ml.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-right");
  return mapa;
}

export function agregarSatelite(mapa: any) {
  if (mapa.getSource("esri")) return;
  mapa.addSource("esri", {
    type: "raster",
    tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256,
    maxzoom: 19,
    attribution: "Imágenes © Esri, Maxar, Earthstar Geographics",
  });
  const capas = mapa.getStyle().layers ?? [];
  const primeraSimbolo = capas.find((c: any) => c.type === "symbol")?.id;
  mapa.addLayer({ id: "esri", type: "raster", source: "esri", layout: { visibility: "none" } }, primeraSimbolo);
}
