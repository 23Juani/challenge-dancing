import { useEffect, useState } from "react";
import heroImage from "./la-paz-hero.jpg";
import "./app.css";
import {
  cargarLluvia,
  cargarNisar,
  type EstadoNisar,
  type Lluvia,
  type PuntoInsar,
  type RiesgoZona,
  COLOR,
  ETIQUETA,
  formatearFecha,
} from "./data";
import { actualizarAlerta, cargarBackend, conectarAlertas } from "./api";
import CentroControl from "./views/CentroControl";
import Simulador from "./views/Simulador";
import MiZona from "./views/MiZona";
import Panel from "./views/Panel";

export type Datos = {
  puntos: PuntoInsar[];
  fuentePuntos: string;
  setPuntos: (p: PuntoInsar[], fuente: string) => void;
  nisar: EstadoNisar;
  lluvia: Lluvia;
  riesgo: RiesgoZona[];
  cohMin: number;
  setCohMin: (v: number) => void;
  backend: { estado: "cargando" | "ok" | "error"; mensaje: string; enVivo: boolean };
};

const RUTAS = ["inicio", "control", "simulador", "zona", "panel"] as const;
type Ruta = (typeof RUTAS)[number];

function rutaActual(): Ruta {
  const h = window.location.hash.replace("#", "") as Ruta;
  return (RUTAS as readonly string[]).includes(h) ? h : "inicio";
}

export const Arrow = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true">
    <path d="M3.75 9h10.5M10.5 5.25 14.25 9l-3.75 3.75" />
  </svg>
);

export const Signal = () => <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" aria-hidden="true" />;

export default function App() {
  const [ruta, setRuta] = useState<Ruta>(rutaActual());
  const [puntos, setPuntosState] = useState<PuntoInsar[]>([]);
  const [fuentePuntos, setFuente] = useState("cargando…");
  const [nisar, setNisar] = useState<EstadoNisar>({ estado: "cargando" });
  const [lluvia, setLluvia] = useState<Lluvia>({ estado: "cargando", pasado72: 0, futuro72: 0, horas: [] });
  const [cohMin, setCohMin] = useState(0.3);
  const [riesgo, setRiesgo] = useState<RiesgoZona[]>([]);
  const [backend, setBackend] = useState<Datos["backend"]>({ estado: "cargando", mensaje: "", enVivo: false });

  useEffect(() => {
    const alCambiar = () => {
      setRuta(rutaActual());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  useEffect(() => {
    cargarNisar().then(setNisar);
    cargarLluvia().then(setLluvia);
    let cancelado = false;
    let desconectar: (() => void) | undefined;
    cargarBackend().then((resultado) => {
      if (cancelado) return;
      setPuntosState(resultado.puntos);
      setFuente(resultado.fuente);
      setRiesgo(resultado.riesgo);
      setBackend({ estado: "ok", mensaje: "", enVivo: false });
      desconectar = conectarAlertas(
        (alerta) => setRiesgo((anterior) => actualizarAlerta(anterior, alerta)),
        (enVivo) => setBackend((anterior) => ({ ...anterior, enVivo })),
      );
    }).catch((error: unknown) => {
      if (cancelado) return;
      setFuente("sin datos del backend");
      setBackend({ estado: "error", mensaje: error instanceof Error ? error.message : String(error), enVivo: false });
    });
    return () => {
      cancelado = true;
      desconectar?.();
    };
  }, []);

  const datos: Datos = {
    puntos,
    fuentePuntos,
    setPuntos: (p, f) => {
      setPuntosState(p);
      setFuente(f);
    },
    nisar,
    lluvia,
    riesgo,
    cohMin,
    setCohMin,
    backend,
  };

  if (ruta === "inicio") return <Landing datos={datos} />;
  return (
    <div className="app-shell">
      <BarraApp ruta={ruta} datos={datos} />
      {ruta === "control" && <CentroControl datos={datos} />}
      {ruta === "simulador" && <Simulador datos={datos} />}
      {ruta === "zona" && <MiZona datos={datos} />}
      {ruta === "panel" && <Panel datos={datos} />}
    </div>
  );
}

function BarraApp({ ruta, datos }: { ruta: Ruta; datos: Datos }) {
  const n = datos.nisar;
  return (
    <header className="app-bar">
      <a className="brand" href="#inicio" aria-label="BENNETT, inicio">
        <Signal />
        <span>BENNETT</span>
      </a>
      <nav className="app-nav" aria-label="Secciones">
        <a href="#control" aria-current={ruta === "control" ? "page" : undefined}>Centro de control</a>
        <a href="#simulador" aria-current={ruta === "simulador" ? "page" : undefined}>Simulador 3D</a>
        <a href="#zona" aria-current={ruta === "zona" ? "page" : undefined}>Mi zona</a>
        <a href="#panel" aria-current={ruta === "panel" ? "page" : undefined}>Autoridades</a>
      </nav>
      <div className="app-status">
        <span className={`chip ${datos.backend.estado === "error" ? "chip-err" : datos.backend.enVivo ? "chip-ok" : ""}`} title={datos.backend.mensaje}>
          <i /> {datos.backend.estado === "cargando" ? "Backend: conectando…" : datos.backend.estado === "error" ? "Backend: sin conexión" : datos.backend.enVivo ? "Backend: en vivo" : "Backend: alertas desconectadas"}
        </span>
        <span className={`chip ${n.estado === "ok" ? "chip-ok" : n.estado === "error" ? "chip-err" : ""}`}>
          <i />
          {n.estado === "cargando" && "NISAR: conectando…"}
          {n.estado === "ok" && `NISAR · ${n.pasadas.length} pasadas (${n.fuente})`}
          {n.estado === "error" && "NISAR: sin conexión"}
        </span>
        <span className="chip">
          Lluvia 72 h: {datos.lluvia.estado === "ok" ? `${datos.lluvia.pasado72} mm` : datos.lluvia.estado === "cargando" ? "…" : "s/d"}
        </span>
      </div>
    </header>
  );
}

const features = [
  { number: "01", eyebrow: "Gemelo digital", title: "Centro de control", text: "Terreno 3D de La Paz con el movimiento del suelo y las alertas de cada pasada NISAR.", href: "#control" },
  { number: "02", eyebrow: "Simulador 3D", title: "¿Qué pasaría si llueve?", text: "Sube la lluvia y mira hasta dónde llegaría la ladera y qué edificios alcanzaría.", href: "#simulador" },
  { number: "03", eyebrow: "Ciudadanos", title: "Mi zona", text: "Busca tu barrio, mira su semáforo y recibe alertas.", href: "#zona" },
  { number: "04", eyebrow: "Autoridades", title: "Panel de gestión", text: "Ranking de zonas que aceleran, alertas y reportes.", href: "#panel" },
];

function Landing({ datos }: { datos: Datos }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const top = datos.riesgo[0];
  const ultima = datos.nisar.estado === "ok" ? datos.nisar.pasadas[0] : undefined;

  return (
    <main>
      <section className="hero" id="inicio">
        <img className="hero-image" src={heroImage} alt="Vista panorámica de La Paz, Bolivia, rodeada por montañas" />
        <div className="hero-shade" />

        <header className="site-header">
          <a className="brand" href="#inicio" aria-label="BENNETT, inicio">
            <Signal />
            <span>BENNETT</span>
          </a>
          <button className="menu-button" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((v) => !v)}>
            <span />
            <span />
            <span />
            <span className="sr-only">Abrir navegación</span>
          </button>
          <div className={`header-links ${menuOpen ? "is-open" : ""}`} id="main-navigation">
            <nav aria-label="Navegación principal">
              <a href="#control" onClick={closeMenu}>Centro de control</a>
              <a href="#simulador" onClick={closeMenu}>Simulador 3D</a>
              <a href="#zona" onClick={closeMenu}>Mi zona</a>
              <a href="#panel" onClick={closeMenu}>Autoridades</a>
            </nav>
            <div className="header-icons" aria-label="Tecnologías y datos">
              <a href="https://science.nasa.gov/mission/nisar/" target="_blank" rel="noreferrer" title="NISAR · NASA">N</a>
              <span aria-hidden="true">×</span>
              <a href="https://www.isro.gov.in/NISARSatellite.html" target="_blank" rel="noreferrer" title="ISRO">I</a>
            </div>
          </div>
        </header>

        <div className="hero-content">
          <div className="data-note">
            <div className="data-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>
              Datos satelitales
              <br />
              NISAR · banda L
            </p>
          </div>
          <p className="kicker">Monitoreo de deslizamientos · La Paz, Bolivia</p>
          <h1>
            La Paz se mueve.
            <span>El radar sí lo siente.</span>
          </h1>
          <p className="intro">
            BENNETT muestra evaluaciones de riesgo y desplazamiento proporcionadas por el backend para monitorear laderas.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#control">
              Entrar al centro de control <Arrow />
            </a>
            <a className="text-link" href="#zona">¿Mi zona es segura?</a>
          </div>
        </div>

        {top && (
          <a className="live-alert" href="#control" style={{ borderColor: COLOR[top.nivel] }}>
            <span className="live-tag" style={{ color: COLOR[top.nivel] }}>
              <i style={{ background: COLOR[top.nivel] }} /> {top.nivelBackend === "critico" ? "Crítico" : ETIQUETA[top.nivel]} · {datos.backend.enVivo ? "en vivo" : "última evaluación"}
            </span>
            <strong>{top.nombre}</strong>
            <span>
              {top.velocidad} mm/mes · índice {top.indice}/100 · lluvia 24 h {top.lluvia24} mm
            </span>
            <small>
              {ultima ? `Última pasada NISAR: ${formatearFecha(ultima.fecha)}` : "Buscando pasadas NISAR sobre La Paz…"}
            </small>
          </a>
        )}
        {!top && datos.backend.estado !== "ok" && (
          <div className="live-alert" role="status">
            <span className="live-tag">{datos.backend.estado === "cargando" ? "Conectando con el backend…" : "Backend sin conexión"}</span>
            {datos.backend.estado === "error" && <small>{datos.backend.mensaje}</small>}
          </div>
        )}

        <div className="scroll-cue" aria-hidden="true">
          <span>Descubre BENNETT</span>
          <i />
        </div>
        <p className="photo-credit">Foto: Jack Prommel / Unsplash</p>
      </section>

      <section className="platform" id="plataforma">
        <div className="platform-heading">
          <p>La plataforma</p>
          <h2>Cuatro formas de usar BENNETT</h2>
        </div>
        <div className="feature-grid">
          {features.map((f) => (
            <article className="feature-card" key={f.number}>
              <span className="feature-number">{f.number}</span>
              <p>{f.eyebrow}</p>
              <h3>{f.title}</h3>
              <span>{f.text}</span>
              <a href={f.href} aria-label={`Abrir ${f.title}`}>
                <Arrow />
              </a>
            </article>
          ))}
        </div>

        <div className="sources">
          <div className="platform-heading">
            <p>Datos conectados</p>
            <h2>NISAR es el corazón. Lo demás le da contexto.</h2>
          </div>
          <div className="source-grid">
            <article className="source-card source-main">
              <span>Fuente principal · NASA</span>
              <h3>Satélite NISAR (NASA–ISRO)</h3>
              <p>
                Las pasadas se consultan en ASF DAAC; las evaluaciones y alertas proceden del backend y no se actualizan automáticamente por cada pasada.
              </p>
              <a href="https://search.asf.alaska.edu/" target="_blank" rel="noreferrer">Abrir ASF Vertex ↗</a>
            </article>
            <article className="source-card">
              <span>NASA · JPL</span>
              <h3>OPERA y ASF Displacement Portal</h3>
              <p>Referencia de cómo NASA publica el desplazamiento InSAR.</p>
            </article>
            <article className="source-card">
              <span>Lluvia</span>
              <h3>Open-Meteo (y GPM IMERG de NASA)</h3>
              <p>Lluvia de las últimas 72 h y pronóstico, para el índice y el simulador.</p>
            </article>
            <article className="source-card">
              <span>Relieve y ciudad</span>
              <h3>DEM + edificios OpenStreetMap</h3>
              <p>Terreno real del valle y edificios en 3D para ver qué queda expuesto.</p>
            </article>
          </div>
        </div>

        <div className="zone-panel" id="mi-zona">
          <div>
            <p>Para vecinos</p>
            <h2>¿Se mueve el suelo donde vivo?</h2>
          </div>
          <a className="primary-button dark-button" href="#zona">
            Consultar mi zona <Arrow />
          </a>
        </div>
      </section>
    </main>
  );
}
