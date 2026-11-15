//! Capa de aplicacion: orquesta los puertos de dominio (repositorio + predictor) y
//! mantiene el estado compartido del servidor (incluyendo el hub de WebSocket).
//! Este es el unico lugar donde website y app-movile "confian": ninguno de los dos
//! calcula riesgo por su cuenta, todo pasa por `AppState`.

use std::sync::Arc;

use chrono::Utc;
use uuid::Uuid;

use crate::domain::models::{
    AlertMessage, CitizenAlert, GeoPoint, Layer, LayerKind, LiveTelemetryPacket, PredictRequest,
    RiskAssessment, RiskLevel, SimulateRequest, SimulationResult, SystemConfig, Zone,
};
use crate::domain::ports::{DataRepository, RiskPredictor};
use crate::infrastructure::websocket_hub::AlertsHub;

pub struct AppConfig {
    pub solution_name: String,
    pub base_location: GeoPoint,
    pub ws_alerts_path: String,
    pub live_ingest_http_path: String,
    pub live_ingest_tcp_port: u16,
}

pub struct AppState {
    pub config: AppConfig,
    pub repository: Arc<dyn DataRepository>,
    pub predictor: Arc<dyn RiskPredictor>,
    pub alerts_hub: AlertsHub,
}

impl AppState {
    pub fn new(
        config: AppConfig,
        repository: Arc<dyn DataRepository>,
        predictor: Arc<dyn RiskPredictor>,
    ) -> Self {
        Self {
            config,
            repository,
            predictor,
            alerts_hub: AlertsHub::new(),
        }
    }

    pub fn system_config(&self) -> SystemConfig {
        SystemConfig {
            solution_name: self.config.solution_name.clone(),
            operational_status: "operativo".to_string(),
            base_location: self.config.base_location,
            base_location_label: "La Paz, Bolivia".to_string(),
            server_time: Utc::now(),
            active_layers: LayerKind::all().len(),
            ws_alerts_path: self.config.ws_alerts_path.clone(),
            live_ingest_http_path: self.config.live_ingest_http_path.clone(),
            live_ingest_tcp_port: self.config.live_ingest_tcp_port,
        }
    }

    pub fn layers(&self) -> Vec<Layer> {
        self.repository.all_layers()
    }

    pub fn zones(&self) -> Vec<Zone> {
        self.repository.all_zones()
    }

    pub fn zone(&self, id: &str) -> Option<Zone> {
        self.repository.zone(id)
    }

    pub async fn assess_zone_by_id(&self, id: &str) -> Option<RiskAssessment> {
        let zone = self.repository.zone(id)?;
        Some(self.predictor.assess_zone(&zone, 1.0, 0.0).await)
    }

    pub async fn predict(&self, req: PredictRequest) -> RiskAssessment {
        let zone = match req.zone_id.as_deref().and_then(|id| self.repository.zone(id)) {
            Some(z) => z,
            None => self.repository.nearest_zone(req.lat, req.lon),
        };
        self.predictor.assess_zone(&zone, 1.0, 0.0).await
    }

    pub async fn simulate(&self, req: SimulateRequest) -> SimulationResult {
        let zone = match req.zone_id.as_deref().and_then(|id| self.repository.zone(id)) {
            Some(z) => z,
            None => {
                let (lat, lon) = (
                    req.lat.unwrap_or(self.config.base_location.lat),
                    req.lon.unwrap_or(self.config.base_location.lon),
                );
                self.repository.nearest_zone(lat, lon)
            }
        };
        let rain_multiplier = req.rain_multiplier.unwrap_or(1.0).max(0.0);
        let extra_displacement = req.extra_displacement_mm.unwrap_or(0.0);
        let assessment = self
            .predictor
            .assess_zone(&zone, rain_multiplier, extra_displacement)
            .await;

        SimulationResult {
            assessment,
            applied_rain_multiplier: rain_multiplier,
            applied_extra_displacement_mm: extra_displacement,
            historical_date: req.historical_date,
        }
    }

    pub async fn citizen_alerts(&self) -> Vec<CitizenAlert> {
        let mut alerts = vec![];
        for zone in self.repository.all_zones() {
            let assessment = self.predictor.assess_zone(&zone, 1.0, 0.0).await;
            if matches!(assessment.risk_level, RiskLevel::Alerta | RiskLevel::Critico) {
                alerts.push(build_citizen_alert(&assessment));
            }
        }
        alerts
    }

    /// Procesa un paquete de telemetria en vivo (desde HTTP o TCP), calcula la evaluacion
    /// de riesgo con el motor configurado y hace broadcast inmediato por `/ws/alerts`.
    pub async fn ingest_live_packet(&self, packet: LiveTelemetryPacket) -> RiskAssessment {
        let zone = match packet.zone_id.as_deref().and_then(|id| self.repository.zone(id)) {
            Some(z) => z,
            None => self.repository.nearest_zone(packet.lat, packet.lon),
        };

        let assessment = self.predictor.assess_live_packet(&packet, &zone).await;

        self.alerts_hub.broadcast(AlertMessage::LiveAlert {
            id: Uuid::new_v4(),
            assessment: assessment.clone(),
            source_packet: packet,
            received_at: Utc::now(),
        });

        assessment
    }
}

fn build_citizen_alert(assessment: &RiskAssessment) -> CitizenAlert {
    let (pedestrian, driver, roads, safe_points) = match assessment.risk_level {
        RiskLevel::Critico => (
            "No transite por la zona. Evacue hacia puntos altos y seguros de inmediato.".to_string(),
            "Via cerrada. Tome la ruta alterna senalizada, no intente cruzar la zona de riesgo.".to_string(),
            vec![format!("Acceso principal a {}", assessment.zone_name)],
            vec!["Punto de encuentro municipal mas cercano".to_string()],
        ),
        RiskLevel::Alerta => (
            "Precaucion alta: evite permanecer en laderas o cerca de taludes en esta zona.".to_string(),
            "Reduzca velocidad y este atento a desvios senalizados en la via.".to_string(),
            vec![format!("Via de acceso a {}", assessment.zone_name)],
            vec!["Plaza o explanada mas cercana fuera de la ladera".to_string()],
        ),
        RiskLevel::Precaucion => (
            "Monitoreo activo: no se requiere accion inmediata, manténgase informado.".to_string(),
            "Transite con normalidad, con atencion a senalizacion vial.".to_string(),
            vec![],
            vec![],
        ),
        RiskLevel::Seguro => (
            "Zona sin riesgo detectado actualmente.".to_string(),
            "Transite con normalidad.".to_string(),
            vec![],
            vec![],
        ),
    };

    CitizenAlert {
        id: format!("{}-{}", assessment.zone_id, assessment.evaluated_at.timestamp()),
        zone_name: assessment.zone_name.clone(),
        center: assessment.center,
        risk_level: assessment.risk_level,
        headline: format!(
            "{}: {} en {}",
            assessment.risk_level.label_es(),
            if assessment.risk_level == RiskLevel::Critico {
                "deslizamiento detectado"
            } else {
                "actividad elevada"
            },
            assessment.zone_name
        ),
        pedestrian_guidance: pedestrian,
        driver_guidance: driver,
        affected_roads: roads,
        safe_points,
        issued_at: assessment.evaluated_at,
    }
}
