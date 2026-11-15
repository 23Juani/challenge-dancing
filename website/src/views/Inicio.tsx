import { LOGO } from "../App";
import { useLang } from "../i18n";
import Icon from "../components/Icon";
import { LADERAS, evaluar, COLOR_NIVEL } from "../laderas";

const BASE = import.meta.env.BASE_URL;

const EQUIPO = [
  { nombre: "Samuel Andrés Castañeta Argollo", rol: "cs", foto: "team/samuel.jpg" },
  { nombre: "Juan Gabriel Tantani Patti", rol: "cs", foto: "team/juan.jpg" },
  { nombre: "Carla Torrez Mamani", rol: "ele", foto: "team/carla.jpg" },
  { nombre: "Jhoselin Daniela Pinto Quintana", rol: "ind", foto: "team/jhoselin.jpg" },
] as const;

export default function Inicio() {
  const { t } = useLang();
  const i = t.inicio;
  const top = LADERAS.map((l) => ({ l, e: evaluar(l) })).sort((a, b) => b.e.indice - a.e.indice)[0];

  return (
    <>
      {/* ---------- 1. PRESENTACIÓN ---------- */}
      <section className="hero" id="presentacion">
        <div className="hero-fondo" aria-hidden="true">
          <Contornos />
        </div>
        <div className="hero-grid contenedor">
          <div className="hero-texto">
            <p className="evento">
              <span className="evento-punto" /> {i.evento}
            </p>
            <p className="desafio-chip">
              <span>{i.desafio}</span> DANCING WITH THE SARS
            </p>
            <h1>{i.titulo}</h1>
            <p className="hero-frase">{i.frase}</p>
            <div className="hero-cta">
              <a className="btn btn-primario" href="#control">
                {i.ctaMapa} <Icon n="arrow" size={18} />
              </a>
              <a className="btn btn-secundario" href="#desafio">
                {i.ctaDesafio}
              </a>
            </div>
            <dl className="hero-stats">
              {i.stats.map(([n, txt]) => (
                <div key={txt}>
                  <dt>{n}</dt>
                  <dd>{txt}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="hero-visual">
            <div className="orbita orbita-1" aria-hidden="true">
              <span className="sat-punto" />
            </div>
            <div className="orbita orbita-2" aria-hidden="true">
              <span className="sat-punto" />
            </div>
            <img className="hero-logo" src={LOGO} alt="Logotipo de BENNETT" />
            <div className="flotante flotante-a">
              <span className="flot-et">
                <i style={{ background: COLOR_NIVEL[top.e.nivel] }} /> {t.comun.nivel[top.e.nivel]}
              </span>
              <strong>{top.l.nombre}</strong>
              <small>
                {t.comun.indiceCorto} {top.e.indice}/100 · {top.e.velocidad} {t.comun.mmMes}
              </small>
            </div>
            <div className="flotante flotante-b">
              <Icon n="satellite" size={18} />
              <div>
                <strong>NISAR · GUNW</strong>
                <small>{i.lugar}</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2. EL DESAFÍO QUE ESTAMOS RESOLVIENDO ---------- */}
      <section className="seccion" id="problema">
        <div className="contenedor">
          <header className="sec-cabeza">
            <p className="eyebrow">{i.s2Eyebrow}</p>
            <h2>{i.s2Titulo}</h2>
            <p className="sec-intro">{i.s2Intro}</p>
          </header>
          <div className="comparacion">
            <article className="comp-col comp-hoy">
              <p className="comp-etiqueta">
                <Icon n="unlink" size={16} /> {i.hoyEtiqueta}
              </p>
              <h3>{i.hoyTitulo}</h3>
              <DiagramaFragmentado />
              <ul className="comp-lista">
                {i.hoy.map(([tit, txt], k) => (
                  <li key={tit} className={k === i.hoy.length - 1 ? "destacado" : ""}>
                    <Icon n={["database", "split", "layers", "clock", "alert", "alert"][k]} size={18} />
                    <div>
                      <strong>{tit}</strong>
                      <span>{txt}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
            <div className="comp-flecha" aria-hidden="true">
              <Icon n="arrow" size={26} />
            </div>
            <article className="comp-col comp-ben">
              <p className="comp-etiqueta">
                <Icon n="link" size={16} /> {i.benEtiqueta}
              </p>
              <h3>{i.benTitulo}</h3>
              <DiagramaIntegrado />
              <ul className="comp-lista">
                {i.ben.map(([tit, txt], k) => (
                  <li key={tit}>
                    <Icon n={["link", "layers", "chart", "gauge", "target"][k]} size={18} />
                    <div>
                      <strong>{tit}</strong>
                      <span>{txt}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <blockquote className="cierre-banda">
            <Icon n="check" size={22} />
            <p>{i.s2Cierre}</p>
          </blockquote>
        </div>
      </section>

      {/* ---------- 3. EL DESAFÍO QUE ELEGIMOS ---------- */}
      <section className="seccion seccion-tinte" id="desafio">
        <div className="contenedor">
          <div className="desafio-grid">
            <div>
              <p className="eyebrow">{i.s3Eyebrow}</p>
              <h2 className="titulo-sar">{i.s3Titulo}</h2>
              <p className="sec-intro">{i.s3Intro}</p>
              <dl className="nisar-datos">
                {i.nisarDatos.map(([n, txt]) => (
                  <div key={txt}>
                    <dt>{n}</dt>
                    <dd>{txt}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <figure className="nisar-figura">
              <IlustracionNisar />
              <figcaption>{i.nisarPie}</figcaption>
            </figure>
          </div>

          <h3 className="sub-titulo">{i.fuentesTitulo}</h3>
          <div className="fuentes-grid">
            {i.fuentes.map(([nom, tipo, txt], k) => (
              <article key={nom} className={`fuente ${k < 2 ? "fuente-nisar" : ""}`}>
                <span className="fuente-icono">
                  <Icon n={["satellite", "drop", "alert", "rain", "mountain"][k]} size={20} />
                </span>
                <p className="fuente-tipo">{tipo}</p>
                <h4>{nom}</h4>
                <p>{txt}</p>
              </article>
            ))}
          </div>

          <h3 className="sub-titulo">{i.etapasTitulo}</h3>
          <ol className="etapas">
            {i.etapas.map(([tit, txt], k) => (
              <li key={tit}>
                <span className="etapa-num">{String(k + 1).padStart(2, "0")}</span>
                <span className="etapa-icono">
                  <Icon n={["database", "layers", "chart", "gauge"][k]} size={22} />
                </span>
                <h4>{tit}</h4>
                <p>{txt}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- 4. NUESTRO IMPACTO ---------- */}
      <section className="seccion" id="impacto">
        <div className="contenedor">
          <header className="sec-cabeza">
            <p className="eyebrow">{i.s4Eyebrow}</p>
            <h2>{i.s4Titulo}</h2>
            <p className="sec-intro">{i.s4Sub}</p>
          </header>
          <p className="nota-meta">
            <Icon n="target" size={16} /> {i.s4Nota}
          </p>
          <div className="kpi-grid">
            <article className="kpi">
              <KpiCabeza n={i.kpis[0][0]} tit={i.kpis[0][1]} txt={i.kpis[0][2]} />
              <MiniMacros titulo={i.kpiMacros} />
            </article>
            <article className="kpi">
              <KpiCabeza n={i.kpis[1][0]} tit={i.kpis[1][1]} txt={i.kpis[1][2]} />
              <MiniFuentes titulo={i.kpiFuentes} tipos={i.kpiFuentesTipos} />
            </article>
            <article className="kpi">
              <KpiCabeza n={i.kpis[2][0]} tit={i.kpis[2][1]} txt={i.kpis[2][2]} />
              <div className="variables-chips">
                {(["desplazamiento", "precipitacion", "humedad", "pendiente", "geologia"] as const).map((f, k) => (
                  <span key={f}>
                    <Icon n={["satellite", "rain", "drop", "mountain", "rock"][k]} size={15} /> {t.comun.factor[f]}
                  </span>
                ))}
              </div>
            </article>
            <article className="kpi">
              <KpiCabeza n={i.kpis[3][0]} tit={i.kpis[3][1]} txt={i.kpis[3][2]} />
              <MiniReporte />
            </article>
          </div>

          <h3 className="sub-titulo">{i.dimTitulo}</h3>
          <div className="dims-grid">
            {i.dims.map(([tit, txt], k) => (
              <article key={tit} className="dim">
                <span className={`dim-icono dim-${k}`}>
                  <Icon n={["users", "building", "cpu", "leaf"][k]} size={22} />
                </span>
                <h4>{tit}</h4>
                <p>{txt}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 5. EQUIPO ---------- */}
      <section className="seccion seccion-tinte" id="equipo">
        <div className="contenedor">
          <header className="sec-cabeza centrado">
            <p className="eyebrow">{i.s5Eyebrow}</p>
            <h2>{i.s5Titulo}</h2>
          </header>
          <div className="equipo-grid">
            {EQUIPO.map((p) => (
              <article key={p.nombre} className="miembro">
                <div className="miembro-foto">
                  <img src={`${BASE}${p.foto}`} alt={p.nombre} />
                </div>
                <h3>{p.nombre}</h3>
                <p>{i.roles[p.rol]}</p>
              </article>
            ))}
          </div>
          <figure className="cita">
            <span aria-hidden="true">“</span>
            <blockquote>{i.cita}</blockquote>
          </figure>
        </div>
      </section>
    </>
  );
}

function KpiCabeza({ n, tit, txt }: { n: string; tit: string; txt: string }) {
  return (
    <>
      <p className="kpi-num">{n}</p>
      <h4>{tit}</h4>
      <p className="kpi-txt">{txt}</p>
    </>
  );
}

function MiniMacros({ titulo }: { titulo: string }) {
  const cuenta = LADERAS.reduce<Record<string, number>>((acc, l) => ((acc[l.macro] = (acc[l.macro] ?? 0) + 1), acc), {});
  const filas = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...filas.map((f) => f[1]));
  return (
    <div className="mini-viz">
      <p>{titulo}</p>
      {filas.map(([m, n]) => (
        <div className="mini-barra" key={m}>
          <span>{m}</span>
          <div>
            <i style={{ width: `${(n / max) * 100}%` }} />
          </div>
          <b>{n}</b>
        </div>
      ))}
    </div>
  );
}

function MiniFuentes({ titulo, tipos }: { titulo: string; tipos: string[] }) {
  const colores = ["#1e6fb8", "#4fa3e0", "#ec7a2c", "#2fa36b"];
  const valores = [2, 1, 1, 1];
  const total = valores.reduce((a, b) => a + b, 0);
  return (
    <div className="mini-viz">
      <p>{titulo}</p>
      <div className="seg-barra">
        {valores.map((v, k) => (
          <i key={k} style={{ flex: v, background: colores[k] }} />
        ))}
      </div>
      <ul className="seg-leyenda">
        {tipos.map((tp, k) => (
          <li key={tp}>
            <i style={{ background: colores[k] }} /> {tp} <b>{Math.round((valores[k] / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniReporte() {
  return (
    <svg className="mini-reporte" viewBox="0 0 220 120" aria-hidden="true">
      <rect x="40" y="8" width="140" height="108" rx="10" fill="#fff" stroke="#d7e2ee" />
      <rect x="54" y="22" width="60" height="8" rx="4" fill="#0b2a4a" />
      <rect x="54" y="36" width="90" height="5" rx="2.5" fill="#cbd8e6" />
      <path d="M56 92 L76 80 L96 84 L116 66 L136 70 L162 50" fill="none" stroke="#1e6fb8" strokeWidth="3" strokeLinecap="round" />
      <rect x="54" y="100" width="40" height="6" rx="3" fill="#2fa36b" />
      <rect x="100" y="100" width="30" height="6" rx="3" fill="#e3b02f" />
      <rect x="136" y="100" width="26" height="6" rx="3" fill="#d6403a" />
      <circle cx="162" cy="50" r="5" fill="#d6403a" />
    </svg>
  );
}

function Contornos() {
  const lineas = Array.from({ length: 14 }, (_, k) => {
    const y = 40 + k * 46;
    return `M-50 ${y} C 200 ${y - 60 + (k % 3) * 20}, 420 ${y + 70}, 700 ${y - 10} S 1150 ${y - 80}, 1500 ${y + 20}`;
  });
  return (
    <svg viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice">
      {lineas.map((d, k) => (
        <path key={k} d={d} fill="none" stroke="#1e6fb8" strokeOpacity={0.07 + (k % 4) * 0.015} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function DiagramaFragmentado() {
  const { t } = useLang();
  const d = t.inicio.diagHoy;
  const cajas = [
    { x: 10, y: 18, et: d.satelite, ic: "#1e6fb8" },
    { x: 238, y: 30, et: d.meteo, ic: "#4fa3e0" },
    { x: 24, y: 118, et: d.geo, ic: "#b5654b" },
    { x: 242, y: 128, et: d.mapas, ic: "#2fa36b" },
  ];
  return (
    <svg className="diagrama" viewBox="0 0 380 190" role="img" aria-label={t.inicio.hoyTitulo}>
      <path d="M138 46 L238 56" className="d-roto" />
      <path d="M76 70 L84 118" className="d-roto" />
      <path d="M152 142 L242 152" className="d-roto" />
      <path d="M300 82 L304 128" className="d-roto" />
      <path d="M130 70 L242 132" className="d-roto" />
      {[[188, 51], [80, 94], [197, 147], [302, 105]].map(([x, y], k) => (
        <g key={k} transform={`translate(${x} ${y})`}>
          <circle r="9" fill="#fff" stroke="#e5a3a0" />
          <path d="M-3.5 -3.5 3.5 3.5M3.5 -3.5 -3.5 3.5" stroke="#c9534e" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      ))}
      {cajas.map((c) => (
        <g key={c.et} transform={`translate(${c.x} ${c.y})`}>
          <rect width="128" height="52" rx="12" fill="#fff" stroke="#d9dee6" />
          <circle cx="22" cy="26" r="6" fill={c.ic} opacity="0.85" />
          <text x="36" y="31" className="d-et">{c.et}</text>
        </g>
      ))}
      <text x="190" y="184" textAnchor="middle" className="d-sub">{d.sinConexion}</text>
    </svg>
  );
}

function DiagramaIntegrado() {
  const { t } = useLang();
  const d = t.inicio.diagBen;
  const fuentes = ["NISAR", "GPM", "Sentinel-1", "Geo/Topo"];
  return (
    <svg className="diagrama" viewBox="0 0 400 190" role="img" aria-label={t.inicio.benTitulo}>
      <defs>
        <linearGradient id="g-flujo" x1="0" x2="1">
          <stop offset="0" stopColor="#4fa3e0" />
          <stop offset="1" stopColor="#1e6fb8" />
        </linearGradient>
      </defs>
      {fuentes.map((f, k) => {
        const y = 18 + k * 42;
        return (
          <g key={f}>
            <rect x="6" y={y} width="78" height="30" rx="9" fill="#fff" stroke="#bcd6ef" />
            <text x="45" y={y + 19.5} textAnchor="middle" className="d-et d-et-s">{f}</text>
            <path d={`M84 ${y + 15} C 112 ${y + 15}, 112 95, 136 95`} fill="none" stroke="url(#g-flujo)" strokeWidth="2" className="d-flujo" />
          </g>
        );
      })}
      <g transform="translate(136 66)">
        <rect width="86" height="58" rx="16" fill="#0b2a4a" />
        <text x="43" y="34" textAnchor="middle" className="d-hub">BENNETT</text>
      </g>
      {[d.mapa, d.serie, d.indicador].map((et, k) => {
        const y = 18 + k * 56;
        return (
          <g key={et}>
            <path d={`M222 95 C 242 95, 242 ${y + 22}, 258 ${y + 22}`} fill="none" stroke="#1e6fb8" strokeWidth="2" className="d-flujo" />
            <rect x="258" y={y} width="138" height="44" rx="11" fill="#fff" stroke="#bcd6ef" />
            {k === 0 && (
              <g transform={`translate(266 ${y + 8})`}>
                <rect width="26" height="28" rx="5" fill="#eaf2fb" />
                <path d="M3 20 L9 11 L14 16 L19 8 L24 14" fill="none" stroke="#2fa36b" strokeWidth="1.6" />
                <circle cx="19" cy="8" r="2.5" fill="#d6403a" />
              </g>
            )}
            {k === 1 && <path d={`M266 ${y + 32} L274 ${y + 24} L281 ${y + 28} L291 ${y + 14}`} fill="none" stroke="#1e6fb8" strokeWidth="2" strokeLinecap="round" />}
            {k === 2 && (
              <g transform={`translate(266 ${y + 12})`}>
                <rect width="7" height="20" y="0" rx="2" fill="#2fa36b" />
                <rect width="7" height="14" x="9" y="6" rx="2" fill="#e3b02f" />
                <rect width="7" height="9" x="18" y="11" rx="2" fill="#d6403a" />
              </g>
            )}
            <text x="300" y={y + 26} className="d-et d-et-s">{et}</text>
          </g>
        );
      })}
    </svg>
  );
}

function IlustracionNisar() {
  return (
    <svg viewBox="0 0 520 380" className="nisar-svg" role="img" aria-label="NISAR">
      <defs>
        <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b2a4a" />
          <stop offset="1" stopColor="#1d4f80" />
        </linearGradient>
        <linearGradient id="haz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7cc4ff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="panel" x1="0" x2="1">
          <stop offset="0" stopColor="#2a4f8f" />
          <stop offset="1" stopColor="#3f79c8" />
        </linearGradient>
        <radialGradient id="fr" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff5a5f" />
          <stop offset="0.25" stopColor="#ffd166" />
          <stop offset="0.5" stopColor="#5ad48c" />
          <stop offset="0.75" stopColor="#4fa3e0" />
          <stop offset="1" stopColor="#9b6dd6" stopOpacity="0" />
        </radialGradient>
        <clipPath id="marco">
          <rect width="520" height="380" rx="22" />
        </clipPath>
      </defs>
      <g clipPath="url(#marco)">
        <rect width="520" height="380" fill="url(#cielo)" />
        {Array.from({ length: 40 }, (_, k) => (
          <circle key={k} cx={(k * 97) % 520} cy={(k * 53) % 200} r={k % 5 === 0 ? 1.4 : 0.8} fill="#fff" opacity={0.5} />
        ))}
        {/* haz radar */}
        <path d="M396 116 L176 306 L352 318 Z" fill="url(#haz)" /><path d="M396 116 L176 306 M396 116 L352 318" stroke="#9fd2ff" strokeOpacity="0.45" strokeDasharray="4 5" fill="none" />
        {/* terreno andino */}
        <path d="M0 300 L60 250 L110 278 L170 214 L215 250 L262 196 L300 238 L350 205 L405 262 L460 230 L520 268 L520 380 L0 380Z" fill="#163a5c" />
        <path d="M262 196 L280 214 L270 216 L262 207 L253 220 L246 214Z" fill="#e8f1fa" />
        <path d="M350 205 L366 222 L356 221 L349 213 L340 224Z" fill="#e8f1fa" />
        <path d="M0 320 L80 290 L160 312 L250 284 L330 306 L420 288 L520 304 L520 380 L0 380Z" fill="#1f4c73" />
        {/* franjas interferométricas */}
        <g opacity="0.85">
          <ellipse cx="262" cy="310" rx="86" ry="22" fill="url(#fr)" opacity="0.55" />
          {[70, 54, 38, 22].map((rx, k) => (
            <ellipse key={rx} cx="262" cy="310" rx={rx} ry={rx / 3.9} fill="none" stroke={["#9b6dd6", "#4fa3e0", "#5ad48c", "#ffd166"][k]} strokeWidth="2.4" opacity="0.9" />
          ))}
        </g>
        {/* satélite */}
        <g transform="translate(300 92) rotate(-12)">
          <rect x="-150" y="-12" width="120" height="24" rx="3" fill="url(#panel)" stroke="#9cc3f0" strokeWidth="1" />
          {[-130, -110, -90, -70, -50].map((x) => (
            <line key={x} x1={x} x2={x} y1="-12" y2="12" stroke="#9cc3f0" strokeOpacity="0.6" />
          ))}
          <line x1="-30" y1="0" x2="-14" y2="0" stroke="#cfd8e3" strokeWidth="3" />
          <rect x="-14" y="-18" width="34" height="36" rx="4" fill="#e9b949" stroke="#b88a1f" />
          <rect x="-8" y="-12" width="22" height="10" rx="2" fill="#fff4d1" opacity="0.7" />
          <line x1="20" y1="0" x2="70" y2="26" stroke="#cfd8e3" strokeWidth="3" />
          <g transform="translate(92 38) rotate(28)">
            <ellipse rx="44" ry="15" fill="#d9e4ef" stroke="#ffffff" strokeWidth="1.5" />
            <ellipse rx="33" ry="11" fill="none" stroke="#a8b9cb" />
            <ellipse rx="20" ry="6.5" fill="none" stroke="#a8b9cb" />
            {Array.from({ length: 12 }, (_, k) => {
              const a = (k / 12) * Math.PI * 2;
              return <line key={k} x1="0" y1="0" x2={Math.cos(a) * 44} y2={Math.sin(a) * 15} stroke="#a8b9cb" strokeWidth="0.8" />;
            })}
          </g>
        </g>
        <text x="24" y="40" fill="#cfe6ff" fontSize="13" letterSpacing="3" fontWeight="600">NASA · ISRO</text>
        <text x="24" y="66" fill="#fff" fontSize="26" fontWeight="700" letterSpacing="1">NISAR</text>
        <g transform="translate(24 340)">
          <rect width="150" height="24" rx="12" fill="#ffffff22" />
          <circle cx="14" cy="12" r="4" fill="#5ad48c" />
          <text x="26" y="16.5" fill="#fff" fontSize="11.5">SAR · L-band 24 cm</text>
        </g>
      </g>
    </svg>
  );
}
