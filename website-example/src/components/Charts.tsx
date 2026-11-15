import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from "react";

export function useAncho<T extends HTMLElement>(inicial = 520) {
  const ref = useRef<T | null>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => {
      const w = Math.round(e[0].contentRect.width);
      if (w > 0) setAncho(w);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, ancho };
}

function escala(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

function ticks(min: number, max: number, n = 4) {
  const paso0 = (max - min) / n || 1;
  const mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= paso0) ?? paso0;
  const out: number[] = [];
  for (let v = Math.ceil(min / paso) * paso; v <= max + 1e-9; v += paso) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export type Serie = {
  nombre: string;
  color: string;
  tipo?: "linea" | "barra" | "area";
  datos: { x: number; y: number | null }[];
  puntos?: boolean;
};

export function SerieChart({
  series,
  alto = 200,
  fmtX,
  fmtY = (v) => String(v),
  yMin,
  yMax,
  unidad = "",
  marcas,
}: {
  series: Serie[];
  alto?: number;
  fmtX: (x: number) => string;
  fmtY?: (y: number) => string;
  yMin?: number;
  yMax?: number;
  unidad?: string;
  marcas?: { x: number; etiqueta: string }[];
}) {
  const { ref, ancho } = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { t: 12, r: 14, b: 26, l: 44 };
  const xs = series.flatMap((s) => s.datos.map((d) => d.x));
  const ys = series.flatMap((s) => s.datos.map((d) => d.y).filter((v): v is number => v != null));
  if (!xs.length) return <div ref={ref} className="chart-vacio">—</div>;
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const hayBarras = series.some((s) => s.tipo === "barra");
  let y0 = yMin ?? Math.min(0, ...ys);
  let y1 = yMax ?? Math.max(0, ...ys);
  if (y0 === y1) y1 = y0 + 1;
  const pad = (y1 - y0) * 0.08;
  if (yMin == null && y0 < 0) y0 -= pad;
  if (yMax == null) y1 += pad;
  const nX = new Set(xs).size;
  const anchoBarra = hayBarras ? Math.max(2, ((ancho - m.l - m.r) / nX) * 0.7) : 0;
  const sx = escala(x0, x1, m.l + anchoBarra / 2, ancho - m.r - anchoBarra / 2);
  const sy = escala(y0, y1, alto - m.b, m.t);
  const ty = ticks(y0, y1, 4);
  const xUnicos = [...new Set(xs)].sort((a, b) => a - b);
  const nTx = Math.max(2, Math.min(6, Math.floor((ancho - m.l) / 90)));
  const txIdx = Array.from({ length: nTx }, (_, i) => Math.round((i / (nTx - 1)) * (xUnicos.length - 1)));

  const mover = (e: PointerEvent<SVGSVGElement>) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    let mejor = 0;
    let dist = Infinity;
    xUnicos.forEach((x, i) => {
      const d = Math.abs(sx(x) - px);
      if (d < dist) {
        dist = d;
        mejor = i;
      }
    });
    setHover(mejor);
  };
  const xH = hover != null ? xUnicos[hover] : null;

  return (
    <div className="chart" ref={ref}>
      <svg width={ancho} height={alto} onPointerMove={mover} onPointerLeave={() => setHover(null)} role="img">
        {ty.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={ancho - m.r} y1={sy(v)} y2={sy(v)} className={v === 0 ? "eje-cero" : "rejilla"} />
            <text x={m.l - 8} y={sy(v) + 4} textAnchor="end" className="tick">
              {fmtY(v)}
            </text>
          </g>
        ))}
        {txIdx.map((i) => (
          <text key={i} x={sx(xUnicos[i])} y={alto - 6} textAnchor="middle" className="tick">
            {fmtX(xUnicos[i])}
          </text>
        ))}
        {marcas?.map((mk) => (
          <g key={mk.x}>
            <line x1={sx(mk.x)} x2={sx(mk.x)} y1={m.t} y2={alto - m.b} className="marca" />
            <text x={sx(mk.x) - 4} y={m.t + 10} textAnchor="end" className="tick marca-txt">
              {mk.etiqueta}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const val = s.datos.filter((d) => d.y != null) as { x: number; y: number }[];
          if (s.tipo === "barra") {
            return (
              <g key={s.nombre}>
                {val.map((d) => (
                  <rect
                    key={d.x}
                    x={sx(d.x) - anchoBarra / 2}
                    width={anchoBarra}
                    y={Math.min(sy(d.y), sy(0))}
                    height={Math.max(0.5, Math.abs(sy(d.y) - sy(0)))}
                    rx={Math.min(3, anchoBarra / 3)}
                    fill={s.color}
                    opacity={xH == null || xH === d.x ? 0.9 : 0.45}
                  />
                ))}
              </g>
            );
          }
          const path = val.map((d, i) => `${i ? "L" : "M"}${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`).join("");
          return (
            <g key={s.nombre}>
              {s.tipo === "area" && val.length > 1 && (
                <path d={`${path}L${sx(val[val.length - 1].x)},${sy(Math.max(y0, 0))}L${sx(val[0].x)},${sy(Math.max(y0, 0))}Z`} fill={s.color} opacity={0.14} />
              )}
              <path d={path} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
              {s.puntos !== false && val.map((d) => <circle key={d.x} cx={sx(d.x)} cy={sy(d.y)} r={xH === d.x ? 5 : 3} fill="#fff" stroke={s.color} strokeWidth={2} />)}
            </g>
          );
        })}
        {xH != null && <line x1={sx(xH)} x2={sx(xH)} y1={m.t} y2={alto - m.b} className="cursor" />}
      </svg>
      {xH != null && (
        <div className="chart-tip" style={{ left: Math.min(ancho - 150, Math.max(0, sx(xH) + 10)) }}>
          <strong>{fmtX(xH)}</strong>
          {series.map((s) => {
            const d = s.datos.find((p) => p.x === xH);
            return (
              <span key={s.nombre}>
                <i style={{ background: s.color }} />
                {s.nombre}: {d?.y == null ? "—" : `${fmtY(d.y)} ${unidad}`}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ valores, color = "#1e6fb8", ancho = 96, alto = 28 }: { valores: number[]; color?: string; ancho?: number; alto?: number }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const sx = escala(0, valores.length - 1, 2, ancho - 2);
  const sy = escala(min, max === min ? min + 1 : max, alto - 3, 3);
  const d = valores.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
  return (
    <svg width={ancho} height={alto} className="spark" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <circle cx={sx(valores.length - 1)} cy={sy(valores[valores.length - 1])} r={2.6} fill={color} />
    </svg>
  );
}

export function Donut({ partes, tam = 170, grosor = 22, centro }: { partes: { valor: number; color: string; etiqueta: string }[]; tam?: number; grosor?: number; centro?: ReactNode }) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  let acum = 0;
  return (
    <div className="donut" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`}>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={grosor} />
        {partes.map((p) => {
          const largo = (p.valor / total) * c;
          const el = (
            <circle
              key={p.etiqueta}
              cx={tam / 2}
              cy={tam / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={grosor}
              strokeDasharray={`${Math.max(0, largo - 2)} ${c}`}
              strokeDashoffset={-acum}
              transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
            >
              <title>{`${p.etiqueta}: ${p.valor}`}</title>
            </circle>
          );
          acum += largo;
          return el;
        })}
      </svg>
      {centro && <div className="donut-centro">{centro}</div>}
    </div>
  );
}

export function Dispersion({
  puntos,
  alto = 300,
  ejeX,
  ejeY,
  onClick,
}: {
  puntos: { id: string; x: number; y: number; r: number; color: string; etiqueta: string }[];
  alto?: number;
  ejeX: string;
  ejeY: string;
  onClick?: (id: string) => void;
}) {
  const { ref, ancho } = useAncho<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const m = { t: 14, r: 18, b: 42, l: 52 };
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const x0 = Math.floor(Math.min(...xs) * 0.9);
  const x1 = Math.ceil(Math.max(...xs) * 1.08);
  const y0 = 0;
  const y1 = Math.ceil(Math.max(...ys) * 1.12);
  const sx = escala(x0, x1, m.l, ancho - m.r);
  const sy = escala(y0, y1, alto - m.b, m.t);
  const h = puntos.find((p) => p.id === hover);
  return (
    <div className="chart" ref={ref}>
      <svg width={ancho} height={alto}>
        {ticks(y0, y1, 5).map((v) => (
          <g key={`y${v}`}>
            <line x1={m.l} x2={ancho - m.r} y1={sy(v)} y2={sy(v)} className="rejilla" />
            <text x={m.l - 8} y={sy(v) + 4} textAnchor="end" className="tick">{v}</text>
          </g>
        ))}
        {ticks(x0, x1, 5).map((v) => (
          <text key={`x${v}`} x={sx(v)} y={alto - m.b + 18} textAnchor="middle" className="tick">{v}</text>
        ))}
        <text x={(m.l + ancho - m.r) / 2} y={alto - 6} textAnchor="middle" className="eje-titulo">{ejeX}</text>
        <text transform={`translate(14 ${(m.t + alto - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="eje-titulo">{ejeY}</text>
        {puntos.map((p) => (
          <circle
            key={p.id}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={p.r}
            fill={p.color}
            fillOpacity={hover && hover !== p.id ? 0.35 : 0.8}
            stroke="#fff"
            strokeWidth={1.5}
            style={{ cursor: onClick ? "pointer" : "default" }}
            onPointerEnter={() => setHover(p.id)}
            onPointerLeave={() => setHover(null)}
            onClick={() => onClick?.(p.id)}
          />
        ))}
      </svg>
      {h && (
        <div className="chart-tip" style={{ left: Math.min(ancho - 160, sx(h.x) + 12), top: Math.max(0, sy(h.y) - 20) }}>
          <strong>{h.etiqueta}</strong>
          <span>{ejeX}: {h.x}</span>
          <span>{ejeY}: {h.y}</span>
        </div>
      )}
    </div>
  );
}

export function BarrasH({ filas, max, fmt = (v) => String(v) }: { filas: { etiqueta: string; valor: number; color: string; valor2?: number }[]; max: number; fmt?: (v: number) => string }) {
  return (
    <div className="barras-h">
      {filas.map((f) => (
        <div className="bh-fila" key={f.etiqueta}>
          <span className="bh-et">{f.etiqueta}</span>
          <div className="bh-pista">
            {f.valor2 != null && <div className="bh-barra bh-fantasma" style={{ width: `${(f.valor2 / max) * 100}%` }} />}
            <div className="bh-barra" style={{ width: `${(f.valor / max) * 100}%`, background: f.color }} />
          </div>
          <span className="bh-val">{fmt(f.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/** Mini-mapa SVG de una ladera con sus puntos InSAR */
export function MiniMapaDesp({ poligono, puntos, colorV }: { poligono: [number, number][]; puntos: { lon: number; lat: number; v: number }[]; colorV: (v: number) => string }) {
  const { ref, ancho } = useAncho<HTMLDivElement>(320);
  const alto = 210;
  const lons = poligono.map((p) => p[0]);
  const lats = poligono.map((p) => p[1]);
  const [a, b, c, d] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const kLon = Math.cos((((c + d) / 2) * Math.PI) / 180);
  const w = (b - a) * kLon;
  const h = d - c;
  const esc = Math.min((ancho - 30) / w, (alto - 30) / h);
  const ox = (ancho - w * esc) / 2;
  const oy = (alto - h * esc) / 2;
  const P = (lon: number, lat: number) => [ox + (lon - a) * kLon * esc, oy + (d - lat) * esc];
  const path = poligono.map((p, i) => `${i ? "L" : "M"}${P(p[0], p[1]).join(",")}`).join("") + "Z";
  return (
    <div ref={ref} className="minimapa">
      <svg width={ancho} height={alto}>
        <defs>
          <pattern id="grid-mm" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="#e3e9f1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={ancho} height={alto} fill="url(#grid-mm)" />
        <path d={path} fill="#eaf2fb" stroke="#0b2a4a" strokeWidth={1.6} strokeDasharray="5 3" />
        {puntos.map((p, i) => {
          const [x, y] = P(p.lon, p.lat);
          return <circle key={i} cx={x} cy={y} r={4.2} fill={colorV(p.v)} stroke="#fff" strokeWidth={1}><title>{`${p.v} mm/mes`}</title></circle>;
        })}
      </svg>
    </div>
  );
}
