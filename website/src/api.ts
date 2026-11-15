import { distancia, type Nivel, type PuntoInsar, type RiesgoZona } from "./data";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");

type GeoPoint = { lat: number; lon: number };
type Zone = {
  id: string;
  name: string;
  center: GeoPoint;
  slope_deg: number;
  polygon: GeoPoint[];
};
type Assessment = {
  zone_id: string;
  displacement_mm_month: number;
  rain_24h_mm: number;
  risk_score: number;
  risk_level: "seguro" | "precaucion" | "alerta" | "critico";
};
type Layer = {
  kind: string;
  source: string;
  features: { position: GeoPoint; value: number; unit: string }[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) throw new Error(`Backend: ${path} respondió ${response.status}`);
  return response.json() as Promise<T>;
}

export function adaptarEvaluacion(zone: Zone, assessment: Assessment): RiesgoZona {
  if (zone.id !== assessment.zone_id) throw new Error("La evaluación no corresponde a la zona solicitada");
  const niveles: Record<Assessment["risk_level"], Nivel> = {
    seguro: "estable", precaucion: "precaucion", alerta: "alerta", critico: "alerta",
  };
  return {
    id: zone.id,
    nombre: zone.name,
    lon: zone.center.lon,
    lat: zone.center.lat,
    radio: Math.max(...zone.polygon.map((p) => distancia(zone.center.lon, zone.center.lat, p.lon, p.lat)), 0),
    poligono: zone.polygon.map((p) => [p.lon, p.lat]),
    pendiente: zone.slope_deg,
    rumbo: 0,
    velocidad: assessment.displacement_mm_month,
    lluvia24: assessment.rain_24h_mm,
    lluviaBase24: assessment.rain_24h_mm,
    indice: Math.round(assessment.risk_score * 100),
    nivel: niveles[assessment.risk_level],
    nivelBackend: assessment.risk_level,
  };
}

export async function cargarBackend() {
  const [zonas, capas] = await Promise.all([
    request<Zone[]>("/api/v1/zones"),
    request<Layer[]>("/api/v1/layers"),
  ]);
  const evaluaciones = await Promise.all(zonas.map((z) =>
    request<Assessment>(`/api/v1/zones/${encodeURIComponent(z.id)}`),
  ));
  const capa = capas.find((l) => l.kind === "deformacion_insar");
  if (!capa) throw new Error("El backend no devolvió la capa de deformación");
  const puntos: PuntoInsar[] = capa.features.map((f) => {
    if (f.unit !== "mm/mes") throw new Error(`Unidad de deformación no compatible: ${f.unit}`);
    return { lon: f.position.lon, lat: f.position.lat, v: f.value, a: null, coh: null };
  });
  return {
    riesgo: zonas.map((z, i) => adaptarEvaluacion(z, evaluaciones[i])).sort((a, b) => b.indice - a.indice),
    puntos,
    fuente: capa.source,
  };
}

export async function simular(zona: RiesgoZona, lluvia24: number): Promise<RiesgoZona> {
  if (zona.lluviaBase24 <= 0 && lluvia24 > 0) {
    throw new Error("El backend no permite simular lluvia absoluta cuando la lluvia base es cero");
  }
  const result = await request<{ assessment: Assessment }>("/api/v1/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone_id: zona.id, rain_multiplier: zona.lluviaBase24 > 0 ? lluvia24 / zona.lluviaBase24 : 0 }),
  });
  if (result.assessment.zone_id !== zona.id) throw new Error("La simulación no corresponde a la zona solicitada");
  return {
    ...zona,
    velocidad: result.assessment.displacement_mm_month,
    lluvia24: result.assessment.rain_24h_mm,
    indice: Math.round(result.assessment.risk_score * 100),
    nivel: result.assessment.risk_level === "seguro" ? "estable" : result.assessment.risk_level === "precaucion" ? "precaucion" : "alerta",
    nivelBackend: result.assessment.risk_level,
  };
}

export async function predecir(lat: number, lon: number): Promise<Assessment> {
  return request<Assessment>("/api/v1/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon }),
  });
}

export function conectarAlertas(onAlert: (assessment: Assessment) => void, onStatus: (connected: boolean) => void) {
  const url = new URL(`${baseUrl}/ws/alerts`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  let socket: WebSocket;
  let timer: ReturnType<typeof setTimeout>;
  let closed = false;
  const conectar = () => {
    socket = new WebSocket(url);
    socket.onopen = () => onStatus(true);
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "live_alert" && message.assessment) onAlert(message.assessment);
      } catch (error) {
        console.error("Mensaje de alerta inválido", error);
      }
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => {
      onStatus(false);
      if (!closed) timer = setTimeout(conectar, 3000);
    };
  };
  conectar();
  return () => {
    closed = true;
    clearTimeout(timer);
    socket.close();
  };
}

export function actualizarAlerta(zonas: RiesgoZona[], assessment: Assessment): RiesgoZona[] {
  return zonas.map((z): RiesgoZona => z.id === assessment.zone_id ? {
    ...z,
    velocidad: assessment.displacement_mm_month,
    lluvia24: assessment.rain_24h_mm,
    indice: Math.round(assessment.risk_score * 100),
    nivel: assessment.risk_level === "seguro" ? "estable" : assessment.risk_level === "precaucion" ? "precaucion" : "alerta",
    nivelBackend: assessment.risk_level,
  } : z).sort((a, b) => b.indice - a.indice);
}
