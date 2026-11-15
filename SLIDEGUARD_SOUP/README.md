# SLIDEGUARD_SOUP — Integracion con el Backend (Puente de Inferencia)

Este archivo documenta especificamente **como el backend en Rust (`../backend`)
se integra con este proyecto Python**. Para la documentacion completa del
modulo de prediccion en si (arquitectura, entrenamiento, CLI, Soup CLI,
formato de datasets), ver `README (1).md` (version detallada en espanol/ingles
tecnico) y `README_ES.md`.

## Estado actual de los artefactos

| Artefacto | Esperado en | Presente en este workspace |
|---|---|---|
| Modelo de lluvia (RandomForest, joblib) | `models/rainfall_rf.joblib` | ❌ No (solo `.gitkeep`) |
| Clasificador de deslizamientos (LoRA / HuggingFace) | `models/soup_landslide/` | ❌ No |
| Datos de entrenamiento | `data/raw/*.csv` | ❌ Solo plantillas vacias (encabezados) |
| Umbrales de alerta calibrados | `config/alert_thresholds.json` | ❌ `calibrated: false`, todos los umbrales en `null` |

Es decir: el codigo de inferencia (`src/run_alert.py`, `src/predict_rainfall.py`,
`src/predict_landslide.py`, `src/alert_engine.py`) existe y es funcional, pero
**no hay pesos entrenados que ejecutar todavia**.

## Por que no se uso ONNX Runtime ni PyO3

Se evaluo construir un puente ONNX Runtime (para el modelo de lluvia) o PyO3
(embebiendo el interprete Python en el binario de Rust), pero ambos requieren
artefactos serializados reales para tener sentido:

- El modelo de lluvia esta pensado para serializarse con **joblib**
  (`rainfall_rf.joblib`), no en formato ONNX. Convertirlo requeriria
  `skl2onnx` y, sobre todo, un modelo ya entrenado — que no existe aqui.
- El clasificador de deslizamientos es un modelo de HuggingFace con **LoRA**
  (`intfloat/multilingual-e5-small` + adaptador), pensado para ejecutarse con
  `transformers`/`torch`. Empotrarlo via PyO3 anadiria una dependencia pesada
  (libtorch) al backend para un modelo que aun no existe en el repo.

Por eso, el **puente de inferencia optimo dado el estado real del proyecto**
es un **adaptador por subproceso**, implementado en
`../backend/src/infrastructure/soup_adapter.rs`:

1. En cada peticion de prediccion, el adaptador comprueba si
   `models/rainfall_rf.joblib` existe y si `models/soup_landslide/` es un
   directorio presente.
2. **Si existen** (es decir, en cuanto el equipo de datos entrene y publique
   los modelos): invoca `python3 src/run_alert.py --input -` como subproceso,
   le pasa un JSON por `stdin` con las features de la zona
   (`latitude`, `longitude`, `slope_deg`, `elevation_m`, `geology`,
   `land_cover`, `rain_history_72h_mm`), lee `event_24h_probability` de la
   salida JSON por `stdout`, y lo combina con la puntuacion del motor
   heuristico interno del backend.
3. **Si no existen** (el caso actual): el adaptador delega 100% en el motor
   heuristico interno (`heuristic_predictor.rs`), que implementa la misma
   formula de riesgo (ponderando desplazamiento InSAR, lluvia 24h, pendiente y
   susceptibilidad geologica) de forma transparente y documentada en el
   codigo, para que el sistema completo (website, app movil) funcione end to
   end mientras los modelos de ML no esten disponibles.

Esto deja el puente **ya construido y probado** (con pruebas automatizadas en
`../backend/tests/integration.rs`): no requiere cambios en el resto de la
arquitectura del backend para activarse, solo que `models/rainfall_rf.joblib`
y `models/soup_landslide/` existan con el formato que `run_alert.py` ya
espera.

## Activar el puente cuando existan modelos

1. Entrenar y exportar los modelos siguiendo `README (1).md` (secciones de
   entrenamiento con Soup CLI y `train_rainfall.py`).
2. Colocar los artefactos en `models/rainfall_rf.joblib` y
   `models/soup_landslide/` dentro de esta carpeta.
3. Calibrar `config/alert_thresholds.json` (actualmente en `null`).
4. Reiniciar el backend: el log mostrara
   `Motor de prediccion activo: soup-adapter (fallback: heuristic-v1)` y, a
   partir de ese momento, cada peticion que encuentre los modelos usara
   `engine: "soup-adapter"` en la respuesta JSON de `RiskAssessment` en vez de
   `"heuristic-v1"`.

No se requiere ninguna variable de entorno adicional: `SOUP_PYTHON_BIN` y
`SOUP_PROJECT_DIR` en `../backend/.env` ya apuntan a `python3` y a esta
carpeta respectivamente.

## Requisitos previos para activar el adaptador

```bash
pip install -r requirements.txt
# Opcional, solo si se usa el clasificador LoRA de deslizamientos:
pip install -r requirements-soup.txt
```

## Verificacion manual del puente (sin modelos reales)

Como no hay modelos, `run_alert.py` fallara si se invoca directamente; esto es
esperado y el backend lo maneja con su *fallback* automatico. Para verificar
que el *fallback* funciona, basta con levantar el backend normalmente
(`cd ../backend && cargo run`) y observar en el log que el motor activo es
`soup-adapter (fallback: heuristic-v1)`, y que `GET /api/v1/zones/:id`
responde con `"engine":"heuristic-v1"`.
