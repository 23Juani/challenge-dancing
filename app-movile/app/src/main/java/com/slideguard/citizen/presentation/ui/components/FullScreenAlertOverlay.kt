package com.slideguard.citizen.presentation.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slideguard.citizen.domain.model.RiskAssessment

/**
 * Alerta a pantalla completa, visual y (via efecto de parpadeo) atencion inmediata,
 * disparada cuando llega un evento desde el puerto de demostracion en tiempo real
 * del backend ("¡ALERTA DE DESLIZAMIENTO DETECTADA EN TU RUTA!").
 */
@Composable
fun FullScreenAlertOverlay(assessment: RiskAssessment, driverMode: Boolean, onDismiss: () -> Unit) {
    val transition = rememberInfiniteTransition(label = "alert-flash")
    val alpha by transition.animateFloat(
        initialValue = 0.55f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(tween(600), RepeatMode.Reverse),
        label = "alpha",
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFEF4444).copy(alpha = alpha)),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "¡ALERTA DE DESLIZAMIENTO\nDETECTADA EN TU RUTA!",
            color = Color.White,
            fontWeight = FontWeight.Black,
            fontSize = 26.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.padding(horizontal = 24.dp),
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "${assessment.zoneName}\nDesplazamiento: ${"%.1f".format(assessment.displacementMmMonth)} mm/mes",
            color = Color.White,
            fontSize = 15.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(20.dp))
        Text(
            text = if (driverMode) {
                "Reduzca velocidad. Tome la ruta alterna senalizada. No cruce la zona de riesgo."
            } else {
                "Aléjese de la ladera. Diríjase al punto seguro más cercano de inmediato."
            },
            color = Color(0xFFFFEDED),
            fontSize = 14.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            modifier = Modifier.padding(horizontal = 32.dp),
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(onClick = onDismiss) {
            Text("Entendido")
        }
    }
}
