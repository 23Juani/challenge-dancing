import { useEffect, useMemo, useRef, useState } from "react";
import type { Vivo } from "../App";
import { irA } from "../App";
import { useLang, fecha, num } from "../i18n";
import Icon from "../components/Icon";
import { SerieChart, MiniMapaDesp, Sparkline } from "../components/Charts";
import { crearMapa, hayMapLibre, agregarSatelite } from "../mapa";
import {
  LADERAS,
  BBOX,
  GEOLOGIA,
  COLOR_NIVEL,
  ADQUISICIONES,
  ULTIMA_ADQUISICION,
  INICIO_SERIE,
  FIN_SERIE,
  evaluar,
  velocidadReciente,
  lluviaAcumulada,
  type Ladera,
  type GeoKey,
} from "../laderas";
import { colorVel, colorLluvia, colorHum, colorPend, gradiente, P_VEL, P_LLUVIA, P_HUM, P_PEND } from "../escalas";
import { abrirReporte, cardinal } from "../reporte";

type Tema = "precipitacion" | "humedad" | "pendiente" | "geologia" | null;
const DIA = 86400e3;

// ---------- capas GeoJSON ----------
function geoLaderas() {
  return {
    type: "FeatureCollection",
    features: LADERAS.map((l) => {
      const e = evaluar(l);
      return {
        type: "Feature",
        id: LADERAS.indexOf(l) + 1,
        geometry: { type: "Polygon", coordinates: [[...l.poligono, l.poligono[0]]] },
        properties: {
          id: l.id,
          nombre: l.nombre,
          cNivel: COLOR_NIVEL[e.nivel],
          cPend: colorPend(l.pendiente),
          cGeo: GEOLOGIA[l.geo].color,
        },
      };
    }),
  };
}
function geoPuntos() {
  return {
    type: "FeatureCollection",
    features: LADERAS.flatMap((l) =>
      l.puntos.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { v: p.v, c: colorVel(p.v), ladera: l.nombre },
      })),
    ),
  };
}
function geoCampo(valor: (l: Ladera) => number, color: (v: number) => string) {
  const paso = 0.0055;
  const feats: any[] = [];
  const vals = LADERAS.map((l) => ({ lon: l.lon, lat: l.lat, v: valor(l) }));
  for (let x = BBOX.oeste; x < BBOX.este; x += paso) {
    for (let y = BBOX.sur; y < BBOX.norte; y += paso) {
      const cx = x + paso / 2;
      const cy = y + paso / 2;
      let num = 0;
      let den = 0;
      let dmin = Infinity;
      vals.forEach((p) => {
        const d2 = (p.lon - cx) ** 2 + (p.lat - cy) ** 2 + 1e-7;
        dmin = Math.min(dmin, d2);
        const w = 1 / d2;
        num += w * p.v;
        den += w;
      });
      const alcance = Math.max(0, 1 - Math.sqrt(dmin) / 0.03);
      if (alcance <= 0) continue;
      feats.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[x, y], [x + paso, y], [x + paso, y + paso], [x, y + paso], [x, y]]] },
        properties: { c: color(num / den), o: 0.2 + 0.4 * alcance },
      });
    }
  }
  return { type: "FeatureCollection", features: feats };
}

export default function MapaInteractivo({ ladera, vivo }: { ladera?: string; vivo: Vivo }) {
  const { t, lang } = useLang();
  const [sel, setSel] = useState<string | null>(ladera ?? null);
  const [tema, setTema] = useState<Tema>(null);
  const [puntos, setPuntos] = useState(true);
  const [base, setBase] = useState<"claro" | "satelite">("claro");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const contRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<any>(null);

  useEffect(() => {
    if (ladera) setSel(ladera);
  }, [ladera]);

  const evals = useMemo(() => Object.fromEntries(LADERAS.map((l) => [l.id, evaluar(l)])), []);
  const ladSel = LADERAS.find((l) => l.id === sel) ?? null;

  // ---------- creación del mapa ----------
  useEffect(() => {
    if (!contRef.current) return;
    if (!hayMapLibre()) {
      setErrorMapa(t.mapa.sinMapa);
      return;
    }
    let mapa: any;
    try {
      mapa = crearMapa(contRef.current, {
        center: [-68.105, -16.528],
        zoom: 11.9,
        minZoom: 9,
        maxZoom: 17.5,
      });
    } catch {
      setErrorMapa(t.mapa.sinMapa);
      return;
    }
    mapaRef.current = mapa;
    const timeout = setTimeout(() => {
      if (!mapa.loaded()) setErrorMapa(t.mapa.sinMapa);
    }, 15000);
    mapa.on("load", () => {
      clearTimeout(timeout);
      setErrorMapa(null);
      agregarSatelite(mapa);
      mapa.addSource("campo-lluvia", { type: "geojson", data: geoCampo((l) => lluviaAcumulada(l, 7), colorLluvia) });
      mapa.addSource("campo-hum", { type: "geojson", data: geoCampo((l) => evaluar(l).condiciones.humedad, colorHum) });
      mapa.addSource("laderas", { type: "geojson", data: geoLaderas() });
      mapa.addSource("insar", { type: "geojson", data: geoPuntos() });
      for (const id of ["campo-lluvia", "campo-hum"]) {
        mapa.addLayer({ id, type: "fill", source: id, layout: { visibility: "none" }, paint: { "fill-color": ["get", "c"], "fill-opacity": ["get", "o"] } });
      }
      mapa.addLayer({ id: "laderas-tema", type: "fill", source: "laderas", layout: { visibility: "none" }, paint: { "fill-color": ["get", "cPend"], "fill-opacity": 0.72 } });
      mapa.addLayer({
        id: "laderas-base",
        type: "fill",
        source: "laderas",
        paint: { "fill-color": ["get", "cNivel"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.32, 0.16] },
      });
      mapa.addLayer({ id: "laderas-borde", type: "line", source: "laderas", paint: { "line-color": ["get", "cNivel"], "line-width": 2.2 } });
      mapa.addLayer({ id: "laderas-sel", type: "line", source: "laderas", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#0b2a4a", "line-width": 4 } });
      mapa.addLayer({
        id: "insar-pts",
        type: "circle",
        source: "insar",
        paint: {
          "circle-color": ["get", "c"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2, 14, 4.5, 16, 7],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 11, 0.4, 15, 1],
        },
      });
      mapa.addLayer({
        id: "laderas-etiqueta",
        type: "symbol",
        source: "laderas",
        layout: { "text-field": ["get", "nombre"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-offset": [0, 0], "text-allow-overlap": false },
        paint: { "text-color": "#0b2a4a", "text-halo-color": "#ffffff", "text-halo-width": 1.6 },
      });
      let hoverId: number | null = null;
      mapa.on("mousemove", "laderas-base", (e: any) => {
        mapa.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        if (hoverId != null) mapa.setFeatureState({ source: "laderas", id: hoverId }, { hover: false });
        hoverId = f.id;
        mapa.setFeatureState({ source: "laderas", id: hoverId }, { hover: true });
      });
      mapa.on("mouseleave", "laderas-base", () => {
        mapa.getCanvas().style.cursor = "";
        if (hoverId != null) mapa.setFeatureState({ source: "laderas", id: hoverId }, { hover: false });
        hoverId = null;
      });
      mapa.on("click", "laderas-base", (e: any) => {
        const id = e.features?.[0]?.properties?.id;
        if (id) setSel(id);
      });
      const popup = new window.maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      mapa.on("mouseenter", "insar-pts", (e: any) => {
        const p = e.features?.[0]?.properties;
        if (p) popup.setLngLat(e.lngLat).setHTML(`<b>${p.ladera}</b><br>${p.v} mm/mes`).addTo(mapa);
      });
      mapa.on("mouseleave", "insar-pts", () => popup.remove());
      setListo(true);
    });
    mapa.on("error", (e: any) => {
      if (!mapa.loaded() && e?.error?.message?.includes("style")) setErrorMapa(t.mapa.sinMapa);
    });
    return () => {
      clearTimeout(timeout);
      mapa.remove();
      mapaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- capas activables ----------
  useEffect(() => {
    const m = mapaRef.current;
    if (!m || !listo) return;
    const vis = (id: string, v: boolean) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", v ? "visible" : "none");
    vis("campo-lluvia", tema === "precipitacion");
    vis("campo-hum", tema === "humedad");
    vis("laderas-tema", tema === "pendiente" || tema === "geologia");
    if (tema === "pendiente" || tema === "geologia") m.setPaintProperty("laderas-tema", "fill-color", ["get", tema === "pendiente" ? "cPend" : "cGeo"]);
    const temaPoligono = tema === "pendiente" || tema === "geologia";
    m.setPaintProperty("laderas-base", "fill-opacity", ["case", ["boolean", ["feature-state", "hover"], false], temaPoligono ? 0.2 : 0.32, temaPoligono ? 0.01 : 0.16]);
    vis("insar-pts", puntos);
    vis("esri", base === "satelite");
  }, [tema, puntos, base, listo]);

  useEffect(() => {
    const m = mapaRef.current;
    if (!m || !listo) return;
    m.setFilter("laderas-sel", ["==", ["get", "id"], sel ?? ""]);
    const l = LADERAS.find((x) => x.id === sel);
    if (l) {
      const lons = l.poligono.map((p) => p[0]);
      const lats = l.poligono.map((p) => p[1]);
      m.fitBounds(
        [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ],
        { padding: { top: 80, bottom: 80, left: 80, right: 80 }, maxZoom: 15.2, duration: 900 },
      );
    }
  }, [sel, listo]);

  const coincidencias = LADERAS.filter((l) => (l.nombre + " " + l.macro).toLowerCase().includes(busqueda.toLowerCase()));
  const ranking = [...LADERAS].sort((a, b) => evals[b.id].indice - evals[a.id].indice);

  const leyenda = (() => {
    if (tema === "precipitacion") return { tit: t.mapa.capa.precipitacion, grad: gradiente(P_LLUVIA), min: "0 mm", max: "80+ mm" };
    if (tema === "humedad") return { tit: t.mapa.capa.humedad, grad: gradiente(P_HUM), min: "0,05", max: "0,45 m³/m³" };
    if (tema === "pendiente") return { tit: t.mapa.capa.pendiente, grad: gradiente(P_PEND), min: "15°", max: "42°" };
    return null;
  })();

  return (
    <div className="mapa-vista">
      <div className="mapa-cabeza contenedor-ancho">
        <div>
          <p className="eyebrow">{t.nav.mapa}</p>
          <h1 className="vista-titulo">{t.mapa.titulo}</h1>
          <p className="vista-sub">{t.mapa.sub}</p>
        </div>
        <div className="chips-vivo">
          <span className={`chip-vivo ${vivo.lluvia.estado}`}>
            <Icon n="rain" size={15} /> {t.mapa.lluviaHoy}:{" "}
            <b>{vivo.lluvia.estado === "ok" ? `${num(vivo.lluvia.pasado72, lang)} mm` : vivo.lluvia.estado === "cargando" ? t.comun.cargando : t.comun.sinConexion}</b>
            <small>Open-Meteo</small>
          </span>
          <span className="chip-vivo ok">
            <Icon n="satellite" size={15} /> {t.mapa.ultimaAdq}: <b>{fecha(ULTIMA_ADQUISICION, lang, true)}</b>
          </span>
        </div>
      </div>

      <div className="mapa-layout contenedor-ancho">
        <div className="mapa-marco">
          <div className="mapa-area">
            <div ref={contRef} className="mapa-lienzo" />
            {errorMapa && (
              <div className="mapa-error">
                <Icon n="map" size={28} />
                <p>{errorMapa}</p>
              </div>
            )}
          </div>

          {/* controles */}
          <div className="mapa-controles">
            <div className="buscador">
              <Icon n="search" size={17} />
              <input
                value={busqueda}
                placeholder={t.comun.buscar}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setAbierto(true);
                }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setTimeout(() => setAbierto(false), 150)}
                aria-label={t.comun.buscar}
              />
              {abierto && (
                <ul className="buscador-lista">
                  {coincidencias.map((l) => (
                    <li key={l.id}>
                      <button
                        type="button"
                        onMouseDown={() => {
                          setSel(l.id);
                          setBusqueda("");
                          setAbierto(false);
                        }}
                      >
                        <i style={{ background: COLOR_NIVEL[evals[l.id].nivel] }} />
                        <span>{l.nombre}</span>
                        <small>{l.macro}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="control-bloque">
              <p className="control-tit">
                <Icon n="layers" size={15} /> {t.mapa.capas}
              </p>
              <label className="capa-toggle">
                <input type="checkbox" checked={puntos} onChange={(e) => setPuntos(e.target.checked)} />
                <span className="toggle" />
                {t.mapa.capa.desplazamiento}
              </label>
              {(["precipitacion", "humedad", "pendiente", "geologia"] as const).map((k) => (
                <label className="capa-toggle" key={k}>
                  <input type="checkbox" checked={tema === k} onChange={(e) => setTema(e.target.checked ? k : null)} />
                  <span className="toggle" />
                  {t.mapa.capa[k]}
                </label>
              ))}
              <p className="control-nota">{t.mapa.capaNota}</p>
            </div>
            <div className="control-bloque">
              <p className="control-tit">
                <Icon n="map" size={15} /> {t.mapa.base}
              </p>
              <div className="segmentado">
                <button type="button" aria-pressed={base === "claro"} onClick={() => setBase("claro")}>
                  {t.mapa.baseClaro}
                </button>
                <button type="button" aria-pressed={base === "satelite"} onClick={() => setBase("satelite")}>
                  {t.mapa.baseSatelite}
                </button>
              </div>
            </div>
          </div>

          {/* leyenda */}
          <div className="mapa-leyenda">
            <p className="control-tit">{t.mapa.leyenda}</p>
            <p className="ley-sub">{t.mapa.limites}</p>
            <div className="ley-niveles">
              {(["bajo", "moderado", "alto", "muyAlto"] as const).map((n) => (
                <span key={n}>
                  <i style={{ background: COLOR_NIVEL[n] }} /> {t.comun.nivel[n]}
                </span>
              ))}
            </div>
            {puntos && (
              <div className="ley-escala">
                <p>{t.mapa.capa.desplazamiento}</p>
                <div className="ley-grad" style={{ background: gradiente(P_VEL) }} />
                <div className="ley-ext">
                  <span>0</span>
                  <span>−28 {t.comun.mmMes}</span>
                </div>
              </div>
            )}
            {leyenda && (
              <div className="ley-escala">
                <p>{leyenda.tit}</p>
                <div className="ley-grad" style={{ background: leyenda.grad }} />
                <div className="ley-ext">
                  <span>{leyenda.min}</span>
                  <span>{leyenda.max}</span>
                </div>
              </div>
            )}
            {tema === "geologia" && (
              <ul className="ley-geo">
                {(Object.keys(GEOLOGIA) as GeoKey[]).map((g) => (
                  <li key={g}>
                    <i style={{ background: GEOLOGIA[g].color }} /> {GEOLOGIA[g][lang]}
                  </li>
                ))}
              </ul>
            )}
            <p className="ley-fechas">
              {t.mapa.periodo}: {fecha(INICIO_SERIE, lang)} – {fecha(FIN_SERIE, lang, true)} · {ADQUISICIONES.length} {t.mapa.obs.toLowerCase()}
            </p>
          </div>
        </div>

        {/* panel lateral */}
        <aside className="panel-lateral">
          {ladSel ? (
            <PanelLadera l={ladSel} onCerrar={() => setSel(null)} />
          ) : (
            <div className="panel-ranking">
              <p className="pista">
                <Icon n="target" size={18} /> {t.mapa.pista}
              </p>
              <h3>{t.mapa.rankingTitulo}</h3>
              <ul>
                {ranking.map((l) => {
                  const e = evals[l.id];
                  return (
                    <li key={l.id}>
                      <button type="button" onClick={() => setSel(l.id)}>
                        <span className="rk-indice" style={{ background: COLOR_NIVEL[e.nivel] }}>
                          {e.indice}
                        </span>
                        <span className="rk-nombre">
                          <strong>{l.nombre}</strong>
                          <small>
                            {l.macro} · {e.velocidad} {t.comun.mmMes}
                          </small>
                        </span>
                        <Sparkline valores={l.observaciones.map((o) => o.desp)} color={COLOR_NIVEL[e.nivel]} ancho={70} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="nota-demo">{t.comun.demo}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function PanelLadera({ l, onCerrar }: { l: Ladera; onCerrar: () => void }) {
  const { t, lang } = useLang();
  const [ventana, setVentana] = useState<1 | 3 | 7>(3);
  const e = evaluar(l);
  const fmtF = (x: number) => fecha(x, lang);

  const lluviaSerie = useMemo(() => {
    const desde = FIN_SERIE - 59 * DIA;
    return l.lluviaDiaria
      .filter((d) => d.fecha >= desde)
      .map((d) => ({ x: d.fecha, y: lluviaAcumulada(l, ventana, d.fecha) }));
  }, [l, ventana]);

  return (
    <div className="panel-ladera">
      <div className="pl-cabeza">
        <div>
          <p className="eyebrow">{l.macro}</p>
          <h2>{l.nombre}</h2>
        </div>
        <button className="btn-icono" type="button" onClick={onCerrar} aria-label={t.mapa.cerrar}>
          <Icon n="x" size={18} />
        </button>
      </div>
      <div className="pl-indice" style={{ borderColor: COLOR_NIVEL[e.nivel] }}>
        <div>
          <span className="pl-num" style={{ color: COLOR_NIVEL[e.nivel] }}>
            {e.indice}
          </span>
          <span className="pl-de">/100</span>
        </div>
        <div>
          <strong>{t.comun.nivel[e.nivel]}</strong>
          <small>{t.comun.accion[e.nivel]}</small>
        </div>
      </div>
      <div className="pl-acciones">
        <button className="btn btn-primario btn-chico" type="button" onClick={() => irA("simulador", l.id)}>
          <Icon n="sliders" size={16} /> {t.comun.simular}
        </button>
        <button className="btn btn-secundario btn-chico" type="button" onClick={() => abrirReporte(l, lang)}>
          <Icon n="file" size={16} /> {t.comun.reporte}
        </button>
      </div>

      <section className="pl-bloque">
        <h3>
          <span>1</span> {t.mapa.ficha}
        </h3>
        <dl className="ficha">
          <div>
            <dt>{t.mapa.ubicacion}</dt>
            <dd>
              {l.lat.toFixed(4)}°, {l.lon.toFixed(4)}°
            </dd>
          </div>
          <div>
            <dt>{t.mapa.superficie}</dt>
            <dd>{l.areaHa} ha</dd>
          </div>
          <div>
            <dt>{t.mapa.pendiente}</dt>
            <dd>{l.pendiente}°</dd>
          </div>
          <div>
            <dt>{t.mapa.elevacion}</dt>
            <dd>{l.elev.toLocaleString(lang === "es" ? "es-BO" : "en-US")} m</dd>
          </div>
          <div>
            <dt>{t.mapa.orientacion}</dt>
            <dd>{cardinal(l.rumbo, lang)}</dd>
          </div>
          <div>
            <dt>{t.comun.velocidad}</dt>
            <dd>
              {num(velocidadReciente(l), lang)} {t.comun.mmMes}
            </dd>
          </div>
          <div className="ficha-ancha">
            <dt>{t.mapa.contexto}</dt>
            <dd>
              <i className="geo-punto" style={{ background: GEOLOGIA[l.geo].color }} /> {GEOLOGIA[l.geo][lang]}
            </dd>
          </div>
        </dl>
      </section>

      <section className="pl-bloque">
        <h3>
          <span>2</span> {t.mapa.mapaDesp}
        </h3>
        <p className="pl-sub">{t.mapa.mapaDespSub}</p>
        <MiniMapaDesp poligono={l.poligono} puntos={l.puntos} colorV={colorVel} />
        <div className="ley-grad ley-grad-chica" style={{ background: gradiente(P_VEL) }} />
        <div className="ley-ext">
          <span>0</span>
          <span>−28 {t.comun.mmMes}</span>
        </div>
      </section>

      <section className="pl-bloque">
        <h3>
          <span>3</span> {t.mapa.serieDesp}
        </h3>
        <p className="pl-sub">{t.mapa.serieDespSub}</p>
        <SerieChart
          series={[{ nombre: "LOS", color: "#1e6fb8", tipo: "area", datos: l.observaciones.map((o) => ({ x: o.fecha, y: o.desp })) }]}
          fmtX={fmtF}
          fmtY={(v) => v.toFixed(0)}
          unidad="mm"
        />
      </section>

      <section className="pl-bloque">
        <h3>
          <span>4</span> {t.mapa.serieLluvia}
        </h3>
        <div className="pl-sub-fila">
          <p className="pl-sub">{t.mapa.serieLluviaSub}</p>
          <div className="segmentado segmentado-chico">
            {([1, 3, 7] as const).map((v) => (
              <button key={v} type="button" aria-pressed={ventana === v} onClick={() => setVentana(v)}>
                {v === 1 ? "24 h" : v === 3 ? "72 h" : lang === "es" ? "7 días" : "7 days"}
              </button>
            ))}
          </div>
        </div>
        <SerieChart series={[{ nombre: `${ventana === 1 ? "24 h" : ventana === 3 ? "72 h" : "7 d"}`, color: "#4f9fdc", tipo: "barra", datos: lluviaSerie }]} fmtX={fmtF} fmtY={(v) => v.toFixed(0)} unidad="mm" />
      </section>

      <section className="pl-bloque">
        <h3>
          <span>5</span> {t.mapa.serieHum}
        </h3>
        <p className="pl-sub">{t.mapa.serieHumSub}</p>
        <SerieChart
          series={[{ nombre: "SME2", color: "#1f8c8c", tipo: "linea", datos: l.observaciones.map((o) => ({ x: o.fecha, y: o.humedad })) }]}
          fmtX={fmtF}
          fmtY={(v) => v.toFixed(2)}
          yMin={0}
          unidad="m³/m³"
        />
      </section>

      <section className="pl-bloque">
        <h3>
          <span>6</span> {t.mapa.historial}
        </h3>
        <div className="tabla-scroll">
          <table className="tabla tabla-chica">
            <thead>
              <tr>
                <th>{t.mapa.tFecha}</th>
                <th>{t.mapa.tDesp}</th>
                <th>{t.mapa.tLluvia}</th>
                <th>{t.mapa.tHum}</th>
                <th>{t.mapa.tCoh}</th>
              </tr>
            </thead>
            <tbody>
              {[...l.observaciones].reverse().map((o) => (
                <tr key={o.fecha}>
                  <td>{fecha(o.fecha, lang, true)}</td>
                  <td>{num(o.desp, lang)} mm</td>
                  <td>{num(o.lluvia12, lang)} mm</td>
                  <td>{o.humedad == null ? <span className="sd">{t.mapa.sinDato}</span> : num(o.humedad, lang, 3)}</td>
                  <td>{num(o.coherencia, lang, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="nota-demo">{t.comun.demo}</p>
    </div>
  );
}
