import { useEffect, useState } from "react";
import "./app.css";
import { cargarLluvia, cargarNisar, type EstadoNisar, type Lluvia } from "./data";
import { LangProvider, useLang } from "./i18n";
import Inicio from "./views/Inicio";
import MapaInteractivo from "./views/MapaInteractivo";
import SimuladorEscenarios from "./views/SimuladorEscenarios";
import Analisis from "./views/Analisis";

const RUTAS = ["inicio", "mapa", "simulador", "analisis"] as const;
export type Ruta = (typeof RUTAS)[number];

function leerHash(): { ruta: Ruta; ladera?: string; ancla?: string } {
  const [r, q] = window.location.hash.replace("#", "").split("?");
  const params = new URLSearchParams(q ?? "");
  if ((RUTAS as readonly string[]).includes(r)) return { ruta: r as Ruta, ladera: params.get("ladera") ?? undefined };
  return { ruta: "inicio", ancla: r || undefined };
}

export const LOGO = `${import.meta.env.BASE_URL}logo-bennett.png`;

export type Vivo = { lluvia: Lluvia; nisar: EstadoNisar };

export function irA(ruta: Ruta, ladera?: string) {
  window.location.hash = ladera ? `${ruta}?ladera=${ladera}` : ruta;
}

export default function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}

function Shell() {
  const [estado, setEstado] = useState(leerHash());
  const [vivo, setVivo] = useState<Vivo>({
    lluvia: { estado: "cargando", pasado72: 0, futuro72: 0, horas: [] },
    nisar: { estado: "cargando" },
  });

  useEffect(() => {
    const alCambiar = () => {
      const nuevo = leerHash();
      setEstado((anterior) => {
        if (nuevo.ancla) {
          setTimeout(() => document.getElementById(nuevo.ancla!)?.scrollIntoView({ behavior: "smooth" }), 30);
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
    cargarLluvia().then((lluvia) => setVivo((v) => ({ ...v, lluvia })));
    cargarNisar().then((nisar) => setVivo((v) => ({ ...v, nisar })));
  }, []);

  return (
    <div className="sitio">
      <Cabecera ruta={estado.ruta} />
      <main className={estado.ruta === "inicio" ? "" : "vista-app"}>
        {estado.ruta === "inicio" && <Inicio />}
        {estado.ruta === "mapa" && <MapaInteractivo ladera={estado.ladera} vivo={vivo} />}
        {estado.ruta === "simulador" && <SimuladorEscenarios ladera={estado.ladera} />}
        {estado.ruta === "analisis" && <Analisis vivo={vivo} />}
      </main>
      <Pie />
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
  const items: [Ruta, string][] = [
    ["inicio", t.nav.inicio],
    ["mapa", t.nav.mapa],
    ["simulador", t.nav.simulador],
    ["analisis", t.nav.analisis],
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
        {items.map(([r, txt]) => (
          <a key={r} href={`#${r}`} aria-current={ruta === r ? "page" : undefined}>
            {txt}
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
        <a href="https://science.nasa.gov/mission/nisar/" target="_blank" rel="noreferrer">NASA NISAR ↗</a>
        <a href="https://search.asf.alaska.edu/" target="_blank" rel="noreferrer">ASF Vertex ↗</a>
        <a href="https://gpm.nasa.gov/data/imerg" target="_blank" rel="noreferrer">GPM IMERG ↗</a>
        <a href="https://www.spaceappschallenge.org/" target="_blank" rel="noreferrer">Space Apps ↗</a>
      </div>
    </footer>
  );
}
