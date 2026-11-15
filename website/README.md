# Website — Plataforma 3D Interactiva (Vite + Three.js)

Visualizacion 3D navegable de La Paz/El Alto con HUD glassmorphism oscuro,
inspirada en `../website-ref.jpg` y `../WhatsApp Image 2026-11-14 at
21.05.02.jpeg` (Image-to-Code) y en la fluidez/iluminacion de
[`slop-newyork`](https://mrdoob.github.io/slop-newyork/). Toda la logica de
prediccion vive en el **backend**: este proyecto solo renderiza y consume la
API REST + WebSocket.

## Arquitectura

```
src/
  config.js               SOLUTION_NAME (unica fuente: VITE_SOLUTION_NAME) + endpoints
  services/
    api.js                 Cliente REST hacia el backend
    ws.js                  Cliente WebSocket /ws/alerts con reconexion
  state/
    store.js                Store pub/sub minimo (capas, zonas, seleccion, exageracion...)
  world/
    geo.js                  Proyeccion lat/lon -> coordenadas locales de escena
    TerrainMesh.js           Malla de elevacion procedural (cuenca La Paz, meseta El Alto, pico Illimani)
    RiskShaders.js           Shader GLSL de mapa de calor InSAR (naranja/rojo pulsante + perimetro cian)
    Markers.js               Marcadores CSS2D (cotas de elevacion, alertas) y estaciones
    Buildings.js             Edificaciones estilizadas (InstancedMesh) y vias
  controls/
    CameraController.js      Envoltorio sobre MapControls (orbit amortiguado)
  core/
    SceneManager.js           Orquesta escena, luces, camara, capas y animacion
  ui/
    TopBar.js, LeftPanel.js, RightPanel.js, BottomBar.js, AlertOverlay.js
  main.js                   Bootstrap: carga config/capas/zonas, conecta WS, monta UI
```

## Variable de marca: `SOLUTION_NAME`

Definida en `.env` como `VITE_SOLUTION_NAME=` (vacia por defecto) y expuesta
via `src/config.js`. Toda la UI (barra superior) la consume desde ese unico
modulo; si esta vacia, el espacio se renderiza limpio, sin texto roto.

## Variables de entorno (`.env`)

```
VITE_SOLUTION_NAME=
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_ALERTS_URL=ws://localhost:8080/ws/alerts
```

## Requisitos previos

- Node.js ≥ 18, npm
- Backend corriendo en `http://localhost:8080` (ver `../backend/README.md`)

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo (http://localhost:5173)
npm run build     # build de produccion en dist/
npm run preview   # sirve dist/ localmente
```

## HUD (barra superior, paneles, barra inferior)

- **Barra superior**: logo, `SOLUTION_NAME`, pestanas (Overview, Monitoring,
  Risk Analysis, Simulation, Resource Prioritization), ubicacion
  (`LA PAZ, BOLIVIA` + timestamp) e indicador "Sistema Operativo".
- **Panel izquierdo** (`Capas Territoriales`): las 9 capas con toggle de
  visibilidad, que activan/desactivan grupos en la escena Three.js.
- **Panel derecho** (`Area Seleccionada`): coordenadas, elevacion, pendiente,
  geologia, estado de monitoreo y evaluacion de riesgo (gauge + metricas +
  minigrafico de tendencia), todo proveniente de `GET /api/v1/zones/:id`.
- **Barra inferior**: D-pad de camara, slider de Exageracion de Terreno
  (1.0x–3.0x, deforma la escala Y del terreno en tiempo real), contador de
  capas activas, linea de tiempo de observaciones, botones "Simular Escenario"
  (llama a `POST /api/v1/simulate`) y "Restablecer Vista", perfil de elevacion.

## Conexion en tiempo real

`src/services/ws.js` se conecta a `/ws/alerts` y reconecta automaticamente.
Cuando llega un mensaje `live_alert` (disparado por el puerto de demo del
backend, ver `../backend/README.md`), el website:

1. Ilumina la escena con un flash (`SceneManager.triggerAlertFlash`).
2. Centra la camara en la zona afectada.
3. Muestra el overlay de alerta a pantalla completa.
4. Refresca la evaluacion de riesgo de todas las zonas.

Para probarlo end-to-end: levantar el backend, abrir el website, y ejecutar
`../backend/scripts/demo_injector.sh critical` en otra terminal.

## Nota sobre el origen de los datos

Las 9 capas territoriales y las zonas de monitoreo son generadas por el
backend (ver `../backend/README.md`, seccion "Origen de los datos"): el
dataset NISAR disponible no cubre La Paz ni esta geocodificado, y
`SLIDEGUARD_SOUP` no tiene modelos entrenados. El website las consume tal
cual las entrega la API, sin inventar ni ajustar valores por su cuenta.
