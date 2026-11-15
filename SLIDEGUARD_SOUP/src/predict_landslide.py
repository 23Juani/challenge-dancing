from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

NUMERIC = ["rain_1h_mm", "rain_24h_mm", "rain_72h_mm", "slope_deg", "elevation_m", "soil_moisture", "humidity_pct", "latitude", "longitude"]
CATEGORICAL = ["soil_type", "geology", "land_cover"]


def feature_text(row: dict) -> str:
    parts = ["Evaluacion de condiciones para deslizamiento en las proximas 24 horas."]
    for key in NUMERIC + CATEGORICAL:
        value = row.get(key)
        parts.append(f"{key}={value if value is not None else 'no_reportado'}")
    return "; ".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Carpeta de salida del clasificador Soup")
    parser.add_argument("--input", required=True, help="JSON con una observación")
    args = parser.parse_args()
    model_dir = Path(args.model)
    if not model_dir.exists():
        raise SystemExit(f"No existe la carpeta del modelo: {model_dir}")
    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    required = ["rain_1h_mm", "rain_24h_mm", "rain_72h_mm", "slope_deg"]
    missing = [key for key in required if payload.get(key) is None]
    if missing:
        raise SystemExit(f"Completa variables requeridas antes de predecir: {', '.join(missing)}")
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    encoded = tokenizer(feature_text(payload), return_tensors="pt", truncation=True, max_length=256)
    with torch.no_grad():
        probabilities = torch.softmax(model(**encoded).logits, dim=-1)[0].cpu().tolist()
    labels = model.config.id2label or {}
    result = {str(labels.get(i, f"LABEL_{i}")): float(p) for i, p in enumerate(probabilities)}
    event_prob = next((v for k, v in result.items() if k.lower() in {"event_24h", "event24h", "1"}), None)
    if event_prob is None and len(probabilities) == 2:
        event_prob = float(probabilities[1])
    print(json.dumps({
        "prediction_type": "soup_sequence_classifier",
        "horizon_hours": 24,
        "class_probabilities": result,
        "event_24h_probability": event_prob,
        "warning": "Probabilidad experimental. No equivale a certeza ni a aviso oficial. Verificar calibración y generalización espacial/temporal."
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
