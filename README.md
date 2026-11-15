# Sistema de Prediccion y Alerta Temprana de Deslizamientos de Tierra

Ecosistema completo de prediccion, visualizacion y alerta temprana de
deslizamientos, enfocado en **La Paz / El Alto (Bolivia)**: un backend central
en Rust, una plataforma web 3D interactiva (Three.js), una app Android nativa
para ciudadanos y choferes, y el modulo de ciencia de datos `SLIDEGUARD_SOUP`.

El nombre comercial de la solucion esta deliberadamente en blanco
(`SOLUTION_NAME=""`) hasta definirse; es una unica variable repetida en los
cuatro componentes (ver seccion "Variable de marca" abajo).

## Arquitectura general

```
                      ┌─────────────────────────┐
                      │   SLIDEGUARD_SOUP (Py)   │  modelos de ML (aun sin entrenar)
                      │ run_alert / predict_*    │  ver SLIDEGUARD_SOUP/README.md
                      └────────────┬────────────┘
                                   │ subproceso (si existen modelos)
                                   ▼
┌──────────────┐   REST + WS   ┌─────────────────────────┐   REST + WS   ┌──────────────┐
│   website    │◄─────────────►│        backend          │◄─────────────►│  app-movile   │
│ Vite + Three │               │   Rust · Axum · Tokio    │               │ Kotlin · Compose │
│   (HUD 3D)   │               │  Clean/Hexagonal Arch.   │               │  (MVVM)       │
└──────────────┘               └────────────┬────────────┘               └──────────────┘
                                             │
                                   lee metadatos de
                                             ▼
                                      ┌──────────────┐
                                      │    ./data     │  NISAR L0B RRSD (NASA)
                                      └──────────────┘
```

**Todo el calculo de riesgo vive en el backend.** El website y la app movil
son clientes puros de la API REST (`/api/v1/*`) y del WebSocket
(`/ws/alerts`); ninguno de los dos implementa logica de prediccion propia.

| Componente | Stack | Rol |
|---|---|---|
| [`backend/`](backend/README.md) | Rust, Axum, Tokio | Nucleo logico: datos, prediccion, API, WebSocket, ingesta en vivo |
| [`website/`](website/README.md) | Vite, JavaScript ES6+, Three.js | Visualizacion 3D interactiva + HUD glassmorphism |
| [`app-movile/`](app-movile/README.md) | Kotlin, Jetpack Compose | App nativa para ciudadanos/choferes (semaforo de riesgo, alertas) |
| [`SLIDEGUARD_SOUP/`](SLIDEGUARD_SOUP/README.md) | Python (scikit-learn, HuggingFace) | Modulo de ML para lluvia y clasificacion de deslizamientos |
| [`data/`](data/JUSTIFICACION_FILTRADO_DESLIZAMIENTOS.md) | HDF5 (NISAR), notebooks | Dataset NASA filtrado y su justificacion |

## Variable de marca: `SOLUTION_NAME`

Una sola variable, repetida (no derivada) en cada componente para mantenerlos
desacoplados:

| Componente | Donde se define | Como se consume |
|---|---|---|
| Backend | `backend/.env` → `SOLUTION_NAME=` | `GET /api/v1/config` → `solution_name` |
| Website | `website/.env` → `VITE_SOLUTION_NAME=` | `website/src/config.js` |
| App movil | `app-movile/app/build.gradle.kts` → `buildConfigField("String", "SOLUTION_NAME", "\"\"")` | `BuildConfig.SOLUTION_NAME` (y `@string/solution_name` para XML legacy) |

Vacia por defecto: toda la UI renderiza el espacio limpiamente sin textos
rotos hasta que se defina un nombre, cambiando un solo valor por componente.

## Transparencia sobre el origen de los datos

Es importante dejarlo explicito para cualquiera que continue el proyecto:

- **`./data`** contiene una escena **NISAR L0B RRSD** (senal radar cruda, sin
  geocodificar), cubriendo la frontera amazonica Peru/Bolivia — **no** La Paz.
  No hay en el repositorio mapas InSAR procesados, DEM, lluvia real ni
  catastro de edificios para La Paz.
- **`SLIDEGUARD_SOUP`** tiene el codigo de inferencia completo, pero **sin
  modelos entrenados** (`models/` vacio) ni datos de entrenamiento (CSVs solo
  con encabezados), y sus umbrales de alerta estan sin calibrar.
- Por lo tanto, el backend genera **capas territoriales y zonas de monitoreo
  sinteticas pero geometricamente coherentes** sobre La Paz/El Alto (semilla
  fija y reproducible), y calcula el riesgo con una **formula heuristica
  transparente** que usa las mismas variables que usaria SOUP (desplazamiento,
  lluvia 24h, pendiente, geologia). Esto se documenta en detalle en
  `backend/README.md` y en los comentarios de
  `backend/src/infrastructure/data_store.rs` y `heuristic_predictor.rs`.
- El puente hacia `SLIDEGUARD_SOUP` (`backend/src/infrastructure/soup_adapter.rs`)
  ya esta implementado y se activa automaticamente en cuanto existan los
  modelos reales — ver `SLIDEGUARD_SOUP/README.md`.

## Como levantar todo el ecosistema (paso a paso)

### 0. Requisitos previos

- **Rust** estable (`rustup`) con `cargo`
- **Node.js** ≥ 18 y npm
- **JDK 17** (para compilar la app Android) y el **Android SDK** (via Android
  Studio o `cmdline-tools`), con `ANDROID_HOME`/`local.properties` configurado
- (Opcional) **Python 3** + dependencias de `SLIDEGUARD_SOUP` si se activa el
  adaptador de ML

### 1. Backend (obligatorio, primero)

```bash
cd backend
cargo check     # verificar que compila
cargo test      # correr la suite de pruebas
cargo run       # levanta HTTP :8080, WS /ws/alerts, TCP demo :8081
```

Confirma en el log que el servidor quedo escuchando en
`http://0.0.0.0:8080` antes de continuar.

### 2. Website

```bash
cd website
npm install
npm run dev      # http://localhost:5173 (usa VITE_API_BASE_URL=http://localhost:8080)
# o, para produccion:
npm run build && npm run preview
```

### 3. App movil (Android Studio o CLI)

```bash
cd app-movile
export JAVA_HOME=/ruta/a/tu/jdk-17
./gradlew assembleDebug
# Instalar en un emulador (host por defecto 10.0.2.2:8080 -> backend del host)
# o abrir la carpeta app-movile/ directamente en Android Studio y pulsar Run.
```

### 4. Probar la demo en tiempo real end-to-end

Con el backend, el website (o la app) corriendo:

```bash
cd backend
./scripts/demo_injector.sh critical
# o: python3 scripts/demo_injector.py --scenario rain_spike
```

El website debe mostrar el flash de alerta + overlay a pantalla completa en
segundos, y la app movil (si esta conectada al mismo backend) debe disparar
su alerta sonora/visual de pantalla completa.

## Pruebas y verificacion realizadas

- `backend`: `cargo check` y `cargo test` (7 pruebas de integracion) ✅
- `website`: `npm install && npm run build` ✅, mas verificacion manual del
  flujo WebSocket (heartbeat y `live_alert`) contra el backend real ✅
- `app-movile`: `./gradlew assembleDebug` ✅ (APK generado en
  `app-movile/app/build/outputs/apk/debug/app-debug.apk`)

## Estructura del repositorio

```
.
├── backend/              Rust — API, WebSocket, motor de prediccion
├── website/               Vite + Three.js — plataforma 3D + HUD
├── app-movile/            Kotlin + Compose — app ciudadana
├── SLIDEGUARD_SOUP/        Python — modulo de ML (lluvia + deslizamientos)
├── data/                   Dataset NASA/NISAR filtrado + justificacion
├── website-ref.jpg                        Referencia visual (Image-to-Code)
├── WhatsApp Image 2026-11-14 at 21.05.02.jpeg  Referencia visual del HUD
└── README.md                              Este archivo
```
