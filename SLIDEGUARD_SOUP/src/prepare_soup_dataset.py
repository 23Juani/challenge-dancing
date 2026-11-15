from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import pandas as pd

REQUIRED = ["event_next_24h", "rain_1h_mm", "rain_24h_mm", "rain_72h_mm", "slope_deg"]
NUMERIC = [
    "rain_1h_mm", "rain_24h_mm", "rain_72h_mm", "slope_deg", "elevation_m",
    "soil_moisture", "humidity_pct", "latitude", "longitude"
]
CATEGORICAL = ["soil_type", "geology", "land_cover"]


def value_text(value: Any) -> str:
    if pd.isna(value):
        return "no_reportado"
    if isinstance(value, (int, float)):
        return f"{float(value):.5g}"
    return str(value).strip().replace(";", ",") or "no_reportado"


def row_to_text(row: pd.Series) -> str:
    parts = ["Evaluacion de condiciones para deslizamiento en las proximas 24 horas."]
    for col in NUMERIC + CATEGORICAL:
        value = row[col] if col in row.index else None
        parts.append(f"{col}={value_text(value)}")
    return "; ".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Convierte un CSV etiquetado a JSONL para el clasificador Soup.")
    parser.add_argument("--input", required=True, help="CSV de observaciones etiquetadas")
    parser.add_argument("--output", default="data/processed/landslide_soup.jsonl")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    if not input_path.exists():
        raise SystemExit(f"No existe el archivo: {input_path}")

    df = pd.read_csv(input_path)
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise SystemExit(f"Faltan columnas obligatorias: {', '.join(missing)}")

    df = df.copy()
    df["event_next_24h"] = pd.to_numeric(df["event_next_24h"], errors="coerce")
    invalid_labels = df[~df["event_next_24h"].isin([0, 1])]
    if not invalid_labels.empty:
        raise SystemExit(f"Hay {len(invalid_labels)} filas con event_next_24h distinto de 0 o 1 o vacío.")

    for col in NUMERIC:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in REQUIRED[1:]:
        if df[col].isna().any():
            raise SystemExit(f"La columna obligatoria {col} contiene valores no numéricos o faltantes. Corrige el CSV; no se imputan etiquetas ni mediciones automáticamente.")

    counts = df["event_next_24h"].value_counts().to_dict()
    if set(counts) != {0, 1}:
        raise SystemExit("El dataset debe contener ejemplos verificados de ambas clases: 0 y 1.")
    if min(counts.values()) < 10:
        raise SystemExit("Hay menos de 10 filas en una de las clases. No es suficiente para entrenar de forma mínimamente fiable.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        for _, row in df.iterrows():
            label = "event_24h" if int(row["event_next_24h"]) == 1 else "no_event_24h"
            record = {"text": row_to_text(row), "label": label}
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"JSONL generado: {output_path}")
    print(f"Filas: {len(df)} | Sin evento: {counts.get(0, 0)} | Con evento: {counts.get(1, 0)}")
    print("Revise etiquetas, balance y calidad espacial/temporal antes de entrenar.")


if __name__ == "__main__":
    main()
