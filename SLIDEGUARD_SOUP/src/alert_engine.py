from __future__ import annotations

import json
from pathlib import Path


def evaluate_alert(rain_next_6h_mm: float, landslide_probability: float, thresholds_path: str = "config/alert_thresholds.json") -> dict:
    """Aplica umbrales locales ya validados. Sin calibración, no emite niveles operativos."""
    cfg = json.loads(Path(thresholds_path).read_text(encoding="utf-8"))
    if not cfg.get("calibrated", False):
        return {
            "alert_level": "PENDIENTE_CALIBRACION",
            "rain_next_6h_mm": rain_next_6h_mm,
            "landslide_probability": landslide_probability,
            "operational_alert": False,
            "message": "El modelo devuelve estimaciones experimentales, pero los umbrales locales aún no están validados."
        }

    rain = cfg["rainfall_next_6h_mm"]
    land = cfg["landslide_probability"]
    levels = ["green", "yellow", "orange", "red"]

    def severity(value: float, limits: dict) -> int:
        ordered = [limits.get("yellow"), limits.get("orange"), limits.get("red")]
        if any(v is None for v in ordered):
            raise ValueError("Faltan umbrales amarillo/naranja/rojo para lluvia o deslizamientos.")
        numeric = [float(v) for v in ordered]
        if numeric != sorted(numeric):
            raise ValueError("Los umbrales deben ser crecientes: amarillo <= naranja <= rojo.")
        return sum(value >= threshold for threshold in numeric)

    rain_level = severity(rain_next_6h_mm, rain)
    land_level = severity(landslide_probability, land)
    level = levels[max(rain_level, land_level)]
    return {
        "alert_level": level.upper(),
        "rain_next_6h_mm": rain_next_6h_mm,
        "landslide_probability": landslide_probability,
        "operational_alert": True,
        "message": "Nivel calculado con umbrales configurados. Debe mantenerse dentro del protocolo de la autoridad competente."
    }
