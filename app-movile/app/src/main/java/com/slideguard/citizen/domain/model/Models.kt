package com.slideguard.citizen.domain.model

/** Nivel de riesgo normalizado, identico al contrato del backend (RiskLevel en Rust). */
enum class RiskLevel {
    SEGURO,
    PRECAUCION,
    ALERTA,
    CRITICO;

    companion object {
        fun fromApi(value: String): RiskLevel = when (value.lowercase()) {
            "seguro" -> SEGURO
            "precaucion" -> PRECAUCION
            "alerta" -> ALERTA
            "critico" -> CRITICO
            else -> SEGURO
        }
    }
}

data class GeoPoint(val lat: Double, val lon: Double)

data class CitizenAlert(
    val id: String,
    val zoneName: String,
    val center: GeoPoint,
    val riskLevel: RiskLevel,
    val headline: String,
    val pedestrianGuidance: String,
    val driverGuidance: String,
    val affectedRoads: List<String>,
    val safePoints: List<String>,
)

data class DangerZone(
    val id: String,
    val name: String,
    val center: GeoPoint,
    val elevationM: Double,
    val slopeDeg: Double,
)

data class RiskAssessment(
    val zoneId: String,
    val zoneName: String,
    val center: GeoPoint,
    val displacementMmMonth: Double,
    val rain24hMm: Double,
    val riskLevel: RiskLevel,
    val riskScore: Double,
    val confidencePct: Double,
)

data class SystemStatus(
    val solutionName: String,
    val operationalStatus: String,
    val baseLocationLabel: String,
)
