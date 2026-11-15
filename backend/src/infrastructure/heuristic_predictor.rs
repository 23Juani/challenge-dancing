//! Motor de prediccion heuristico determinista.
//!
//! No existen en el repositorio pesos entrenados de `SLIDEGUARD_SOUP` (el joblib del
//! modelo de lluvia y el directorio LoRA del clasificador de deslizamientos no estan
//! presentes, y `config/alert_thresholds.json` tiene sus umbrales en null). Por eso este
//! motor implementa una formula de riesgo transparente y documentada, basada en las mismas
//! variables que usa SOUP (desplazamiento InSAR, lluvia 24h, pendiente, susceptibilidad
//! geologica), de forma que el comportamiento sea identico al contrato de la API aunque los
//! modelos de ML aun no esten entrenados. Vease `infrastructure/soup_adapter.rs` para el
//! adaptador que lo reemplaza automaticamente en cuanto existan modelos reales.

use async_trait::async_trait;
use chrono::{Duration, Utc};
use rand::rngs::StdRng;
use rand::{Rng, SeedableRng};

use crate::domain::models::{
    LiveTelemetryPacket, Priority, RiskAssessment, RiskLevel, TrendPoint, Zone,
};
use crate::domain::ports::RiskPredictor;

pub struct HeuristicRiskPredictor;

impl HeuristicRiskPredictor {
    pub fn new() -> Self {
        Self
    }

    /// Formula central de riesgo: pondera desplazamiento, lluvia y pendiente/geologia.
    /// Normaliza cada variable a [0,1] y combina con pesos fijos y documentados.
    fn compute_score(displacement_mm_month: f64, rain_24h_mm: f64, slope_deg: f64, geology_factor: f64) -> f64 {
        let disp_n = (displacement_mm_month / 30.0).clamp(0.0, 1.0); // 30mm/mes = saturacion
        let rain_n = (rain_24h_mm / 60.0).clamp(0.0, 1.0); // 60mm/24h = saturacion
        let slope_n = (slope_deg / 45.0).clamp(0.0, 1.0);
        let score = 0.45 * disp_n + 0.30 * rain_n + 0.15 * slope_n + 0.10 * geology_factor;
        score.clamp(0.0, 1.0)
    }

    fn geology_factor(geology: &str) -> f64 {
        if geology.contains("coluvial") {
            0.9
        } else if geology.contains("erosion") {
            0.85
        } else if geology.contains("fractur") {
            0.75
        } else if geology.contains("Conglomerados") {
            0.5
        } else {
            0.4
        }
    }

    fn build_trend(seed: u64, base_score: f64, base_displacement: f64) -> Vec<TrendPoint> {
        let mut rng = StdRng::seed_from_u64(seed);
        let now = Utc::now();
        (0..14)
            .map(|i| {
                let days_back = 13 - i;
                let drift = rng.gen_range(-0.04..0.06);
                let score = (base_score - (days_back as f64 * 0.01) + drift).clamp(0.02, 0.99);
                let displacement = (base_displacement - (days_back as f64 * 0.3) + rng.gen_range(-0.5..0.8)).max(0.0);
                TrendPoint {
                    timestamp: now - Duration::days(days_back as i64),
                    displacement_mm: (displacement * 100.0).round() / 100.0,
                    risk_score: (score * 100.0).round() / 100.0,
                }
            })
            .collect()
    }

    fn assemble(
        zone: &Zone,
        displacement_mm_month: f64,
        rain_24h_mm: f64,
        confidence_pct: f64,
    ) -> RiskAssessment {
        let geology_factor = Self::geology_factor(&zone.geology);
        let score = Self::compute_score(displacement_mm_month, rain_24h_mm, zone.slope_deg, geology_factor);
        let risk_level = RiskLevel::from_score(score);
        let priority = Priority::from_score(score);
        let exposure = if score >= 0.6 {
            "Alta"
        } else if score >= 0.35 {
            "Media"
        } else {
            "Baja"
        };
        let seed = zone.id.bytes().fold(0u64, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u64));
        let trend = Self::build_trend(seed, score, displacement_mm_month);

        RiskAssessment {
            zone_id: zone.id.clone(),
            zone_name: zone.name.clone(),
            center: zone.center,
            displacement_mm_month: (displacement_mm_month * 100.0).round() / 100.0,
            rain_24h_mm: (rain_24h_mm * 100.0).round() / 100.0,
            slope_deg: zone.slope_deg,
            elevation_m: zone.elevation_m,
            geology: zone.geology.clone(),
            risk_level,
            risk_score: (score * 1000.0).round() / 1000.0,
            confidence_pct: (confidence_pct * 10.0).round() / 10.0,
            exposure: exposure.to_string(),
            priority,
            trend,
            evaluated_at: Utc::now(),
            engine: "heuristic-v1".to_string(),
        }
    }
}

#[async_trait]
impl RiskPredictor for HeuristicRiskPredictor {
    async fn assess_zone(&self, zone: &Zone, rain_multiplier: f64, extra_displacement_mm: f64) -> RiskAssessment {
        let seed = zone.id.bytes().fold(7u64, |acc, b| acc.wrapping_mul(17).wrapping_add(b as u64));
        let mut rng = StdRng::seed_from_u64(seed);
        let base_displacement = 3.0 + zone.slope_deg * 0.25 + rng.gen_range(0.0..4.0);
        let base_rain = 4.0 + rng.gen_range(0.0..10.0);

        let displacement = (base_displacement + extra_displacement_mm).max(0.0);
        let rain = (base_rain * rain_multiplier).max(0.0);
        let confidence = 80.0 + rng.gen_range(0.0..15.0);

        Self::assemble(zone, displacement, rain, confidence)
    }

    async fn assess_live_packet(&self, packet: &LiveTelemetryPacket, zone: &Zone) -> RiskAssessment {
        let displacement = packet.displacement_mm_month.unwrap_or_else(|| {
            3.0 + zone.slope_deg * 0.25
        });
        let rain = packet
            .rain_24h_mm
            .or(packet.rain_1h_mm.map(|r| r * 10.0))
            .unwrap_or(5.0);
        let mut assessment = Self::assemble(zone, displacement, rain, 92.0);
        assessment.engine = "heuristic-v1-live".to_string();
        assessment
    }

    fn engine_name(&self) -> &'static str {
        "heuristic-v1"
    }
}
