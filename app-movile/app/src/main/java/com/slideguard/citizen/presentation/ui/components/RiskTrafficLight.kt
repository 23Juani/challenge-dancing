package com.slideguard.citizen.presentation.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
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
    RiskLevel.CRITICO -> "VÍA CERRADA"
}

/**
 * Semaforo de riesgo de alto contraste: Verde (Seguro), Amarillo (Precaucion),
 * Rojo (Alerta de Deslizamiento / Via Cerrada), pensado para lectura rapida a pie
 * o al volante.
 */
@Composable
fun RiskTrafficLight(level: RiskLevel, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Color(0xFF0D1424), shape = androidx.compose.foundation.shape.RoundedCornerShape(24.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(140.dp)
                .background(colorForRisk(level), shape = CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = labelForRisk(level),
                color = Color.Black,
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                modifier = Modifier.padding(8.dp),
            )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = descriptionForRisk(level), color = Color(0xFFBFC9DA), fontSize = 13.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

private fun descriptionForRisk(level: RiskLevel): String = when (level) {
    RiskLevel.SEGURO -> "Sin riesgo detectado en tu zona actual."
    RiskLevel.PRECAUCION -> "Monitoreo activo. Mantente informado."
    RiskLevel.ALERTA -> "Actividad elevada detectada. Evita laderas y taludes."
    RiskLevel.CRITICO -> "Deslizamiento activo o inminente. Evacua y evita la zona."
}
