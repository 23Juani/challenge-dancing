package com.slideguard.citizen.presentation.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slideguard.citizen.domain.model.RiskLevel
import com.slideguard.citizen.presentation.ui.theme.RiskAlert
import com.slideguard.citizen.presentation.ui.theme.RiskCaution
import com.slideguard.citizen.presentation.ui.theme.RiskCritical
import com.slideguard.citizen.presentation.ui.theme.RiskSafe

fun colorForRisk(level: RiskLevel): Color = when (level) {
    RiskLevel.SEGURO -> RiskSafe
    RiskLevel.PRECAUCION -> RiskCaution
    RiskLevel.ALERTA -> RiskAlert
    RiskLevel.CRITICO -> RiskCritical
}

fun labelForRisk(level: RiskLevel): String = when (level) {
    RiskLevel.SEGURO -> "SEGURO"
    RiskLevel.PRECAUCION -> "PRECAUCIÓN"
    RiskLevel.ALERTA -> "ALERTA"
    RiskLevel.CRITICO -> "ALTO RIESGO"
}

/**
 * Semáforo de riesgo Image-to-Code inspirado en el Gauge circular de TERRA-SAR (Image 2):
 * Doble anillo concéntrico iluminado con indicador de estado y mensaje de alta visibilidad.
 */
@Composable
fun RiskTrafficLight(level: RiskLevel, modifier: Modifier = Modifier) {
    val riskColor = colorForRisk(level)

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color(0xFF0D1424), shape = RoundedCornerShape(20.dp))
            .border(1.dp, Color(0xFF22314E), shape = RoundedCornerShape(20.dp))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Anillo exterior con halo
        Box(
            modifier = Modifier
                .size(130.dp)
                .background(riskColor.copy(alpha = 0.15f), shape = CircleShape)
                .border(4.dp, riskColor, shape = CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            // Anillo interior
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .background(Color(0xFF080D18), shape = CircleShape)
                    .border(2.dp, riskColor.copy(alpha = 0.4f), shape = CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = labelForRisk(level),
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.padding(6.dp),
                )
            }
        }
        Spacer(modifier = Modifier.height(14.dp))
        Text(
            text = descriptionForRisk(level),
            color = Color(0xFFCBD5E1),
            fontSize = 13.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            fontWeight = FontWeight.Medium,
        )
    }
}

private fun descriptionForRisk(level: RiskLevel): String = when (level) {
    RiskLevel.SEGURO -> "Sin riesgo geológico detectado en tu ruta actual."
    RiskLevel.PRECAUCION -> "Monitoreo activo por sensor orbital NISAR. Transite con atención."
    RiskLevel.ALERTA -> "Saturación hídrica e inicio de creep en laderas. Evite taludes."
    RiskLevel.CRITICO -> "Deslizamiento inminente o vía cerrada. Tome desvíos inmediatos."
}
