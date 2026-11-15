from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline

WEATHER = ["temperature_c", "humidity_pct", "pressure_hpa", "wind_speed_kmh"]
LAGS = [1, 3, 6, 12, 24, 48, 72]
ROLLS = [3, 6, 24, 72]


def load_hourly(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {"timestamp", "precipitation_mm"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Faltan columnas: {', '.join(sorted(missing))}")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df["precipitation_mm"] = pd.to_numeric(df["precipitation_mm"], errors="coerce")
    df = df.dropna(subset=["timestamp", "precipitation_mm"])
    if df.empty:
        raise ValueError("No hay observaciones válidas de lluvia.")
    if (df["precipitation_mm"] < 0).any():
        raise ValueError("Hay precipitaciones negativas; revisa unidades y códigos de faltantes.")
    if "station_id" not in df.columns:
        df["station_id"] = "station_0"
    for col in WEATHER:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    frames = []
    for station, group in df.groupby("station_id", dropna=False):
        group = group.sort_values("timestamp").set_index("timestamp")
        agg = {"precipitation_mm": "sum"}
        for col in WEATHER:
            if col in group.columns:
                agg[col] = "mean"
        hourly = group.resample("1h").agg(agg)
        hourly["station_id"] = str(station)
        frames.append(hourly)
    return pd.concat(frames).sort_index()


def build_supervised(hourly: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    chunks = []
    for station, group in hourly.groupby("station_id"):
        g = group.sort_index().copy()
        s = g["precipitation_mm"]
        x = pd.DataFrame(index=g.index)
        for lag in LAGS:
            x[f"rain_lag_{lag}h"] = s.shift(lag - 1)
        for window in ROLLS:
            x[f"rain_sum_{window}h"] = s.rolling(window=window, min_periods=window).sum()
        for col in WEATHER:
            if col in g.columns:
                x[col] = g[col]
        future = pd.concat([s.shift(-h).rename(str(h)) for h in range(1, 7)], axis=1)
        y = future.sum(axis=1, min_count=6).rename("rain_next_6h_mm")
        part = x.join(y).dropna(subset=["rain_next_6h_mm"])
        part["_timestamp"] = part.index
        part["_station"] = str(station)
        chunks.append(part)
    if not chunks:
        raise ValueError("No se pudieron crear ventanas de entrenamiento. Se requieren registros horarios continuos de al menos 72 horas.")
    all_rows = pd.concat(chunks).sort_values("_timestamp")
    target = all_rows.pop("rain_next_6h_mm")
    all_rows = all_rows.drop(columns=["_timestamp", "_station"])
    if len(all_rows) < 100:
        raise ValueError(f"Solo se generaron {len(all_rows)} ventanas. Se requieren más datos para una primera prueba y evaluación temporal.")
    return all_rows, target, list(all_rows.columns)


def main() -> None:
    parser = argparse.ArgumentParser(description="Entrena Random Forest para precipitación acumulada en las próximas 6 horas.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default="models/rainfall_rf.joblib")
    parser.add_argument("--report", default="reports/rainfall_metrics.json")
    args = parser.parse_args()

    hourly = load_hourly(Path(args.input))
    X, y, features = build_supervised(hourly)
    # Separación cronológica: las últimas observaciones se reservan para prueba.
    split = int(len(X) * 0.8)
    if split <= 0 or len(X) - split < 20:
        raise ValueError("No hay suficientes ejemplos para separar entrenamiento y prueba.")
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=42, n_jobs=-1))
    ])
    pipeline.fit(X_train, y_train)
    pred = np.maximum(0, pipeline.predict(X_test))
    metrics = {
        "target": "rain_next_6h_mm",
        "n_rows": int(len(X)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "mae_mm": float(mean_absolute_error(y_test, pred)),
        "rmse_mm": float(np.sqrt(mean_squared_error(y_test, pred))),
        "r2": float(r2_score(y_test, pred)) if len(y_test) > 1 else None,
        "test_start": str(X_test.index[0]) if hasattr(X_test.index, "__getitem__") else None,
        "test_end": str(X_test.index[-1]) if hasattr(X_test.index, "__getitem__") else None,
        "features": features,
        "warning": "Métricas experimentales sobre el archivo suministrado; no representan validación operativa ni generalización a otras zonas."
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "features": features, "lags": LAGS, "rolls": ROLLS}, out)
    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Modelo guardado: {out}")
    print(f"Informe: {report}")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
