import { useEffect, useMemo, useRef, useState } from "react";
import type { Datos } from "../App";
import { agregarCapaInsar } from "../mapa";
import { agregarCapaZonas, useMapa } from "./useMapa";
import { COLOR, ETIQUETA, LA_PAZ, distancia, puntosAGeoJSON, type RiesgoZona } from "../data";
import { actualizarAlerta, predecir } from "../api";

type Resultado = { nombre: string; lon: number; lat: number; zona: RiesgoZona | null; dist: number; vLocal: number | null };

export default function MiZona({ datos }: { datos: Datos }) {
  const [q, setQ] = useState("Pampahasi");
  const [buscando, setBuscando] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const [err, setErr] = useState("");
  const marcador = useRef<any>(null);
  const { ref, mapa, listo, error } = useMapa({ center: [LA_PAZ.lon, LA_PAZ.lat - 0.015], zoom: 12.8, pitch: 55, bearing: -20 });
  const geo = useMemo(() => puntosAGeoJSON(datos.puntos), [datos.puntos]);

  useEffect(() => {
    if (!listo || !mapa.current) return;
    agregarCapaInsar(mapa.current, geo);
    agregarCapaZonas(mapa.current, datos.riesgo);
  }, [listo, geo, datos.riesgo, mapa]);

  async function evaluar(nombre: string, lon: number, lat: number) {
    const assessment = await predecir(lat, lon);
    const mejor = actualizarAlerta(datos.riesgo, assessment).find((z) => z.id === assessment.zone_id);
    if (!mejor) throw new Error("La zona evaluada no está disponible en el mapa");
    const dMejor = distancia(lon, lat, mejor.lon, mejor.lat) - mejor.radio;
    const cerca = datos.puntos.filter((p) => distancia(p.lon, p.lat, lon, lat) < 250);
    const vLocal = cerca.length ? Math.round((cerca.reduce((s, p) => s + p.v, 0) / cerca.length) * 10) / 10 : null;
    setRes({ nombre, lon, lat, zona: mejor, dist: Math.max(0, Math.round(dMejor)), vLocal });
    if (mapa.current) {
      marcador.current?.remove();
      marcador.current = new window.maplibregl.Marker({ color: "#55d0f5" }).setLngLat([lon, lat]).addTo(mapa.current);
      mapa.current.flyTo({ center: [lon, lat], zoom: 15.5, pitch: 65, duration: 2200 });
    }
  }

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBuscando(true);
    setErr("");
    try {
      const params = new URLSearchParams({ format: "json", limit: "1", q: `${q}, La Paz, Bolivia`, viewbox: "-68.25,-16.42,-67.98,-16.6", bounded: "1" });
      const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { "Accept-Language": "es" } });
      if (!r.ok) throw new Error(`El buscador respondió ${r.status}`);
      const j = await r.json();
      if (!j.length) throw new Error("No encontramos esa dirección en La Paz");
      await evaluar(j[0].display_name.split(",").slice(0, 2).join(","), Number(j[0].lon), Number(j[0].lat));
    } catch (e: any) {
      setErr(e?.message ?? "Error al buscar");
    } finally {
      setBuscando(false);
    }
  }

  function miUbicacion() {
    navigator.geolocation?.getCurrentPosition(
      (p) => { evaluar("Mi ubicación", p.coords.longitude, p.coords.latitude).catch((error: unknown) => setErr(error instanceof Error ? error.message : String(error))); },
      () => setErr("No pudimos obtener tu ubicación"),
    );
  }

  const nivel = res?.zona ? res.zona.nivel : "estable";

  return (
    <div className="zone-page">
      <section className="zone-search">
        <p className="eyebrow">Para vecinos</p>
        <h1>¿Se mueve el suelo donde vivo?</h1>
        <form onSubmit={buscar} className="search-row">
          <label className="search-input">
            <span className="sr-only">Barrio o dirección</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe tu barrio o calle" />
          </label>
          <button className="primary-button" type="submit" disabled={buscando}>{buscando ? "Buscando…" : "Consultar"}</button>
          <button className="ghost-button" type="button" onClick={miUbicacion}>Usar mi ubicación</button>
        </form>
        {err && <p className="muted">{err}</p>}
      </section>

      <div className="zone-body">
        <div className="zone-map">
          <div ref={ref} className="map" />
          {error && <div className="map-error">{error}</div>}
        </div>
        <div className="zone-cards">
          {res ? (
            <article className="result-card" style={{ borderColor: COLOR[nivel] }}>
              <div className="traffic">
                {(["alerta", "precaucion", "estable"] as const).map((n) => (
                  <i key={n} style={{ background: n === nivel ? COLOR[n] : "#24383a" }} />
                ))}
              </div>
              <div>
                <span className="muted">{res.nombre}</span>
                <h2 style={{ color: COLOR[nivel] }}>{res.zona ? ETIQUETA[nivel] : "Sin zona de riesgo cercana"}</h2>
                <p>
                  {res.zona
                    ? nivel === "alerta"
                      ? `La zona monitoreada más cercana es ${res.zona.nombre}. Mantente atento a las indicaciones oficiales.`
                      : nivel === "precaucion"
                        ? `La zona monitoreada más cercana es ${res.zona.nombre}. Revisa tu casa en época de lluvias.`
                        : `${res.zona.nombre} es la zona monitoreada más cercana según el backend.`
                    : "No hay zonas monitoreadas a menos de 600 m de este punto."}
                </p>
                <ul className="facts">
                  <li>Movimiento cercano: <strong>{res.vLocal != null ? `${res.vLocal} mm/mes` : "sin puntos cercanos"}</strong></li>
                  {res.zona && <li>Zona evaluada más cercana: <strong>{res.zona.nombre} ({res.dist === 0 ? "cerca" : `a aproximadamente ${res.dist} m`})</strong></li>}
                  <li>Lluvia 72 h: <strong>{datos.lluvia.estado === "ok" ? `${datos.lluvia.pasado72} mm` : "sin datos"}</strong></li>
                </ul>
              </div>
            </article>
          ) : (
            <article className="result-card">
              <h2>Busca tu barrio</h2>
              <p className="muted">Te mostramos la evaluación del backend para la zona monitoreada más cercana.</p>
            </article>
          )}

          <article className="info-card">
            <h3>Recibe alertas</h3>
            <p className="muted">Te avisamos si tu zona cambia de color.</p>
            <a className="primary-button wide" href="https://t.me/" target="_blank" rel="noreferrer">Conectar con Telegram</a>
            <div className="bubble">{res?.zona ? <>BENNETT · {res.zona.nombre}: <strong style={{ color: COLOR[nivel] }}>{res.zona.nivelBackend === "critico" ? "Crítico" : ETIQUETA[nivel]}</strong>. Revisa grietas en tu vivienda.</> : "BENNETT · Consulta una zona para ver su evaluación."}</div>
          </article>

          <article className="info-card">
            <h3>Señales de alerta en tu casa</h3>
            <ul>
              <li>Grietas nuevas en paredes, pisos o veredas</li>
              <li>Puertas y ventanas que de pronto se traban</li>
              <li>Postes, árboles o muros que se inclinan</li>
              <li>Agua que brota del suelo o tuberías rotas</li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}
