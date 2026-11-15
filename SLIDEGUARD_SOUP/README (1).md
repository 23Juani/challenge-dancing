# SLIDEGUARD — Predicción de lluvia y alertas de deslizamientos

**Entorno objetivo:** Windows 10/11 + PowerShell  
**Versión comprobada en el equipo:** Python 3.11.9, Soup CLI 0.77.2, PyTorch 2.15.0+cpu  
**Estado:** entorno de software instalado y verificado; entrenamiento pendiente de incorporar datasets reales.

SLIDEGUARD es un módulo de predicción que recibe datos meteorológicos y geoespaciales preparados por el equipo. Produce un pronóstico numérico de precipitación para las próximas 6 horas, una estimación de probabilidad de deslizamiento para las próximas 24 horas y una salida JSON para integrar con otro sistema.

> **Alcance técnico:** Soup CLI se utiliza para entrenar el clasificador de condiciones asociadas a deslizamientos. La predicción numérica de precipitación se entrena con Random Forest de scikit-learn, porque una regresión de milímetros de lluvia es una tarea tabular numérica y no un fine-tuning de lenguaje. Soup Zero (`https://trysoup.dev/zero`) aparece como “Coming soon”; este proyecto utiliza el motor abierto Soup CLI (`https://github.com/MakazhanAlpamys/Soup`).

> **Advertencia:** este es un prototipo de investigación. No es un sistema oficial de alerta temprana, no debe utilizarse para ordenar evacuaciones y no sustituye a SENAMHI, autoridades de protección civil ni personal geológico. Los umbrales permanecen desactivados hasta ser calibrados y aprobados con datos locales.

---

## 1. Arquitectura y flujo

```text
Datasets de entrada
  ├── Lluvia horaria (CSV)
  ├── Historial verificado de deslizamientos (CSV)
  ├── Topografía / pendiente / elevación
  ├── Suelo / geología / cobertura terrestre
  └── Observaciones meteorológicas complementarias
             │
             ▼
Validación y preprocesamiento
  ├── src/train_rainfall.py
  └── src/prepare_soup_dataset.py
             │
       ┌─────┴──────────────┐
       ▼                    ▼
RandomForestRegressor   Soup CLI classifier
Predicción lluvia       Riesgo de deslizamiento
próximas 6 h            próximas 24 h
       └─────┬──────────────┘
             ▼
       src/run_alert.py
             │
             ▼
       Resultado JSON
             │
             ▼
       Aplicación integradora
```

## 2. Estructura del proyecto

```text
SLIDEGUARD_SOUP/
├── config/
│   ├── alert_thresholds.json       # umbrales; inicialmente no calibrados
│   └── soup_landslide.yaml         # configuración de clasificación Soup
├── data/
│   ├── raw/                        # datos originales y plantillas
│   └── processed/                  # JSONL generado para Soup
├── models/                         # modelos entrenados; se generan localmente
├── reports/                        # métricas y resultados JSON
├── scripts/
│   ├── instalar_windows.ps1        # instalación/verificación de Windows
│   └── configurar_soup_path.ps1    # repara PATH y verifica Soup
├── src/
│   ├── train_rainfall.py           # entrena Random Forest de lluvia
│   ├── prepare_soup_dataset.py     # CSV etiquetado -> JSONL
│   ├── predict_rainfall.py         # predicción aislada de lluvia
│   ├── predict_landslide.py        # predicción aislada de deslizamiento
│   ├── alert_engine.py             # niveles de alerta
│   └── run_alert.py                # ejecuta el flujo completo
├── requirements.txt
├── requirements-soup.txt
├── README.md
└── README_ES.md
```

---

## 3. Abrir PowerShell en la carpeta correcta

Ejecuta este comando (ajusta la ruta si descomprimiste el proyecto en otra carpeta):

```powershell
Set-Location "C:\RetoNASA\SLIDEGUARD_SOUP_Windows\SLIDEGUARD_SOUP"
```

Comprueba que estás en la raíz del proyecto:

```powershell
Get-Location
Get-ChildItem
```

Todos los comandos de este manual se ejecutan desde esa carpeta.

## 4. Instalación y verificación de Soup en Windows

### 4.1. Lo que ya se comprobó en el equipo

El registro compartido por el usuario confirma:

- Python `3.11.9`.
- Soup CLI `0.77.2`.
- PyTorch `2.15.0+cpu`.
- Transformers `5.23.0`.
- pandas `3.1.1`.
- scikit-learn `1.9.1`.
- Soup Doctor: `All checks passed! Your environment is ready.`

Los avisos de `datasketch`, `lm-eval`, `wandb`, `deepspeed`, `unsloth`, `torchao`, `sglang` y `librosa` son dependencias opcionales. No son necesarias para el flujo de clasificación descrito aquí. `CPU only` es una advertencia de rendimiento, no un error.

**No reinstales paquetes si `soup doctor` ya termina con `All checks passed`.** En el equipo se utiliza el Python de WindowsApps y su carpeta de scripts del usuario; por eso el comando `soup` puede dejar de reconocerse al abrir una terminal nueva si `Scripts` no está en `PATH`.

### 4.2. Reparar PATH sin usar `py`

El lanzador `py` no está disponible en el equipo. Usa `python`. Este bloque detecta la carpeta correcta, la agrega a la sesión actual y al PATH del usuario, y ejecuta Soup por ruta completa:

```powershell
$ErrorActionPreference = "Stop"

$PythonExe = (Get-Command python -ErrorAction Stop).Source
$UserSite = (& $PythonExe -c "import site; print(site.getusersitepackages())").Trim()
$Scripts = Join-Path (Split-Path $UserSite -Parent) "Scripts"
$SoupExe = Join-Path $Scripts "soup.exe"

Write-Host "Python: $PythonExe"
Write-Host "Scripts: $Scripts"

if (!(Test-Path -LiteralPath $SoupExe -PathType Leaf)) {
    throw "No se encontró soup.exe en $Scripts. Ejecuta: python -m pip show -f soup-cli"
}

# PATH para esta ventana de PowerShell.
$env:Path = "$Scripts;$env:Path"

# PATH permanente para el usuario (no requiere administrador).
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathParts = @($UserPath -split ';') + @($Scripts)
$NewUserPath = ($PathParts | Where-Object { $_ } | Select-Object -Unique) -join ';'
[Environment]::SetEnvironmentVariable("Path", $NewUserPath, "User")

# Invocación por ruta completa: funciona incluso si el comando soup no se resuelve.
& $SoupExe --version
if ($LASTEXITCODE -ne 0) { throw "Soup no pudo mostrar la versión." }
& $SoupExe doctor
if ($LASTEXITCODE -ne 0) { throw "Soup Doctor detectó un problema." }
```

También se puede ejecutar el script incluido:

```powershell
.\scripts\configurar_soup_path.ps1
```

Después de guardar el PATH, cierra y vuelve a abrir PowerShell para que las nuevas ventanas lo carguen. Si el comando `soup` sigue sin reconocerse, vuelve a calcular `$SoupExe` con el bloque anterior y llama a Soup así:

```powershell
& $SoupExe --version
& $SoupExe doctor
```

### 4.3. Instalación desde cero (solo si faltan dependencias)

No es necesario repetir estos pasos en el equipo si Soup Doctor ya pasó. En una instalación nueva, desde la raíz del proyecto:

```powershell
python --version
python -m pip install --upgrade pip
python -m pip install -r .\requirements-soup.txt
```

No uses `py -3.11`: en el equipo comprobado el comando `py` no existe. El comando anterior instala también la base de entrenamiento de Soup. La primera instalación puede descargar PyTorch y otros paquetes grandes y necesita conexión a Internet.

Si PowerShell bloquea la ejecución de un archivo `.ps1`, permite scripts solo en la sesión actual:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

No es necesario modificar el Registro de Windows para seguir este manual. El intento anterior de activar `LongPathsEnabled` devolvió acceso denegado y no es un bloqueo actual: las dependencias quedaron instaladas y Soup Doctor pasó.

---

## 5. Datasets encontrados y cómo revisarlos

En la búsqueda realizada en el equipo aparecieron estos archivos en `Downloads`:

1. `Disaster_Charter_Acquisitions_sup_EN.csv`
2. `1. Bolivia - Superficie Autorizada para Desmonte, según Departamento 2001 - 2024.xlsx`
3. `2. Bolivia - Superficie Autorizada para Desmonte, según Tipo de Usuario 2001 - 2024.xlsx`

**No los copies automáticamente como `rainfall.csv` o `landslide_training.csv`.** Por su nombre, los dos Excel contienen estadísticas anuales de desmonte; pueden ser contexto ambiental, pero no son mediciones de precipitación ni etiquetas de deslizamientos. El CSV de adquisiciones de la Carta Internacional de Desastres es un candidato para revisar antecedentes, pero primero hay que inspeccionar sus columnas, tipos de desastre, fechas y ubicaciones. La lista de archivos no permite confirmar su contenido.

### 5.1. Copiar los tres archivos encontrados a una carpeta de fuentes

```powershell
New-Item -ItemType Directory -Force .\data\raw\fuentes_originales | Out-Null

$Downloads = Join-Path $env:USERPROFILE "Downloads"

$Candidates = @(
    "Disaster_Charter_Acquisitions_sup_EN.csv",
    "1. Bolivia - Superficie Autorizada para Desmonte, según Departamento 2001 - 2024.xlsx",
    "2. Bolivia - Superficie Autorizada para Desmonte, según Tipo de Usuario 2001 - 2024.xlsx"
)

foreach ($Name in $Candidates) {
    $Source = Join-Path $Downloads $Name
    if (Test-Path -LiteralPath $Source -PathType Leaf) {
        Copy-Item -LiteralPath $Source -Destination .\data\raw\fuentes_originales -Force
        Write-Host "Copiado: $Name" -ForegroundColor Green
    }
    else {
        Write-Warning "No encontrado: $Source"
    }
}

Get-ChildItem .\data\raw\fuentes_originales
```

### 5.2. Inspeccionar columnas y muestras desde PowerShell

`openpyxl` forma parte de `requirements.txt` y permite leer los Excel. Este análisis no modifica los archivos:

```powershell
@'
from pathlib import Path
import pandas as pd

base = Path("data/raw/fuentes_originales")

for path in sorted(base.glob("*")):
    print("\n" + "=" * 90)
    print("ARCHIVO:", path.name)
    print("=" * 90)

    try:
        if path.suffix.lower() == ".csv":
            df = pd.read_csv(path, sep=None, engine="python", encoding="utf-8-sig", nrows=10)
            print("COLUMNAS:", list(df.columns))
            print(df.head(10).to_string(index=False))
        elif path.suffix.lower() in (".xlsx", ".xls"):
            xls = pd.ExcelFile(path)
            print("HOJAS:", xls.sheet_names)
            for sheet in xls.sheet_names:
                df = pd.read_excel(path, sheet_name=sheet, nrows=8)
                print("\nHOJA:", sheet)
                print("COLUMNAS:", list(df.columns))
                print(df.head(8).to_string(index=False))
    except Exception as exc:
        print("NO SE PUDO LEER:", repr(exc))
'@ | python -
```

Revisa el resultado antes de decidir si una fuente puede convertirse en observaciones de entrenamiento. No se deben derivar etiquetas de deslizamiento solo porque exista una adquisición satelital o una declaración general de desastre.

---

## 6. Dataset de lluvia para Random Forest

### 6.1. Ubicación y columnas

Guarda el dataset meteorológico real como:

```text
data/raw/rainfall.csv
```

Columnas obligatorias:

| Columna | Descripción | Unidad / formato |
|---|---|---|
| `timestamp` | Fecha y hora de observación | `YYYY-MM-DD HH:MM:SS` |
| `precipitation_mm` | Precipitación observada en el intervalo | milímetros |

Columnas opcionales:

- `station_id`: identificador estable de estación.
- `temperature_c`: temperatura en °C.
- `humidity_pct`: humedad relativa en porcentaje.
- `pressure_hpa`: presión en hPa.
- `wind_speed_kmh`: velocidad del viento en km/h.

Ejemplo de estructura (solo ejemplo de formato; no son datos de entrenamiento):

```csv
timestamp,station_id,precipitation_mm,temperature_c,humidity_pct,pressure_hpa,wind_speed_kmh
2026-01-10 08:00:00,ESTACION_01,2.5,16.2,78,1012,8.2
2026-01-10 09:00:00,ESTACION_01,4.8,15.8,82,1011,7.9
```

### 6.2. Copiar un dataset real sin aceptar rutas vacías

Sustituye la ruta por el archivo real que te entreguen. El bloque aborta si presionas Enter sin escribir una ruta:

```powershell
$RainSource = (Read-Host "Ruta completa del CSV de lluvia").Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($RainSource)) { throw "No escribiste la ruta del CSV de lluvia." }
if (!(Test-Path -LiteralPath $RainSource -PathType Leaf)) { throw "No existe el archivo: $RainSource" }
if ([IO.Path]::GetExtension($RainSource).ToLowerInvariant() -ne ".csv") { throw "El archivo de lluvia debe ser CSV." }

Copy-Item -LiteralPath $RainSource -Destination .\data\raw\rainfall.csv -Force
Get-Content .\data\raw\rainfall.csv -TotalCount 5
```

### 6.3. Reglas de calidad

- Debe ser una serie temporal horaria o poder convertirse a una serie horaria sin inventar observaciones.
- Mantén la misma zona horaria y unidades a lo largo de la serie.
- Para cada estación, conserva un `station_id` estable.
- No conviertas automáticamente una medición faltante en `0 mm`: cero significa que se observó y no llovió; faltante significa que no hay dato.
- El entrenamiento crea características de las últimas 1, 3, 6, 12, 24, 48 y 72 horas y pronostica la suma de las siguientes 6 horas.
- El script requiere al menos 100 ventanas utilizables. En la práctica se necesita un historial horario continuo considerablemente mayor que 72 horas para formar las ventanas y reservar una prueba temporal.

### 6.4. Entrenar

```powershell
python -m src.train_rainfall --input .\data\raw\rainfall.csv
```

Salidas esperadas tras un entrenamiento exitoso:

```text
models/rainfall_rf.joblib
reports/rainfall_metrics.json
```

El informe contiene `MAE`, `RMSE`, `R²`, cantidad de ventanas y periodo de prueba. Son métricas experimentales para ese dataset; no demuestran generalización a otras estaciones o regiones.

---

## 7. Dataset de deslizamientos para Soup

### 7.1. Ubicación y columnas

Guarda el inventario etiquetado como:

```text
data/raw/landslide_training.csv
```

Columnas obligatorias:

| Columna | Significado |
|---|---|
| `event_next_24h` | `1` si hubo deslizamiento verificado en las siguientes 24 h; `0` si se verificó que no hubo evento |
| `rain_1h_mm` | Lluvia acumulada en 1 hora, mm |
| `rain_24h_mm` | Lluvia acumulada en 24 horas, mm |
| `rain_72h_mm` | Lluvia acumulada en 72 horas, mm |
| `slope_deg` | Pendiente del terreno en grados |

Columnas adicionales admitidas por el preprocesador:

- `timestamp`, `latitude`, `longitude`, `elevation_m`.
- `soil_moisture`, `soil_type`, `geology`, `humidity_pct`, `land_cover`.

Ejemplo de estructura (solo ejemplo de columnas; no son datos reales):

```csv
timestamp,latitude,longitude,rain_1h_mm,rain_24h_mm,rain_72h_mm,slope_deg,elevation_m,soil_moisture,soil_type,geology,humidity_pct,land_cover,event_next_24h
```

**Etiquetado:** `0` no significa “no encontré el evento en el CSV”. Significa que la ubicación y la ventana temporal fueron revisadas y se confirmó que no ocurrió un deslizamiento. El preprocesador exige las dos clases (`0` y `1`) y al menos 10 filas por clase como control mínimo, no como garantía de suficiencia estadística. No uses adquisiciones de desastre sin validar como etiquetas negativas o positivas.

### 7.2. Copiar el CSV real con validación de ruta

```powershell
$SlideSource = (Read-Host "Ruta completa del CSV de deslizamientos etiquetado").Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($SlideSource)) { throw "No escribiste la ruta del CSV de deslizamientos." }
if (!(Test-Path -LiteralPath $SlideSource -PathType Leaf)) { throw "No existe el archivo: $SlideSource" }
if ([IO.Path]::GetExtension($SlideSource).ToLowerInvariant() -ne ".csv") { throw "El archivo de deslizamientos debe ser CSV." }

Copy-Item -LiteralPath $SlideSource -Destination .\data\raw\landslide_training.csv -Force
Get-Content .\data\raw\landslide_training.csv -TotalCount 5
```

### 7.3. Convertir CSV a JSONL y validar

```powershell
python -m src.prepare_soup_dataset --input .\data\raw\landslide_training.csv --output .\data\processed\landslide_soup.jsonl
```

El programa comprueba columnas requeridas, valores numéricos, etiquetas `0/1` y la presencia de ambas clases. Si falta una columna o una etiqueta, detiene el proceso.

Valida e inspecciona el JSONL usando Soup:

```powershell
soup data validate .\data\processed\landslide_soup.jsonl
soup data inspect .\data\processed\landslide_soup.jsonl
```

Si `soup` no se reconoce en esa ventana, usa la ruta completa calculada en la sección 4.2:

```powershell
& $SoupExe data validate .\data\processed\landslide_soup.jsonl
& $SoupExe data inspect .\data\processed\landslide_soup.jsonl
```

### 7.4. Validar configuración y entrenar Soup

Primero valida el archivo de configuración y los datos sin comenzar el entrenamiento:

```powershell
& $SoupExe train --config .\config\soup_landslide.yaml --dry-run
```

Solo si el `dry-run` termina correctamente, inicia el entrenamiento:

```powershell
& $SoupExe train --config .\config\soup_landslide.yaml
```

La configuración actual utiliza `intfloat/multilingual-e5-small`, una tarea `classifier` de dos clases, longitud máxima 128, separación interna de validación del 20%, 3 épocas y batch size 2. No activa `classifier_lora`: entrena el clasificador completo para que la carpeta de salida sea un checkpoint Transformers que puedan cargar los scripts de predicción incluidos. El equipo comprobado tiene 8 GB de RAM y CPU, sin GPU; el entrenamiento puede ser lento. Si ocurre falta de memoria, reduce temporalmente `batch_size` a 1 y vuelve a ejecutar primero el `--dry-run`.

La clasificación de secuencias de Soup se documenta como una función BETA/experimental. Registra la versión (`soup --version`), conserva el log del entrenamiento y evalúa falsos negativos, falsos positivos, F1 y generalización por periodo/ubicación antes de usar el modelo.

Salida configurada:

```text
models/soup_landslide/
```

La estructura concreta de checkpoints depende de la versión. Conserva toda la carpeta de salida.

---

## 8. Predicción individual

### 8.1. Predicción de lluvia

Prepara `data/raw/rainfall_prediction_example.json` con al menos 72 valores horarios reales en `rain_history_72h_mm`, ordenados del más antiguo al más reciente. No uses una lista vacía ni reemplaces faltantes por cero.

```powershell
python -m src.predict_rainfall --model .\models\rainfall_rf.joblib --input .\data\raw\rainfall_prediction_example.json
```

La salida incluye `rain_next_6h_mm` y el horizonte de 6 horas.

### 8.2. Predicción de deslizamiento

Completa `data/raw/landslide_prediction_example.json` con mediciones del lugar que se desea evaluar. Como mínimo: lluvia 1 h, lluvia 24 h, lluvia 72 h y pendiente.

```powershell
python -m src.predict_landslide --model .\models\soup_landslide --input .\data\raw\landslide_prediction_example.json
```

La salida incluye probabilidades de clase para la ventana de 24 horas. No equivale a certeza de ocurrencia.

---

## 9. Ejecutar el motor completo de alertas

El archivo `data/raw/combined_prediction_template.json` requiere:

- `rain_history_72h_mm`: lista de al menos 72 observaciones horarias reales, del valor más antiguo al más reciente.
- Variables meteorológicas opcionales: `temperature_c`, `humidity_pct`, `pressure_hpa`, `wind_speed_kmh`.
- `landslide_features`: objeto con `rain_1h_mm`, `rain_24h_mm`, `rain_72h_mm`, `slope_deg` y las variables de terreno adicionales cuando estén disponibles.

Ejemplo de estructura, con números ficticios únicamente para mostrar el formato:

```json
{
  "rain_history_72h_mm": [0, 0, 0, 0],
  "temperature_c": 17.0,
  "humidity_pct": 82,
  "pressure_hpa": 1010,
  "wind_speed_kmh": 7,
  "landslide_features": {
    "rain_1h_mm": 3.2,
    "rain_24h_mm": 18.5,
    "rain_72h_mm": 42.0,
    "slope_deg": 28.0,
    "elevation_m": 3650,
    "soil_moisture": null,
    "soil_type": "no_reportado",
    "geology": "no_reportado",
    "humidity_pct": 82,
    "land_cover": "no_reportado"
  }
}
```

La lista abreviada de arriba **no es una entrada ejecutable**: el archivo real debe contener 72 valores horarios, no 4. Completa todas las mediciones obligatorias con datos reales.

Antes de correrlo, comprueba que existen ambos modelos:

```powershell
Test-Path .\models\rainfall_rf.joblib
Test-Path .\models\soup_landslide
```

Ambos deben devolver `True`. Después ejecuta:

```powershell
python -m src.run_alert --input .\data\raw\combined_prediction_template.json
```

`src/run_alert.py` imprime un objeto JSON en la terminal. No genera automáticamente un archivo de salida.

---

## 10. Integración con la aplicación principal

### 10.1. Contrato de integración

La aplicación integradora debe entregar un JSON con la estructura de `combined_prediction_template.json` y recibir el JSON que imprime `src/run_alert.py`.

El resultado contiene:

```json
{
  "rainfall_forecast": {
    "next_6h_mm": 0.0
  },
  "landslide_prediction": {
    "horizon_hours": 24,
    "event_probability": 0.0,
    "class_probabilities": {}
  },
  "alert": {
    "alert_level": "PENDIENTE_CALIBRACION",
    "operational_alert": false
  },
  "warning": "Prototipo de apoyo a investigación. No es un sistema oficial de alerta temprana."
}
```

Los valores anteriores son ilustrativos, no resultados de una predicción. Los nombres de los campos son el contrato que utiliza `src/run_alert.py` y `src/alert_engine.py`.

### 10.2. Invocar el motor desde PowerShell y guardar el JSON

Este bloque ejecuta el módulo, comprueba el código de salida, convierte la respuesta a objeto PowerShell y guarda el resultado en `reports/ultima_alerta.json`:

```powershell
$InputFile = (Resolve-Path .\data\raw\combined_prediction_template.json).Path
$OutputLines = & python -m src.run_alert --input $InputFile

if ($LASTEXITCODE -ne 0) {
    throw "SLIDEGUARD terminó con error. Revisa el mensaje anterior."
}

$OutputText = $OutputLines -join "`n"
$Result = $OutputText | ConvertFrom-Json

New-Item -ItemType Directory -Force .\reports | Out-Null
$Result | ConvertTo-Json -Depth 12 | Set-Content .\reports\ultima_alerta.json -Encoding UTF8

Write-Host "Pronóstico lluvia 6 h: $($Result.rainfall_forecast.next_6h_mm) mm"
Write-Host "Probabilidad deslizamiento: $($Result.landslide_prediction.event_probability)"
Write-Host "Nivel: $($Result.alert.alert_level)"
Write-Host "JSON guardado en reports\ultima_alerta.json"
```

### 10.3. Integrar desde otro backend

En el backend de la aplicación principal, la integración mínima consiste en:

1. Crear o recibir un JSON con el contrato de entrada descrito arriba.
2. Ejecutar `python -m src.run_alert --input ruta/al/archivo.json` desde la carpeta raíz de SLIDEGUARD.
3. Comprobar que el proceso termina con código `0`.
4. Leer `stdout` y parsearlo como JSON.
5. Entregar ese objeto al frontend o guardarlo en la base de datos.

**No existe todavía una API HTTP/FastAPI implementada en este paquete.** La integración entregada es por línea de comandos y JSON. Si la aplicación necesita HTTP, se debe desarrollar y probar un wrapper FastAPI aparte; no se debe asumir que existe un endpoint `/predict`.

---

## 11. Calibración y niveles de alerta

`config/alert_thresholds.json` comienza con:

```json
"calibrated": false
```

y los límites de lluvia y probabilidad se encuentran en `null` deliberadamente. Mientras permanezca así, el motor devuelve:

```text
PENDIENTE_CALIBRACION
```

No cambies `calibrated` a `true` ni inventes límites para obtener colores de alerta. La calibración requiere un conjunto local independiente, validación temporal y espacial, evaluación de falsas alarmas y eventos no detectados, y revisión por personal meteorológico/geológico y autoridades competentes.

---

## 12. Problemas frecuentes en PowerShell

### `py` no se reconoce

Usa `python`, no `py`:

```powershell
python --version
python -m pip --version
```

### `soup` no se reconoce

Ejecuta la sección 4.2. Si persiste, usa el ejecutable por ruta completa:

```powershell
& $SoupExe --version
& $SoupExe doctor
```

### `Activate.ps1` no existe

El entorno virtual `.venv` no se creó. Este proyecto no exige activar un entorno virtual para utilizar la instalación global ya verificada. No ejecutes `Activate.ps1` si no existe `.venv\Scripts\Activate.ps1`.

### `FileNotFoundError: rainfall.csv`

El archivo real no está en `data/raw/rainfall.csv`. Revisa `Get-ChildItem .\data\raw` y copia el dataset real como se indica en la sección 6.2.

### `No existe el archivo: landslide_training.csv`

El CSV etiquetado no está en `data/raw/landslide_training.csv`. Cópialo siguiendo la sección 7.2.

### `File not found: data/processed/landslide_soup.jsonl`

No se generó JSONL porque falló o no se ejecutó la conversión. Primero ejecuta correctamente `src.prepare_soup_dataset.py` como módulo:

```powershell
python -m src.prepare_soup_dataset --input .\data\raw\landslide_training.csv --output .\data\processed\landslide_soup.jsonl
```

### `models/rainfall_rf.joblib` no existe

No se entrenó correctamente el modelo de lluvia. No ejecutes el motor combinado hasta que `Test-Path .\models\rainfall_rf.joblib` devuelva `True`.

### `CPU only`

No es un error. Soup trabaja en CPU, pero puede tardar. Cierra otras aplicaciones y reduce `batch_size` a 2 si se agota la memoria.

### `Acceso denegado` al modificar el Registro

No hace falta modificar el Registro para continuar. El intento previo de habilitar rutas largas no es necesario para el entorno que pasó Soup Doctor.

---

## 13. Orden recomendado de ejecución

Desde la raíz del proyecto, sigue este orden:

```powershell
# 1. Verificar el entorno
python --version
& $SoupExe --version
& $SoupExe doctor

# 2. Comprobar los archivos de entrenamiento
Get-ChildItem .\data\raw

# 3. Entrenar lluvia (después de copiar el CSV real)
python -m src.train_rainfall --input .\data\raw\rainfall.csv

# 4. Convertir etiquetas de deslizamiento (después de copiar el CSV real)
python -m src.prepare_soup_dataset --input .\data\raw\landslide_training.csv --output .\data\processed\landslide_soup.jsonl

# 5. Validar los datos y la configuración Soup
& $SoupExe data validate .\data\processed\landslide_soup.jsonl
& $SoupExe data inspect .\data\processed\landslide_soup.jsonl
& $SoupExe train --config .\config\soup_landslide.yaml --dry-run

# 6. Entrenar el clasificador
& $SoupExe train --config .\config\soup_landslide.yaml

# 7. Confirmar que los modelos existen
Test-Path .\models\rainfall_rf.joblib
Test-Path .\models\soup_landslide

# 8. Ejecutar alertas (después de completar el JSON de entrada con datos reales)
python -m src.run_alert --input .\data\raw\combined_prediction_template.json
```

No pegues todo el bloque de una vez si el primer comando de entrenamiento falla: corrige cada etapa antes de continuar.

---

## 14. Referencias

- Soup CLI (repositorio): https://github.com/MakazhanAlpamys/Soup
- Soup Zero: https://trysoup.dev/zero
- Soup — instalación y README: https://github.com/MakazhanAlpamys/Soup#readme
- Soup — clasificación y entrenamiento: https://github.com/MakazhanAlpamys/Soup/blob/main/docs/training.md
- Soup — formatos y validación de datos: https://github.com/MakazhanAlpamys/Soup/blob/main/docs/data.md
- scikit-learn: https://scikit-learn.org/stable/

## 15. Estado real del proyecto

| Componente | Estado |
|---|---|
| Python / dependencias | Instalados en el equipo; verificaciones correctas |
| Soup CLI 0.77.2 | Instalado; `soup doctor` pasó |
| Modelo de lluvia | Pendiente de CSV meteorológico real y entrenamiento |
| Clasificador Soup | Pendiente de inventario etiquetado y entrenamiento |
| Motor de alertas | Código presente; depende de ambos modelos |
| Umbrales operativos | No calibrados; alertas operativas desactivadas |
| API HTTP | No implementada; integración actual por CLI + JSON |

**No se han calculado métricas de rendimiento ni se ha entrenado un modelo final con datos reales.** Esos resultados se generarán después de recibir, revisar y validar los datasets del equipo.
