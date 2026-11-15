package com.slideguard.citizen.presentation.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.slideguard.citizen.core.AppSettings
import com.slideguard.citizen.data.remote.AlertsWebSocketClient
import com.slideguard.citizen.data.remote.NetworkModule
import com.slideguard.citizen.data.repository.AlertsRepositoryImpl
import com.slideguard.citizen.domain.model.CitizenAlert
import com.slideguard.citizen.domain.model.DangerZone
import com.slideguard.citizen.domain.model.RiskAssessment
import com.slideguard.citizen.domain.model.RiskLevel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class CitizenUiState(
    val loading: Boolean = true,
    val solutionName: String = "",
    val baseLocationLabel: String = "",
    val connected: Boolean = false,
    val serverHost: String = "",
    val serverPort: Int = 0,
    val driverMode: Boolean = false,
    val overallRiskLevel: RiskLevel = RiskLevel.SEGURO,
    val activeAlerts: List<CitizenAlert> = emptyList(),
    val dangerZones: List<DangerZone> = emptyList(),
    val liveAlert: RiskAssessment? = null,
    val errorMessage: String? = null,
)

/**
 * ViewModel unico de la app (MVVM): orquesta el repositorio, mantiene el estado de
 * UI como StateFlow y reacciona al stream de alertas en vivo del WebSocket.
 */
class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val settings = AppSettings(application)
    private val okHttpClient = NetworkModule.buildOkHttpClient()

    private val _uiState = MutableStateFlow(CitizenUiState())
    val uiState: StateFlow<CitizenUiState> = _uiState

    private var currentHost: String = ""
    private var currentPort: Int = 0

    init {
        viewModelScope.launch {
            val host = settings.serverHost.first()
            val port = settings.serverPort.first()
            val driverMode = settings.driverMode.first()
            _uiState.value = _uiState.value.copy(
                serverHost = host,
                serverPort = port,
                driverMode = driverMode,
            )
            connectTo(host, port)
        }
    }

    fun updateServer(host: String, port: Int) {
        viewModelScope.launch {
            settings.setServer(host, port)
            _uiState.value = _uiState.value.copy(serverHost = host, serverPort = port, loading = true)
            connectTo(host, port)
        }
    }

    fun setDriverMode(enabled: Boolean) {
        viewModelScope.launch {
            settings.setDriverMode(enabled)
            _uiState.value = _uiState.value.copy(driverMode = enabled)
        }
    }

    fun dismissLiveAlert() {
        _uiState.value = _uiState.value.copy(liveAlert = null)
    }

    fun refresh() {
        if (currentHost.isNotEmpty()) {
            viewModelScope.launch { connectTo(currentHost, currentPort) }
        }
    }

    private suspend fun connectTo(host: String, port: Int) {
        currentHost = host
        currentPort = port

        val api = NetworkModule.buildApiService(host, port, okHttpClient)
        val wsUrl = NetworkModule.wsAlertsUrl(host, port)
        val repository = AlertsRepositoryImpl(api, AlertsWebSocketClient(okHttpClient), wsUrl)

        val statusResult = repository.getSystemStatus()
        val alertsResult = repository.getCitizenAlerts()
        val zonesResult = repository.getDangerZones()

        val connected = statusResult.isSuccess
        val overall = alertsResult.getOrNull()?.maxOfOrNull { it.riskLevel } ?: RiskLevel.SEGURO

        _uiState.value = _uiState.value.copy(
            loading = false,
            connected = connected,
            solutionName = statusResult.getOrNull()?.solutionName ?: _uiState.value.solutionName,
            baseLocationLabel = statusResult.getOrNull()?.baseLocationLabel ?: "",
            overallRiskLevel = overall,
            activeAlerts = alertsResult.getOrNull() ?: emptyList(),
            dangerZones = zonesResult.getOrNull() ?: emptyList(),
            errorMessage = if (!connected) "No se pudo conectar a $host:$port" else null,
        )

        viewModelScope.launch {
            repository.observeLiveAlerts().collect { assessment ->
                _uiState.value = _uiState.value.copy(
                    liveAlert = assessment,
                    overallRiskLevel = maxRiskLevel(_uiState.value.overallRiskLevel, assessment.riskLevel),
                )
            }
        }
    }
}

private fun maxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel =
    if (b.ordinal > a.ordinal) b else a
