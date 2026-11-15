// BENNETT · Conjunto de datos del piloto (21 laderas de La Paz)
// ---------------------------------------------------------------------------
// Las laderas, su ubicación aproximada y su contexto geológico se definen aquí.
// Las series temporales (desplazamiento InSAR, precipitación y humedad) son
// valores DEMOSTRATIVOS generados de forma determinista para el prototipo:
// reproducen el formato de los productos NISAR GUNW / SME2 y GPM IMERG, pero
// no son mediciones reales. Sustituir por la salida del pipeline de datos
// (../data/nisar_landslide_pipeline.ipynb) cuando esté validada.

import { desplazar, distancia } from "./data";

export type Lang = "es" | "en";
export type GeoKey = "lapaz" | "coluvial" | "calvario" | "purapurani" | "miraflores" | "aluvial" | "devonico";
export type NivelAtencion = "bajo" | "moderado" | "alto" | "muyAlto";

export const GEOLOGIA: Record<GeoKey, { es: string; en: string; factor: number; color: string }> = {
  lapaz: { es: "Fm. La Paz · limos y arcillas lacustres", en: "La Paz Fm. · lacustrine silts and clays", factor: 1, color: "#c98b5d" },
  coluvial: { es: "Depósitos coluviales y de deslizamientos antiguos", en: "Colluvium and old landslide deposits", factor: 0.95, color: "#b5654b" },
  calvario: { es: "Fm. Calvario · till glacial", en: "Calvario Fm. · glacial till", factor: 0.72, color: "#9c8fb8" },
  purapurani: { es: "Fm. Purapurani · gravas y arenas", en: "Purapurani Fm. · gravels and sands", factor: 0.58, color: "#d8bf6a" },
  miraflores: { es: "Fm. Miraflores · gravas fluvioglaciales", en: "Miraflores Fm. · fluvioglacial gravels", factor: 0.5, color: "#8fb38a" },
  aluvial: { es: "Depósitos aluviales recientes", en: "Recent alluvial deposits", factor: 0.42, color: "#7fb2c9" },
  devonico: { es: "Basamento devónico · lutitas y areniscas", en: "Devonian bedrock · shales and sandstones", factor: 0.32, color: "#7d8796" },
};

type LaderaBase = {
  id: string;
  nombre: string;
  macro: string;
  lon: number;
  lat: number;
  areaHa: number;
  pendiente: number; // grados
  elev: number; // m s. n. m.
  rumbo: number; // dirección ladera abajo (grados desde el norte)
  geo: GeoKey;
  vel: number; // velocidad media LOS (mm/mes, negativo = alejamiento del satélite)
  sens: number; // sensibilidad a la lluvia (0-1)
};

const BASE: LaderaBase[] = [
  { id: "callapa", nombre: "Callapa", macro: "San Antonio", lon: -68.0995, lat: -16.5392, areaHa: 42, pendiente: 34, elev: 3420, rumbo: 250, geo: "lapaz", vel: -17.5, sens: 0.95 },
  { id: "llojeta", nombre: "Llojeta", macro: "Cotahuma", lon: -68.1435, lat: -16.5262, areaHa: 58, pendiente: 38, elev: 3650, rumbo: 70, geo: "lapaz", vel: -14.2, sens: 0.85 },
  { id: "irpavi2", nombre: "Irpavi II", macro: "Sur", lon: -68.0782, lat: -16.5228, areaHa: 31, pendiente: 31, elev: 3470, rumbo: 200, geo: "coluvial", vel: -12.4, sens: 0.8 },
  { id: "pampahasi", nombre: "Pampahasi", macro: "San Antonio", lon: -68.1002, lat: -16.5058, areaHa: 49, pendiente: 29, elev: 3720, rumbo: 260, geo: "coluvial", vel: -11.1, sens: 0.75 },
  { id: "altoobrajes", nombre: "Alto Obrajes", macro: "Sur", lon: -68.1148, lat: -16.5268, areaHa: 37, pendiente: 33, elev: 3500, rumbo: 120, geo: "lapaz", vel: -10.2, sens: 0.7 },
  { id: "kantutani", nombre: "Kantutani", macro: "Centro", lon: -68.1182, lat: -16.5153, areaHa: 22, pendiente: 36, elev: 3480, rumbo: 140, geo: "lapaz", vel: -9.3, sens: 0.72 },
  { id: "kupini", nombre: "Kupini", macro: "San Antonio", lon: -68.1098, lat: -16.5162, areaHa: 26, pendiente: 30, elev: 3560, rumbo: 230, geo: "coluvial", vel: -8.8, sens: 0.68 },
  { id: "tembladerani", nombre: "Tembladerani", macro: "Cotahuma", lon: -68.1418, lat: -16.5178, areaHa: 34, pendiente: 32, elev: 3700, rumbo: 80, geo: "calvario", vel: -8.1, sens: 0.65 },
  { id: "auquisamana", nombre: "Auquisamaña", macro: "Sur", lon: -68.0818, lat: -16.5402, areaHa: 28, pendiente: 30, elev: 3380, rumbo: 300, geo: "lapaz", vel: -7.9, sens: 0.66 },
  { id: "armonia", nombre: "Villa Armonía", macro: "San Antonio", lon: -68.1032, lat: -16.5176, areaHa: 33, pendiente: 27, elev: 3610, rumbo: 240, geo: "coluvial", vel: -7.2, sens: 0.6 },
  { id: "ovejuyo", nombre: "Ovejuyo", macro: "Sur", lon: -68.0418, lat: -16.5422, areaHa: 46, pendiente: 28, elev: 3560, rumbo: 220, geo: "calvario", vel: -6.9, sens: 0.58 },
  { id: "sanantonio", nombre: "San Antonio Alto", macro: "San Antonio", lon: -68.0948, lat: -16.5118, areaHa: 39, pendiente: 26, elev: 3760, rumbo: 250, geo: "purapurani", vel: -6.2, sens: 0.55 },
  { id: "bellavista", nombre: "Bella Vista", macro: "Sur", lon: -68.0902, lat: -16.5302, areaHa: 24, pendiente: 29, elev: 3440, rumbo: 210, geo: "lapaz", vel: -5.9, sens: 0.55 },
  { id: "retamani", nombre: "Retamani", macro: "Periférica", lon: -68.1402, lat: -16.4802, areaHa: 30, pendiente: 33, elev: 3780, rumbo: 110, geo: "purapurani", vel: -5.8, sens: 0.52 },
  { id: "cotahuma", nombre: "Cotahuma", macro: "Cotahuma", lon: -68.1432, lat: -16.5072, areaHa: 41, pendiente: 30, elev: 3760, rumbo: 90, geo: "calvario", vel: -5.2, sens: 0.5 },
  { id: "vinotinto", nombre: "Vino Tinto", macro: "Periférica", lon: -68.1452, lat: -16.4852, areaHa: 27, pendiente: 31, elev: 3820, rumbo: 120, geo: "purapurani", vel: -4.9, sens: 0.48 },
  { id: "chasquipampa", nombre: "Chasquipampa", macro: "Sur", lon: -68.0562, lat: -16.5452, areaHa: 35, pendiente: 25, elev: 3510, rumbo: 200, geo: "miraflores", vel: -4.6, sens: 0.45 },
  { id: "achumani", nombre: "Achumani", macro: "Sur", lon: -68.0702, lat: -16.5332, areaHa: 29, pendiente: 24, elev: 3420, rumbo: 190, geo: "miraflores", vel: -4.1, sens: 0.42 },
  { id: "mallasa", nombre: "Mallasa", macro: "Mallasa", lon: -68.0952, lat: -16.5682, areaHa: 52, pendiente: 35, elev: 3260, rumbo: 250, geo: "lapaz", vel: -3.9, sens: 0.45 },
  { id: "huanuhuanuni", nombre: "Huanu Huanuni", macro: "Sur", lon: -68.0652, lat: -16.5418, areaHa: 21, pendiente: 22, elev: 3460, rumbo: 180, geo: "aluvial", vel: -3.1, sens: 0.38 },
  { id: "jupapina", nombre: "Jupapina", macro: "Mallasa", lon: -68.0948, lat: -16.5802, areaHa: 33, pendiente: 23, elev: 3200, rumbo: 260, geo: "devonico", vel: -2.6, sens: 0.3 },
];

// ---------- generador determinista ----------
function semilla(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const DIA = 86400e3;
export const INICIO_SERIE = Date.UTC(2026, 6, 1); // 1 jul 2026
export const FIN_SERIE = Date.UTC(2026, 10, 14); // 14 nov 2026
export const ADQUISICIONES = Array.from({ length: 11 }, (_, i) => Date.UTC(2026, 6, 16) + i * 12 * DIA); // 16 jul → 13 nov (cada 12 días)
export const ULTIMA_ADQUISICION = ADQUISICIONES[ADQUISICIONES.length - 1];

// Lluvia regional diaria (mm): estación seca en julio-agosto, inicio de lluvias en octubre-noviembre.
const DIAS = Math.round((FIN_SERIE - INICIO_SERIE) / DIA) + 1;
const LLUVIA_REGIONAL: number[] = (() => {
  const r = rng(semilla("lluvia-regional-lapaz"));
  return Array.from({ length: DIAS }, (_, d) => {
    const f = d / (DIAS - 1);
    const prob = 0.03 + 0.42 * f ** 1.6;
    const media = 1.5 + 8 * f ** 1.4;
    if (r() > prob) return 0;
    return Math.round(-Math.log(1 - r() * 0.98) * media * 10) / 10;
  }).map((mm, d, arr) => {
    // episodio de lluvias de la semana del 8 al 14 de noviembre
    const evento = [0, 3.2, 6.1, 1.4, 4.5, 0.8, 5.2];
    const k = d - (arr.length - evento.length);
    return k >= 0 ? Math.round((mm + evento[k]) * 10) / 10 : mm;
  });
})();

export type PuntoInsarL = { lon: number; lat: number; v: number; coh: number };
export type Obs = { fecha: number; desp: number; humedad: number | null; coherencia: number; lluvia12: number };

export type Ladera = LaderaBase & {
  poligono: [number, number][];
  lluviaDiaria: { fecha: number; mm: number }[];
  observaciones: Obs[];
  puntos: PuntoInsarL[];
};

function poligonoLadera(b: LaderaBase): [number, number][] {
  const r = rng(semilla(b.id + "-poly"));
  const radio = Math.sqrt((b.areaHa * 10000) / Math.PI);
  const ang = ((90 - b.rumbo) * Math.PI) / 180; // eje mayor a lo largo de la pendiente
  const pts: [number, number][] = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 0.78 + r() * 0.36;
    const ex = Math.cos(t) * radio * 1.35 * k;
    const ey = Math.sin(t) * radio * 0.74 * k;
    const dx = ex * Math.cos(ang) - ey * Math.sin(ang);
    const dy = ex * Math.sin(ang) + ey * Math.cos(ang);
    pts.push(desplazar(b.lon, b.lat, dx, dy));
  }
  return pts;
}

function dentro(p: [number, number], poly: [number, number][]) {
  let a = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) a = !a;
  }
  return a;
}

function construir(b: LaderaBase): Ladera {
  const r = rng(semilla(b.id));
  const local = 0.82 + r() * 0.4;
  const lluviaDiaria = LLUVIA_REGIONAL.map((mm, d) => ({
    fecha: INICIO_SERIE + d * DIA,
    mm: Math.round(mm * local * (0.7 + r() * 0.6) * 10) / 10,
  }));
  const sumaEntre = (a: number, z: number) =>
    lluviaDiaria.filter((x) => x.fecha > a && x.fecha <= z).reduce((s, x) => s + x.mm, 0);

  const humBase = 0.07 + r() * 0.05 + (b.geo === "lapaz" || b.geo === "coluvial" ? 0.03 : 0);
  let acum = 0;
  const observaciones: Obs[] = ADQUISICIONES.map((fecha, i) => {
    const ll12 = i === 0 ? 0 : sumaEntre(ADQUISICIONES[i - 1], fecha);
    const ll7 = sumaEntre(fecha - 7 * DIA, fecha);
    if (i > 0) {
      const tasa = (b.vel * 12) / 30;
      acum += tasa * (1 + b.sens * (ll12 / 55)) + (r() - 0.5) * 1.6;
    }
    const sinHumedad = r() < 0.12; // escenas sin estimación SME2 válida
    const humedad = sinHumedad ? null : Math.min(0.46, Math.round((humBase + ll7 * 0.0042 + (r() - 0.5) * 0.015) * 1000) / 1000);
    return {
      fecha,
      desp: Math.round(acum * 10) / 10,
      humedad,
      coherencia: Math.round((0.55 + r() * 0.35) * 100) / 100,
      lluvia12: Math.round(ll12 * 10) / 10,
    };
  });

  const poligono = poligonoLadera(b);
  const lons = poligono.map((p) => p[0]);
  const lats = poligono.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const puntos: PuntoInsarL[] = [];
  let intentos = 0;
  while (puntos.length < 46 && intentos < 900) {
    intentos++;
    const p: [number, number] = [x0 + r() * (x1 - x0), y0 + r() * (y1 - y0)];
    if (!dentro(p, poligono)) continue;
    const dCentro = distancia(p[0], p[1], b.lon, b.lat) / Math.sqrt((b.areaHa * 10000) / Math.PI);
    const v = b.vel * (1.25 - 0.7 * Math.min(1, dCentro)) * (0.8 + r() * 0.4);
    puntos.push({ lon: p[0], lat: p[1], v: Math.round(v * 10) / 10, coh: Math.round((0.45 + r() * 0.5) * 100) / 100 });
  }
  return { ...b, poligono, lluviaDiaria, observaciones, puntos };
}

export const LADERAS: Ladera[] = BASE.map(construir);

// ---------- indicadores ----------
export type Condiciones = { lluvia24: number; lluvia72: number; lluvia7d: number; humedad: number };

export function lluviaAcumulada(l: Ladera, horasDias: number, hasta = FIN_SERIE) {
  return Math.round(l.lluviaDiaria.filter((x) => x.fecha > hasta - horasDias * DIA && x.fecha <= hasta).reduce((s, x) => s + x.mm, 0) * 10) / 10;
}

export function condicionesActuales(l: Ladera): Condiciones {
  const hum = [...l.observaciones].reverse().find((o) => o.humedad != null)?.humedad ?? 0.12;
  return { lluvia24: lluviaAcumulada(l, 1), lluvia72: lluviaAcumulada(l, 3), lluvia7d: lluviaAcumulada(l, 7), humedad: hum };
}

export function velocidadReciente(l: Ladera) {
  const o = l.observaciones;
  const n = o.length;
  return Math.round((((o[n - 1].desp - o[n - 4].desp) / 36) * 30) * 10) / 10; // mm/mes, últimos 3 intervalos
}
export function aceleracion(l: Ladera) {
  const o = l.observaciones;
  const ini = (o[3].desp - o[0].desp) / 36;
  const fin = (o[o.length - 1].desp - o[o.length - 4].desp) / 36;
  return ini === 0 ? 1 : Math.round((fin / ini) * 100) / 100;
}

const norm = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));

export const PESOS = { desplazamiento: 0.3, precipitacion: 0.2, humedad: 0.15, pendiente: 0.2, geologia: 0.15 };
export type Factor = keyof typeof PESOS;

export type Evaluacion = {
  indice: number;
  nivel: NivelAtencion;
  velocidad: number;
  condiciones: Condiciones;
  aportes: Record<Factor, number>; // puntos del índice aportados por cada factor
};

export function evaluar(l: Ladera, esc?: Partial<Condiciones>): Evaluacion {
  const base = condicionesActuales(l);
  const c: Condiciones = { ...base, ...esc };
  const v0 = Math.abs(velocidadReciente(l));
  const extra = Math.max(0, c.lluvia7d - base.lluvia7d) + 0.6 * Math.max(0, c.lluvia72 - base.lluvia72) + 0.4 * Math.max(0, c.lluvia24 - base.lluvia24);
  const velocidad = Math.round(v0 * (1 + (l.sens * extra) / 70) * 10) / 10;
  const n = {
    desplazamiento: norm(velocidad, 0, 26),
    precipitacion: Math.max(norm(c.lluvia7d, 0, 70), norm(c.lluvia72, 0, 45), norm(c.lluvia24, 0, 30)),
    humedad: norm(c.humedad, 0.05, 0.4),
    pendiente: norm(l.pendiente, 12, 42),
    geologia: GEOLOGIA[l.geo].factor,
  };
  const aportes = Object.fromEntries((Object.keys(PESOS) as Factor[]).map((k) => [k, Math.round(n[k] * PESOS[k] * 1000) / 10])) as Record<Factor, number>;
  const indice = Math.round(Object.values(aportes).reduce((s, x) => s + x, 0));
  return { indice, nivel: nivelDe(indice), velocidad, condiciones: c, aportes };
}

export function humedadEscenario(l: Ladera, c: Omit<Condiciones, "humedad">) {
  const base = condicionesActuales(l);
  const delta = (c.lluvia7d - base.lluvia7d) * 0.0034 + (c.lluvia72 - base.lluvia72) * 0.0012;
  return Math.max(0.04, Math.min(0.46, Math.round((base.humedad + delta) * 1000) / 1000));
}

export function nivelDe(indice: number): NivelAtencion {
  if (indice >= 70) return "muyAlto";
  if (indice >= 55) return "alto";
  if (indice >= 38) return "moderado";
  return "bajo";
}

export const COLOR_NIVEL: Record<NivelAtencion, string> = {
  bajo: "#2fa36b",
  moderado: "#e3b02f",
  alto: "#ec7a2c",
  muyAlto: "#d6403a",
};

export function centroide(l: Ladera): [number, number] {
  return [l.lon, l.lat];
}

export const BBOX = { oeste: -68.165, este: -68.025, sur: -16.592, norte: -16.468 };
