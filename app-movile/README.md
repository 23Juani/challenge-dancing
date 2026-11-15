# App Movil Ciudadana — `app-movile` (Kotlin + Jetpack Compose)

Aplicacion Android nativa para **ciudadanos de a pie y choferes**, enfocada en
lectura rapida y alto contraste: semaforo de riesgo, zonas de peligro y
alertas en tiempo real desde el backend en Rust. Toda la prediccion de riesgo
viene del backend: la app solo consume `GET /api/v1/alerts/citizen`,
`GET /api/v1/zones` y el WebSocket `/ws/alerts`.

## Arquitectura (MVVM + Clean Architecture)

```
app/src/main/java/com/slideguard/citizen/
  core/
    AppSettings.kt            DataStore: host/puerto del servidor, modo conductor
  data/
    remote/
      ApiService.kt            Interfaz Retrofit (config, alerts, zones)
      dto/Dtos.kt              DTOs (Gson) que reflejan el contrato del backend
      NetworkModule.kt         Fabrica de OkHttp/Retrofit (host/puerto configurables)
      AlertsWebSocketClient.kt Cliente WebSocket /ws/alerts con reconexion
    repository/
      AlertsRepositoryImpl.kt  Traduce DTOs -> modelos de dominio
  domain/
    model/Models.kt            RiskLevel, CitizenAlert, DangerZone, RiskAssessment
    repository/AlertsRepository.kt  Puerto de dominio (interfaz)
  presentation/
    viewmodel/MainViewModel.kt StateFlow unico de UI (MVVM)
    ui/
      theme/                   Color.kt, Theme.kt (dark, alto contraste)
      components/              RiskTrafficLight, ServerConfigDialog, FullScreenAlertOverlay
      screens/HomeScreen.kt    Pantalla principal
  MainActivity.kt              Host de Compose
```

## Variable de marca: `SOLUTION_NAME`

Definida en **un solo lugar**: `app/build.gradle.kts` →
`buildConfigField("String", "SOLUTION_NAME", "\"\"")` (vacia por defecto),
expuesta en runtime como `BuildConfig.SOLUTION_NAME` y leida por
`AppSettings.solutionName`. Tambien existe el recurso homologo
`res/values/strings.xml` → `@string/solution_name` (vacio) para vistas XML
legacy que no usen Compose/Kotlin directamente. El backend (`.env`) y el
website (`VITE_SOLUTION_NAME`) usan la misma convencion.

## Requisitos previos

- **Android Studio** (Koala o superior) o Gradle + JDK 17 desde linea de comandos
- JDK 17
- Android SDK con `compileSdk`/`targetSdk` 35, `minSdk` 26 (API 26, Android 8.0+)
- Un emulador o dispositivo fisico

## Abrir en Android Studio

1. `Open` → selecciona la carpeta `app-movile/` (no un archivo).
2. Deja que Android Studio sincronice Gradle (usa el wrapper incluido,
   `./gradlew`, Gradle 8.9).
3. Selecciona el modulo `app` y ejecuta (`Run ▶`) sobre un emulador o
   dispositivo.

## Compilar por linea de comandos

```bash
# Requiere JAVA_HOME apuntando a un JDK 17 y el Android SDK instalado
export JAVA_HOME=/path/a/tu/jdk-17
./gradlew assembleDebug
# APK generado en: app/build/outputs/apk/debug/app-debug.apk
```

`local.properties` (no versionado) debe apuntar al SDK, por ejemplo:

```
sdk.dir=/Users/tu_usuario/Library/Android/sdk
```

## Pantallas y funcionalidad

- **Pantalla principal**: selector Modo Peaton / Modo Conductor, semaforo de
  riesgo (`RiskTrafficLight`: Verde=Seguro, Amarillo=Precaucion,
  Rojo=Alerta/Via Cerrada), lista de zonas de peligro monitoreadas y alertas
  activas (con la guia especifica para peaton o conductor segun el modo).
- **Conexion en tiempo real**: `AlertsWebSocketClient` escucha
  `/ws/alerts`. Al llegar un `live_alert` (disparado por el puerto de demo del
  backend), se muestra `FullScreenAlertOverlay`: pantalla completa, parpadeo
  rojo y el mensaje "¡ALERTA DE DESLIZAMIENTO DETECTADA EN TU RUTA!" con
  instrucciones inmediatas segun el modo activo.
- **Configuracion de servidor**: icono de ajustes en la barra superior abre
  `ServerConfigDialog` para cambiar IP/puerto del backend. Por defecto
  `10.0.2.2:8080` (alias del `localhost` de la maquina anfitriona desde el
  emulador Android); en un dispositivo fisico, usar la IP de la laptop en la
  red local durante la demo.

## Probar el flujo de alerta en vivo

1. Levantar el backend (`cd ../backend && cargo run`).
2. Instalar y abrir la app en el emulador (host por defecto `10.0.2.2:8080`
   ya apunta al backend del host).
3. Ejecutar `../backend/scripts/demo_injector.sh critical` en otra terminal.
4. La app debe mostrar la alerta a pantalla completa en segundos.

## Nota sobre el origen de los datos

Las zonas de peligro y alertas provienen integramente del backend (capas
sinteticas pero coherentes sobre La Paz/El Alto; ver
`../backend/README.md`). La app no calcula ni ajusta ningun valor de riesgo.
