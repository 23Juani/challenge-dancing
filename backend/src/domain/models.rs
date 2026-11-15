//! Modelos de dominio puro: sin dependencias de framework web ni de infraestructura.
//! Representan los conceptos del negocio (capas territoriales, zonas de riesgo,
//! evaluaciones, alertas) tal como los consume tanto el website como la app movil.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Nivel de riesgo normalizado usado en toda la plataforma.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Seguro,
    Precaucion,
    Alerta,
    Critico,
}

impl RiskLevel {
    /// Color hexadecimal asociado, consistente con el HUD del website y el semaforo movil.
    pub fn color_hex(&self) -> &'static str {
        match self {
            RiskLevel::Seguro => "#22c55e",
            RiskLevel::Precaucion => "#eab308",
            RiskLevel::Alerta => "#f97316",
            RiskLevel::Critico => "#ef4444",
        }
    }

    pub fn label_es(&self) -> &'static str {
        match self {
            RiskLevel::Seguro => "Seguro",
            RiskLevel::Precaucion => "Precaucion",
            RiskLevel::Alerta => "Alerta",
            RiskLevel::Critico => "Alerta Critica",
        }
    }

    pub fn from_score(score: f64) -> Self {
        if score >= 0.85 {
            RiskLevel::Critico
        } else if score >= 0.6 {
            RiskLevel::Alerta
        } else if score >= 0.35 {
            RiskLevel::Precaucion
        } else {
            RiskLevel::Seguro
        }
    }
}

/// Prioridad operativa de atencion para una zona.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    Baja,
    Media,
    Alta,
    Critica,
}

impl Priority {
    pub fn from_score(score: f64) -> Self {
        if score >= 0.85 {
            Priority::Critica
        } else if score >= 0.6 {
            Priority::Alta
        } else if score >= 0.35 {
            Priority::Media
        } else {
            Priority::Baja
        }
    }
}

/// Identificador de las 9 capas territoriales requeridas por el website.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LayerKind {
    TerrenoElevacion,
    ImagenSatelital,
    DeformacionInsar,
    MonitoreoLluvias,
    EstacionesMonitoreo,
    SusceptibilidadGeologica,
    InfraestructuraUrbana,
    EdificacionesExpuestas,
    EscenariosRiesgo,
}

impl LayerKind {
    pub fn all() -> [LayerKind; 9] {
        [
            LayerKind::TerrenoElevacion,
            LayerKind::ImagenSatelital,
            LayerKind::DeformacionInsar,
            LayerKind::MonitoreoLluvias,
            LayerKind::EstacionesMonitoreo,
            LayerKind::SusceptibilidadGeologica,
            LayerKind::InfraestructuraUrbana,
            LayerKind::EdificacionesExpuestas,
            LayerKind::EscenariosRiesgo,
        ]
    }

    pub fn label_es(&self) -> &'static str {
        match self {
            LayerKind::TerrenoElevacion => "Terreno y Elevacion",
            LayerKind::ImagenSatelital => "Imagen Satelital",
            LayerKind::DeformacionInsar => "Deformacion (InSAR)",
            LayerKind::MonitoreoLluvias => "Monitoreo de Lluvias",
            LayerKind::EstacionesMonitoreo => "Estaciones de Monitoreo",
            LayerKind::SusceptibilidadGeologica => "Susceptibilidad Geologica",
            LayerKind::InfraestructuraUrbana => "Infraestructura Urbana",
            LayerKind::EdificacionesExpuestas => "Edificaciones Expuestas",
            LayerKind::EscenariosRiesgo => "Escenarios de Riesgo",
        }
    }

    pub fn color_hex(&self) -> &'static str {
        match self {
            LayerKind::TerrenoElevacion => "#8b9dc3",
            LayerKind::ImagenSatelital => "#60a5fa",
            LayerKind::DeformacionInsar => "#f97316",
            LayerKind::MonitoreoLluvias => "#38bdf8",
            LayerKind::EstacionesMonitoreo => "#a78bfa",
            LayerKind::SusceptibilidadGeologica => "#f59e0b",
            LayerKind::InfraestructuraUrbana => "#94a3b8",
            LayerKind::EdificacionesExpuestas => "#fb7185",
            LayerKind::EscenariosRiesgo => "#ef4444",
        }
    }
}

/// Punto geografico simple (lat/lon en grados decimales, WGS84).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct GeoPoint {
    pub lat: f64,
    pub lon: f64,
}

/// Un punto de dato dentro de una capa (marcador, estacion, edificio, poligono simplificado).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerFeature {
    pub id: String,
    pub name: String,
    pub position: GeoPoint,
    pub elevation_m: f64,
    /// Valor escalar representativo de la capa (mm/mes, mm/24h, indice 0-1, etc).
    pub value: f64,
    pub unit: String,
    /// Para capas de poligono (InSAR, susceptibilidad, escenarios de riesgo): anillo exterior.
    pub polygon: Option<Vec<GeoPoint>>,
}

/// Una capa territorial completa, lista para renderizar en Three.js.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Layer {
    pub kind: LayerKind,
    pub label: String,
    pub color: String,
    pub source: String,
    pub features: Vec<LayerFeature>,
}

/// Una zona de monitoreo (poligono de riesgo) con su serie temporal de tendencia.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Zone {
    pub id: String,
    pub name: String,
    pub center: GeoPoint,
    pub elevation_m: f64,
    pub slope_deg: f64,
    pub geology: String,
    pub land_cover: String,
    pub polygon: Vec<GeoPoint>,
}

/// Punto de la curva de tendencia (series temporales de desplazamiento/riesgo).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendPoint {
    pub timestamp: DateTime<Utc>,
    pub displacement_mm: f64,
    pub risk_score: f64,
}

/// Evaluacion de riesgo completa para una zona/coordenada, segun el contrato del API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub zone_id: String,
    pub zone_name: String,
    pub center: GeoPoint,
    pub displacement_mm_month: f64,
    pub rain_24h_mm: f64,
    pub slope_deg: f64,
    pub elevation_m: f64,
    pub geology: String,
    pub risk_level: RiskLevel,
    pub risk_score: f64,
    pub confidence_pct: f64,
    pub exposure: String,
    pub priority: Priority,
    pub trend: Vec<TrendPoint>,
    pub evaluated_at: DateTime<Utc>,
    /// Indica si la evaluacion provino del adaptador SOUP (Python) o del motor heuristico interno.
    pub engine: String,
}

/// Entrada cruda para POST /api/v1/predict
#[derive(Debug, Clone, Deserialize)]
pub struct PredictRequest {
    pub lat: f64,
    pub lon: f64,
    pub zone_id: Option<String>,
}

/// Entrada para POST /api/v1/simulate: permite variar parametros o fechas historicas.
#[derive(Debug, Clone, Deserialize)]
pub struct SimulateRequest {
    pub zone_id: Option<String>,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    /// Factor multiplicador sobre la lluvia acumulada 24h (ej. 1.5 = +50%)
    pub rain_multiplier: Option<f64>,
    /// Desplazamiento adicional simulado en mm/mes
    pub extra_displacement_mm: Option<f64>,
    /// Fecha historica del satelite a simular (ISO8601); opcional
    pub historical_date: Option<DateTime<Utc>>,
}

/// Resultado de una simulacion: evaluacion resultante + parametros aplicados.
#[derive(Debug, Clone, Serialize)]
pub struct SimulationResult {
    pub assessment: RiskAssessment,
    pub applied_rain_multiplier: f64,
    pub applied_extra_displacement_mm: f64,
    pub historical_date: Option<DateTime<Utc>>,
}

/// Alerta activa para consumo ligero de la app movil (GET /api/v1/alerts/citizen).
#[derive(Debug, Clone, Serialize)]
pub struct CitizenAlert {
    pub id: String,
    pub zone_name: String,
    pub center: GeoPoint,
    pub risk_level: RiskLevel,
    pub headline: String,
    pub pedestrian_guidance: String,
    pub driver_guidance: String,
    pub affected_roads: Vec<String>,
    pub safe_points: Vec<String>,
    pub issued_at: DateTime<Utc>,
}

/// Payload crudo de telemetria inyectado por el puerto de demo en vivo.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LiveTelemetryPacket {
    pub lat: f64,
    pub lon: f64,
    pub zone_id: Option<String>,
    pub rain_1h_mm: Option<f64>,
    pub rain_24h_mm: Option<f64>,
    pub rain_72h_mm: Option<f64>,
    pub displacement_mm_month: Option<f64>,
    pub soil_moisture: Option<f64>,
    pub note: Option<String>,
}

/// Mensaje de alerta que viaja por /ws/alerts hacia website y app-movile.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AlertMessage {
    LiveAlert {
        id: Uuid,
        assessment: RiskAssessment,
        source_packet: LiveTelemetryPacket,
        received_at: DateTime<Utc>,
    },
    Heartbeat {
        server_time: DateTime<Utc>,
        active_connections: usize,
    },
}

/// Metadatos de sistema para GET /api/v1/config
#[derive(Debug, Clone, Serialize)]
pub struct SystemConfig {
    pub solution_name: String,
    pub operational_status: String,
    pub base_location: GeoPoint,
    pub base_location_label: String,
    pub server_time: DateTime<Utc>,
    pub active_layers: usize,
    pub ws_alerts_path: String,
    pub live_ingest_http_path: String,
    pub live_ingest_tcp_port: u16,
}
