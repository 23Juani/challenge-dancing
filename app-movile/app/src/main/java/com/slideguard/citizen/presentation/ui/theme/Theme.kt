package com.slideguard.citizen.presentation.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val SlideGuardDarkColorScheme = darkColorScheme(
    primary = RiskAlert,
    secondary = Color(0xFF22D3EE),
    background = BackgroundDark,
    surface = SurfaceGlass,
    onPrimary = Color.White,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = RiskCritical,
)

private val SlideGuardLightColorScheme = lightColorScheme(
    primary = RiskAlert,
    secondary = Color(0xFF0284C7),
    background = Color(0xFFF1F5F9),
    surface = Color(0xFFFFFFFF),
    onPrimary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
    error = RiskCritical,
)

@Composable
fun SlideGuardCitizenTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colorScheme = if (darkTheme) SlideGuardDarkColorScheme else SlideGuardLightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = MaterialTheme.typography,
        content = content,
    )
}
