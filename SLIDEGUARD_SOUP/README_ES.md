# SLIDEGUARD — Predicción de lluvia y alerta de deslizamientos

Proyecto base para Windows. Utiliza **Soup CLI** para entrenar un clasificador de riesgo de deslizamiento a partir de variables ambientales convertidas a registros de texto estructurado. Para pronosticar cantidad de lluvia en mm usa un modelo tabular de regresión (Random Forest), porque Soup está orientado principalmente al ajuste de modelos de lenguaje y clasificadores de secuencias, no a regresión meteorológica numérica.

> **Estado:** estructura de entrenamiento lista para integrar los datasets reales. No hay un modelo entrenado ni métricas reales todavía: los datasets de los compañeros aún no se han recibido. No se incluyen datos sintéticos como si fueran observaciones reales. El clasificador `task: classifier` de Soup se documenta como BETA, por lo que sus resultados deben validarse cuidadosamente.

## 1. Requisitos

- Windows 10/11 y PowerShell.
- Python 3.11 o 3.12 recomendado.
- Conexión a Internet la primera vez para instalar dependencias y descargar el modelo base.
- Para entrenar Soup: RAM suficiente. El clasificador encoder multilingüe es bastante menor que un LLM generativo grande, pero el entrenamiento puede ser lento en CPU. Una GPU NVIDIA acelera el proceso.

## 2. Preparar el entorno (PowerShell)

Desde la carpeta del proyecto:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install "soup-cli[train]"
```

Si PowerShell bloquea la activación del entorno, en esa terminal ejecuta:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Comprueba Soup:

```powershell
soup --version
soup doctor
```

Soup Zero (`trysoup.dev/zero`) se anuncia como una estación de trabajo en desarrollo. El motor que se utiliza aquí es el **Soup CLI abierto** del repositorio indicado.

## 3. Dataset de lluvia

Copia el archivo de lluvia de los compañeros a `data/raw/rainfall.csv`. La plantilla está en `data/raw/rainfall_template.csv`.

Columnas requeridas:

- `timestamp`: fecha y hora con zona horaria o fecha-hora local consistente, por ejemplo `2026-01-10 08:00:00`.
- `precipitation_mm`: precipitación observada en ese intervalo horario, en milímetros.

Columnas opcionales: `station_id`, `temperature_c`, `humidity_pct`, `pressure_hpa`, `wind_speed_kmh`.

**Importante:** la serie debe ser horaria o poder convertirse a frecuencia horaria sin inventar mediciones. El script no rellena lluvia faltante con cero. Varias estaciones deben tener un `station_id` estable.

Entrenar el pronóstico de acumulación de las próximas 6 horas:

```powershell
python -m src.train_rainfall --input data/raw/rainfall.csv
```

El modelo y el informe se guardan en `models/rainfall_rf.joblib` y `reports/rainfall_metrics.json`.

## 4. Dataset de deslizamientos

Copia los registros ya etiquetados a `data/raw/landslide_training.csv`. Usa como referencia la plantilla `data/raw/landslide_training_template.csv`.

Columnas mínimas:

- `event_next_24h`: 1 si se registró un deslizamiento en esa ubicación durante las siguientes 24 horas; 0 solo si se verificó que no ocurrió un evento.
- `rain_1h_mm`, `rain_24h_mm`, `rain_72h_mm`, `slope_deg`.

Columnas adicionales admitidas: `timestamp`, `latitude`, `longitude`, `elevation_m`, `soil_moisture`, `soil_type`, `geology`, `humidity_pct`, `land_cover`.

No convertir automáticamente filas sin evento en clase 0. La ausencia de un evento en un inventario incompleto no demuestra que no haya ocurrido.

Convertir CSV a JSONL para Soup:

```powershell
python -m src.prepare_soup_dataset --input data/raw/landslide_training.csv --output data/processed/landslide_soup.jsonl
```

Validar el dataset con Soup:

```powershell
soup data validate data/processed/landslide_soup.jsonl
soup data inspect data/processed/landslide_soup.jsonl
```

## 5. Entrenar el clasificador Soup

El archivo `config/soup_landslide.yaml` configura `task: classifier`, dos clases (`no_event_24h` y `event_24h`) y un encoder multilingüe. El ejemplo utiliza LoRA para reducir los parámetros entrenables. La tarea de clasificador en Soup se documenta como experimental/BETA en el repositorio; por ello hay que registrar la versión instalada y revisar las métricas antes de usar los resultados.

```powershell
soup train --config config/soup_landslide.yaml
```

La salida se configura en `models/soup_landslide`. El nombre y estructura exactos de los archivos guardados dependen de la versión de Soup; conserva toda la carpeta de salida.

## 6. Predicción de prueba

Después de entrenar el clasificador Soup:

```powershell
python -m src.predict_landslide --model models/soup_landslide --input data/raw/landslide_prediction_example.json
```

El JSON de ejemplo es una **plantilla vacía de entrada** para reemplazar con valores medidos. La salida incluye probabilidades del clasificador, no una garantía de que vaya a ocurrir un deslizamiento.

Para pronóstico de lluvia se necesita una serie real de las últimas 72 horas y un modelo entrenado:

```powershell
python -m src.predict_rainfall --model models/rainfall_rf.joblib --input data/raw/combined_prediction_template.json
```

Para ejecutar las dos predicciones y el motor de alertas en una sola operación, completa `data/raw/combined_prediction_template.json` con valores medidos y ejecuta:

```powershell
python -m src.run_alert --input data/raw/combined_prediction_template.json
```

## 7. Motor de alertas

`src/alert_engine.py` combina la predicción de lluvia y la probabilidad de deslizamiento. Los umbrales de `config/alert_thresholds.json` aparecen inicialmente como `null` y `calibrated: false` deliberadamente. Deben calibrarse con datos locales, validación temporal/espacial y criterios de Protección Civil/servicio geológico/meteorológico competente.

Mientras no se calibren, el motor devuelve `PENDIENTE_CALIBRACION`; no emite niveles rojo/naranja/amarillo que parezcan avisos oficiales. No usar este prototipo para ordenar evacuaciones ni sustituir sistemas oficiales.

## 8. Estructura

```text
SLIDEGUARD_SOUP/
├── config/
│   ├── soup_landslide.yaml
│   └── alert_thresholds.json
├── data/
│   ├── raw/          # datasets entregados por los compañeros
│   └── processed/    # JSONL generado para Soup
├── models/           # modelos entrenados
├── reports/          # métricas y validaciones
├── src/
│   ├── prepare_soup_dataset.py
│   ├── train_rainfall.py
│   ├── predict_landslide.py
│   ├── predict_rainfall.py
│   ├── run_alert.py
│   └── alert_engine.py
└── requirements.txt
```

## 9. Qué necesitamos para cerrar el entrenamiento

1. El dataset de lluvia con definición de intervalo, unidades, estación/coordenadas y zona horaria.
2. Inventario de deslizamientos con fecha/hora, coordenadas y fuente de verificación.
3. Datos de terreno (pendiente, elevación, suelo/geología) y cómo se relacionan espacialmente con las estaciones/eventos.
4. Definición del horizonte operativo que se desea alertar (por ejemplo, 6 h para lluvia y 24 h para deslizamiento).

Con los datasets reales se debe revisar cobertura, duplicados, faltantes, etiquetas, desequilibrio de clases y separación por tiempo/ubicación antes de afirmar métricas de rendimiento.
