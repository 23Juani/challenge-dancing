package com.slideguard.citizen.presentation.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.slideguard.citizen.domain.model.DangerZone
import com.slideguard.citizen.presentation.ui.components.RiskTrafficLight
import com.slideguard.citizen.presentation.ui.components.colorForRisk
import com.slideguard.citizen.presentation.viewmodel.CitizenUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    state: CitizenUiState,
    onToggleDriverMode: (Boolean) -> Unit,
    onOpenServerSettings: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = state.solutionName.ifBlank { "" },
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = state.baseLocationLabel.ifBlank { "Alerta Temprana de Deslizamientos" },
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onOpenServerSettings) {
                        Icon(Icons.Filled.Settings, contentDescription = "Configuración de servidor")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            ModeSwitcher(driverMode = state.driverMode, onToggle = onToggleDriverMode)

            Spacer(modifier = Modifier.height(16.dp))

            if (state.loading) {
                CircularProgressIndicator()
            } else {
                RiskTrafficLight(level = state.overallRiskLevel)

                state.errorMessage?.let {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "Zonas de peligro monitoreadas",
                    style = MaterialTheme.typography.titleSmall,
                    modifier = Modifier.align(Alignment.Start),
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(state.dangerZones) { zone -> DangerZoneRow(zone) }
                    if (state.activeAlerts.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "Alertas activas",
                                style = MaterialTheme.typography.titleSmall,
                            )
                        }
                        items(state.activeAlerts) { alert ->
                            ListItem(
                                headlineContent = { Text(alert.headline) },
                                supportingContent = {
                                    Text(if (state.driverMode) alert.driverGuidance else alert.pedestrianGuidance)
                                },
                                leadingContent = {
                                    Box(
                                        modifier = Modifier
                                            .size(12.dp)
                                            .background(
                                                colorForRisk(alert.riskLevel),
                                                shape = androidx.compose.foundation.shape.CircleShape,
                                            ),
                                    )
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ModeSwitcher(driverMode: Boolean, onToggle: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
    ) {
        FilterChip(
            selected = !driverMode,
            onClick = { onToggle(false) },
            label = { Text("Modo Peatón") },
            leadingIcon = { Icon(Icons.Filled.DirectionsWalk, contentDescription = null) },
        )
        Spacer(modifier = Modifier.width(12.dp))
        FilterChip(
            selected = driverMode,
            onClick = { onToggle(true) },
            label = { Text("Modo Conductor") },
            leadingIcon = { Icon(Icons.Filled.DirectionsCar, contentDescription = null) },
        )
    }
}

@Composable
private fun DangerZoneRow(zone: DangerZone) {
    ListItem(
        headlineContent = { Text(zone.name) },
        supportingContent = {
            Text("Elevación ${zone.elevationM.toInt()} m · Pendiente ${"%.1f".format(zone.slopeDeg)}°")
        },
    )
    HorizontalDivider()
}
