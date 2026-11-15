from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

WEATHER = ["temperature_c", "humidity_pct", "pressure_hpa", "wind_speed_kmh"]
LAGS = [1, 3, 6, 12, 24, 48, 72]
ROLLS = [3, 6, 24, 72]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    bundle = joblib.load(args.model)
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    history = payload.get("rain_history_72h_mm", [])
    if not isinstance(history, list) or len(history) < 72:
        raise SystemExit("rain_history_72h_mm debe contener al menos 72 valores horarios, del más antiguo al más reciente.")
    rain = np.asarray(history[-72:], dtype=float)
    if not np.isfinite(rain).all() or (rain < 0).any():
        raise SystemExit("El historial contiene valores inválidos. No reemplaces mediciones faltantes por cero.")
    row = {}
    for lag in LAGS:
        row[f"rain_lag_{lag}h"] = float(rain[-lag])
    for window in ROLLS:
        row[f"rain_sum_{window}h"] = float(rain[-window:].sum())
    for col in WEATHER:
        row[col] = payload.get(col)
    X = pd.DataFrame([{col: row.get(col, np.nan) for col in bundle["features"]}])
    prediction = max(0.0, float(bundle["pipeline"].predict(X)[0]))
    print(json.dumps({
        "rain_next_6h_mm": prediction,
        "horizon_hours": 6,
        "model": "RandomForestRegressor",
        "warning": "Pronóstico experimental condicionado a la calidad y representatividad del historial horario."
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
