//! Adaptador opcional hacia `SLIDEGUARD_SOUP` (Python).
//!
//! `SLIDEGUARD_SOUP` expone CLIs independientes (`run_alert.py`, `predict_rainfall.py`,
//! `predict_landslide.py`) que cargan un modelo scikit-learn (`models/rainfall_rf.joblib`)
//! y un clasificador LoRA de HuggingFace (`models/soup_landslide/`). Ninguno de los dos
//! esta presente en este workspace (la carpeta `models/` solo tiene un `.gitkeep`), asi que
//! no hay un binario ONNX ni pesos serializados utilizables hoy. En lugar de forzar un
//! puente ONNX Runtime/PyO3 contra artefactos inexistentes, este adaptador:
//!
//! 1. Verifica en cada peticion si `models/rainfall_rf.joblib` y `models/soup_landslide/`
//!    existen dentro de `SOUP_PROJECT_DIR`.
//! 2. Si existen, invoca `python3 src/run_alert.py --input -` como subproceso (stdin/stdout
//!    JSON), parsea `event_24h_probability` y lo combina con la formula de riesgo del motor
//!    heuristico para producir el mismo contrato `RiskAssessment`.
//! 3. Si no existen (caso actual), delega 100% en `HeuristicRiskPredictor`, de forma
//!    transparente para el resto del backend.
//!
//! Esto deja el puente listo para activarse en cuanto el equipo de datos entrene y publique
//! los modelos, sin cambiar la API ni el resto de la arquitectura hexagonal.

use std::path::{Path, PathBuf};
use std::process::Stdio;

use async_trait::async_trait;
use serde_json::json;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

use crate::domain::models::{LiveTelemetryPacket, RiskAssessment, Zone};
use crate::domain::ports::RiskPredictor;

use super::heuristic_predictor::HeuristicRiskPredictor;

pub struct SoupAdapter {
    python_bin: String,
    project_dir: PathBuf,
    fallback: HeuristicRiskPredictor,
}

impl SoupAdapter {
    pub fn new(python_bin: String, project_dir: PathBuf) -> Self {
        Self {
            python_bin,
            project_dir,
            fallback: HeuristicRiskPredictor::new(),
        }
    }

    fn models_available(&self) -> bool {
        let rain_model = self.project_dir.join("models/rainfall_rf.joblib");
        let landslide_model = self.project_dir.join("models/soup_landslide");
        rain_model.exists() && landslide_model.is_dir()
    }

    async fn try_run_alert(&self, payload: serde_json::Value) -> Option<f64> {
        let script = self.project_dir.join("src/run_alert.py");
        if !script.exists() {
            return None;
        }

        let mut child = Command::new(&self.python_bin)
            .current_dir(&self.project_dir)
            .arg(script_relative(&self.project_dir, &script))
            .arg("--input")
            .arg("-")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .ok()?;

        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(payload.to_string().as_bytes()).await;
        }

        let output = child.wait_with_output().await.ok()?;
        if !output.status.success() {
            return None;
        }

        let parsed: serde_json::Value = serde_json::from_slice(&output.stdout).ok()?;
        parsed
            .get("event_24h_probability")
            .and_then(|v| v.as_f64())
            .or_else(|| {
                parsed
                    .get("landslide")
                    .and_then(|l| l.get("event_24h_probability"))
                    .and_then(|v| v.as_f64())
            })
    }
}

fn script_relative(base: &Path, script: &Path) -> PathBuf {
    script.strip_prefix(base).unwrap_or(script).to_path_buf()
}

#[async_trait]
impl RiskPredictor for SoupAdapter {
    async fn assess_zone(&self, zone: &Zone, rain_multiplier: f64, extra_displacement_mm: f64) -> RiskAssessment {
        if self.models_available() {
            let payload = json!({
                "landslide_features": {
                    "latitude": zone.center.lat,
                    "longitude": zone.center.lon,
                    "slope_deg": zone.slope_deg,
                    "elevation_m": zone.elevation_m,
                    "geology": zone.geology,
                    "land_cover": zone.land_cover,
                },
                "rain_history_72h_mm": [5.0, 6.0, 7.0],
            });
            if let Some(prob) = self.try_run_alert(payload).await {
                let mut assessment = self.fallback.assess_zone(zone, rain_multiplier, extra_displacement_mm).await;
                assessment.risk_score = ((assessment.risk_score + prob) / 2.0 * 1000.0).round() / 1000.0;
                assessment.engine = "soup-adapter".to_string();
                return assessment;
            }
        }
        self.fallback.assess_zone(zone, rain_multiplier, extra_displacement_mm).await
    }

    async fn assess_live_packet(&self, packet: &LiveTelemetryPacket, zone: &Zone) -> RiskAssessment {
        self.fallback.assess_live_packet(packet, zone).await
    }

    fn engine_name(&self) -> &'static str {
        "soup-adapter (fallback: heuristic-v1)"
    }
}
