# BENNETT · app web

> Integración actual: React/MapLibre consume las zonas y evaluaciones de
> `GET /api/v1/zones` y `GET /api/v1/zones/:id`, la capa de deformación de
> `GET /api/v1/layers`, `POST /api/v1/predict`, `POST /api/v1/simulate` y
> las alertas en vivo de `/ws/alerts`. El diseño no depende de la arquitectura
> Three.js antigua descrita más abajo.
>
> Arranca primero el backend con `cd ../backend && cargo run`; el sitio usa
> `VITE_API_BASE_URL=http://localhost:8080` por defecto. Configura esa variable
> antes de iniciar Vite o compilar si el backend está en otra dirección. El
> WebSocket usa el mismo origen, cambiando HTTP por WS.
>
> El backend actual proporciona datos sintéticos y evaluaciones heurísticas,
> no mediciones NISAR reales para La Paz. El desplazamiento se muestra en
> mm/mes y la lluvia de la simulación en 24 h. La simulación visual de alcance
> y edificios es ilustrativa; solo el índice y el nivel vienen del backend.
> Las pasadas de ASF/CMR, la lluvia de Open-Meteo y los mapas siguen siendo
> servicios externos independientes. Los archivos GeoJSON/CSV subidos se
> visualizan en el mapa (velocidad de entrada en mm/año), pero no modifican
> las evaluaciones del backend. Los datos sin aceleración o coherencia no
> inventan esos valores. Las alertas WebSocket se reciben mientras el cliente
> está conectado; el backend no conserva el historial de alertas en vivo.
>
> Pruebas: `node --test scripts/api.test.mjs`, `npx tsc --noEmit`,
> `npm run build`.

Gemelo digital de La Paz para monitorear deslizamientos con el satélite NISAR (NASA–ISRO).
Construido sobre el landing de Figma Make (Vite + React).

## Cómo correrla

```bash
pnpm install      # o: npm install
pnpm dev          # abre http://localhost:8443
```

Para publicarla: `pnpm build` y sube la carpeta `dist/` a Vercel, Netlify o GitHub Pages.

## Pantallas (rutas)

| Ruta | Qué hace |
|---|---|
| `#inicio` | Landing con la foto de La Paz + tarjeta de **alerta en vivo** calculada con los datos |
| `#control` | **Centro de control**: mapa 3D (relieve real + edificios), puntos InSAR, zonas con semáforo, alertas, pasadas NISAR en vivo, carga de tu dataset |
| `#simulador` | **Simulador 3D**: lluvia → mancha del deslizamiento, escombros animados, edificios alcanzados en rojo |
| `#zona` | **Mi zona**: buscador de barrios (OpenStreetMap), semáforo, señales de alerta |
| `#panel` | **Autoridades**: KPIs, ranking de zonas, pasadas NISAR, exportar CSV |

## Conexiones de datos (en vivo, desde el navegador)

- **NISAR (NASA)**: `src/data.ts → cargarNisar()` busca pasadas NISAR sobre La Paz en la API de búsqueda de ASF DAAC
  (`api.daac.asf.alaska.edu`) y, si falla, en NASA Earthdata CMR. Muestra fecha, track, frame y enlace de descarga.
- **Lluvia**: Open-Meteo (últimas 72 h + pronóstico 72 h) como contexto independiente; el riesgo usa la lluvia del backend.
- **Mapa 3D**: MapLibre GL (CDN) con imagen satelital Esri, relieve AWS Terrain Tiles y edificios OpenStreetMap (OpenFreeMap). Sin claves.
- **Movimiento del suelo**: la capa de deformación del backend es sintética; no se carga el GeoJSON de ejemplo por defecto.

## Conectar sus datos NISAR reales

1. Descarguen las pasadas NISAR de La Paz desde ASF Vertex.
2. Procesen la serie de tiempo con MintPy y geocodifiquen (`geo_velocity.h5`, `geo_temporalCoherence.h5`).
3. Conviertan a GeoJSON:
   ```bash
   pip install h5py numpy
   python scripts/nisar_a_geojson.py --velocity geo/geo_velocity.h5 \
       --coherence geo/geo_temporalCoherence.h5 --salida public/data/insar_lapaz.geojson
   ```
4. Súbanlo desde el **Centro de control → "Conectar tu dataset"** (GeoJSON o CSV con `lon, lat, velocity, coh`).
   El archivo solo afecta el mapa; para integrarlo al cálculo de riesgo hay que incorporarlo al backend.

## Ajustar

- Las zonas y sus polígonos proceden del backend.
- El índice y los niveles de riesgo los calcula el backend.
- El simulador es una visualización ilustrativa, no un modelo físico.

# Documentación histórica del frontend anterior (Three.js)

La sección siguiente describe el frontend anterior y no la implementación actual.

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
