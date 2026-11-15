# Backend — Motor de Prediccion y Alerta Temprana (Rust)

Nucleo logico del ecosistema de deslizamientos. Centraliza la carga de datos
(`../data`), la evaluacion de riesgo (heuristica propia o adaptador hacia
`../SLIDEGUARD_SOUP`), el calculo de capas territoriales, series temporales,
niveles de alerta y el broadcast en tiempo real hacia el `website` y la
`app-movile`. **Ni el website ni la app calculan riesgo por su cuenta**: solo
consumen esta API.

## Arquitectura (hexagonal / Clean Architecture)

```
src/
  domain/           Modelos y puertos (traits) puros, sin dependencias externas
    models.rs        RiskLevel, Layer, Zone, RiskAssessment, AlertMessage, etc.
    ports.rs         DataRepository, RiskPredictor (traits)
  application/
    services.rs      AppState: orquesta repositorio + predictor + hub de WS
  infrastructure/
    data_store.rs       Repositorio de capas/zonas (ver "Origen de los datos" abajo)
    heuristic_predictor.rs  Motor de riesgo heuristico determinista (activo por defecto)
    soup_adapter.rs      Adaptador opcional hacia SLIDEGUARD_SOUP (Python/subprocess)
    websocket_hub.rs     Hub de broadcast para /ws/alerts
    tcp_ingest.rs        Listener TCP crudo para el puerto de demo en vivo
  presentation/
    routes.rs        Definicion de rutas Axum + CORS
    handlers.rs      Handlers HTTP
    ws.rs            Handler del WebSocket /ws/alerts
  config.rs          Carga de variables de entorno (.env)
  lib.rs / main.rs    Punto de entrada (lib reutilizable + binario)
```

Stack: **Axum** + **Tokio** + **Serde** + **Tower-HTTP** (CORS). Pruebas de
integracion en `tests/integration.rs` contra la libreria `slideguard_backend`.

## Variable de marca: `SOLUTION_NAME`

Definida en `.env` (`SOLUTION_NAME=`), vacia por defecto. Se expone en
`GET /api/v1/config` como `solution_name`. El website y la app movil leen el
mismo valor desde sus propias variables homologas (`VITE_SOLUTION_NAME` y
`BuildConfig.SOLUTION_NAME`), de forma que cambiarla en los tres lugares (o
dejarla en blanco) mantiene todo consistente.

## Origen de los datos (transparencia)

- `../data` contiene una escena **NISAR L0B RRSD** (senal radar cruda, sin
  geocodificar) sobre la frontera amazonica Peru/Bolivia, **no** sobre La Paz.
  No hay en el workspace mapas InSAR procesados, DEM, lluvia ni edificios
  reales para La Paz.
- `../SLIDEGUARD_SOUP` no tiene modelos entrenados (`models/` solo tiene
  `.gitkeep`) ni datos de entrenamiento (los CSV son plantillas vacias), y sus
  umbrales de alerta estan en `null`.
- Por lo tanto, `infrastructure/data_store.rs` genera **capas y zonas
  sinteticas pero geometricamente coherentes** sobre La Paz/El Alto (semilla
  fija, reproducible), y `heuristic_predictor.rs` calcula el riesgo con una
  formula transparente y documentada (ver el modulo) que usa las mismas
  variables que SOUP (desplazamiento, lluvia 24h, pendiente, geologia).
- `infrastructure/soup_adapter.rs` ya esta listo para activarse automaticamente
  en cuanto existan `models/rainfall_rf.joblib` y `models/soup_landslide/`: en
  cada peticion comprueba su existencia y, si los encuentra, invoca
  `python3 src/run_alert.py` como subproceso y combina su probabilidad con la
  formula heuristica. Mientras no existan, el sistema opera 100% con el motor
  heuristico interno, de forma transparente para el resto de la arquitectura.

## Variables de entorno (`.env`)

| Variable | Descripcion | Default |
|---|---|---|
| `SOLUTION_NAME` | Nombre de marca (en blanco por defecto) | `` |
| `HTTP_HOST` / `HTTP_PORT` | Host/puerto del servidor REST + WS | `0.0.0.0` / `8080` |
| `LIVE_INGEST_TCP_PORT` | Puerto TCP crudo de ingesta en vivo (demo) | `8081` |
| `BASE_LAT` / `BASE_LON` | Coordenadas base (La Paz, Bolivia) | `-16.5204` / `-68.1297` |
| `NISAR_FILTERED_H5_PATH` | Ruta de referencia al HDF5 filtrado | ver `.env` |
| `SOUP_PYTHON_BIN` | Interprete Python para el adaptador SOUP | `python3` |
| `SOUP_PROJECT_DIR` | Ruta a `SLIDEGUARD_SOUP` | `../SLIDEGUARD_SOUP` |
| `RUST_LOG` | Nivel de logs (`tracing`) | `info` |

## Requisitos previos

- Rust estable (`rustup`), `cargo` ≥ 1.75
- (Opcional) Python 3 + dependencias de `SLIDEGUARD_SOUP` si se activa el adaptador

## Comandos

```bash
# Verificar que compila
cargo check

# Ejecutar la suite de pruebas (7 tests de integracion sobre capas, zonas,
# prediccion, simulacion, ingesta en vivo y alertas ciudadanas)
cargo test

# Levantar el servidor (HTTP :8080, WS en /ws/alerts, TCP demo :8081)
cargo run
```

Al arrancar, el log indica el motor de prediccion activo y las URLs:

```
Motor de prediccion activo: soup-adapter (fallback: heuristic-v1)
SOLUTION_NAME="" — servidor HTTP/WebSocket escuchando en http://0.0.0.0:8080
API base: http://0.0.0.0:8080/api/v1 — WebSocket alertas: ws://0.0.0.0:8080/ws/alerts
Ingesta en vivo (demo): HTTP POST /api/v1/ingest/live y TCP :8081
```

## API REST

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/api/v1/config` | Metadatos del sistema (`SOLUTION_NAME`, estado, coordenadas base) |
| GET | `/api/v1/layers` | Las 9 capas territoriales |
| GET | `/api/v1/zones` | Lista de zonas de monitoreo |
| GET | `/api/v1/zones/:id` | Evaluacion de riesgo de una zona |
| POST | `/api/v1/predict` | Evaluacion de riesgo para lat/lon (o `zone_id`) |
| POST | `/api/v1/simulate` | Simulacion variando `rain_multiplier`, `extra_displacement_mm`, `historical_date` |
| GET | `/api/v1/alerts/citizen` | Alertas activas, ligero, para `app-movile` |
| POST | `/api/v1/ingest/live` | Ingesta HTTP de telemetria en vivo (equivalente al puerto TCP) |
| WS | `/ws/alerts` | Broadcast en tiempo real (`live_alert` \| `heartbeat`) |

## Puerto de demostracion en tiempo real (Live Demo Ingestion)

Durante una demo, cualquier telemetria enviada a **TCP `:8081`** (una linea
JSON) o a `POST /api/v1/ingest/live` se procesa de inmediato con el motor de
prediccion activo y se reenvia por **`/ws/alerts`** a todos los clientes
conectados (website y app movil), disparando su animacion/alerta visual.

Script de prueba incluido:

```bash
# Via TCP (requiere `nc`)
./scripts/demo_injector.sh rain_spike   # pico de lluvia (ALERTA)
./scripts/demo_injector.sh critical     # desplazamiento critico (CRITICO)

# Alternativa en Python (sin dependencias externas)
python3 scripts/demo_injector.py --scenario critical

# Alternativa HTTP directa
curl -X POST http://localhost:8080/api/v1/ingest/live \
  -H 'Content-Type: application/json' \
  -d '{"lat":-16.5204,"lon":-68.1297,"zone_id":"zona-piloto-cotahuma","rain_24h_mm":70,"displacement_mm_month":34}'
```

Verificado end-to-end durante el desarrollo: conectar un cliente a
`ws://localhost:8080/ws/alerts`, ejecutar el injector y observar el mensaje
`{"type":"live_alert", "assessment": {...}}` llegar en menos de un segundo.
