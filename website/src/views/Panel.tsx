import type { Datos } from "../App";
import { COLOR, ETIQUETA, formatearFecha } from "../data";

export default function Panel({ datos }: { datos: Datos }) {
  const r = datos.riesgo;
  const alertas = r.filter((z) => z.nivel === "alerta").length;
  const acelerando = datos.puntos.filter((p) => p.a !== null && p.a >= 1.4 && p.coh !== null && p.coh >= datos.cohMin).length;
  const pasadas = datos.nisar.estado === "ok" ? datos.nisar.pasadas : [];

  function exportarCSV() {
    const filas = [["zona", "desplazamiento_mm_mes", "lluvia_24h_mm", "indice", "nivel"]];
    r.forEach((z) => filas.push([z.nombre, String(z.velocidad), String(z.lluvia24), String(z.indice), z.nivelBackend]));
    const blob = new Blob([filas.map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bennett_zonas.csv";
    a.click();
  }

  return (
    <div className="panel-page">
      <div className="panel-top">
        <div>
          <h1>Resumen de la ciudad</h1>
          <p className="muted">
            {pasadas[0] ? `Última pasada NISAR: ${formatearFecha(pasadas[0].fecha)}` : "Sin pasadas NISAR cargadas"} · Datos de movimiento: {datos.fuentePuntos}
          </p>
        </div>
        <div className="row-gap">
          <button type="button" className="ghost-button" onClick={exportarCSV}>Exportar CSV</button>
          <a className="primary-button" href="#control">Abrir centro de control</a>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi"><span>Zonas monitoreadas</span><strong>{r.length}</strong></div>
        <div className="kpi"><span>Zonas en alerta</span><strong style={{ color: COLOR.alerta }}>{alertas}</strong></div>
        <div className="kpi"><span>Puntos que aceleraron</span><strong style={{ color: COLOR.precaucion }}>{datos.puntos.some((p) => p.a !== null) ? acelerando.toLocaleString("es-BO") : "s/d"}</strong></div>
        <div className="kpi"><span>Lluvia 72 h / pronóstico</span><strong>{datos.lluvia.estado === "ok" ? `${datos.lluvia.pasado72} / ${datos.lluvia.futuro72} mm` : "s/d"}</strong></div>
      </div>

      <div className="panel-grid">
        <section className="panel-box">
          <h2>Ranking de zonas</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Zona</th><th>Desplazamiento</th><th>Lluvia 24 h</th><th>Índice</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {r.map((z) => (
                  <tr key={z.id}>
                    <td>{z.nombre}</td>
                    <td>{z.velocidad} mm/mes</td>
                    <td>{z.lluvia24} mm</td>
                    <td>
                      <div className="bar"><i style={{ width: `${z.indice}%`, background: COLOR[z.nivel] }} /></div>
                      {z.indice}
                    </td>
                    <td style={{ color: COLOR[z.nivel], fontWeight: 700 }}>{z.nivelBackend === "critico" ? "Crítico" : ETIQUETA[z.nivel]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-box">
          <h2>Pasadas NISAR recientes</h2>
          {pasadas.length === 0 && <p className="muted">{datos.nisar.estado === "cargando" ? "Consultando NASA ASF…" : "Sin pasadas disponibles."}</p>}
          <ul className="pass-list">
            {pasadas.slice(0, 8).map((p) => (
              <li key={p.id + p.fecha}>
                <div>
                  <strong>{formatearFecha(p.fecha)}</strong>
                  <span>{[p.nivel, p.track && `track ${p.track}`, p.frame && `frame ${p.frame}`].filter(Boolean).join(" · ") || p.id}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
