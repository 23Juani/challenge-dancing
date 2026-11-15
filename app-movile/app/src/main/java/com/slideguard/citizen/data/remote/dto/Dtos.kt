package com.slideguard.citizen.data.remote.dto

import com.google.gson.annotations.SerializedName

data class GeoPointDto(val lat: Double, val lon: Double)

data class SystemConfigDto(
    @SerializedName("solution_name") val solutionName: String,
    @SerializedName("operational_status") val operationalStatus: String,
    @SerializedName("base_location") val baseLocation: GeoPointDto,
    @SerializedName("base_location_label") val baseLocationLabel: String,
)

data class CitizenAlertDto(
    val id: String,
    @SerializedName("zone_name") val zoneName: String,
    val center: GeoPointDto,
    @SerializedName("risk_level") val riskLevel: String,
    val headline: String,
    @SerializedName("pedestrian_guidance") val pedestrianGuidance: String,
    @SerializedName("driver_guidance") val driverGuidance: String,
    @SerializedName("affected_roads") val affectedRoads: List<String>,
    @SerializedName("safe_points") val safePoints: List<String>,
)

data class CitizenAlertsResponseDto(
    @SerializedName("solution_name") val solutionName: String,
    val count: Int,
    val alerts: List<CitizenAlertDto>,
)

data class ZoneDto(
    val id: String,
    val name: String,
    val center: GeoPointDto,
    @SerializedName("elevation_m") val elevationM: Double,
    @SerializedName("slope_deg") val slopeDeg: Double,
)

data class RiskAssessmentDto(
    @SerializedName("zone_id") val zoneId: String,
    @SerializedName("zone_name") val zoneName: String,
    val center: GeoPointDto,
    @SerializedName("displacement_mm_month") val displacementMmMonth: Double,
    @SerializedName("rain_24h_mm") val rain24hMm: Double,
    @SerializedName("risk_level") val riskLevel: String,
    @SerializedName("risk_score") val riskScore: Double,
    @SerializedName("confidence_pct") val confidencePct: Double,
)

/** Mensaje recibido por /ws/alerts: `type` discrimina entre "live_alert" y "heartbeat". */
data class AlertMessageDto(
    val type: String,
    val assessment: RiskAssessmentDto? = null,
    @SerializedName("server_time") val serverTime: String? = null,
)
