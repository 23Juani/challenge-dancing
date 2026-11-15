import { DICCIONARIOS, fecha, num } from "./i18n";
import {
  type Ladera,
  type Lang,
  GEOLOGIA,
  COLOR_NIVEL,
  evaluar,
  aceleracion,
  velocidadReciente,
  PESOS,
  type Factor,
} from "./laderas";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function cardinal(grados: number, lang: Lang) {
  const es = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const en = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return (lang === "es" ? es : en)[Math.round(((grados % 360) / 45)) % 8];
}

export function factorDominante(l: Ladera): Factor {
  const e = evaluar(l);
  return (Object.keys(PESOS) as Factor[]).sort((a, b) => e.aportes[b] - e.aportes[a])[0];
}

function graficoSvg(l: Ladera) {
  const o = l.observaciones;
  const w = 640;
  const h = 180;
  const min = Math.min(...o.map((x) => x.desp), 0);
  const x = (i: number) => 40 + (i / (o.length - 1)) * (w - 60);
  const y = (v: number) => 16 + ((0 - v) / (0 - min || 1)) * (h - 40);
  const d = o.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.desp).toFixed(1)}`).join("");
  const puntos = o.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.desp)}" r="3.5" fill="#fff" stroke="#1e6fb8" stroke-width="2"/>`).join("");
  const ticks = [0, min / 2, min].map((v) => `<text x="34" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="#64748b">${v.toFixed(0)}</text><line x1="40" x2="${w - 20}" y1="${y(v)}" y2="${y(v)}" stroke="#e2e8f0"/>`).join("");
  return `<svg width="100%" viewBox="0 0 ${w} ${h}">${ticks}<path d="${d}" fill="none" stroke="#1e6fb8" stroke-width="2.5"/>${puntos}</svg>`;
}

export function generarReporteHTML(l: Ladera, lang: Lang) {
  const t = DICCIONARIOS[lang];
  const e = evaluar(l);
  const c = e.condiciones;
  const g = GEOLOGIA[l.geo];
  const hoy = new Date().toLocaleString(lang === "es" ? "es-BO" : "en-GB");
  const fila = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`;
  const aportes = (Object.keys(PESOS) as Factor[])
    .map((f) => `<div class="ap"><span>${esc(t.comun.factor[f])}</span><div class="pista"><i style="width:${(e.aportes[f] / (PESOS[f] * 100)) * 100}%"></i></div><b>${num(e.aportes[f], lang)}</b></div>`)
    .join("");
  const recs = t.an.rec[e.nivel].map((r) => `<li>${esc(r)}</li>`).join("");
  const filasObs = l.observaciones
    .map((o) => `<tr><td>${fecha(o.fecha, lang, true)}</td><td>${num(o.desp, lang)} mm</td><td>${num(o.lluvia12, lang)} mm</td><td>${o.humedad == null ? t.mapa.sinDato : num(o.humedad, lang, 3)}</td><td>${num(o.coherencia, lang, 2)}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>BENNETT · ${esc(l.nombre)}</title>
<style>
body{font-family:"Plus Jakarta Sans",Inter,system-ui,sans-serif;color:#0f1e33;margin:0;background:#f4f7fb}
.hoja{max-width:820px;margin:24px auto;background:#fff;padding:40px 48px;border-radius:16px;box-shadow:0 10px 40px #0b2a4a14}
header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b2a4a;padding-bottom:16px;margin-bottom:22px}
h1{font-size:26px;margin:4px 0 0}h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:#1e6fb8;margin:26px 0 10px}
small{color:#64748b}.nivel{display:inline-block;padding:6px 14px;border-radius:99px;color:#fff;font-weight:700;background:${COLOR_NIVEL[e.nivel]}}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #e8eef5}th{color:#475569;font-weight:600;width:42%}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.kpi{background:#f4f8fc;border-radius:12px;padding:12px}.kpi b{display:block;font-size:22px}.kpi span{font-size:11.5px;color:#475569}
.ap{display:grid;grid-template-columns:140px 1fr 40px;gap:10px;align-items:center;font-size:13px;margin:6px 0}.pista{height:8px;background:#eef2f7;border-radius:9px}.pista i{display:block;height:100%;background:#1e6fb8;border-radius:9px}
.obs th{width:auto}ul{padding-left:18px}li{margin:6px 0}.nota{font-size:11.5px;color:#64748b;border-top:1px solid #e2e8f0;margin-top:26px;padding-top:12px}
@media print{body{background:#fff}.hoja{box-shadow:none;margin:0;padding:12px}.noprint{display:none}}
button{background:#0b2a4a;color:#fff;border:0;border-radius:10px;padding:10px 16px;font-weight:600;cursor:pointer}
</style></head><body><div class="hoja">
<header><div><small>BENNETT · NASA Space Apps Challenge 2026</small><h1>${esc(t.rep.titulo)}: ${esc(l.nombre)}</h1><small>${esc(t.rep.generado)}: ${esc(hoy)}</small></div>
<div style="text-align:right"><span class="nivel">${esc(t.comun.nivel[e.nivel])} · ${e.indice}/100</span><p><small>${esc(t.comun.accion[e.nivel])}</small></p><button class="noprint" onclick="print()">🖨 PDF</button></div></header>
<h2>${esc(t.rep.caracterizacion)}</h2><table>
${fila(t.comun.macro, l.macro)}
${fila(t.mapa.ubicacion, `${l.lat.toFixed(4)}°, ${l.lon.toFixed(4)}°`)}
${fila(t.mapa.superficie, `${l.areaHa} ha`)}
${fila(t.mapa.pendiente, `${l.pendiente}°`)}
${fila(t.mapa.elevacion, `${l.elev} m`)}
${fila(t.mapa.orientacion, cardinal(l.rumbo, lang))}
${fila(t.mapa.contexto, g[lang])}
</table>
<h2>${esc(t.rep.indicadores)}</h2>
<div class="kpis"><div class="kpi"><b>${num(velocidadReciente(l), lang)}</b><span>${esc(t.comun.velocidad)} (${t.comun.mmMes})</span></div>
<div class="kpi"><b>${num(c.lluvia72, lang)} mm</b><span>${esc(t.sim.l72)}</span></div>
<div class="kpi"><b>${num(c.lluvia7d, lang)} mm</b><span>${esc(t.sim.l7d)}</span></div>
<div class="kpi"><b>${num(c.humedad, lang, 2)}</b><span>${esc(t.sim.humedadEst)} (m³/m³)</span></div></div>
<p style="font-size:13px;margin-top:14px"><b>${esc(t.comun.indice)}:</b> ${e.indice}/100 · ${lang === "es" ? "aceleración" : "acceleration"} ×${num(aceleracion(l), lang, 2)}</p>
${aportes}
<h2>${esc(t.rep.evolucion)}</h2>${graficoSvg(l)}
<table class="obs"><tr><th>${esc(t.mapa.tFecha)}</th><th>${esc(t.mapa.tDesp)}</th><th>${esc(t.mapa.tLluvia)}</th><th>${esc(t.mapa.tHum)}</th><th>${esc(t.mapa.tCoh)}</th></tr>${filasObs}</table>
<h2>${esc(t.rep.recomendaciones)}</h2><ul>${recs}</ul>
<p class="nota">${esc(t.rep.nota)} ${esc(t.comun.demo)}</p>
</div></body></html>`;
}

export function abrirReporte(l: Ladera, lang: Lang) {
  const html = generarReporteHTML(l, lang);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `BENNETT_${l.id}.html`;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
