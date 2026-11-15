import { useMemo, useState } from "react";
import type { Vivo } from "../App";
import { irA } from "../App";
import { useLang, fecha, num } from "../i18n";
import Icon from "../components/Icon";
import { Donut, Dispersion, Sparkline } from "../components/Charts";
import {
  LADERAS,
  COLOR_NIVEL,
  ADQUISICIONES,
  ULTIMA_ADQUISICION,
  evaluar,
  aceleracion,
  type NivelAtencion,
} from "../laderas";
import { abrirReporte, factorDominante } from "../reporte";

type Orden = "indice" | "velocidad" | "lluvia7d" | "humedad" | "pendiente" | "nombre";
const NIVELES: NivelAtencion[] = ["muyAlto", "alto", "moderado", "bajo"];

export default function Analisis({ vivo }: { vivo: Vivo }) {
  const { t, lang } = useLang();
  const [orden, setOrden] = useState<Orden>("indice");
  const [filtro, setFiltro] = useState<NivelAtencion | "todas">("todas");
  const [repId, setRepId] = useState(LADERAS[0].id);

  const filas = useMemo(
    () =>
      LADERAS.map((l) => {
        const e = evaluar(l);
        return { l, e, acel: aceleracion(l), dom: factorDominante(l) };
      }),
    [],
  );

  const ordenadas = [...filas]
    .filter((f) => filtro === "todas" || f.e.nivel === filtro)
    .sort((a, b) => {
      if (orden === "nombre") return a.l.nombre.localeCompare(b.l.nombre);
      if (orden === "indice") return b.e.indice - a.e.indice;
      if (orden === "velocidad") return b.e.velocidad - a.e.velocidad;
      if (orden === "pendiente") return b.l.pendiente - a.l.pendiente;
      if (orden === "humedad") return b.e.condiciones.humedad - a.e.condiciones.humedad;
      return b.e.condiciones.lluvia7d - a.e.condiciones.lluvia7d;
    });

  const prom = (f: (x: (typeof filas)[number]) => number) => filas.reduce((s, x) => s + f(x), 0) / filas.length;
  const cuenta = (n: NivelAtencion) => filas.filter((f) => f.e.nivel === n).length;
  const totalPuntos = LADERAS.reduce((s, l) => s + l.puntos.length, 0);
  const prioridad = [...filas].sort((a, b) => b.e.indice - a.e.indice).filter((f) => f.e.nivel === "muyAlto" || f.e.nivel === "alto");

  const descargarCsv = () => {
    const cab = ["id", "ladera", "macrodistrito", "indice", "nivel", "accion", "vel_mm_mes", "lluvia24_mm", "lluvia72_mm", "lluvia7d_mm", "humedad_m3m3", "pendiente_deg", "aceleracion", "factor_dominante"];
    const filasCsv = filas.map(({ l, e, acel, dom }) =>
      [l.id, l.nombre, l.macro, e.indice, t.comun.nivel[e.nivel], t.comun.accion[e.nivel], e.velocidad, e.condiciones.lluvia24, e.condiciones.lluvia72, e.condiciones.lluvia7d, e.condiciones.humedad, l.pendiente, acel, t.comun.factor[dom]]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [cab.join(","), ...filasCsv].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "BENNETT_laderas.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const columnas: [Orden, string][] = [
    ["nombre", t.comun.ladera],
    ["indice", t.comun.indiceCorto],
    ["velocidad", t.comun.velocidad],
    ["lluvia7d", t.sim.l7d],
    ["humedad", t.sim.humedadEst],
    ["pendiente", t.mapa.pendiente],
  ];

  return (
    <div className="contenedor-ancho vista-pad">
      <header className="vista-cabeza">
        <p className="eyebrow">{t.nav.analisis}</p>
        <h1 className="vista-titulo">{t.an.titulo}</h1>
        <p className="vista-sub">{t.an.sub}</p>
      </header>

      {/* resumen */}
      <h2 className="bloque-tit">{t.an.resumen}</h2>
      <div className="resumen-grid">
        {(
          [
            ["map", String(LADERAS.length), t.an.r.laderas],
            ["satellite", String(ADQUISICIONES.length), t.an.r.adquisiciones],
            ["target", totalPuntos.toLocaleString(lang === "es" ? "es-BO" : "en-US"), t.an.r.puntos],
            ["layers", "05", t.an.r.variables],
            ["clock", fecha(ULTIMA_ADQUISICION, lang, true), t.an.r.ultima],
          ] as const
        ).map(([ic, v, et]) => (
          <div className="resumen" key={et}>
            <span className="resumen-ic">
              <Icon n={ic} size={20} />
            </span>
            <b>{v}</b>
            <span>{et}</span>
          </div>
        ))}
      </div>

      <div className="an-grid-2">
        <section className="tarjeta">
          <h3 className="t-tit">{t.an.distribucion}</h3>
          <div className="dist">
            <Donut
              partes={NIVELES.map((n) => ({ valor: cuenta(n), color: COLOR_NIVEL[n], etiqueta: t.comun.nivel[n] }))}
              centro={
                <>
                  <b>{LADERAS.length}</b>
                  <span>{t.comun.laderas}</span>
                </>
              }
            />
            <ul className="dist-lista">
              {NIVELES.map((n) => (
                <li key={n}>
                  <button type="button" aria-pressed={filtro === n} onClick={() => setFiltro(filtro === n ? "todas" : n)}>
                    <i style={{ background: COLOR_NIVEL[n] }} />
                    <span>
                      <strong>{t.comun.nivel[n]}</strong>
                      <small>{t.comun.accion[n]}</small>
                    </span>
                    <b>{cuenta(n)}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <h3 className="t-tit t-tit-esp">{t.an.indicadores}</h3>
          <div className="ind-grid">
            <div>
              <b>{num(prom((x) => x.e.velocidad), lang)}</b>
              <span>
                {t.an.promVel} ({t.comun.mmMes})
              </span>
            </div>
            <div>
              <b>{num(prom((x) => x.e.condiciones.lluvia7d), lang)} mm</b>
              <span>{t.an.promLluvia}</span>
            </div>
            <div>
              <b>{num(prom((x) => x.e.condiciones.humedad), lang, 3)}</b>
              <span>{t.an.promHum} (m³/m³)</span>
            </div>
            <div>
              <b>{num(prom((x) => x.e.indice), lang, 0)}/100</b>
              <span>{t.an.promInd}</span>
            </div>
          </div>
        </section>

        <section className="tarjeta">
          <h3 className="t-tit">{t.an.dispersion}</h3>
          <p className="pl-sub">{t.an.dispersionSub}</p>
          <Dispersion
            ejeX={t.an.ejeX}
            ejeY={t.an.ejeY}
            onClick={(id) => irA("mapa", id)}
            puntos={filas.map(({ l, e }) => ({
              id: l.id,
              x: e.condiciones.lluvia7d,
              y: e.velocidad,
              r: 4 + (l.pendiente - 20) / 2.4,
              color: COLOR_NIVEL[e.nivel],
              etiqueta: `${l.nombre} · ${t.comun.indiceCorto} ${e.indice}`,
            }))}
          />
        </section>
      </div>

      {/* comparación */}
      <section className="tarjeta">
        <div className="tabla-cabeza">
          <h3 className="t-tit">{t.an.comparacion}</h3>
          <div className="tabla-filtros">
            <div className="segmentado segmentado-chico">
              <button type="button" aria-pressed={filtro === "todas"} onClick={() => setFiltro("todas")}>
                {t.comun.todas}
              </button>
              {NIVELES.map((n) => (
                <button key={n} type="button" aria-pressed={filtro === n} onClick={() => setFiltro(n)}>
                  {t.comun.nivel[n]}
                </button>
              ))}
            </div>
            <button className="btn btn-secundario btn-chico" type="button" onClick={descargarCsv}>
              <Icon n="download" size={16} /> {t.an.descargarCsv}
            </button>
          </div>
        </div>
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr>
                <th>#</th>
                {columnas.map(([k, et]) => (
                  <th key={k}>
                    <button type="button" className={`th-orden ${orden === k ? "activo" : ""}`} onClick={() => setOrden(k)}>
                      {et} {orden === k ? "↓" : ""}
                    </button>
                  </th>
                ))}
                <th>{t.an.tendencia}</th>
                <th>{t.an.factorPrincipal}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordenadas.map(({ l, e, dom }, k) => (
                <tr key={l.id}>
                  <td className="td-num">{k + 1}</td>
                  <td>
                    <strong>{l.nombre}</strong>
                    <small className="td-sub">{l.macro}</small>
                  </td>
                  <td>
                    <div className="td-indice">
                      <span className="nivel-pildora" style={{ background: COLOR_NIVEL[e.nivel] }}>
                        {e.indice}
                      </span>
                      <div className="mini-pista">
                        <i style={{ width: `${e.indice}%`, background: COLOR_NIVEL[e.nivel] }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    {num(e.velocidad, lang)} <small>{t.comun.mmMes}</small>
                  </td>
                  <td>{num(e.condiciones.lluvia7d, lang)} mm</td>
                  <td>{num(e.condiciones.humedad, lang, 3)}</td>
                  <td>{l.pendiente}°</td>
                  <td>
                    <Sparkline valores={l.observaciones.map((o) => o.desp)} color={COLOR_NIVEL[e.nivel]} ancho={84} />
                  </td>
                  <td>{t.comun.factor[dom]}</td>
                  <td className="td-acciones">
                    <button type="button" className="btn-icono" title={t.comun.verMapa} onClick={() => irA("mapa", l.id)}>
                      <Icon n="map" size={16} />
                    </button>
                    <button type="button" className="btn-icono" title={t.comun.simular} onClick={() => irA("simulador", l.id)}>
                      <Icon n="sliders" size={16} />
                    </button>
                    <button type="button" className="btn-icono" title={t.comun.reporte} onClick={() => abrirReporte(l, lang)}>
                      <Icon n="file" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="an-grid-2">
        {/* priorización */}
        <section className="tarjeta">
          <h3 className="t-tit">{t.an.prioridad}</h3>
          <p className="pl-sub">{t.an.prioridadSub}</p>
          <ol className="prioridad">
            {prioridad.map(({ l, e, dom, acel }, k) => (
              <li key={l.id}>
                <span className="prio-num" style={{ background: COLOR_NIVEL[e.nivel] }}>
                  {k + 1}
                </span>
                <div className="prio-cuerpo">
                  <strong>{l.nombre}</strong>
                  <small>
                    {t.an.factorPrincipal}: {t.comun.factor[dom]} · {lang === "es" ? "aceleración" : "acceleration"} ×{num(acel, lang, 2)}
                  </small>
                </div>
                <div className="prio-accion">
                  <span style={{ color: COLOR_NIVEL[e.nivel] }}>{t.comun.accion[e.nivel]}</span>
                  <b>{e.indice}/100</b>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* recomendaciones */}
        <section className="tarjeta">
          <h3 className="t-tit">{t.an.recomendaciones}</h3>
          <div className="recs">
            {NIVELES.map((n) => (
              <div className="rec" key={n} style={{ borderColor: COLOR_NIVEL[n] }}>
                <div className="rec-cabeza">
                  <span className="nivel-pildora" style={{ background: COLOR_NIVEL[n] }}>
                    {t.comun.nivel[n]}
                  </span>
                  <strong>{t.comun.accion[n]}</strong>
                  <small>
                    {cuenta(n)} {t.comun.laderas}
                  </small>
                </div>
                <ul>
                  {t.an.rec[n].map((r) => (
                    <li key={r}>
                      <Icon n="check" size={14} /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="an-grid-2">
        <section className="tarjeta tarjeta-reporte">
          <span className="rep-icono">
            <Icon n="file" size={26} />
          </span>
          <h3 className="t-tit">{t.an.reporteSel}</h3>
          <p className="pl-sub">{t.an.reporteSub}</p>
          <div className="rep-fila">
            <select className="select" value={repId} onChange={(e) => setRepId(e.target.value)} aria-label={t.comun.seleccionar}>
              {LADERAS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <button className="btn btn-primario" type="button" onClick={() => abrirReporte(LADERAS.find((l) => l.id === repId)!, lang)}>
              <Icon n="print" size={17} /> {t.an.generar}
            </button>
          </div>
          <small className="pl-sub">{t.an.abrirReporte}</small>
        </section>

        <section className="tarjeta">
          <h3 className="t-tit">
            {t.an.nisarVivo}{" "}
            <span className={`chip-vivo mini ${vivo.nisar.estado}`}>
              {vivo.nisar.estado === "ok" ? t.comun.enVivo : vivo.nisar.estado === "cargando" ? t.comun.cargando : t.comun.sinConexion}
            </span>
          </h3>
          {vivo.nisar.estado === "ok" && vivo.nisar.pasadas.length ? (
            <ul className="pasadas">
              {vivo.nisar.pasadas.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Icon n="satellite" size={16} />
                  <div>
                    <strong>{fecha(p.fecha, lang, true)}</strong>
                    <small title={p.id}>{p.id}</small>
                  </div>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer">
                      ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-sub">{vivo.nisar.estado === "cargando" ? t.comun.cargando : t.an.nisarVacio}</p>
          )}
          <p className="nota-demo">{t.comun.demo}</p>
        </section>
      </div>
    </div>
  );
}
