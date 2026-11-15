/**
 * Configuracion global del frontend. `SOLUTION_NAME` es la UNICA variable de marca:
 * se define aqui (via VITE_SOLUTION_NAME en .env) y toda la UI la consume desde este
 * modulo. Si esta vacia, los componentes deben renderizar el espacio en blanco sin
 * textos rotos (ver ui/TopBar.js).
 */
export const SOLUTION_NAME = import.meta.env.VITE_SOLUTION_NAME ?? '';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const WS_ALERTS_URL = import.meta.env.VITE_WS_ALERTS_URL ?? 'ws://localhost:8080/ws/alerts';

export const BASE_LOCATION_LABEL = 'DEPTO. DE LA PAZ, BOLIVIA';
