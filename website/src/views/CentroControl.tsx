import { useEffect, useMemo, useRef, useState } from "react";
import type { Datos } from "../App";
import { agregarCapaInsar } from "../mapa";
import { agregarCapaZonas, useMapa } from "./useMapa";
import {
  COLOR,
  ETIQUETA,
  LA_PAZ,
  formatearFecha,
  puntosAGeoJSON,
  puntosDesdeCSV,
  puntosDesdeGeoJSON,
  type RiesgoZona,
} from "../data";

type Modo = "velocidad" | "aceleracion";

const COLOR_VELOCIDAD = ["interpolate", ["linear"], ["abs", ["get", "v"]], 0, "#3b8fd9", 5, "#5ad1a0", 10, "#e6f06b", 15, "#fdc23e", 25, "#f46d43", 30, "#d7191c"];
const COLOR_ACELERACION = ["interpolate", ["linear"], ["get", "a"], 0.8, "#3b8fd9", 1, "#5ad1a0", 1.4, "#fdc23e", 2, "#f46d43", 2.6, "#d7191c"];

export default function CentroControl({ datos }: { datos: Datos }) {
  const { ref, mapa, listo, error } = useMapa({
    center: [LA_PAZ.lon + 0.01, LA_PAZ.lat - 0.02],
    zoom: 12.6,
    pitch: 62,
    bearing: -28,
  });
  const [modo, setModo] = useState<Modo>("velocidad");
  const [exag, setExag] = useState(1.3);
  const [sel, setSel] = useState<RiesgoZona | null>(null);
  const [msgArchivo, setMsgArchivo] = useState<string>("");
  const marcadores = useRef<any[]>([]);

  const geo = useMemo(() => puntosAGeoJSON(datos.puntos), [datos.puntos]);

  // capas de datos
  useEffect(() => {
    if (!listo || !mapa.current) return;
    agregarCapaInsar(mapa.current, geo);
    agregarCapaZonas(mapa.current, datos.riesgo);
  }, [listo, geo, datos.riesgo, mapa]);

  // marcadores con etiqueta por zona
  useEffect(() => {
    if (!listo || !mapa.current) return;
    marcadores.current.forEach((m) => m.remove());
    marcadores.current = datos.riesgo.map((z) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `zone-marker nivel-${z.nivel}`;
      const icono = document.createElement("i");
      const texto = document.createElement("span");
      const nombre = document.createElement("strong");
      const velocidad = document.createElement("em");
      nombre.textContent = z.nombre;
      velocidad.textContent = `${z.velocidad} mm/mes`;
      texto.append(nombre, velocidad);
      el.append(icono, texto);
      el.addEventListener("click", () => {
        setSel(z);
        mapa.current.flyTo({ center: [z.lon, z.lat], zoom: 15.2, pitch: 68, duration: 2200 });
      });
      return new window.maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([z.lon, z.lat]).addTo(mapa.current);
    });
  }, [listo, datos.riesgo, mapa]);

  useEffect(() => {
    if (!listo || !mapa.current?.getLayer("insar")) return;
    mapa.current.setPaintProperty("insar", "circle-color", modo === "velocidad" ? COLOR_VELOCIDAD : COLOR_ACELERACION);
    mapa.current.setFilter("insar", [">=", ["coalesce", ["get", "coh"], 1], datos.cohMin]);
  }, [listo, modo, datos.cohMin, mapa, geo]);

  useEffect(() => {
    if (!listo || !mapa.current) return;
    mapa.current.setTerrain({ source: "relieve", exaggeration: exag });
  }, [listo, exag, mapa]);

  const alertas = datos.riesgo.filter((z) => z.nivel !== "estable");
  const pasadas = datos.nisar.estado === "ok" ? datos.nisar.pasadas : [];
  const ultima = pasadas[0];

  async function cargarArchivo(f: File) {
    try {
      const texto = await f.text();
      const pts = /\.csv$/i.test(f.name) ? puntosDesdeCSV(texto) : puntosDesdeGeoJSON(JSON.parse(texto));
      if (!pts.length) throw new Error("No encontré puntos en el archivo");
      datos.setPuntos(pts, `Tu dataset: ${f.name}`);
      setMsgArchivo(`${pts.length.toLocaleString("es-BO")} puntos cargados de ${f.name}`);
      const lons = pts.map((p) => p.lon);
      const lats = pts.map((p) => p.lat);
      mapa.current?.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: 60, pitch: 60, duration: 1800 },
      );
    } catch (e: any) {
      setMsgArchivo(`No se pudo leer: ${e?.message ?? e}`);
    }
  }

  return (
    <div className="workspace">
      <div className="map-area">
        <div ref={ref} className="map" />
        {error && <div className="map-error">{error}</div>}
        <div className="map-card top-left">
          <strong>La Paz · movimiento del suelo</strong>
          <span>{datos.fuentePuntos}</span>
          <div className="legend-bar" style={{ background: "linear-gradient(90deg,#3b8fd9,#5ad1a0,#e6f06b,#fdc23e,#f46d43,#d7191c)" }} />
          <div className="legend-labels">
            {modo === "velocidad" ? (
              <>
                <span>0 mm/mes</span>
                <span>15</span>
                <span>30+</span>
              </>
            ) : (
              <>
                <span>se frena</span>
                <span>igual</span>
                <span>acelera ×2,6</span>
              </>
            )}
          </div>
        </div>
      </div>

      <aside className="control-panel">
        <div className="panel-head">
          <h1>Centro de control</h1>
          <span className={`chip ${datos.nisar.estado === "ok" ? "chip-ok" : datos.nisar.estado === "error" ? "chip-err" : ""}`}>
            <i />
            {datos.nisar.estado === "ok" ? `Conectado a NASA ${datos.nisar.fuente === "ASF" ? "ASF DAAC" : "Earthdata CMR"}` : datos.nisar.estado === "error" ? "NISAR sin conexión" : "Conectando con NASA…"}
          </span>
        </div>

        <section className="panel-sec">
          <h2>Alertas activas</h2>
          {datos.backend.estado === "cargando" && <p className="muted">Cargando evaluaciones del backend…</p>}
          {datos.backend.estado === "error" && <p className="muted">No se pudieron cargar las evaluaciones: {datos.backend.mensaje}</p>}
          {datos.backend.estado === "ok" && alertas.length === 0 && <p className="muted">Sin alertas: todas las zonas están estables.</p>}
          {alertas.map((z) => (
            <button key={z.id} type="button" className={`alert-card nivel-${z.nivel}`} onClick={() => {
              setSel(z);
              mapa.current?.flyTo({ center: [z.lon, z.lat], zoom: 15.2, pitch: 68, duration: 2200 });
            }}>
              <div>
                <strong>{z.nombre}</strong>
                <span style={{ color: COLOR[z.nivel] }}>{z.nivelBackend === "critico" ? "CRÍTICO" : ETIQUETA[z.nivel].toUpperCase()}</span>
              </div>
              <p>
                {z.velocidad} mm/mes · lluvia 24 h {z.lluvia24} mm · índice {z.indice}/100
              </p>
              <small>
                {ultima ? `Pasada NISAR ${formatearFecha(ultima.fecha)}${ultima.track ? ` · track ${ultima.track}` : ""}` : "Pasada NISAR: —"} · evaluación del backend
              </small>
            </button>
          ))}
        </section>

        {sel && (
          <section className="panel-sec">
            <h2>Zona seleccionada</h2>
            <div className="kpi-grid">
              <div><span>Desplazamiento</span><strong style={{ color: COLOR[sel.nivel] }}>{(datos.riesgo.find((z) => z.id === sel.id) ?? sel).velocidad} mm/mes</strong></div>
              <div><span>Lluvia 24 h</span><strong>{(datos.riesgo.find((z) => z.id === sel.id) ?? sel).lluvia24} mm</strong></div>
              <div><span>Pendiente</span><strong>{sel.pendiente}°</strong></div>
              <div><span>Índice</span><strong style={{ color: COLOR[(datos.riesgo.find((z) => z.id === sel.id) ?? sel).nivel] }}>{(datos.riesgo.find((z) => z.id === sel.id) ?? sel).indice}/100</strong></div>
            </div>
            <a className="small-button" href="#simulador">Simular lluvia en esta zona →</a>
          </section>
        )}

        <section className="panel-sec">
          <h2>Pasadas NISAR sobre La Paz</h2>
          {datos.nisar.estado === "cargando" && <p className="muted">Buscando en NASA ASF DAAC…</p>}
          {datos.nisar.estado === "error" && <p className="muted">No se pudo consultar ASF ni CMR ({datos.nisar.mensaje}).</p>}
          {datos.nisar.estado === "ok" && pasadas.length === 0 && <p className="muted">ASF no devolvió pasadas NISAR para este punto todavía.</p>}
          <ul className="pass-list">
            {pasadas.slice(0, 6).map((p) => (
              <li key={p.id + p.fecha}>
                <div>
                  <strong>{formatearFecha(p.fecha)}</strong>
                  <span>{[p.nivel, p.track && `track ${p.track}`, p.frame && `frame ${p.frame}`, p.direccion].filter(Boolean).join(" · ")}</span>
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" title={p.id}>Descargar ↗</a>
                )}
              </li>
            ))}
          </ul>
          <p className="tiny">La descarga pide iniciar sesión en NASA Earthdata.</p>
        </section>

        <section className="panel-sec">
          <h2>Conectar tu dataset NISAR procesado</h2>
          <label className="file-drop">
            <input type="file" accept=".geojson,.json,.csv" onChange={(e) => e.target.files?.[0] && cargarArchivo(e.target.files[0])} />
            <span>Subir GeoJSON o CSV (lon, lat, velocity, coh)</span>
          </label>
          {msgArchivo && <p className="muted">{msgArchivo}</p>}
          <p className="tiny">Genéralo con scripts/nisar_a_geojson.py a partir de la salida de MintPy. La velocidad del archivo debe estar en mm/año.</p>
          <p className="tiny">El archivo se muestra en el mapa; las evaluaciones siguen procediendo del backend.</p>
        </section>

        <section className="panel-sec">
          <h2>Modo de análisis</h2>
          <div className="seg">
            <button type="button" aria-pressed={modo === "velocidad"} onClick={() => setModo("velocidad")}>Velocidad</button>
            <button type="button" aria-pressed={modo === "aceleracion"} disabled={!datos.puntos.some((p) => p.a !== null)} onClick={() => setModo("aceleracion")}>Aceleración</button>
          </div>
          <label className="slider">
            <span>Coherencia mínima <strong>{datos.cohMin.toFixed(2)}</strong></span>
            <input type="range" min={0} max={0.9} step={0.05} value={datos.cohMin} onChange={(e) => datos.setCohMin(Number(e.target.value))} />
          </label>
          <label className="slider">
            <span>Exageración del relieve <strong>×{exag.toFixed(1)}</strong></span>
            <input type="range" min={1} max={3} step={0.1} value={exag} onChange={(e) => setExag(Number(e.target.value))} />
          </label>
        </section>
      </aside>
    </div>
  );
}
