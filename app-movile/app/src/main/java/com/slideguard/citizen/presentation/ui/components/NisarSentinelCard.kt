package com.slideguard.citizen.presentation.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Tarjeta de telemetría de radar espacial NASA NISAR (Reto "Dancing with the SARs"):
 * Muestra el estado del sensor orbital en Banda L, polarización y constante dieléctrica.
 */
@Composable
fun NisarSentinelCard(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color(0xFF0D182A), shape = RoundedCornerShape(16.dp))
            .border(1.dp, Color(0xFF22D3EE).copy(alpha = 0.35f), shape = RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(Color(0xFF22D3EE), shape = androidx.compose.foundation.shape.CircleShape),
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "RADAR NISAR · BANDA L",
                    color = Color(0xFF22D3EE),
                    fontWeight = FontWeight.Black,
                    fontSize = 12.sp,
                    letterSpacing = 0.5.sp,
                )
            }
            Text(
                text = "Órbita 6791 · Track 035",
                color = Color(0xFF8EA0BD),
                fontSize = 11.sp,
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            TelemetryItem(label = "Constante Dieléctrica (ε_r)", value = "31.4 (Saturado)", highlight = Color(0xFFEF4444))
            TelemetryItem(label = "Coherencia (γ)", value = "0.28 (Inestable)", highlight = Color(0xFFF97316))
        }

        Spacer(modifier = Modifier.height(8.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            TelemetryItem(label = "Penetración de Dosel", value = "HV Banda L (Activa)", highlight = Color(0xFF22D3EE))
            TelemetryItem(label = "Desplazamiento LOS", value = "↑ 12 mm/mes", highlight = Color(0xFFEF4444))
        }
    }
}

@Composable
private fun TelemetryItem(label: String, value: String, highlight: Color) {
    Column {
        Text(text = label, color = Color(0xFF8EA0BD), fontSize = 10.5.sp)
        Text(text = value, color = highlight, fontWeight = FontWeight.Bold, fontSize = 12.5.sp)
    }
}
