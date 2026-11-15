#!/usr/bin/env bash
#
# demo_injector.sh — simula el envio de telemetria en tiempo real al puerto de
# ingesta en vivo del backend (TCP, por defecto 8081), durante una demostracion.
#
# Uso:
#   ./scripts/demo_injector.sh                       # escenario por defecto: pico de lluvia
#   ./scripts/demo_injector.sh critical               # escenario critico (desplazamiento alto)
#   HOST=127.0.0.1 PORT=8081 ./scripts/demo_injector.sh
#
# Tambien puede usarse el equivalente HTTP:
#   curl -X POST http://localhost:8080/api/v1/ingest/live -H 'Content-Type: application/json' -d @payload.json
#
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8081}"
SCENARIO="${1:-rain_spike}"

case "$SCENARIO" in
  rain_spike)
    PAYLOAD='{"lat":-16.5204,"lon":-68.1297,"zone_id":"zona-piloto-cotahuma","rain_1h_mm":18.5,"rain_24h_mm":62.0,"rain_72h_mm":95.0,"soil_moisture":0.78,"note":"Pico de lluvia detectado - demo en vivo"}'
    ;;
  critical)
    PAYLOAD='{"lat":-16.5204,"lon":-68.1297,"zone_id":"zona-piloto-cotahuma","rain_24h_mm":70.0,"displacement_mm_month":34.0,"soil_moisture":0.9,"note":"Desplazamiento critico simulado - demo en vivo"}'
    ;;
  *)
    echo "Escenario desconocido: $SCENARIO (usa rain_spike|critical)" >&2
    exit 1
    ;;
esac

echo "Enviando telemetria ($SCENARIO) a ${HOST}:${PORT} ..."
echo "$PAYLOAD" | nc -w 2 "$HOST" "$PORT"
echo "Listo. Revisa /ws/alerts en el website / app-movile para ver el broadcast."
