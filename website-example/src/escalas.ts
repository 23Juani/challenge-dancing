// Escalas de color compartidas por el mapa, la leyenda y los gráficos.

export type Parada = [number, string];

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function interpolar(paradas: Parada[], v: number) {
  if (v <= paradas[0][0]) return paradas[0][1];
  for (let i = 1; i < paradas.length; i++) {
    const [b, cb] = paradas[i];
    const [a, ca] = paradas[i - 1];
    if (v <= b) {
      const t = (v - a) / (b - a);
      const x = hex(ca);
      const y = hex(cb);
      return `rgb(${x.map((k, j) => Math.round(k + (y[j] - k) * t)).join(",")})`;
    }
  }
  return paradas[paradas.length - 1][1];
}

// Velocidad LOS en mm/mes (valor absoluto de alejamiento)
export const P_VEL: Parada[] = [
  [0, "#2fa36b"],
  [5, "#9cc95a"],
  [10, "#e3b02f"],
  [18, "#ec7a2c"],
  [28, "#c62f3a"],
];
export const P_LLUVIA: Parada[] = [
  [0, "#f2f8fd"],
  [20, "#a9d0ef"],
  [40, "#4f9fdc"],
  [60, "#1e5fa8"],
  [80, "#0b2a6a"],
];
export const P_HUM: Parada[] = [
  [0.05, "#f3ead6"],
  [0.15, "#c9dfb4"],
  [0.25, "#6fbfa6"],
  [0.35, "#1f8c8c"],
  [0.45, "#0d4f63"],
];
export const P_PEND: Parada[] = [
  [15, "#fff3c4"],
  [24, "#f5c76a"],
  [30, "#e08a3c"],
  [36, "#b8532b"],
  [42, "#6e2a1a"],
];

export const colorVel = (v: number) => interpolar(P_VEL, Math.abs(v));
export const colorLluvia = (v: number) => interpolar(P_LLUVIA, v);
export const colorHum = (v: number) => interpolar(P_HUM, v);
export const colorPend = (v: number) => interpolar(P_PEND, v);

export const gradiente = (p: Parada[]) => `linear-gradient(90deg, ${p.map(([, c]) => c).join(", ")})`;
