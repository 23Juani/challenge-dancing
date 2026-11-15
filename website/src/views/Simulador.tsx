import { useEffect, useMemo, useRef, useState } from "react";
import type { Datos } from "../App";
import { agregarCapaInsar } from "../mapa";
import { useMapa } from "./useMapa";
import { COLOR, ETIQUETA, desplazar, dentro, puntosAGeoJSON, type RiesgoZona } from "../data";
import { simular } from "../api";

type Resultado = { alcanzados: number; vigilancia: number; alcance: number; area: number };

function poligonoDeslizamiento(z: RiesgoZona, lluvia: number, escala = 1): [number, number][] {
  const L = (120 + lluvia * 5) * escala;
  const W = (60 + lluvia * 1.3) * escala;
  const b = (z.rumbo * Math.PI) / 180;
  const ux = Math.sin(b);
  const uy = Math.cos(b);
  const px = -uy;
  const py = ux;
  const inicio = -z.radio * 0.35;
  const izq: [number, number][] = [];
  const der: [number, number][] = [];
  const pasos = 28;
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const d = inicio + t * L;
    const w = W * Math.sqrt(Math.sin(Math.PI * Math.min(t, 0.999) * 0.92 + 0.08)) * (0.55 + 0.45 * t);
    const ond = Math.sin(t * 9) * W * 0.06;
    izq.push(desplazar(z.lon, z.lat, ux * d + px * (w + ond), uy * d + py * (w + ond)));
    der.push(desplazar(z.lon, z.lat, ux * d - px * (w - ond), uy * d - py * (w - ond)));
  }
  return [...izq, ...der.reverse(), izq[0]];
}

function areaHa(poly: [number, number][]) {
  const lat0 = poly[0][1];
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  let s = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    s += poly[i][0] * kx * (poly[i + 1][1] * ky) - poly[i + 1][0] * kx * (poly[i][1] * ky);
  }
  return Math.abs(s / 2) / 10000;
}

function centroide(geom: any): [number, number] | null {
  const anillo = geom.type === "Polygon" ? geom.coordinates[0] : geom.type === "MultiPolygon" ? geom.coordinates[0][0] : null;
  if (!anillo?.length) return null;
  let x = 0;
  let y = 0;
  anillo.forEach((c: number[]) => {
    x += c[0];
    y += c[1];
  });
  return [x / anillo.length, y / anillo.length];
}

export default function Simulador({ datos }: { datos: Datos }) {
  const [zonaId, setZonaId] = useState<string>("");
  const zona = datos.riesgo.find((z) => z.id === zonaId) ?? datos.riesgo[0];
  const [lluvia, setLluvia] = useState(60);
  const [usoReal, setUsoReal] = useState(false);
  const [res, setRes] = useState<Resultado>({ alcanzados: 0, vigilancia: 0, alcance: 0, area: 0 });
  const [simulada, setSimulada] = useState<RiesgoZona | null>(null);
  const [errorSim, setErrorSim] = useState("");
  const lienzo = useRef<HTMLCanvasElement | null>(null);

  const { ref, mapa, listo, error } = useMapa({
    center: zona ? [zona.lon, zona.lat] : [-68.1035, -16.529],
    zoom: 15.4,
    pitch: 70,
    bearing: zona ? zona.rumbo - 180 + 40 : 60,
  });

  const geo = useMemo(() => puntosAGeoJSON(datos.puntos), [datos.puntos]);
  const activo = simulada?.nivel === "alerta";

  useEffect(() => {
    if (usoReal && zona) setLluvia(zona.lluviaBase24);
  }, [usoReal, zona?.id, zona?.lluviaBase24]);

  useEffect(() => {
    setSimulada(null);
    setErrorSim("");
    if (!zona) return;
    let cancelado = false;
    const timer = setTimeout(() => {
      simular(zona, lluvia).then((resultado) => {
        if (!cancelado) setSimulada(resultado);
      }).catch((error: unknown) => {
        if (!cancelado) setErrorSim(error instanceof Error ? error.message : String(error));
      });
    }, 250);
    return () => { cancelado = true; clearTimeout(timer); };
  }, [zona?.id, zona?.lluviaBase24, lluvia]);

  // al cambiar de zona, volar a ella
  useEffect(() => {
    if (!listo || !mapa.current || !zona) return;
    mapa.current.flyTo({ center: [zona.lon, zona.lat], zoom: 15.4, pitch: 70, bearing: zona.rumbo - 140, duration: 2400 });
  }, [listo, zona?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // capas base del simulador
  useEffect(() => {
    if (!listo || !mapa.current) return;
    const m = mapa.current;
    agregarCapaInsar(m, geo);
    if (!m.getSource("deslizamiento")) {
      const vacio = { type: "FeatureCollection", features: [] };
      m.addSource("deslizamiento", { type: "geojson", data: vacio });
      m.addLayer({ id: "deslizamiento", type: "fill", source: "deslizamiento", paint: { "fill-color": "#7a4a26", "fill-opacity": 0.55 } });
      m.addLayer({ id: "deslizamiento-borde", type: "line", source: "deslizamiento", paint: { "line-color": "#ff5a5f", "line-width": 3, "line-dasharray": [2, 1] } });
      m.addSource("afectados", { type: "geojson", data: vacio });
      m.addLayer({
        id: "afectados",
        type: "fill-extrusion",
        source: "afectados",
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["+", ["coalesce", ["get", "h"], 8], 1.5],
          "fill-extrusion-opacity": 0.95,
        },
      });
      m.addSource("escombros", { type: "geojson", data: vacio });
      m.addLayer({
        id: "escombros",
        type: "circle",
        source: "escombros",
        paint: { "circle-radius": ["get", "r"], "circle-color": "#5b3a1f", "circle-stroke-color": "#c9a27a", "circle-stroke-width": 0.6 },
      });
    }
  }, [listo, geo, mapa]);

  // recalcular la simulación
  useEffect(() => {
    if (!listo || !mapa.current || !zona) return;
    const m = mapa.current;
    const poly = poligonoDeslizamiento(zona, lluvia);
    const polyVig = poligonoDeslizamiento(zona, lluvia, 1.35);
    m.getSource("deslizamiento").setData({
      type: "FeatureCollection",
      features: activo ? [{ type: "Feature", geometry: { type: "Polygon", coordinates: [poly] }, properties: {} }] : [],
    });

    const calcularEdificios = () => {
      const feats: any[] = activo ? m.queryRenderedFeatures({ layers: ["edificios"] }) : [];
      const vistos = new Set<string>();
      let alc = 0;
      let vig = 0;
      const afect: any[] = [];
      feats.forEach((f) => {
        const c = centroide(f.geometry);
        if (!c) return;
        const clave = c.map((v) => v.toFixed(5)).join(",");
        if (vistos.has(clave)) return;
        vistos.add(clave);
        let color = "";
        if (dentro(c, poly)) {
          color = "#ff5a5f";
          alc++;
        } else if (dentro(c, polyVig)) {
          color = "#f5b83d";
          vig++;
        }
        if (color) afect.push({ type: "Feature", geometry: f.geometry, properties: { color, h: f.properties?.render_height ?? 8 } });
      });
      m.getSource("afectados")?.setData({ type: "FeatureCollection", features: afect });
      setRes({ alcanzados: alc, vigilancia: vig, alcance: activo ? Math.round(120 + lluvia * 5) : 0, area: activo ? Math.round(areaHa(poly) * 10) / 10 : 0 });
    };
    if (m.loaded()) calcularEdificios();
    m.once("idle", calcularEdificios);
  }, [listo, lluvia, zona?.id, activo]); // eslint-disable-line react-hooks/exhaustive-deps

  // escombros animados que bajan por la ladera
  useEffect(() => {
    if (!listo || !mapa.current || !zona) return;
    const m = mapa.current;
    const fuente = m.getSource("escombros");
    if (!fuente) return;
    if (!activo) {
      fuente.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    const n = Math.round(40 + lluvia * 1.6);
    const L = 120 + lluvia * 5;
    const W = 60 + lluvia * 1.3;
    const b = (zona.rumbo * Math.PI) / 180;
    const ux = Math.sin(b);
    const uy = Math.cos(b);
    const part = Array.from({ length: n }, () => ({ t: Math.random(), s: (Math.random() - 0.5) * 1.6, v: 0.0015 + Math.random() * 0.004, r: 1.5 + Math.random() * 3.5 }));
    let id = 0;
    let ultimo = 0;
    const paso = (ts: number) => {
      id = requestAnimationFrame(paso);
      if (ts - ultimo < 50) return;
      ultimo = ts;
      const feats = part.map((p) => {
        p.t += p.v;
        if (p.t > 1) p.t = 0;
        const d = -zona.radio * 0.35 + p.t * L;
        const w = W * Math.sqrt(Math.sin(Math.PI * Math.min(p.t, 0.999) * 0.92 + 0.08)) * (0.55 + 0.45 * p.t) * 0.8;
        const [lon, lat] = desplazar(zona.lon, zona.lat, ux * d + -uy * w * p.s * 0.5, uy * d + ux * w * p.s * 0.5);
        return { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { r: p.r } };
      });
      fuente.setData({ type: "FeatureCollection", features: feats });
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [listo, lluvia, zona?.id, activo]); // eslint-disable-line react-hooks/exhaustive-deps

  // lluvia animada sobre la vista
  useEffect(() => {
    const cv = lienzo.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let id = 0;
    const gotas = Array.from({ length: 400 }, () => ({ x: Math.random(), y: Math.random(), v: 0.008 + Math.random() * 0.012 }));
    const dibujar = () => {
      id = requestAnimationFrame(dibujar);
      const w = (cv.width = cv.clientWidth);
      const h = (cv.height = cv.clientHeight);
      ctx.clearRect(0, 0, w, h);
      const cuantas = Math.round((lluvia / 150) * gotas.length);
      ctx.strokeStyle = "rgba(210,230,245,0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < cuantas; i++) {
        const g = gotas[i];
        g.y += g.v;
        g.x -= g.v * 0.18;
        if (g.y > 1) {
          g.y = 0;
          g.x = Math.random() * 1.1;
        }
        ctx.moveTo(g.x * w, g.y * h);
        ctx.lineTo(g.x * w - 3, g.y * h + 14);
      }
      ctx.stroke();
    };
    dibujar();
    return () => cancelAnimationFrame(id);
  }, [lluvia]);

  const aviso = !simulada
    ? { txt: errorSim || (datos.backend.estado === "error" ? "Backend sin conexión" : "Consultando simulación…"), c: COLOR.precaucion }
    : !activo
    ? { txt: `Resultado del backend: ${ETIQUETA[simulada.nivel]}`, c: COLOR[simulada.nivel] }
    : res.alcanzados > 0
      ? { txt: `${simulada.nivelBackend === "critico" ? "Crítico" : "Alerta"}: escenario ilustrativo con ${res.alcanzados} edificios`, c: COLOR.alerta }
      : { txt: `${simulada.nivelBackend === "critico" ? "Crítico" : "Alerta"}: escenario ilustrativo de desplazamiento`, c: COLOR.alerta };

  return (
    <div className="workspace">
      <div className="map-area">
        <div ref={ref} className="map" />
        <canvas ref={lienzo} className="rain-canvas" aria-hidden="true" />
        {error && <div className="map-error">{error}</div>}
        <div className="map-card top-left">
          <strong>{zona?.nombre ?? "—"} · simulación 3D</strong>
          <span>Puntos InSAR ({datos.fuentePuntos}) · edificios OpenStreetMap · relieve real</span>
        </div>
        <div className="sim-banner" style={{ borderColor: aviso.c, color: aviso.c }}>{aviso.txt}</div>
      </div>

      <aside className="control-panel">
        <div className="panel-head">
          <h1>¿Qué pasaría si llueve?</h1>
          <p className="muted">Consulta al backend cómo cambia el riesgo con la lluvia y visualiza un escenario ilustrativo.</p>
        </div>

        <section className="panel-sec">
          <h2>Zona</h2>
          <select className="select" value={zona?.id ?? ""} onChange={(e) => setZonaId(e.target.value)} aria-label="Zona a simular">
            {datos.riesgo.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre} · {ETIQUETA[z.nivel]} ({z.indice})
              </option>
            ))}
          </select>
        </section>

        <section className="panel-sec">
          <h2>Lluvia acumulada 24 h</h2>
          <div className="big-number">{lluvia} mm</div>
          <input
            className="range-big"
            type="range"
            min={0}
            max={150}
            step={5}
            value={lluvia}
            aria-label="Lluvia acumulada en 24 horas"
            onChange={(e) => {
              setUsoReal(false);
              setLluvia(Number(e.target.value));
            }}
          />
          <div className="seg seg-3">
            <button type="button" onClick={() => { setUsoReal(false); setLluvia(10); }}>Día normal</button>
            <button type="button" onClick={() => { setUsoReal(false); setLluvia(70); }}>Tormenta</button>
            <button type="button" onClick={() => { setUsoReal(false); setLluvia(140); }}>Extremo</button>
          </div>
          <button type="button" className="small-button" aria-pressed={usoReal} onClick={() => setUsoReal(true)} disabled={!zona}>
            Usar lluvia base del backend ({zona ? `${zona.lluviaBase24} mm` : "sin datos"})
          </button>
          {datos.lluvia.estado === "ok" && <p className="tiny">Pronóstico próximas 72 h: {datos.lluvia.futuro72} mm (Open-Meteo)</p>}
        </section>

        <section className="panel-sec">
          <h2>Resultado</h2>
          <div className="kpi-grid">
            <div><span>Edificios alcanzados</span><strong style={{ color: COLOR.alerta }}>{res.alcanzados}</strong></div>
            <div><span>En vigilancia</span><strong style={{ color: COLOR.precaucion }}>{res.vigilancia}</strong></div>
            <div><span>Alcance</span><strong>{res.alcance} m</strong></div>
            <div><span>Área</span><strong>{res.area} ha</strong></div>
            <div><span>Índice simulado</span><strong style={{ color: simulada ? COLOR[simulada.nivel] : undefined }}>{simulada ? `${simulada.indice}/100` : "s/d"}</strong></div>
            <div><span>Desplazamiento</span><strong>{simulada ? `${simulada.velocidad} mm/mes` : "s/d"}</strong></div>
          </div>
          <p className="tiny">El índice proviene del backend. La dirección, alcance y área son ilustrativos, no un modelo físico. Cuenta los edificios visibles en pantalla.</p>
        </section>

        <section className="panel-sec">
          <a className="primary-button wide" href="#zona">Avisar a los vecinos de esta zona</a>
        </section>
      </aside>
    </div>
  );
}
