import { useEffect, useState } from "react";
import "./app.css";
import {
  cargarLluvia,
  cargarNisar,
  type EstadoNisar,
  type Lluvia,
  type PuntoInsar,
  type RiesgoZona,
} from "./data";
import { actualizarAlerta, cargarBackend, conectarAlertas } from "./api";
import { LangProvider, useLang } from "./i18n";
import Inicio from "./views/Inicio";
import CentroControl from "./views/CentroControl";
import Simulador from "./views/Simulador";
import MiZona from "./views/MiZona";
import Panel from "./views/Panel";

export const LOGO = `${import.meta.env.BASE_URL}logo-bennett.png`;

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
export type Ruta = (typeof RUTAS)[number];

function leerHash(): { ruta: Ruta; ancla?: string } {
  const [r, q] = window.location.hash.replace("#", "").split("?");
  if (r === "control" || r === "mapa") return { ruta: "control" };
  if (r === "simulador") return { ruta: "simulador" };
  if (r === "zona") return { ruta: "zona" };
  if (r === "panel" || r === "analisis") return { ruta: "panel" };
  if ((RUTAS as readonly string[]).includes(r)) return { ruta: r as Ruta };
  return { ruta: "inicio", ancla: r || undefined };
}

export const Signal = () => (
  <img src={`${import.meta.env.BASE_URL}logo-bennett.png`} alt="" aria-hidden="true" style={{ width: 24, height: 24, objectFit: "contain" }} />
);

export default function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}

function Shell() {
  const [estado, setEstado] = useState(leerHash());
  const [puntos, setPuntosState] = useState<PuntoInsar[]>([]);
  const [fuentePuntos, setFuente] = useState("cargando…");
  const [nisar, setNisar] = useState<EstadoNisar>({ estado: "cargando" });
  const [lluvia, setLluvia] = useState<Lluvia>({ estado: "cargando", pasado72: 0, futuro72: 0, horas: [] });
  const [cohMin, setCohMin] = useState(0.3);
  const [riesgo, setRiesgo] = useState<RiesgoZona[]>([]);
  const [backend, setBackend] = useState<Datos["backend"]>({ estado: "cargando", mensaje: "", enVivo: false });

  useEffect(() => {
    const alCambiar = () => {
      const nuevo = leerHash();
      setEstado((anterior) => {
        if (nuevo.ancla) {
          setTimeout(() => document.getElementById(nuevo.ancla!)?.scrollIntoView({ behavior: "smooth" }), 40);
        } else if (anterior.ruta !== nuevo.ruta) {
          window.scrollTo(0, 0);
        }
        return nuevo;
      });
    };
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  useEffect(() => {
    cargarNisar().then(setNisar);
    cargarLluvia().then(setLluvia);
    let cancelado = false;
    let desconectar: (() => void) | undefined;
    cargarBackend()
      .then((resultado) => {
        if (cancelado) return;
        setPuntosState(resultado.puntos);
        setFuente(resultado.fuente);
        setRiesgo(resultado.riesgo);
        setBackend({ estado: "ok", mensaje: "", enVivo: false });
        desconectar = conectarAlertas(
          (alerta) => setRiesgo((anterior) => actualizarAlerta(anterior, alerta)),
          (enVivo) => setBackend((anterior) => ({ ...anterior, enVivo })),
        );
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        setFuente("sin datos del backend");
        setBackend({
          estado: "error",
          mensaje: error instanceof Error ? error.message : String(error),
          enVivo: false,
        });
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

  if (estado.ruta === "inicio") {
    return (
      <div className="sitio">
        <Cabecera ruta={estado.ruta} />
        <main>
          <Inicio />
        </main>
        <Pie />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <BarraApp ruta={estado.ruta} datos={datos} />
      {estado.ruta === "control" && <CentroControl datos={datos} />}
      {estado.ruta === "simulador" && <Simulador datos={datos} />}
      {estado.ruta === "zona" && <MiZona datos={datos} />}
      {estado.ruta === "panel" && <Panel datos={datos} />}
    </div>
  );
}

function Cabecera({ ruta }: { ruta: Ruta }) {
  const { t, lang, setLang } = useLang();
  const [scroll, setScroll] = useState(false);

  useEffect(() => {
    const f = () => setScroll(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  const items = [
    { id: "inicio", href: "#inicio", label: t.nav.inicio },
    { id: "control", href: "#control", label: "Centro de control" },
    { id: "simulador", href: "#simulador", label: t.nav.simulador },
    { id: "zona", href: "#zona", label: "Mi zona" },
    { id: "panel", href: "#panel", label: "Autoridades" },
  ];

  return (
    <header className={`cabecera ${scroll ? "con-sombra" : ""}`}>
      <a className="marca" href="#inicio" aria-label="BENNETT">
        <img src={LOGO} alt="" />
        <span>
          <strong>BENNETT</strong>
          <small>NASA Space Apps 2026</small>
        </span>
      </a>
      <nav className="pestanas" aria-label="Secciones">
        {items.map((it) => (
          <a key={it.id} href={it.href} aria-current={ruta === it.id ? "page" : undefined}>
            {it.label}
          </a>
        ))}
      </nav>
      <div className="switch-idioma" role="group" aria-label={t.nav.idioma}>
        <span className={`switch-pildora ${lang === "en" ? "der" : ""}`} aria-hidden="true" />
        <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>
          ES
        </button>
        <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
          EN
        </button>
      </div>
    </header>
  );
}

function Pie() {
  const { t } = useLang();
  return (
    <footer className="pie">
      <div className="pie-marca">
        <img src={LOGO} alt="" />
        <div>
          <strong>BENNETT</strong>
          <p>{t.inicio.pie}</p>
        </div>
      </div>
      <div className="pie-links">
        <a href="https://science.nasa.gov/mission/nisar/" target="_blank" rel="noreferrer">
          NASA NISAR ↗
        </a>
        <a href="https://search.asf.alaska.edu/" target="_blank" rel="noreferrer">
          ASF Vertex ↗
        </a>
        <a href="https://gpm.nasa.gov/data/imerg" target="_blank" rel="noreferrer">
          GPM IMERG ↗
        </a>
        <a href="https://www.spaceappschallenge.org/" target="_blank" rel="noreferrer">
          Space Apps ↗
        </a>
      </div>
    </footer>
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
        <a href="#control" aria-current={ruta === "control" ? "page" : undefined}>
          Centro de control
        </a>
        <a href="#simulador" aria-current={ruta === "simulador" ? "page" : undefined}>
          Simulador 3D
        </a>
        <a href="#zona" aria-current={ruta === "zona" ? "page" : undefined}>
          Mi zona
        </a>
        <a href="#panel" aria-current={ruta === "panel" ? "page" : undefined}>
          Autoridades
        </a>
      </nav>
      <div className="app-status">
        <span
          className={`chip ${datos.backend.estado === "error" ? "chip-err" : datos.backend.enVivo ? "chip-ok" : ""}`}
          title={datos.backend.mensaje}
        >
          <i />{" "}
          {datos.backend.estado === "cargando"
            ? "Backend: conectando…"
            : datos.backend.estado === "error"
              ? "Backend: sin conexión"
              : datos.backend.enVivo
                ? "Backend: en vivo"
                : "Backend: alertas desconectadas"}
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
