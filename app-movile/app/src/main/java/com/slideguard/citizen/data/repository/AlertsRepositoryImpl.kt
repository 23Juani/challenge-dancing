package com.slideguard.citizen.data.repository

import com.slideguard.citizen.data.remote.AlertsWebSocketClient
import com.slideguard.citizen.data.remote.ApiService
import com.slideguard.citizen.data.remote.dto.CitizenAlertDto
import com.slideguard.citizen.data.remote.dto.RiskAssessmentDto
import com.slideguard.citizen.data.remote.dto.ZoneDto
import com.slideguard.citizen.domain.model.CitizenAlert
import com.slideguard.citizen.domain.model.DangerZone
import com.slideguard.citizen.domain.model.GeoPoint
import com.slideguard.citizen.domain.model.RiskAssessment
import com.slideguard.citizen.domain.model.RiskLevel
import com.slideguard.citizen.domain.model.SystemStatus
import com.slideguard.citizen.domain.repository.AlertsRepository
import kotlinx.coroutines.flow.Flow

class AlertsRepositoryImpl(
    private val apiService: ApiService,
    private val wsClient: AlertsWebSocketClient,
    private val wsUrl: String,
) : AlertsRepository {

    override suspend fun getSystemStatus(): Result<SystemStatus> = runCatching {
        val dto = apiService.getConfig()
        SystemStatus(
            solutionName = dto.solutionName,
            operationalStatus = dto.operationalStatus,
            baseLocationLabel = dto.baseLocationLabel,
        )
    }

    override suspend fun getCitizenAlerts(): Result<List<CitizenAlert>> = runCatching {
        apiService.getCitizenAlerts().alerts.map { it.toDomain() }
    }

    override suspend fun getDangerZones(): Result<List<DangerZone>> = runCatching {
        apiService.getZones().map { it.toDomain() }
    }

    override suspend fun getZoneAssessment(zoneId: String): Result<RiskAssessment> = runCatching {
        apiService.getZoneAssessment(zoneId).toDomain()
    }

    override fun observeLiveAlerts(): Flow<RiskAssessment> =
        kotlinx.coroutines.flow.flow {
            wsClient.connect(wsUrl).collect { message ->
                message.assessment?.let { emit(it.toDomain()) }
            }
        }
}

private fun CitizenAlertDto.toDomain() = CitizenAlert(
    id = id,
    zoneName = zoneName,
    center = GeoPoint(center.lat, center.lon),
    riskLevel = RiskLevel.fromApi(riskLevel),
    headline = headline,
    pedestrianGuidance = pedestrianGuidance,
    driverGuidance = driverGuidance,
    affectedRoads = affectedRoads,
    safePoints = safePoints,
)

private fun ZoneDto.toDomain() = DangerZone(
    id = id,
    name = name,
    center = GeoPoint(center.lat, center.lon),
    elevationM = elevationM,
    slopeDeg = slopeDeg,
)

private fun RiskAssessmentDto.toDomain() = RiskAssessment(
    zoneId = zoneId,
    zoneName = zoneName,
    center = GeoPoint(center.lat, center.lon),
    displacementMmMonth = displacementMmMonth,
    rain24hMm = rain24hMm,
    riskLevel = RiskLevel.fromApi(riskLevel),
    riskScore = riskScore,
    confidencePct = confidencePct,
)
