from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from src.alert_engine import evaluate_alert

WEATHER = ["temperature_c", "humidity_pct", "pressure_hpa", "wind_speed_kmh"]
LAGS = [1, 3, 6, 12, 24, 48, 72]
ROLLS = [3, 6, 24, 72]
NUMERIC = ["rain_1h_mm", "rain_24h_mm", "rain_72h_mm", "slope_deg", "elevation_m", "soil_moisture", "humidity_pct", "latitude", "longitude"]
CATEGORICAL = ["soil_type", "geology", "land_cover"]


def get_rain_forecast(bundle: dict, payload: dict) -> float:
    history = payload.get("rain_history_72h_mm", [])
    if not isinstance(history, list) or len(history) < 72:
        raise ValueError("rain_history_72h_mm debe tener al menos 72 observaciones horarias.")
    rain = np.asarray(history[-72:], dtype=float)
    if not np.isfinite(rain).all() or (rain < 0).any():
        raise ValueError("Historial de lluvia con valores no válidos.")
    row = {}
    for lag in LAGS:
        row[f"rain_lag_{lag}h"] = float(rain[-lag])
    for window in ROLLS:
        row[f"rain_sum_{window}h"] = float(rain[-window:].sum())
    for col in WEATHER:
        row[col] = payload.get(col)
    X = pd.DataFrame([{c: row.get(c, np.nan) for c in bundle["features"]}])
    return max(0.0, float(bundle["pipeline"].predict(X)[0]))


def get_landslide_probability(model_dir: Path, row: dict) -> tuple[float, dict]:
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    parts = ["Evaluacion de condiciones para deslizamiento en las proximas 24 horas."]
    for key in NUMERIC + CATEGORICAL:
        value = row.get(key)
        parts.append(f"{key}={value if value is not None else 'no_reportado'}")
    encoded = tokenizer("; ".join(parts), return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        probs = torch.softmax(model(**encoded).logits, dim=-1)[0].cpu().tolist()
    labels = model.config.id2label or {}
    class_probs = {str(labels.get(i, f"LABEL_{i}")): float(p) for i, p in enumerate(probs)}
    event_idx = next((i for i, label in labels.items() if str(label).lower() == "event_24h"), 1)
    event_prob = float(probs[int(event_idx)])
    return event_prob, class_probs


def main() -> None:
    parser = argparse.ArgumentParser(description="Ejecuta el pronóstico de lluvia y la evaluación de riesgo de deslizamiento.")
    parser.add_argument("--input", required=True, help="JSON que contiene historial horario y variables del terreno")
    parser.add_argument("--rain-model", default="models/rainfall_rf.joblib")
    parser.add_argument("--landslide-model", default="models/soup_landslide")
    parser.add_argument("--thresholds", default="config/alert_thresholds.json")
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    bundle = joblib.load(args.rain_model)
    rain_mm = get_rain_forecast(bundle, payload)
    landslide_features = payload.get("landslide_features", {})
    required = ["rain_1h_mm", "rain_24h_mm", "rain_72h_mm", "slope_deg"]
    missing = [key for key in required if landslide_features.get(key) is None]
    if missing:
        raise SystemExit(f"Completa landslide_features antes de alertar: {', '.join(missing)}")
    event_prob, class_probs = get_landslide_probability(Path(args.landslide_model), landslide_features)
    alert = evaluate_alert(rain_mm, event_prob, args.thresholds)
    result = {
        "rainfall_forecast": {"next_6h_mm": rain_mm},
        "landslide_prediction": {"horizon_hours": 24, "event_probability": event_prob, "class_probabilities": class_probs},
        "alert": alert,
        "warning": "Prototipo de apoyo a investigación. No es un sistema oficial de alerta temprana."
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
