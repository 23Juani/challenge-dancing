//! Listener TCP crudo para el puerto de ingesta en vivo (por defecto 8081).
//! Acepta lineas JSON (newline-delimited) con el esquema `LiveTelemetryPacket` y las
//! procesa igual que el endpoint HTTP `POST /api/v1/ingest/live`, permitiendo inyectar
//! telemetria durante una demo con herramientas simples como `nc` o el script
//! `scripts/demo_injector.sh` / `scripts/demo_injector.py`.

use std::sync::Arc;

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpListener;
use tracing::{error, info, warn};

use crate::application::services::AppState;
use crate::domain::models::LiveTelemetryPacket;

pub async fn run_tcp_ingest(state: Arc<AppState>, port: u16) {
    let addr = format!("0.0.0.0:{port}");
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            error!("No se pudo abrir el puerto de ingesta TCP {addr}: {e}");
            return;
        }
    };
    info!("Puerto de ingesta en tiempo real (TCP) escuchando en {addr}");

    loop {
        match listener.accept().await {
            Ok((socket, peer)) => {
                info!("Conexion de telemetria en vivo desde {peer}");
                let state = state.clone();
                tokio::spawn(async move {
                    let reader = BufReader::new(socket);
                    let mut lines = reader.lines();
                    loop {
                        match lines.next_line().await {
                            Ok(Some(line)) => {
                                let trimmed = line.trim();
                                if trimmed.is_empty() {
                                    continue;
                                }
                                match serde_json::from_str::<LiveTelemetryPacket>(trimmed) {
                                    Ok(packet) => {
                                        state.ingest_live_packet(packet).await;
                                    }
                                    Err(e) => warn!("Paquete de telemetria invalido via TCP: {e}"),
                                }
                            }
                            Ok(None) => break,
                            Err(e) => {
                                warn!("Error leyendo socket de telemetria: {e}");
                                break;
                            }
                        }
                    }
                });
            }
            Err(e) => {
                error!("Error aceptando conexion en puerto de ingesta: {e}");
            }
        }
    }
}
