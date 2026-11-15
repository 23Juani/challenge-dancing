#!/usr/bin/env python3
"""
demo_injector.py — alternativa en Python al script de shell para simular el
envio de telemetria en tiempo real al puerto de ingesta en vivo del backend.

Uso:
    python3 scripts/demo_injector.py
    python3 scripts/demo_injector.py --scenario critical
    python3 scripts/demo_injector.py --host 127.0.0.1 --port 8081 --scenario rain_spike
"""
import argparse
import json
import socket

SCENARIOS = {
    "rain_spike": {
        "lat": -16.5204,
        "lon": -68.1297,
        "zone_id": "zona-piloto-cotahuma",
        "rain_1h_mm": 18.5,
        "rain_24h_mm": 62.0,
        "rain_72h_mm": 95.0,
        "soil_moisture": 0.78,
        "note": "Pico de lluvia detectado - demo en vivo",
    },
    "critical": {
        "lat": -16.5204,
        "lon": -68.1297,
        "zone_id": "zona-piloto-cotahuma",
        "rain_24h_mm": 70.0,
        "displacement_mm_month": 34.0,
        "soil_moisture": 0.9,
        "note": "Desplazamiento critico simulado - demo en vivo",
    },
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Inyector de telemetria en vivo para demo")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8081)
    parser.add_argument("--scenario", choices=SCENARIOS.keys(), default="rain_spike")
    args = parser.parse_args()

    payload = json.dumps(SCENARIOS[args.scenario]) + "\n"

    with socket.create_connection((args.host, args.port), timeout=5) as sock:
        sock.sendall(payload.encode("utf-8"))

    print(f"Telemetria '{args.scenario}' enviada a {args.host}:{args.port}")
    print("Revisa /ws/alerts en el website / app-movile para ver el broadcast.")


if __name__ == "__main__":
    main()
