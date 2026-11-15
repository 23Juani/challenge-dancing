//! Puertos (traits) del dominio hexagonal: definen como la capa de aplicacion
//! requiere datos e inferencia sin conocer los detalles de infraestructura.

use async_trait::async_trait;

use super::models::{LiveTelemetryPacket, Layer, LayerKind, RiskAssessment, Zone};

/// Puerto de repositorio de datos territoriales (deriva de ./data, sintetico o real).
pub trait DataRepository: Send + Sync {
    fn layer(&self, kind: LayerKind) -> Layer;
    fn all_layers(&self) -> Vec<Layer>;
    fn zone(&self, id: &str) -> Option<Zone>;
    fn all_zones(&self) -> Vec<Zone>;
    fn nearest_zone(&self, lat: f64, lon: f64) -> Zone;
}

/// Puerto de inferencia de riesgo. Puede implementarse con el motor heuristico interno
/// o con un adaptador que invoque SLIDEGUARD_SOUP (Python) cuando sus modelos existan.
#[async_trait]
pub trait RiskPredictor: Send + Sync {
    async fn assess_zone(&self, zone: &Zone, rain_multiplier: f64, extra_displacement_mm: f64) -> RiskAssessment;
    async fn assess_live_packet(&self, packet: &LiveTelemetryPacket, zone: &Zone) -> RiskAssessment;
    /// Nombre del motor activo, para trazabilidad en la respuesta (`engine`).
    fn engine_name(&self) -> &'static str;
}
