//! Handlers HTTP: traducen requests/responses Axum hacia/desde `AppState`.

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;

use crate::application::services::AppState;
use crate::domain::models::{PredictRequest, SimulateRequest, LiveTelemetryPacket};

pub type SharedState = Arc<AppState>;

pub async fn get_config(State(state): State<SharedState>) -> Json<serde_json::Value> {
    Json(serde_json::to_value(state.system_config()).unwrap())
}

pub async fn get_layers(State(state): State<SharedState>) -> Json<serde_json::Value> {
    Json(serde_json::to_value(state.layers()).unwrap())
}

pub async fn get_zones(State(state): State<SharedState>) -> Json<serde_json::Value> {
    Json(serde_json::to_value(state.zones()).unwrap())
}

pub async fn get_zone_by_id(
    State(state): State<SharedState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    match state.assess_zone_by_id(&id).await {
        Some(assessment) => Ok(Json(serde_json::to_value(assessment).unwrap())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn post_predict(
    State(state): State<SharedState>,
    Json(req): Json<PredictRequest>,
) -> Json<serde_json::Value> {
    let assessment = state.predict(req).await;
    Json(serde_json::to_value(assessment).unwrap())
}

pub async fn post_simulate(
    State(state): State<SharedState>,
    Json(req): Json<SimulateRequest>,
) -> Json<serde_json::Value> {
    let result = state.simulate(req).await;
    Json(serde_json::to_value(result).unwrap())
}

pub async fn get_citizen_alerts(State(state): State<SharedState>) -> Json<serde_json::Value> {
    let alerts = state.citizen_alerts().await;
    Json(serde_json::json!({
        "solution_name": state.config.solution_name,
        "count": alerts.len(),
        "alerts": alerts,
    }))
}

/// POST /api/v1/ingest/live — contraparte HTTP del puerto TCP de demo.
pub async fn post_ingest_live(
    State(state): State<SharedState>,
    Json(packet): Json<LiveTelemetryPacket>,
) -> Json<serde_json::Value> {
    let assessment = state.ingest_live_packet(packet).await;
    Json(serde_json::json!({
        "status": "broadcasted",
        "ws_path": state.config.ws_alerts_path,
        "assessment": assessment,
    }))
}

pub async fn health() -> &'static str {
    "ok"
}
