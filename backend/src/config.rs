//! Carga de configuracion desde variables de entorno (.env). `SOLUTION_NAME` es la unica
//! variable de marca del sistema: vacia por defecto, y definida en un solo lugar.

use crate::domain::models::GeoPoint;

#[derive(Debug, Clone)]
pub struct EnvConfig {
    pub solution_name: String,
    pub http_host: String,
    pub http_port: u16,
    pub live_ingest_tcp_port: u16,
    pub base_location: GeoPoint,
    pub soup_python_bin: String,
    pub soup_project_dir: String,
}

impl EnvConfig {
    pub fn load() -> Self {
        let _ = dotenvy::dotenv();

        Self {
            solution_name: std::env::var("SOLUTION_NAME").unwrap_or_default(),
            http_host: std::env::var("HTTP_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            http_port: std::env::var("HTTP_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8080),
            live_ingest_tcp_port: std::env::var("LIVE_INGEST_TCP_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8081),
            base_location: GeoPoint {
                lat: std::env::var("BASE_LAT")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(-16.5204),
                lon: std::env::var("BASE_LON")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(-68.1297),
            },
            soup_python_bin: std::env::var("SOUP_PYTHON_BIN").unwrap_or_else(|_| "python3".to_string()),
            soup_project_dir: std::env::var("SOUP_PROJECT_DIR")
                .unwrap_or_else(|_| "../SLIDEGUARD_SOUP".to_string()),
        }
    }
}
