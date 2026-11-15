package com.slideguard.citizen.domain.repository

import com.slideguard.citizen.domain.model.CitizenAlert
import com.slideguard.citizen.domain.model.DangerZone
import com.slideguard.citizen.domain.model.RiskAssessment
import com.slideguard.citizen.domain.model.SystemStatus
import kotlinx.coroutines.flow.Flow

/** Puerto de dominio: la UI/ViewModel solo conoce esta interfaz, nunca Retrofit/OkHttp. */
interface AlertsRepository {
    suspend fun getSystemStatus(): Result<SystemStatus>
    suspend fun getCitizenAlerts(): Result<List<CitizenAlert>>
    suspend fun getDangerZones(): Result<List<DangerZone>>
    suspend fun getZoneAssessment(zoneId: String): Result<RiskAssessment>
    fun observeLiveAlerts(): Flow<RiskAssessment>
}
