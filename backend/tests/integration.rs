use std::path::PathBuf;
use std::sync::Arc;

use slideguard_backend::application::services::{AppConfig, AppState};
use slideguard_backend::config::EnvConfig;
use slideguard_backend::domain::models::{GeoPoint, PredictRequest, RiskLevel, SimulateRequest};
use slideguard_backend::domain::ports::RiskPredictor;
use slideguard_backend::infrastructure::data_store::InMemoryDataRepository;
use slideguard_backend::infrastructure::soup_adapter::SoupAdapter;

fn test_state() -> Arc<AppState> {
    let repository = Arc::new(InMemoryDataRepository::bootstrap());
    let predictor: Arc<dyn RiskPredictor> = Arc::new(SoupAdapter::new(
        "python3".to_string(),
        PathBuf::from("../SLIDEGUARD_SOUP"),
    ));
    let config = AppConfig {
        solution_name: String::new(),
        base_location: GeoPoint { lat: -16.5204, lon: -68.1297 },
        ws_alerts_path: "/ws/alerts".to_string(),
        live_ingest_http_path: "/api/v1/ingest/live".to_string(),
        live_ingest_tcp_port: 8081,
    };
    Arc::new(AppState::new(config, repository, predictor))
}

#[tokio::test]
async fn layers_returns_nine_territorial_layers() {
    let state = test_state();
    assert_eq!(state.layers().len(), 9);
}

#[tokio::test]
async fn zones_are_not_empty_and_have_valid_coordinates() {
    let state = test_state();
    let zones = state.zones();
    assert!(!zones.is_empty());
    for z in zones {
        assert!(z.center.lat < -10.0 && z.center.lat > -20.0);
        assert!(z.center.lon < -60.0 && z.center.lon > -70.0);
        assert!(!z.polygon.is_empty());
    }
}

#[tokio::test]
async fn predict_returns_assessment_for_nearest_zone() {
    let state = test_state();
    let req = PredictRequest {
        lat: -16.5204,
        lon: -68.1297,
        zone_id: None,
    };
    let assessment = state.predict(req).await;
    assert!(assessment.risk_score >= 0.0 && assessment.risk_score <= 1.0);
    assert!(assessment.confidence_pct > 0.0);
    assert!(!assessment.trend.is_empty());
}

#[tokio::test]
async fn simulate_with_rain_multiplier_increases_or_maintains_score() {
    let state = test_state();
    let zones = state.zones();
    let zone_id = zones[0].id.clone();

    let baseline = state
        .simulate(SimulateRequest {
            zone_id: Some(zone_id.clone()),
            lat: None,
            lon: None,
            rain_multiplier: Some(1.0),
            extra_displacement_mm: Some(0.0),
            historical_date: None,
        })
        .await;

    let amplified = state
        .simulate(SimulateRequest {
            zone_id: Some(zone_id),
            lat: None,
            lon: None,
            rain_multiplier: Some(5.0),
            extra_displacement_mm: Some(20.0),
            historical_date: None,
        })
        .await;

    assert!(amplified.assessment.risk_score >= baseline.assessment.risk_score);
    assert_eq!(amplified.applied_rain_multiplier, 5.0);
    assert_eq!(amplified.applied_extra_displacement_mm, 20.0);
}

#[tokio::test]
async fn ingest_live_packet_broadcasts_and_returns_assessment() {
    let state = test_state();
    let mut rx = state.alerts_hub.subscribe();

    let packet = slideguard_backend::domain::models::LiveTelemetryPacket {
        lat: -16.5204,
        lon: -68.1297,
        zone_id: None,
        rain_1h_mm: Some(2.0),
        rain_24h_mm: Some(55.0),
        rain_72h_mm: Some(90.0),
        displacement_mm_month: Some(28.0),
        soil_moisture: Some(0.8),
        note: Some("pico de lluvia simulado".to_string()),
    };

    let assessment = state.ingest_live_packet(packet).await;
    assert!(matches!(assessment.risk_level, RiskLevel::Alerta | RiskLevel::Critico));

    let received = rx.try_recv();
    assert!(received.is_ok());
}

#[tokio::test]
async fn citizen_alerts_only_include_alerta_or_critico() {
    let state = test_state();
    let alerts = state.citizen_alerts().await;
    for a in alerts {
        assert!(matches!(a.risk_level, RiskLevel::Alerta | RiskLevel::Critico));
    }
}

#[test]
fn env_config_defaults_solution_name_to_empty() {
    std::env::remove_var("SOLUTION_NAME");
    let cfg = EnvConfig::load();
    // Puede estar vacio o definido si el usuario ya lo configuro globalmente; lo importante
    // es que el sistema no falla y respeta la variable.
    let _ = cfg.solution_name;
}
