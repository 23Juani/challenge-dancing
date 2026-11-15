use std::path::PathBuf;
use std::sync::Arc;

use tracing_subscriber::EnvFilter;

use slideguard_backend::application::services::{AppConfig, AppState};
use slideguard_backend::config::EnvConfig;
use slideguard_backend::domain::ports::RiskPredictor;
use slideguard_backend::infrastructure::data_store::InMemoryDataRepository;
use slideguard_backend::infrastructure::soup_adapter::SoupAdapter;
use slideguard_backend::infrastructure::tcp_ingest::run_tcp_ingest;
use slideguard_backend::presentation::routes::build_router;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let env = EnvConfig::load();

    let repository = Arc::new(InMemoryDataRepository::bootstrap());
    let predictor: Arc<dyn RiskPredictor> = Arc::new(SoupAdapter::new(
        env.soup_python_bin.clone(),
        PathBuf::from(&env.soup_project_dir),
    ));

    tracing::info!("Motor de prediccion activo: {}", predictor.engine_name());

    let app_config = AppConfig {
        solution_name: env.solution_name.clone(),
        base_location: env.base_location,
        ws_alerts_path: "/ws/alerts".to_string(),
        live_ingest_http_path: "/api/v1/ingest/live".to_string(),
        live_ingest_tcp_port: env.live_ingest_tcp_port,
    };

    let state = Arc::new(AppState::new(app_config, repository, predictor));

    // Puerto de ingesta en tiempo real (TCP crudo) para la demo en vivo.
    let tcp_state = state.clone();
    let tcp_port = env.live_ingest_tcp_port;
    tokio::spawn(async move {
        run_tcp_ingest(tcp_state, tcp_port).await;
    });

    let router = build_router(state);

    let addr = format!("{}:{}", env.http_host, env.http_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| panic!("No se pudo abrir el puerto HTTP {addr}: {e}"));

    tracing::info!(
        "SOLUTION_NAME={:?} — servidor HTTP/WebSocket escuchando en http://{addr}",
        env.solution_name
    );
    tracing::info!("API base: http://{addr}/api/v1 — WebSocket alertas: ws://{addr}/ws/alerts");
    tracing::info!("Ingesta en vivo (demo): HTTP POST /api/v1/ingest/live y TCP :{tcp_port}");

    axum::serve(listener, router).await.unwrap();
}
