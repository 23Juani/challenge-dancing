import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const api = await server.ssrLoadModule("/src/api.ts");
const data = await server.ssrLoadModule("/src/data.ts");
after(() => server.close());

const zone = {
  id: "zona/1", name: "Zona de prueba", center: { lat: -16.5, lon: -68.1 },
  slope_deg: 30, polygon: [{ lat: -16.5, lon: -68.1 }, { lat: -16.501, lon: -68.1 }],
};
const assessment = {
  zone_id: zone.id, displacement_mm_month: 12, rain_24h_mm: 10,
  risk_score: 0.62, risk_level: "alerta",
};

test("carga zonas y deformación del backend con unidades y niveles originales", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    const body = url.endsWith("/zones") ? [zone]
      : url.endsWith("/layers") ? [{ kind: "deformacion_insar", source: "sintético", features: [{ position: zone.center, value: 7, unit: "mm/mes" }] }]
      : assessment;
    return new Response(JSON.stringify(body));
  };
  try {
    const result = await api.cargarBackend();
    assert.ok(calls.some((url) => url.endsWith("/zones/zona%2F1")));
    assert.equal(result.riesgo[0].indice, 62);
    assert.equal(result.riesgo[0].nivel, "alerta");
    assert.equal(result.riesgo[0].velocidad, 12);
    assert.equal(result.puntos[0].v, 7);
    assert.equal(result.puntos[0].coh, null);
    assert.equal(result.fuente, "sintético");
  } finally { globalThis.fetch = original; }
});

test("simulación usa lluvia base aun después de una alerta en vivo", async () => {
  const original = globalThis.fetch;
  const initial = api.adaptarEvaluacion(zone, assessment);
  const live = api.actualizarAlerta([initial], { ...assessment, rain_24h_mm: 70, risk_level: "critico" })[0];
  assert.equal(live.nivelBackend, "critico");
  assert.equal(live.lluviaBase24, 10);
  globalThis.fetch = async (url, init) => {
    assert.ok(url.endsWith("/api/v1/simulate"));
    assert.equal(JSON.parse(init.body).rain_multiplier, 2);
    return new Response(JSON.stringify({ assessment: { ...assessment, rain_24h_mm: 20 } }));
  };
  try {
    assert.equal((await api.simular(live, 20)).lluvia24, 20);
    await assert.rejects(api.simular({ ...live, lluviaBase24: 0 }, 20), /lluvia base es cero/);
  } finally { globalThis.fetch = original; }
});

test("errores HTTP no se presentan como evaluaciones válidas", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 503 });
  try {
    await assert.rejects(api.cargarBackend(), /503/);
    await assert.rejects(api.predecir(-16.5, -68.1), /503/);
  } finally { globalThis.fetch = original; }
});

test("los archivos de usuario convierten mm/año a mm/mes sin inventar métricas", () => {
  const [csv] = data.puntosDesdeCSV("lon,lat,velocity\n-68.1,-16.5,-120");
  const [geo] = data.puntosDesdeGeoJSON({
    features: [{ geometry: { type: "Point", coordinates: [-68.1, -16.5] }, properties: { velocity: -120 } }],
  });
  for (const point of [csv, geo]) {
    assert.equal(point.v, -10);
    assert.equal(point.a, null);
    assert.equal(point.coh, null);
  }
});
