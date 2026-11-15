package com.slideguard.citizen.data.remote

import com.slideguard.citizen.data.remote.dto.CitizenAlertsResponseDto
import com.slideguard.citizen.data.remote.dto.RiskAssessmentDto
import com.slideguard.citizen.data.remote.dto.SystemConfigDto
import com.slideguard.citizen.data.remote.dto.ZoneDto
import retrofit2.http.GET
import retrofit2.http.Path

/** Contrato REST contra el backend en Rust. La app NUNCA calcula riesgo por su cuenta. */
interface ApiService {

    @GET("/api/v1/config")
    suspend fun getConfig(): SystemConfigDto

    @GET("/api/v1/alerts/citizen")
    suspend fun getCitizenAlerts(): CitizenAlertsResponseDto

    @GET("/api/v1/zones")
    suspend fun getZones(): List<ZoneDto>

    @GET("/api/v1/zones/{id}")
    suspend fun getZoneAssessment(@Path("id") id: String): RiskAssessmentDto
}
