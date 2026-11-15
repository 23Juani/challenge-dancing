//! Definicion de rutas del servidor HTTP/WebSocket.

use std::sync::Arc;

use axum::routing::{get, post};
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::application::services::AppState;

use super::handlers::{
    get_citizen_alerts, get_config, get_layers, get_zone_by_id, get_zones, health,
    post_ingest_live, post_predict, post_simulate, root_index,
};
use super::ws::ws_alerts_handler;

pub fn build_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/", get(root_index))
        .route("/health", get(health))
        .route("/api/v1/config", get(get_config))
        .route("/api/v1/layers", get(get_layers))
        .route("/api/v1/zones", get(get_zones))
        .route("/api/v1/zones/:id", get(get_zone_by_id))
        .route("/api/v1/predict", post(post_predict))
        .route("/api/v1/simulate", post(post_simulate))
        .route("/api/v1/alerts/citizen", get(get_citizen_alerts))
        .route("/api/v1/ingest/live", post(post_ingest_live))
        .route("/ws/alerts", get(ws_alerts_handler))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}
