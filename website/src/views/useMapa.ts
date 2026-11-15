import { useEffect, useRef, useState } from "react";
import { crearMapa, hayMapLibre } from "../mapa";
import { desplazar, type Zona, type RiesgoZona, COLOR } from "../data";

// Crea un mapa MapLibre en el div referenciado y avisa cuando el estilo cargó.
export function useMapa(opciones: Record<string, any>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<any>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!hayMapLibre()) {
      setError("No se pudo cargar MapLibre (revisa la conexión a internet).");
      return;
    }
    let mapa: any;
    try {
      mapa = crearMapa(ref.current, opciones);
    } catch (e: any) {
      setError(e?.message ?? "Error al crear el mapa (¿WebGL desactivado?)");
      return;
    }
    mapaRef.current = mapa;
    mapa.on("load", () => setListo(true));
    return () => {
      mapa.remove();
      mapaRef.current = null;
      setListo(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, mapa: mapaRef, listo, error };
}

export function circulo(z: Zona, pasos = 48): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= pasos; i++) {
    const ang = (i / pasos) * Math.PI * 2;
    pts.push(desplazar(z.lon, z.lat, Math.cos(ang) * z.radio, Math.sin(ang) * z.radio));
  }
  return pts;
}

export function zonasGeoJSON(riesgo: RiesgoZona[]) {
  return {
    type: "FeatureCollection",
    features: riesgo.map((z) => ({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [[...z.poligono, z.poligono[0]]] },
      properties: { id: z.id, nombre: z.nombre, color: COLOR[z.nivel], nivel: z.nivel },
    })),
  };
}

export function agregarCapaZonas(mapa: any, riesgo: RiesgoZona[]) {
  const datos = zonasGeoJSON(riesgo);
  if (mapa.getSource("zonas")) {
    mapa.getSource("zonas").setData(datos);
    return;
  }
  mapa.addSource("zonas", { type: "geojson", data: datos });
  mapa.addLayer({
    id: "zonas-relleno",
    type: "fill",
    source: "zonas",
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.12 },
  });
  mapa.addLayer({
    id: "zonas-borde",
    type: "line",
    source: "zonas",
    paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-dasharray": [2, 1.5] },
  });
}
