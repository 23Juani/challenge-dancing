// Mapa 3D con MapLibre GL (cargado desde CDN en index.html):
// imagen satelital + relieve real (DEM Terrarium) + edificios 3D de OpenStreetMap.

declare global {
  interface Window {
    maplibregl: any;
  }
}

export function hayMapLibre() {
  return typeof window !== "undefined" && !!window.maplibregl;
}

export const ESTILO_3D: any = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    satelite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imágenes © Esri, Maxar, Earthstar Geographics",
    },
    relieve: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      encoding: "terrarium",
      tileSize: 256,
      maxzoom: 15,
      attribution: "Relieve: Mapzen / AWS Terrain Tiles",
    },
    osm: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
      attribution: "© OpenStreetMap · OpenFreeMap",
    },
  },
  layers: [
    { id: "satelite", type: "raster", source: "satelite" },
    {
      id: "sombras",
      type: "hillshade",
      source: "relieve",
      paint: { "hillshade-exaggeration": 0.25, "hillshade-shadow-color": "#0b1718" },
    },
    {
      id: "edificios",
      type: "fill-extrusion",
      source: "osm",
      "source-layer": "building",
      minzoom: 13,
      paint: {
        "fill-extrusion-color": "#e4e7ea",
        "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
        "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
        "fill-extrusion-opacity": 0.85,
      },
    },
  ],
  terrain: { source: "relieve", exaggeration: 1.3 },
  sky: {
    "sky-color": "#20343a",
    "horizon-color": "#d9b48f",
    "fog-color": "#a9b8bb",
    "sky-horizon-blend": 0.6,
    "horizon-fog-blend": 0.6,
    "fog-ground-blend": 0.4,
  },
};

export function crearMapa(contenedor: HTMLElement, opciones: Record<string, any>) {
  const ml = window.maplibregl;
  const mapa = new ml.Map({
    container: contenedor,
    style: ESTILO_3D,
    maxPitch: 80,
    attributionControl: { compact: true },
    ...opciones,
  });
  mapa.addControl(new ml.NavigationControl({ visualizePitch: true }), "top-right");
  return mapa;
}

// Capa de puntos de deformación coloreados por magnitud (mm/mes)
export function agregarCapaInsar(mapa: any, datos: any) {
  if (mapa.getSource("insar")) {
    mapa.getSource("insar").setData(datos);
    return;
  }
  mapa.addSource("insar", { type: "geojson", data: datos });
  mapa.addLayer({
    id: "insar",
    type: "circle",
    source: "insar",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 1.6, 15, 3.5, 17, 6],
      "circle-color": [
        "interpolate",
        ["linear"],
        ["abs", ["get", "v"]],
        0, "#3b8fd9",
        5, "#5ad1a0",
        10, "#e6f06b",
        15, "#fdc23e",
        25, "#f46d43",
        30, "#d7191c",
      ],
      "circle-opacity": 0.9,
      "circle-stroke-width": 0,
    },
  });
}
