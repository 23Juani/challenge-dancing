package com.slideguard.citizen.presentation.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slideguard.citizen.domain.model.DangerZone
import com.slideguard.citizen.presentation.ui.components.NisarSentinelCard
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
        containerColor = Color(0xFF060B13),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0A121E),
                    titleContentColor = Color.White,
                    actionIconContentColor = Color(0xFF22D3EE),
                ),
                title = {
                    Column {
                        Text(
                            text = state.solutionName.ifBlank { "TERRA-SAR" },
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            letterSpacing = 0.5.sp,
                        )
                        Text(
                            text = "MISIÓN NASA NISAR · ${state.baseLocationLabel.ifBlank { "LA PAZ, BOLIVIA" }}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF8EA0BD),
                            fontSize = 9.5.sp,
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
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            ModeSwitcher(driverMode = state.driverMode, onToggle = onToggleDriverMode)

            Spacer(modifier = Modifier.height(14.dp))

            if (state.loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF22D3EE))
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    // Semáforo de riesgo principal estilo TERRA-SAR
                    item {
                        RiskTrafficLight(level = state.overallRiskLevel)
                    }

                    // Card de Telemetría espacial NASA NISAR (Reto Dancing with the SARs)
                    item {
                        NisarSentinelCard()
                    }

                    state.errorMessage?.let { error ->
                        item {
                            Text(
                                text = error,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }

                    // Alertas activas
                    if (state.activeAlerts.isNotEmpty()) {
                        item {
                            Text(
                                text = "ALERTAS ACTIVAS EN RUTA",
                                color = Color(0xFFEF4444),
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                letterSpacing = 0.5.sp,
                            )
                        }
                        items(state.activeAlerts) { alert ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1015)),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(10.dp)
                                                .background(colorForRisk(alert.riskLevel), shape = androidx.compose.foundation.shape.CircleShape),
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(text = alert.headline, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.5.sp)
                                    }
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = if (state.driverMode) alert.driverGuidance else alert.pedestrianGuidance,
                                        color = Color(0xFFE2E8F0),
                                        fontSize = 12.sp,
                                    )
                                }
                            }
                        }
                    }

                    // Zonas de peligro monitoreadas
                    item {
                        Text(
                            text = "ZONAS DE MONITOREO GEOLÓGICO",
                            color = Color(0xFF8EA0BD),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 0.5.sp,
                        )
                    }

                    items(state.dangerZones) { zone ->
                        DangerZoneCard(zone)
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
            label = { Text("Modo Peatón", fontWeight = if (!driverMode) FontWeight.Bold else FontWeight.Normal) },
            leadingIcon = { Icon(Icons.Filled.DirectionsWalk, contentDescription = null) },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = Color(0xFF22D3EE).copy(alpha = 0.2f),
                selectedLabelColor = Color(0xFF22D3EE),
            ),
        )
        Spacer(modifier = Modifier.width(12.dp))
        FilterChip(
            selected = driverMode,
            onClick = { onToggle(true) },
            label = { Text("Modo Conductor", fontWeight = if (driverMode) FontWeight.Bold else FontWeight.Normal) },
            leadingIcon = { Icon(Icons.Filled.DirectionsCar, contentDescription = null) },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = Color(0xFF22D3EE).copy(alpha = 0.2f),
                selectedLabelColor = Color(0xFF22D3EE),
            ),
        )
    }
}

@Composable
private fun DangerZoneCard(zone: DangerZone) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0D1424)),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp)),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(text = zone.name, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 13.5.sp)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Elevación ${zone.elevationM.toInt()} m · Pendiente ${"%.1f".format(zone.slopeDeg)}°",
                    color = Color(0xFF8EA0BD),
                    fontSize = 11.5.sp,
                )
            }
            Text(
                text = "Activa",
                color = Color(0xFF22D3EE),
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
