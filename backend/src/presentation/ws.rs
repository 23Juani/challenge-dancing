//! Endpoint WebSocket `/ws/alerts`: suscribe al cliente al `AlertsHub` y reenvia
//! cada `AlertMessage` (incluyendo heartbeats periodicos) como JSON.

use std::sync::Arc;
use std::time::Duration;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use chrono::Utc;
use futures::{SinkExt, StreamExt};
use tracing::info;

use crate::application::services::AppState;
use crate::domain::models::AlertMessage;

pub async fn ws_alerts_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.alerts_hub.subscribe();

    info!("Cliente conectado a /ws/alerts (total: {})", state.alerts_hub.receiver_count());

    // Tarea de heartbeat + reenvio de alertas.
    let hub_state = state.clone();
    let mut send_task = tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        loop {
            tokio::select! {
                msg = rx.recv() => {
                    match msg {
                        Ok(alert) => {
                            if let Ok(json) = serde_json::to_string(&alert) {
                                if sender.send(Message::Text(json)).await.is_err() {
                                    break;
                                }
                            }
                        }
                        Err(_) => continue,
                    }
                }
                _ = interval.tick() => {
                    let heartbeat = AlertMessage::Heartbeat {
                        server_time: Utc::now(),
                        active_connections: hub_state.alerts_hub.receiver_count(),
                    };
                    if let Ok(json) = serde_json::to_string(&heartbeat) {
                        if sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                }
            }
        }
    });

    // Drena mensajes entrantes del cliente (no se usan, pero hay que leerlos para
    // detectar desconexion/ping-pong correctamente).
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(_msg)) = receiver.next().await {}
    });

    tokio::select! {
        _ = (&mut send_task) => { recv_task.abort(); }
        _ = (&mut recv_task) => { send_task.abort(); }
    }
}
