package com.slideguard.citizen.presentation.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val SlideGuardColorScheme = darkColorScheme(
    primary = RiskAlert,
    secondary = Color(0xFF22D3EE),
    background = BackgroundDark,
    surface = SurfaceGlass,
    onPrimary = Color.White,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = RiskCritical,
)

@Composable
fun SlideGuardCitizenTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = SlideGuardColorScheme,
        typography = MaterialTheme.typography,
        content = content,
    )
}
