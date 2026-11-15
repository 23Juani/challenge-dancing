package com.slideguard.citizen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.slideguard.citizen.presentation.ui.components.FullScreenAlertOverlay
import com.slideguard.citizen.presentation.ui.components.ServerConfigDialog
import com.slideguard.citizen.presentation.ui.screens.HomeScreen
import com.slideguard.citizen.presentation.ui.theme.SlideGuardCitizenTheme
import com.slideguard.citizen.presentation.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SlideGuardCitizenTheme {
                val state by viewModel.uiState.collectAsState()
                var showServerDialog by remember { mutableStateOf(false) }

                Box(modifier = Modifier.fillMaxSize()) {
                    HomeScreen(
                        state = state,
                        onToggleDriverMode = viewModel::setDriverMode,
                        onOpenServerSettings = { showServerDialog = true },
                    )

                    state.liveAlert?.let { assessment ->
                        FullScreenAlertOverlay(
                            assessment = assessment,
                            driverMode = state.driverMode,
                            onDismiss = viewModel::dismissLiveAlert,
                        )
                    }

                    if (showServerDialog) {
                        ServerConfigDialog(
                            currentHost = state.serverHost,
                            currentPort = state.serverPort,
                            onDismiss = { showServerDialog = false },
                            onConfirm = { host, port ->
                                viewModel.updateServer(host, port)
                                showServerDialog = false
                            },
                        )
                    }
                }
            }
        }
    }
}
