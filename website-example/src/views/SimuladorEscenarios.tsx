import { useEffect, useMemo, useState } from "react";
import { irA } from "../App";
import { useLang, num } from "../i18n";
import Icon from "../components/Icon";
import { BarrasH } from "../components/Charts";
import {
  LADERAS,
  COLOR_NIVEL,
  GEOLOGIA,
  PESOS,
  evaluar,
  condicionesActuales,
  humedadEscenario,
  type Factor,
} from "../laderas";
import { abrirReporte } from "../reporte";

type Preset = "actual" | "moderada" | "intensa" | "prolongada" | "extrema";

export default function SimuladorEscenarios({ ladera }: { ladera?: string }) {
  const { t, lang } = useLang();
  const [id, setId] = useState(ladera ?? LADERAS[0].id);
  useEffect(() => {
    if (ladera) setId(ladera);
  }, [ladera]);
  const l = LADERAS.find((x) => x.id === id) ?? LADERAS[0];
  const base = useMemo(() => condicionesActuales(l), [l]);
  const [ll, setLl] = useState({ lluvia24: base.lluvia24, lluvia72: base.lluvia72, lluvia7d: base.lluvia7d });
  const [preset, setPreset] = useState<Preset>("actual");

  const aplicar = (p: Preset) => {
    setPreset(p);
    const b = condicionesActuales(l);
    const v = {
      actual: { lluvia24: b.lluvia24, lluvia72: b.lluvia72, lluvia7d: b.lluvia7d },
      moderada: { lluvia24: 15, lluvia72: 30, lluvia7d: Math.max(45, b.lluvia7d) },
      intensa: { lluvia24: 40, lluvia72: 55, lluvia7d: Math.max(75, b.lluvia7d) },
      prolongada: { lluvia24: 18, lluvia72: 50, lluvia7d: 110 },
      extrema: { lluvia24: 60, lluvia72: 95, lluvia7d: 150 },
    }[p];
    setLl(v);
  };

  useEffect(() => {
    aplicar("actual");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cambiar = (k: keyof typeof ll, v: number) => {
    setPreset("actual");
    setLl((prev) => {
      const n = { ...prev, [k]: v };
      // coherencia física: 24 h ≤ 72 h ≤ 7 días
      if (k === "lluvia24") {
        n.lluvia72 = Math.max(n.lluvia72, v);
        n.lluvia7d = Math.max(n.lluvia7d, n.lluvia72);
      }
      if (k === "lluvia72") {
        n.lluvia24 = Math.min(n.lluvia24, v);
        n.lluvia7d = Math.max(n.lluvia7d, v);
      }
      if (k === "lluvia7d") {
        n.lluvia72 = Math.min(n.lluvia72, v);
        n.lluvia24 = Math.min(n.lluvia24, n.lluvia72);
      }
      return n;
    });
  };

  const actual = evaluar(l);
  const hum = humedadEscenario(l, ll);
  const esc = evaluar(l, { ...ll, humedad: hum });
  const delta = esc.indice - actual.indice;

  const factores = (Object.keys(PESOS) as Factor[]).filter((f) => {
    if (f === "desplazamiento") return esc.velocidad > 12;
    if (f === "precipitacion") return esc.condiciones.lluvia7d > 50 || esc.condiciones.lluvia24 > 25;
    if (f === "humedad") return hum > 0.3;
    if (f === "pendiente") return l.pendiente >= 32 && (esc.condiciones.lluvia72 > 30 || esc.indice >= 55);
    return GEOLOGIA[l.geo].factor >= 0.9 && esc.indice >= 50;
  });

  const presets: Preset[] = ["actual", "moderada", "intensa", "prolongada", "extrema"];

  return (
    <div className="contenedor-ancho vista-pad">
      <header className="vista-cabeza">
        <p className="eyebrow">{t.nav.simulador}</p>
        <h1 className="vista-titulo">{t.sim.titulo}</h1>
        <p className="vista-sub">{t.sim.sub}</p>
      </header>
      <p className="aviso">
        <Icon n="alert" size={17} /> {t.sim.aviso}
      </p>

      <div className="sim-layout">
        <section className="tarjeta sim-config">
          <h3 className="t-tit">{t.sim.paso1}</h3>
          <select className="select" value={id} onChange={(e) => setId(e.target.value)} aria-label={t.comun.seleccionar}>
            {LADERAS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre} · {x.macro}
              </option>
            ))}
          </select>
          <div className="sim-ficha">
            <span>
              <Icon n="mountain" size={15} /> {l.pendiente}°
            </span>
            <span>
              <Icon n="map" size={15} /> {l.areaHa} ha
            </span>
            <span>
              <i className="geo-punto" style={{ background: GEOLOGIA[l.geo].color }} /> {GEOLOGIA[l.geo][lang].split("·")[0]}
            </span>
          </div>

          <h3 className="t-tit">{t.sim.paso2}</h3>
          <p className="control-tit">{t.sim.presets}</p>
          <div className="presets">
            {presets.map((p) => (
              <button key={p} type="button" aria-pressed={preset === p} onClick={() => aplicar(p)}>
                {t.sim.preset[p]}
              </button>
            ))}
          </div>
          {(
            [
              ["lluvia24", t.sim.l24, 80],
              ["lluvia72", t.sim.l72, 140],
              ["lluvia7d", t.sim.l7d, 200],
            ] as const
          ).map(([k, et, max]) => (
            <div className="deslizador" key={k}>
              <div className="des-cabeza">
                <label htmlFor={`r-${k}`}>{et}</label>
                <span>
                  <b>{num(ll[k], lang)}</b> mm
                  <small>
                    {" "}
                    ({t.sim.actual.toLowerCase()} {num(base[k], lang)})
                  </small>
                </span>
              </div>
              <input
                id={`r-${k}`}
                type="range"
                min={0}
                max={max}
                step={0.5}
                value={ll[k]}
                onChange={(e) => cambiar(k, Number(e.target.value))}
                style={{ ["--p" as any]: `${(ll[k] / max) * 100}%` }}
              />
            </div>
          ))}
        </section>

        <section className="sim-resultados">
          <div className="tarjeta">
            <h3 className="t-tit">{t.sim.comparacion}</h3>
            <div className="comp-indices">
              <Medidor titulo={t.sim.actual} indice={actual.indice} nivel={actual.nivel} />
              <div className={`delta ${delta > 0 ? "sube" : delta < 0 ? "baja" : ""}`}>
                <Icon n="arrow" size={22} />
                <b>
                  {delta > 0 ? "+" : ""}
                  {delta}
                </b>
              </div>
              <Medidor titulo={t.sim.escenario} indice={esc.indice} nivel={esc.nivel} />
            </div>
          </div>

          <div className="tarjeta">
            <h3 className="t-tit">{t.sim.cambios}</h3>
            <div className="cambios-grid">
              <Cambio et={t.sim.l24} a={actual.condiciones.lluvia24} b={esc.condiciones.lluvia24} u="mm" />
              <Cambio et={t.sim.l72} a={actual.condiciones.lluvia72} b={esc.condiciones.lluvia72} u="mm" />
              <Cambio et={t.sim.l7d} a={actual.condiciones.lluvia7d} b={esc.condiciones.lluvia7d} u="mm" />
              <Cambio et={t.sim.humedadEst} a={actual.condiciones.humedad} b={hum} u="m³/m³" dec={3} />
              <Cambio et={t.sim.velEst} a={actual.velocidad} b={esc.velocidad} u={t.comun.mmMes} />
              <Cambio et={t.comun.indice} a={actual.indice} b={esc.indice} u="/100" dec={0} />
            </div>
          </div>

          <div className="tarjeta">
            <h3 className="t-tit">{t.sim.aportes}</h3>
            <BarrasH
              max={30}
              fmt={(v) => num(v, lang)}
              filas={(Object.keys(PESOS) as Factor[]).map((f) => ({
                etiqueta: t.comun.factor[f],
                valor: esc.aportes[f],
                valor2: actual.aportes[f],
                color: factores.includes(f) ? "#ec7a2c" : "#1e6fb8",
              }))}
            />
            <p className="leyenda-mini">
              <i className="lm-fantasma" /> {t.sim.actual} <i className="lm-azul" /> {t.sim.escenario}
            </p>
          </div>

          <div className="tarjeta">
            <h3 className="t-tit">{t.sim.atencion}</h3>
            {factores.length ? (
              <ul className="factores-lista">
                {factores.map((f) => (
                  <li key={f}>
                    <Icon n="alert" size={17} />
                    <div>
                      <strong>{t.comun.factor[f]}</strong>
                      <span>{t.sim.factorMsg[f]}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sin-factores">
                <Icon n="check" size={17} /> {t.sim.sinFactores}
              </p>
            )}
            <div className="recomendacion" style={{ borderColor: COLOR_NIVEL[esc.nivel] }}>
              <span>{t.sim.recomendacion}</span>
              <strong style={{ color: COLOR_NIVEL[esc.nivel] }}>{t.comun.accion[esc.nivel]}</strong>
            </div>
            <div className="pl-acciones">
              <button className="btn btn-secundario btn-chico" type="button" onClick={() => irA("mapa", l.id)}>
                <Icon n="map" size={16} /> {t.comun.verMapa}
              </button>
              <button className="btn btn-secundario btn-chico" type="button" onClick={() => abrirReporte(l, lang)}>
                <Icon n="file" size={16} /> {t.comun.reporte}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Medidor({ titulo, indice, nivel }: { titulo: string; indice: number; nivel: keyof typeof COLOR_NIVEL }) {
  const { t } = useLang();
  const r = 70;
  const c = Math.PI * r;
  const color = COLOR_NIVEL[nivel];
  return (
    <div className="medidor">
      <p>{titulo}</p>
      <svg viewBox="0 0 180 104" width="180" height="104">
        <defs>
          <linearGradient id="g-medidor" x1="0" x2="1">
            <stop offset="0" stopColor="#2fa36b" />
            <stop offset="0.45" stopColor="#e3b02f" />
            <stop offset="0.7" stopColor="#ec7a2c" />
            <stop offset="1" stopColor="#d6403a" />
          </linearGradient>
        </defs>
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="#eef2f7" strokeWidth="14" strokeLinecap="round" />
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="url(#g-medidor)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(indice / 100) * c} ${c}`} style={{ transition: "stroke-dasharray .5s ease" }} />
        <text x="90" y="84" textAnchor="middle" className="medidor-num" fill={color}>
          {indice}
        </text>
      </svg>
      <span className="nivel-pildora" style={{ background: color }}>
        {t.comun.nivel[nivel]}
      </span>
    </div>
  );
}

function Cambio({ et, a, b, u, dec = 1 }: { et: string; a: number; b: number; u: string; dec?: number }) {
  const { lang } = useLang();
  const d = b - a;
  return (
    <div className="cambio">
      <span className="cambio-et">{et}</span>
      <div className="cambio-val">
        <span className="cambio-a">{num(a, lang, dec)}</span>
        <Icon n="arrow" size={14} />
        <b>{num(b, lang, dec)}</b>
        <small>{u}</small>
      </div>
      <span className={`cambio-d ${d > 0.0005 ? "sube" : d < -0.0005 ? "baja" : ""}`}>
        {d > 0 ? "+" : ""}
        {num(d, lang, dec)}
      </span>
    </div>
  );
}
