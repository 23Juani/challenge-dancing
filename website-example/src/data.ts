// BENNETT · conexiones de datos
// - NISAR: búsqueda de pasadas sobre La Paz en NASA ASF DAAC (API de búsqueda de ASF, respaldo CMR de Earthdata)
// - Lluvia: Open-Meteo (últimas 72 h y pronóstico 72 h)
// - Movimiento del suelo: GeoJSON de puntos InSAR (ejemplo en /public/data o el que suba el usuario)

export const LA_PAZ = { lon: -68.119, lat: -16.5, wkt: "POINT(-68.119 -16.5)" };

export type Nivel = "estable" | "precaucion" | "alerta";

export type Zona = {
  id: string;
  nombre: string;
  lon: number;
  lat: number;
  radio: number; // metros
  poligono: [number, number][];
  pendiente: number; // grados aprox.
  rumbo: number; // dirección ladera abajo, grados (0 = norte)
};

export type PuntoInsar = { lon: number; lat: number; v: number; a: number | null; coh: number | null };

export type Pasada = {
  id: string;
  fecha: string; // ISO
  track?: string;
  frame?: string;
  nivel?: string;
  direccion?: string;
  url?: string;
};

export type EstadoNisar =
  | { estado: "cargando" }
  | { estado: "ok"; fuente: "ASF" | "CMR"; pasadas: Pasada[] }
  | { estado: "error"; mensaje: string };

export type Lluvia = {
  estado: "cargando" | "ok" | "error";
  pasado72: number;
  futuro72: number;
  horas: { t: string; mm: number }[];
};

export type RiesgoZona = Zona & {
  velocidad: number; // mm/mes
  lluvia24: number;
  lluviaBase24: number;
  indice: number;
  nivel: Nivel;
  nivelBackend: "seguro" | "precaucion" | "alerta" | "critico";
};

// ---------- utilidades geográficas ----------
const R = 6371000;
export function distancia(lon1: number, lat1: number, lon2: number, lat2: number) {
  const toR = Math.PI / 180;
  const dLat = (lat2 - lat1) * toR;
  const dLon = (lon2 - lon1) * toR;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function desplazar(lon: number, lat: number, dx: number, dy: number): [number, number] {
  const dLat = dy / R;
  const dLon = dx / (R * Math.cos((lat * Math.PI) / 180));
  return [lon + (dLon * 180) / Math.PI, lat + (dLat * 180) / Math.PI];
}

export function dentro(punto: [number, number], poligono: [number, number][]) {
  let adentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > punto[1] !== yj > punto[1] && punto[0] < ((xj - xi) * (punto[1] - yi)) / (yj - yi) + xi) {
      adentro = !adentro;
    }
  }
  return adentro;
}

// ---------- NISAR ----------
async function buscarASF(): Promise<Pasada[]> {
  const params = new URLSearchParams({
    platform: "NISAR",
    intersectsWith: LA_PAZ.wkt,
    maxResults: "30",
    output: "geojson",
  });
  const r = await fetch(`https://api.daac.asf.alaska.edu/services/search/param?${params}`);
  if (!r.ok) throw new Error(`ASF respondió ${r.status}`);
  const json = await r.json();
  const feats: any[] = json.features ?? [];
  return feats.map((f) => {
    const p = f.properties ?? {};
    return {
      id: p.fileID ?? p.sceneName ?? p.granuleName ?? "—",
      fecha: p.startTime ?? p.processingDate ?? "",
      track: p.pathNumber != null ? String(p.pathNumber) : undefined,
      frame: p.frameNumber != null ? String(p.frameNumber) : undefined,
      nivel: p.processingLevel,
      direccion: p.flightDirection,
      url: p.url,
    };
  });
}

async function buscarCMR(): Promise<Pasada[]> {
  const params = new URLSearchParams({
    provider: "ASF",
    platform: "NISAR",
    point: `${LA_PAZ.lon},${LA_PAZ.lat}`,
    page_size: "30",
    sort_key: "-start_date",
  });
  const r = await fetch(`https://cmr.earthdata.nasa.gov/search/granules.json?${params}`);
  if (!r.ok) throw new Error(`CMR respondió ${r.status}`);
  const json = await r.json();
  const entries: any[] = json.feed?.entry ?? [];
  return entries.map((e) => ({
    id: e.producer_granule_id ?? e.title ?? e.id,
    fecha: e.time_start ?? "",
    nivel: e.collection_concept_id,
    url: (e.links ?? []).find((l: any) => /data#/.test(l.rel ?? ""))?.href,
  }));
}

export async function cargarNisar(): Promise<EstadoNisar> {
  const ordenar = (p: Pasada[]) => [...p].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  try {
    const p = await buscarASF();
    if (p.length) return { estado: "ok", fuente: "ASF", pasadas: ordenar(p) };
  } catch {
    /* probamos CMR */
  }
  try {
    const p = await buscarCMR();
    return { estado: "ok", fuente: "CMR", pasadas: ordenar(p) };
  } catch (e: any) {
    return { estado: "error", mensaje: e?.message ?? "sin conexión" };
  }
}

// ---------- Lluvia ----------
export async function cargarLluvia(): Promise<Lluvia> {
  try {
    const params = new URLSearchParams({
      latitude: String(LA_PAZ.lat),
      longitude: String(LA_PAZ.lon),
      hourly: "precipitation",
      past_days: "3",
      forecast_days: "3",
      timezone: "America/La_Paz",
    });
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const t: string[] = j.hourly.time;
    const mm: number[] = j.hourly.precipitation;
    const ahora = Date.now();
    let pasado = 0;
    let futuro = 0;
    const horas = t.map((ti, i) => ({ t: ti, mm: mm[i] ?? 0 }));
    horas.forEach((h) => {
      const ms = new Date(h.t).getTime();
      if (ms <= ahora && ms > ahora - 72 * 3600e3) pasado += h.mm;
      if (ms > ahora && ms <= ahora + 72 * 3600e3) futuro += h.mm;
    });
    return { estado: "ok", pasado72: Math.round(pasado * 10) / 10, futuro72: Math.round(futuro * 10) / 10, horas };
  } catch {
    return { estado: "error", pasado72: 0, futuro72: 0, horas: [] };
  }
}

// ---------- InSAR ----------
export function puntosDesdeGeoJSON(gj: any): PuntoInsar[] {
  const feats: any[] = gj?.features ?? [];
  return feats
    .filter((f) => f.geometry?.type === "Point")
    .map((f) => {
      const p = f.properties ?? {};
      const v = Number(p.v ?? p.velocity ?? p.velocidad ?? p.vel_mm_yr ?? 0) / 12;
      return {
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        v,
        a: p.a != null || p.accel != null || p.aceleracion != null ? Number(p.a ?? p.accel ?? p.aceleracion) : null,
        coh: p.coh != null || p.coherence != null ? Number(p.coh ?? p.coherence) : null,
      };
    });
}

export function puntosDesdeCSV(texto: string): PuntoInsar[] {
  const lineas = texto.trim().split(/\r?\n/);
  const cab = lineas[0].toLowerCase().split(/[,;\t]/).map((s) => s.trim());
  const idx = (...n: string[]) => cab.findIndex((c) => n.includes(c));
  const iLon = idx("lon", "longitude", "longitud", "x");
  const iLat = idx("lat", "latitude", "latitud", "y");
  const iV = idx("v", "velocity", "velocidad", "vel_mm_yr", "vel");
  const iA = idx("a", "accel", "aceleracion");
  const iC = idx("coh", "coherence", "coherencia");
  if (iLon < 0 || iLat < 0 || iV < 0) throw new Error("El CSV necesita columnas lon, lat y velocity (mm/año)");
  return lineas.slice(1).map((l) => {
    const c = l.split(/[,;\t]/);
    return {
      lon: Number(c[iLon]),
      lat: Number(c[iLat]),
      v: Number(c[iV]) / 12,
      a: iA >= 0 ? Number(c[iA]) : null,
      coh: iC >= 0 ? Number(c[iC]) : null,
    };
  }).filter((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat) && Number.isFinite(p.v));
}

export function puntosAGeoJSON(puntos: PuntoInsar[]) {
  return {
    type: "FeatureCollection",
    features: puntos.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { v: p.v, a: p.a, coh: p.coh },
    })),
  };
}

// ---------- Riesgo ----------
export const COLOR: Record<Nivel, string> = { estable: "#3dd68c", precaucion: "#f5b83d", alerta: "#ff5a5f" };
export const ETIQUETA: Record<Nivel, string> = { estable: "Estable", precaucion: "Precaución", alerta: "Alerta" };

export function formatearFecha(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}
